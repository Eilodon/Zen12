

export interface QuantumMetrics {
  coherence: number;
  entanglement: number;
  presence: number;
}

export interface ConsciousnessDimensions {
  contextual: number; // Mức độ nhận thức bối cảnh
  emotional: number;  // Chiều sâu cảm xúc
  cultural: number;   // Sự kết nối văn hóa
  wisdom: number;     // Trí tuệ/Tuệ giác
  uncertainty: number;// Khả năng chấp nhận vô thường
  relational: number; // Tương tức (Interbeing)
}

export type AwarenessStage = 'reflexive' | 'aware' | 'mindful' | 'contemplative';

// New: Consciousness Archetype based on DNA Mapping
export type ConsciousnessArchetype = 'The Observer' | 'The Healer' | 'The Warrior' | 'The Void' | 'The Seeker';

export interface ZenResponse {
  emotion: 'anxious' | 'sad' | 'joyful' | 'calm' | 'neutral' | 'stressed' | 'confused' | 'lonely' | 'seeking';
  wisdom_text: string; 
  wisdom_english?: string;
  user_transcript: string;
  breathing: '4-7-8' | 'box-breathing' | 'coherent-breathing' | 'none' | null;
  confidence: number;
  reasoning_steps: string[];
  quantum_metrics: QuantumMetrics;
  awareness_stage: AwarenessStage;
  consciousness_dimensions: ConsciousnessDimensions;
  // Extended soundscapes from PDF ideas
  ambient_sound?: 'rain' | 'bowl' | 'bell' | 'silence' | 'mekong' | 'monsoon';
  voice_tone?: 'calm_warm' | 'grounding_firm' | 'uplifting_bright' | 'gentle_soft';
}

export interface ConversationEntry {
  id: string;
  timestamp: number;
  emotion: string;
  quantum_metrics: QuantumMetrics;
  stage?: AwarenessStage;
  consciousness_dimensions?: ConsciousnessDimensions;
}

export type AppState = 'idle' | 'listening' | 'processing' | 'speaking';
export type ConnectionState = 'connected' | 'disconnected' | 'reconnecting' | 'offline';

export type CulturalMode = 'VN' | 'Universal';
export type Language = 'vi' | 'en';
export type InputMode = 'voice' | 'text';

export interface VisionAnalysis {
  buddhist_score: number;
  modern_score: number;
  natural_score: number;
  detected_items: string[];
  mode: CulturalMode;
}

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
}