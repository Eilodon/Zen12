import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type } from "@google/genai";
import { ZenResponse, VisionAnalysis, CulturalMode, Language } from "../types";
import { 
  AUDIO_WORKLET_CODE, 
  base64EncodeAudio, 
  RobustVoiceDetector 
} from "./audioManager";
import { getSharedAudioContext } from "./audioContext";

// --- INFRASTRUCTURE: PROXY & SECURITY UTILS ---

// Resilience: Exponential Backoff Helper
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function  withRetry<T>(
  fn: () => Promise<T>, 
  retries = 3, 
  baseDelay = 1000,
  onRetry?: (attempt: number) => void
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (retries === 0) throw error;
    
    // Check if error is retryable (Network errors, 5xx)
    // Fatal errors (401 Auth, 400 Bad Request) should throw immediately
    const isFatal = error.toString().includes("401") || error.toString().includes("API_KEY");
    if (isFatal) throw error;

    const delay = baseDelay * Math.pow(2, 3 - retries) + (Math.random() * 200); // Add Jitter
    if (onRetry) onRetry(4 - retries);
    
    console.warn(`[Infrastructure] Retry attempt ${4 - retries} in ${Math.round(delay)}ms`);
    await wait(delay);
    return withRetry(fn, retries - 1, baseDelay, onRetry);
  }
}

// Security: In a real production build, this would point to your Proxy URL
// e.g., const API_ENDPOINT = "https://api.thay.ai/v1/generate";
// Current implementation uses Direct Client Access due to Sandbox constraints.
const getClient = (apiKey: string) => {
    // PROXY-READY: This is where we would inject the Proxy Client
    return new GoogleGenAI({ apiKey });
};

// --- UTILS ---

const cleanJsonString = (text: string): string => {
  if (!text) return "{}";
  let cleaned = text.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  } else {
    return "{}";
  }
  return cleaned;
};

// --- CONFIGURATION ---

const updateZenStateTool: FunctionDeclaration = {
  name: 'update_zen_state',
  description: 'Update the visual interface with current emotion, wisdom text, quantum metrics, and consciousness dimensions.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      emotion: { type: Type.STRING, enum: ['anxious', 'sad', 'joyful', 'calm', 'neutral', 'stressed', 'confused', 'lonely', 'seeking'] },
      wisdom_text: { type: Type.STRING },
      wisdom_english: { type: Type.STRING },
      breathing: { type: Type.STRING, enum: ['4-7-8', 'box-breathing', 'coherent-breathing', 'none'] },
      quantum_metrics: {
        type: Type.OBJECT,
        properties: {
          coherence: { type: Type.NUMBER },
          entanglement: { type: Type.NUMBER },
          presence: { type: Type.NUMBER }
        },
        required: ['coherence', 'entanglement', 'presence']
      },
      awareness_stage: { type: Type.STRING, enum: ['reflexive', 'aware', 'mindful', 'contemplative'] },
      consciousness_dimensions: {
        type: Type.OBJECT,
        properties: {
          contextual: { type: Type.NUMBER },
          emotional: { type: Type.NUMBER },
          cultural: { type: Type.NUMBER },
          wisdom: { type: Type.NUMBER },
          uncertainty: { type: Type.NUMBER },
          relational: { type: Type.NUMBER }
        },
        required: ['contextual', 'emotional', 'cultural', 'wisdom', 'uncertainty', 'relational']
      },
      reasoning_steps: { type: Type.ARRAY, items: { type: Type.STRING } },
      ambient_sound: { type: Type.STRING, enum: ['rain', 'bowl', 'bell', 'silence', 'mekong', 'monsoon'] }
    },
    required: ['emotion', 'wisdom_text', 'quantum_metrics', 'awareness_stage', 'consciousness_dimensions']
  }
};

const getSystemInstruction = (mode: CulturalMode) => `
You are an AI Zen Master inspired by Thích Nhất Hạnh, operating as a "Quantum Consciousness Engine".
This is a REAL-TIME voice conversation.

CORE TEACHINGS LOGIC (Apply based on emotion):
- Sadness/Loss -> Teach "Impermanence" (Vô thường): The cloud never dies, it becomes rain.
- Anger/Frustration -> Teach "Compassion" (Từ bi): Hold anger like a mother holds a crying baby.
- Anxiety/Stress -> Teach "Presence" (Hiện pháp lạc trú): Breath is the anchor to the present moment.
- Loneliness -> Teach "Interbeing" (Tương tức): You are connected to everything (clouds, trees, ancestors).

AWARENESS STAGES (Analyze user's state):
1. Reflexive (Phản xạ): User is reactive, chaotic, or superficial.
2. Aware (Nhận thức): User notices their feelings but is still attached.
3. Mindful (Tâm thức): User accepts the present moment with some calm.
4. Contemplative (Thiền định): User shows deep insight or transformation.

INSTRUCTIONS:
1. Speak calmly, slowly, and warmly. Short sentences.
2. Adapt formality: ${mode === 'VN' ? 'Use "Thầy" (I/Teacher) and "con" (You/Child).' : 'Use warm, direct tone (I/You).'}.
3. Call 'update_zen_state' IMMEDIATELY at the start of your turn to update the UI.
4. If user is silent, maintain presence.
5. If in crisis, guide to breathe immediately.
`;

// --- SERVICES ---

// Infrastructure: Queue for Text Queries when offline
let textQueryQueue: Array<{
    text: string;
    resolve: (val: ZenResponse) => void;
    reject: (err: any) => void;
}> = [];

// Flush queue when network recovers
const flushTextQueue = async (apiKey: string, mode: CulturalMode, language: Language) => {
    if (textQueryQueue.length === 0) return;
    console.log(`[Infrastructure] Flushing ${textQueryQueue.length} queued requests...`);
    
    const queue = [...textQueryQueue];
    textQueryQueue = []; // Clear global queue
    
    for (const item of queue) {
        try {
            const result = await sendZenTextQuery(apiKey, item.text, mode, language);
            item.resolve(result);
        } catch (e) {
            // If it fails again, might want to re-queue or fail permanently
            console.error("Failed to process queued item", e);
            item.reject(e); 
        }
    }
};

export const sendZenTextQuery = async (
  apiKey: string,
  text: string, 
  mode: CulturalMode, 
  language: Language
): Promise<ZenResponse> => {
  if (!apiKey) throw new Error("API_KEY_MISSING");

  // Network Check
  if (!navigator.onLine) {
     console.warn("[Infrastructure] Network offline. Queueing request.");
     return new Promise((resolve, reject) => {
         textQueryQueue.push({ text, resolve, reject });
     });
  }
  
  // Use withRetry for resilience
  return withRetry(async () => {
      const ai = getClient(apiKey);
      const formality = mode === 'VN' ? 'Use "Thầy" (Teacher) and "con" (child/disciple).' : 'Use warm, direct tone.';
      
      const prompt = `
        User input: "${text}"
        Role: Zen Master Thích Nhất Hạnh (Quantum Engine).
        Language: ${language === 'vi' ? 'Vietnamese' : 'English'}.
        Formality: ${formality}
        Task: 
        1. Analyze user's "Awareness Stage" (Reflexive/Aware/Mindful/Contemplative).
        2. Calculate 6 Dimensions (0.0-1.0): Contextual, Emotional, Cultural, Wisdom, Uncertainty, Relational.
        3. Provide mindful wisdom based on Core Teachings OR Specific Situation (Coffee, Traffic, etc).
        4. Select ambient sound: 'mekong' (flow), 'monsoon' (rain), 'bell', 'bowl'.
        Output: JSON matching schema.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              emotion: { type: Type.STRING, enum: ['anxious', 'sad', 'joyful', 'calm', 'neutral', 'stressed', 'confused', 'lonely', 'seeking'] },
              wisdom_text: { type: Type.STRING },
              wisdom_english: { type: Type.STRING },
              user_transcript: { type: Type.STRING },
              breathing: { type: Type.STRING, enum: ['4-7-8', 'box-breathing', 'coherent-breathing', 'none'] },
              confidence: { type: Type.NUMBER },
              reasoning_steps: { type: Type.ARRAY, items: { type: Type.STRING } },
              quantum_metrics: {
                type: Type.OBJECT,
                properties: {
                  coherence: { type: Type.NUMBER },
                  entanglement: { type: Type.NUMBER },
                  presence: { type: Type.NUMBER }
                },
                required: ['coherence', 'entanglement', 'presence']
              },
              awareness_stage: { type: Type.STRING, enum: ['reflexive', 'aware', 'mindful', 'contemplative'] },
              consciousness_dimensions: {
                type: Type.OBJECT,
                properties: {
                  contextual: { type: Type.NUMBER },
                  emotional: { type: Type.NUMBER },
                  cultural: { type: Type.NUMBER },
                  wisdom: { type: Type.NUMBER },
                  uncertainty: { type: Type.NUMBER },
                  relational: { type: Type.NUMBER }
                },
                required: ['contextual', 'emotional', 'cultural', 'wisdom', 'uncertainty', 'relational']
              },
              ambient_sound: { type: Type.STRING, enum: ['rain', 'bowl', 'bell', 'silence', 'mekong', 'monsoon'] }
            },
            required: ['emotion', 'wisdom_text', 'quantum_metrics', 'reasoning_steps', 'awareness_stage', 'consciousness_dimensions']
          }
        }
      });

      const rawText = response.text || "{}";
      const cleanedText = cleanJsonString(rawText);
      
      try {
        const data = JSON.parse(cleanedText);
        return {
          ...data,
          user_transcript: data.user_transcript || text,
          breathing: data.breathing || 'none',
          ambient_sound: data.ambient_sound || 'silence',
          awareness_stage: data.awareness_stage || 'reflexive',
          consciousness_dimensions: data.consciousness_dimensions || {
             contextual: 0.5, emotional: 0.5, cultural: 0.5, wisdom: 0.5, uncertainty: 0.5, relational: 0.5
          }
        };
      } catch (e) {
        console.error("JSON Parse Error on Text Query:", e, rawText);
        // Soft Fallback
        return {
          emotion: 'neutral',
          wisdom_text: "Thầy đang lắng nghe...",
          quantum_metrics: { coherence: 0.5, entanglement: 0.5, presence: 0.5 },
          reasoning_steps: ["Error parsing response"],
          breathing: 'none',
          confidence: 0,
          user_transcript: text,
          awareness_stage: 'reflexive',
          consciousness_dimensions: { contextual: 0.5, emotional: 0.5, cultural: 0.5, wisdom: 0.5, uncertainty: 0.5, relational: 0.5 }
        };
      }
  }, 3, 1000); // 3 Retries, 1s base delay
};

export class ZenLiveSession {
  private mode: CulturalMode;
  private lang: Language;
  private onStateChange: (data: Partial<ZenResponse>) => void;
  private onAudioActivity: (active: boolean) => void;
  private onDisconnectCallback: (reason?: string, isReconnecting?: boolean) => void;
  
  private inputContext: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  
  private vad: RobustVoiceDetector;
  private sessionPromise: Promise<any> | null = null;
  
  // Reconnect & State Management
  private idleTimer: any = null;
  private readonly IDLE_TIMEOUT_MS = 60000;
  private isAiSpeaking = false; 
  private isManuallyClosed = false;
  private reconnectAttempts = 0;
  private readonly MAX_RETRIES = 5; // Increased retries for robustness

  private boundHandleNetworkRecovery: () => void;
  private boundHandleNetworkOffline: () => void;

  constructor(
    mode: CulturalMode, 
    lang: Language, 
    onStateChange: (data: Partial<ZenResponse>) => void,
    onAudioActivity: (active: boolean) => void,
    onDisconnectCallback: (reason?: string, isReconnecting?: boolean) => void
  ) {
    this.mode = mode;
    this.lang = lang;
    this.onStateChange = onStateChange;
    this.onAudioActivity = onAudioActivity;
    this.onDisconnectCallback = onDisconnectCallback;
    this.vad = new RobustVoiceDetector();
    
    this.boundHandleNetworkRecovery = this.handleNetworkRecovery.bind(this);
    this.boundHandleNetworkOffline = this.handleNetworkOffline.bind(this);
  }

  public async warmupAudio() {
    this.inputContext = await getSharedAudioContext();
  }

  async connect(isReconnect = false): Promise<AnalyserNode> {
    if (!isReconnect) {
        this.isManuallyClosed = false;
        this.reconnectAttempts = 0;
    }
    this.resetIdleTimer();
    
    // Resilience: Listen for network changes
    window.addEventListener('online', this.boundHandleNetworkRecovery);
    window.addEventListener('offline', this.boundHandleNetworkOffline);

    await this.warmupAudio();

    let inputSource: MediaStreamAudioSourceNode | null = null;

    try {
      if (!this.inputContext) throw new Error("Audio Context not initialized");

      const blob = new Blob([AUDIO_WORKLET_CODE], { type: "application/javascript" });
      const workletUrl = URL.createObjectURL(blob);
      try {
        await this.inputContext.audioWorklet.addModule(workletUrl);
      } catch (e: any) {
        if (!e.message.includes('already exists')) console.warn(e);
      }
      URL.revokeObjectURL(workletUrl);

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          channelCount: 1, 
          echoCancellation: true, 
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 24000 // Request native rate if possible
        } 
      });

      inputSource = this.inputContext.createMediaStreamSource(stream);
      this.workletNode = new AudioWorkletNode(this.inputContext, 'zen-audio-processor');
      
      inputSource.connect(this.workletNode);
      this.workletNode.connect(this.inputContext.destination);

      this.workletNode.port.onmessage = (event) => {
         const { type, buffer } = event.data;
         
         if (type === 'input_data') {
            const inputData = buffer as Float32Array;

            if (this.vad.process(inputData)) {
              this.resetIdleTimer();
              
              if (this.isAiSpeaking) {
                  this.workletNode?.port.postMessage({ type: 'clear_buffer' });
                  this.isAiSpeaking = false;
                  this.onAudioActivity(false);
              }

              // Resilience: Check session status before sending
              if (this.sessionPromise) {
                  const base64 = base64EncodeAudio(inputData);
                  this.sessionPromise.then(session => {
                    session.sendRealtimeInput({
                      // CRITICAL: Explicitly set rate to 24000 to match AudioContext and avoid pitch shift
                      media: { mimeType: 'audio/pcm;rate=24000', data: base64 }
                    });
                  }).catch(err => {
                      console.warn("Dropped audio chunk due to connection loss", err);
                  });
              }
            }
         }
      };

    } catch (e) {
      console.error("Mic access failed", e);
      throw new Error("Microphone/Worklet access failed");
    }

    const key = process.env.API_KEY;
    if (!key || key.trim() === '') throw new Error("API_KEY_MISSING");

    const ai = getClient(key);
    const voiceName = this.lang === 'vi' ? 'Kore' : 'Fenrir';

    // Resilience: Process pending text queue if any
    flushTextQueue(key, this.mode, this.lang);

    this.sessionPromise = ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName } }
        },
        systemInstruction: getSystemInstruction(this.mode),
        tools: [{ functionDeclarations: [updateZenStateTool] }]
      },
      callbacks: {
        onopen: () => {
          console.log("Gemini Connected");
          this.reconnectAttempts = 0;
          this.onDisconnectCallback(undefined, false); // Signal connected
        },
        onmessage: this.handleMessage.bind(this),
        onclose: (e) => this.handleConnectionLoss("closed", e),
        onerror: (err) => {
          console.error(err);
          this.handleConnectionLoss("error");
        }
      }
    });
    
    const analyser = this.inputContext.createAnalyser();
    if (inputSource) {
      inputSource.connect(analyser);
    }
    return analyser;
  }

  private handleNetworkOffline() {
    console.log("[Infrastructure] Network Offline detected");
    this.workletNode?.port.postMessage({ type: 'clear_buffer' });
    this.onDisconnectCallback("Mất kết nối mạng...", true);
  }

  private handleNetworkRecovery() {
    console.log("[Infrastructure] Network Recovery detected");
    if (!this.isManuallyClosed && (this.sessionPromise === null || this.reconnectAttempts > 0)) {
        this.onDisconnectCallback("Đã có mạng trở lại. Đang kết nối...", true);
        
        // Resilience: Attempt queued flushes immediately
        const key = process.env.API_KEY;
        if (key) flushTextQueue(key, this.mode, this.lang);

        this.connect(true).catch(e => console.error("Auto-reconnect failed", e));
    }
  }

  private handleConnectionLoss(type: string, event?: any) {
    if (this.isManuallyClosed) return;

    if (event instanceof CloseEvent) {
        if (event.code === 4003 || event.code === 401) { 
            this.disconnect("Authentication failed");
            return;
        }
    }

    // Resilience: Exponential Backoff Logic
    if (this.reconnectAttempts < this.MAX_RETRIES) {
      this.reconnectAttempts++;
      // Backoff: 1s, 2s, 4s, 8s, 16s + Jitter
      const delay = 1000 * Math.pow(2, this.reconnectAttempts - 1) + (Math.random() * 500);
      
      this.onDisconnectCallback(`Thử lại lần ${this.reconnectAttempts}...`, true);
      this.sessionPromise = null;

      console.log(`[Infrastructure] Reconnecting in ${Math.round(delay)}ms`);
      setTimeout(() => {
        if (this.isManuallyClosed) return;
        this.connect(true).catch(e => {
            console.error("Reconnect attempt failed", e);
            // Don't recursive loop here; let the onerror callback trigger next backoff
        });
      }, delay);
    } else {
      this.disconnect("FALLBACK_TO_TEXT");
    }
  }

  private resetIdleTimer() {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => {
      this.disconnect("Timeout due to inactivity");
    }, this.IDLE_TIMEOUT_MS);
  }

  private async handleMessage(message: LiveServerMessage) {
    this.resetIdleTimer();

    if (message.toolCall) {
      for (const fc of message.toolCall.functionCalls) {
        if (fc.name === 'update_zen_state') {
          const args = fc.args as any;
          this.onStateChange(args);
          this.sessionPromise?.then(session => {
            session.sendToolResponse({
              functionResponses: {
                id: fc.id,
                name: fc.name,
                response: { result: "OK" }
              }
            });
          });
        }
      }
    }

    const modelTurn = message.serverContent?.modelTurn;
    if (modelTurn?.parts?.[0]?.inlineData) {
      this.isAiSpeaking = true; 
      this.onAudioActivity(true);
      
      const base64 = modelTurn.parts[0].inlineData.data;
      const audioData = this.decodeBase64ToFloat32(base64);
      
      if (this.workletNode) {
          this.workletNode.port.postMessage({ 
              type: 'audio_chunk', 
              data: audioData 
          });
      }
    }

    if (message.serverContent?.interrupted) {
      this.workletNode?.port.postMessage({ type: 'clear_buffer' });
      this.isAiSpeaking = false; 
      this.onAudioActivity(false);
    }
    
    if (message.serverContent?.turnComplete) {
         setTimeout(() => {
             if (this.isAiSpeaking) {
                 this.isAiSpeaking = false;
                 this.onAudioActivity(false);
             }
         }, 800);
    }
  }

  private decodeBase64ToFloat32(base64: string): Float32Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768.0;
    }
    return float32;
  }

  disconnect(reason?: string) {
    this.isManuallyClosed = true; 
    
    window.removeEventListener('online', this.boundHandleNetworkRecovery);
    window.removeEventListener('offline', this.boundHandleNetworkOffline);

    if (this.idleTimer) clearTimeout(this.idleTimer);
    
    this.workletNode?.port.postMessage({ type: 'clear_buffer' });
    this.isAiSpeaking = false;
    
    if (this.workletNode) {
      this.workletNode.port.onmessage = null;
      try { this.workletNode.disconnect(); } catch(e) {}
      this.workletNode = null;
    }
    
    this.sessionPromise = null; 
    this.onDisconnectCallback(reason, false); // Not reconnecting, actual disconnect
  }
}

export const analyzeEnvironment = async (apiKey: string, base64Image: string): Promise<VisionAnalysis> => {
  if (!apiKey) throw new Error("API_KEY_MISSING");
  
  return withRetry(async () => {
      const ai = getClient(apiKey); 
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
            { text: `Analyze environment: DETECT: 
              1. Buddhist (altar/incense/Buddha/lotus/prayer beads); 
              2. Modern office (desk/computer/lights); 
              3. Natural (plants/windows). 
              RULES: buddhist>0.6 -> VN mode; Else Universal. 
              Return JSON.` }
          ]
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              buddhist_score: { type: Type.NUMBER },
              modern_score: { type: Type.NUMBER },
              natural_score: { type: Type.NUMBER },
              detected_items: { type: Type.ARRAY, items: { type: Type.STRING } },
              mode: { type: Type.STRING, enum: ['VN', 'Universal'] }
            },
            required: ['mode', 'detected_items', 'buddhist_score']
          }
        }
      });
      const rawText = response.text || "{}";
      const cleanedText = cleanJsonString(rawText);
      return JSON.parse(cleanedText) as VisionAnalysis;
  }, 2, 500); // 2 Retries for image
};