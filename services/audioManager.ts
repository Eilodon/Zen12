
import * as ort from 'onnxruntime-web';

// --- AUDIO MANAGER & UTILITIES ---

export const AUDIO_WORKLET_CODE = `
class ZenAudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // CONFIG
    this.BUFFER_SIZE = 1536; // 96ms at 16kHz for Silero compatibility check (though native is 24k)
    
    // INPUT STATE (Mic)
    this.inputBuffer = new Float32Array(this.BUFFER_SIZE);
    this.inputByteCount = 0;

    // OUTPUT STATE (Speaker - Ring Buffer)
    this.RING_BUFFER_SIZE = 24000 * 10; // ~10 seconds buffer
    this.outputRingBuffer = new Float32Array(this.RING_BUFFER_SIZE);
    this.readIndex = 0;
    this.writeIndex = 0;
    this.availableSamples = 0;
    
    // Message Handling
    this.port.onmessage = (e) => {
      if (e.data.type === 'audio_chunk') {
        this.pushToRingBuffer(e.data.data);
      } else if (e.data.type === 'clear_buffer') {
        // Optimistic Interruption: Instant Silence
        this.readIndex = 0;
        this.writeIndex = 0;
        this.availableSamples = 0;
        this.outputRingBuffer.fill(0);
      }
    };
  }

  pushToRingBuffer(data) {
    for (let i = 0; i < data.length; i++) {
      this.outputRingBuffer[this.writeIndex] = data[i];
      this.writeIndex = (this.writeIndex + 1) % this.RING_BUFFER_SIZE;
    }
    this.availableSamples = Math.min(this.availableSamples + data.length, this.RING_BUFFER_SIZE);
  }

  process(inputs, outputs, parameters) {
    // --- 1. HANDLE INPUT (MIC) ---
    const input = inputs[0];
    if (input && input.length > 0) {
      const channelData = input[0];
      
      // Pass raw data to main thread for VAD and Encoding
      // We chunk it here to avoid flooding the message port
      if (this.inputByteCount + channelData.length > this.BUFFER_SIZE) {
         const space = this.BUFFER_SIZE - this.inputByteCount;
         this.inputBuffer.set(channelData.subarray(0, space), this.inputByteCount);
         this.port.postMessage({ type: 'input_data', buffer: this.inputBuffer.slice() });
         
         this.inputBuffer.set(channelData.subarray(space));
         this.inputByteCount = channelData.length - space;
      } else {
         this.inputBuffer.set(channelData, this.inputByteCount);
         this.inputByteCount += channelData.length;
      }
    }

    // --- 2. HANDLE OUTPUT (SPEAKER) ---
    const output = outputs[0];
    if (output && output.length > 0) {
      const outputChannel = output[0];
      
      // Pull from Ring Buffer
      if (this.availableSamples > 0) {
        for (let i = 0; i < outputChannel.length; i++) {
          if (this.availableSamples > 0) {
            outputChannel[i] = this.outputRingBuffer[this.readIndex];
            this.readIndex = (this.readIndex + 1) % this.RING_BUFFER_SIZE;
            this.availableSamples--;
          } else {
            outputChannel[i] = 0; // Underrun padding
          }
        }
      } else {
        // Silence if buffer empty
        outputChannel.fill(0);
      }
    }

    return true; // Keep processor alive
  }
}
registerProcessor('zen-audio-processor', ZenAudioProcessor);
`;

export const floatTo16BitPCM = (float32Array: Float32Array): ArrayBuffer => {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < float32Array.length; i++) {
    let s = Math.max(-1, Math.min(1, float32Array[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  return buffer;
};

export const base64EncodeAudio = (float32Array: Float32Array): string => {
  const pcm = floatTo16BitPCM(float32Array);
  let binary = '';
  const bytes = new Uint8Array(pcm);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

/**
 * Robust VAD Implementation
 * Hybrid approach: 
 * 1. Bandpass Filter (300Hz - 3400Hz) to ignore rumble/hiss.
 * 2. Adaptive Noise Gate.
 * 3. [FUTURE] Silero ONNX (Placeholder for when model caching is robust).
 */
export class RobustVoiceDetector {
  private session: any = null;
  private noiseGate = 0.005; // Slightly higher default for Vietnam environment
  private holdFrameCount = 5;
  private currentHold = 0;
  private isActive = false;
  
  // Audio Filtering State
  private b0 = 0; private b1 = 0; private b2 = 0; private a1 = 0; private a2 = 0;
  private x1 = 0; private x2 = 0; private y1 = 0; private y2 = 0;

  constructor() {
    // Initialize Bandpass Filter Coeffs (Approx 300-3000Hz at 24kHz)
    // Simple 1st order BPF logic or biquad simulation
    this.calculateFilterCoeffs();
    this.initONNX();
  }

  private async initONNX() {
    try {
        // We load ONNX asynchronously. Until it's ready, we use DSP fallback.
        // Using a reliable CDN for Silero VAD model
        // const modelUrl = 'https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.19/dist/silero_vad.onnx';
        // this.session = await ort.InferenceSession.create(modelUrl);
        // console.log("Silero VAD Loaded");
    } catch (e) {
        console.warn("VAD Model load failed, using DSP fallback", e);
    }
  }

  private calculateFilterCoeffs() {
     // Simplified High-pass at 300Hz to kill motorbike rumble
     const rc = 1.0 / (300 * 2 * Math.PI);
     const dt = 1.0 / 24000;
     const alpha = rc / (rc + dt);
     this.a1 = alpha;
  }

  private applyFilter(sample: number): number {
     // Simple High Pass Filter
     const y = this.a1 * (this.y1 + sample - this.x1);
     this.x1 = sample;
     this.y1 = y;
     return y;
  }

  public process(float32Array: Float32Array): boolean {
    // 1. Pre-processing: Filter out low freq noise
    let sum = 0;
    const len = float32Array.length;
    
    for (let i = 0; i < len; i += 2) { // Downsample slightly for speed
       const filtered = this.applyFilter(float32Array[i]);
       sum += filtered * filtered;
    }
    
    const rms = Math.sqrt(sum / (len / 2));

    // 2. Adaptive Thresholding
    // Adapt to background noise slowly, but not to speech
    if (rms < this.noiseGate) {
       this.noiseGate = (this.noiseGate * 0.99) + (rms * 0.01);
    } else {
       // Only increase noise floor very slowly if loud
       this.noiseGate = (this.noiseGate * 0.9995) + (rms * 0.0005);
    }
    
    // Clamp noise floor
    this.noiseGate = Math.max(0.002, Math.min(this.noiseGate, 0.02));

    const threshold = this.noiseGate * 3.5; // Requires 3.5x SNR to trigger

    // 3. Logic with Hysteresis (Sticky)
    if (rms > threshold) {
       this.isActive = true;
       this.currentHold = this.holdFrameCount;
       return true;
    } else {
       if (this.currentHold > 0) {
          this.currentHold--;
          return true;
       } else {
          this.isActive = false;
          return false;
       }
    }
  }
}
