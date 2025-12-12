

import { create } from 'zustand';
import { AppState, ZenResponse, CulturalMode, Language, InputMode, ConversationEntry, ConnectionState } from '../types';

interface UIState {
  culturalMode: CulturalMode;
  language: Language;
  inputMode: InputMode;
  snackbar: { kind: "success" | "warn" | "error" | "info", text: string } | null;
  isLoading: boolean;
  showBreathing: boolean;
  emergencyActive: boolean;
  
  setCulturalMode: (mode: CulturalMode) => void;
  setLanguage: (lang: Language) => void;
  setInputMode: (mode: InputMode) => void;
  setSnackbar: (snack: UIState['snackbar']) => void;
  setIsLoading: (loading: boolean) => void;
  setShowBreathing: (show: boolean) => void;
  setEmergencyActive: (active: boolean) => void;
}

interface ZenSessionState {
  status: AppState;
  connectionState: ConnectionState; // New: Track specific connection health
  zenData: ZenResponse | null;
  history: ConversationEntry[];
  connectionAttempts: number;
  
  setStatus: (status: AppState) => void;
  setConnectionState: (state: ConnectionState) => void;
  setZenData: (data: ZenResponse | null) => void;
  setHistory: (history: ConversationEntry[]) => void;
  addToHistory: (entry: ConversationEntry) => void;
  incrementConnectionAttempts: () => void;
  resetConnectionAttempts: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  culturalMode: 'Universal',
  language: 'vi',
  inputMode: 'voice',
  snackbar: null,
  isLoading: true,
  showBreathing: false,
  emergencyActive: false,

  setCulturalMode: (mode) => set({ culturalMode: mode }),
  setLanguage: (lang) => set({ language: lang }),
  setInputMode: (mode) => set({ inputMode: mode }),
  setSnackbar: (snack) => set({ snackbar: snack }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setShowBreathing: (show) => set({ showBreathing: show }),
  setEmergencyActive: (active) => set({ emergencyActive: active }),
}));

export const useZenStore = create<ZenSessionState>((set) => ({
  status: 'idle',
  connectionState: 'disconnected',
  zenData: null,
  history: [],
  connectionAttempts: 0,

  setStatus: (status) => set({ status }),
  setConnectionState: (state) => set({ connectionState: state }),
  setZenData: (data) => set({ zenData: data }),
  setHistory: (history) => set({ history }),
  addToHistory: (entry) => set((state) => ({ history: [...state.history, entry] })),
  incrementConnectionAttempts: () => set((state) => ({ connectionAttempts: state.connectionAttempts + 1 })),
  resetConnectionAttempts: () => set({ connectionAttempts: 0 }),
}));