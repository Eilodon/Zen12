
import * as Tone from 'tone';

// Singleton instance
let sharedContext: AudioContext | null = null;

/**
 * Gets or creates a robust, shared AudioContext.
 * Ensures compatibility between native Web Audio API and Tone.js.
 * This is the "Single Source of Truth" for audio.
 */
export const getSharedAudioContext = async (): Promise<AudioContext> => {
  if (!sharedContext) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    sharedContext = new AudioContextClass({
      sampleRate: 24000, // Optimized for Gemini Live
      latencyHint: 'interactive'
    });
    
    // CRITICAL: Sync Tone.js to use this same context
    Tone.setContext(sharedContext);
    console.log("Audio Context Initialized & Synced with Tone.js");
  }

  if (sharedContext.state === 'suspended') {
    try {
      await sharedContext.resume();
    } catch (e) {
      console.warn("Audio Context resume failed (waiting for user gesture)", e);
    }
  }

  return sharedContext;
};

export const closeSharedAudioContext = async () => {
  if (sharedContext && sharedContext.state !== 'closed') {
    try {
      await sharedContext.close();
    } catch (e) {
      console.error("Error closing context", e);
    }
  }
  sharedContext = null;
};
