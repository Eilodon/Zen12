

import * as React from 'react';
import { useRef, useCallback } from 'react';
import { ZenLiveSession, sendZenTextQuery } from '../services/geminiService';
import { ZenResponse } from '../types';
import { haptic } from '../utils/designSystem';
import { detectEmergency } from '../data/emergencyKeywords';
import { useUIStore, useZenStore } from '../store/zenStore';
import { getSharedAudioContext } from '../services/audioContext';

interface UseZenSessionProps {
  onEmergencyDetected: () => void;
  onError: (msg: string, type: 'error' | 'warn' | 'info') => void;
}

export function useZenSession({ 
  onEmergencyDetected, 
  onError 
}: UseZenSessionProps) {
  
  // Select state from stores to avoid prop drilling
  const { culturalMode, language, setInputMode, setEmergencyActive } = useUIStore();
  const { status, setStatus, setZenData, setConnectionState } = useZenStore();
  
  const liveSessionRef = useRef<ZenLiveSession | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Handle session disconnects & reconnects
  const handleDisconnect = React.useCallback((reason?: string, isReconnecting?: boolean) => {
    if (isReconnecting) {
        setConnectionState('reconnecting');
        if (reason) onError(reason, "warn"); // Show "Reconnecting..."
        return;
    }
    
    // Fallback if connection fails permanently
    if (reason === "FALLBACK_TO_TEXT") {
        onError("Mạng yếu, chuyển sang chế độ chat.", "info");
        setInputMode('text');
        haptic('warn');
        setConnectionState('disconnected');
    } else if (reason) {
       onError(reason === "Timeout due to inactivity" ? "Đã ngắt kết nối (Tự động)" : reason, "info");
       setConnectionState('disconnected');
    } else {
       // Clean disconnect
       setConnectionState('disconnected');
    }

    liveSessionRef.current = null;
    analyserRef.current = null;
    setStatus('idle');
  }, [onError, setStatus, setInputMode, setConnectionState]);

  // Handle incoming data updates from Gemini
  const handleStateChange = React.useCallback((data: Partial<ZenResponse>) => {
     useZenStore.setState((prev) => {
        const newData = prev.zenData ? { ...prev.zenData, ...data } : data as ZenResponse;
        
        // Emergency Check
        if (newData.wisdom_text && detectEmergency(newData.wisdom_text)) {
           setEmergencyActive(true);
           onEmergencyDetected();
           liveSessionRef.current?.disconnect();
        }
        return { zenData: newData };
     });
  }, [onEmergencyDetected, setEmergencyActive]);

  // Connect Function
  const connect = React.useCallback(async () => {
    if (status !== 'idle') {
        liveSessionRef.current?.disconnect();
        return;
    }

    try {
        await getSharedAudioContext();

        liveSessionRef.current = new ZenLiveSession(
          culturalMode,
          language,
          handleStateChange,
          (active) => setStatus(active ? 'speaking' : 'listening'),
          handleDisconnect
        );
        
        await liveSessionRef.current.warmupAudio();

        haptic('success');
        setStatus('listening');
        setConnectionState('reconnecting'); // Initial connecting state

        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        if (!hasKey) {
          await (window as any).aistudio.openSelectKey();
          const confirmed = await (window as any).aistudio.hasSelectedApiKey();
          if (!confirmed) {
             liveSessionRef.current = null;
             setStatus('idle');
             setConnectionState('disconnected');
             return;
          }
        }
        
        if (liveSessionRef.current) {
            const analyser = await liveSessionRef.current.connect();
            analyserRef.current = analyser;
            setConnectionState('connected');
        }

    } catch (e) {
        console.error(e);
        setStatus('idle');
        setConnectionState('disconnected');
        onError("Lỗi kết nối", "error");
        liveSessionRef.current?.disconnect();
    }
  }, [status, culturalMode, language, handleStateChange, handleDisconnect, onError, setStatus, setConnectionState]);

  // Manual Disconnect
  const disconnect = React.useCallback(() => {
     if (liveSessionRef.current) {
         liveSessionRef.current.disconnect();
         haptic('warn');
     }
  }, []);

  // Text Query Function
  const sendText = React.useCallback(async (text: string) => {
    if (!text.trim()) return null;
    if (liveSessionRef.current) liveSessionRef.current.disconnect();

    try {
      const hasKey = await (window as any).aistudio.hasSelectedApiKey();
      if (!hasKey) {
          await (window as any).aistudio.openSelectKey();
          const confirmed = await (window as any).aistudio.hasSelectedApiKey();
          if (!confirmed) return null;
      }

      haptic('selection');
      setStatus('processing');
      
      const apiKey = process.env.API_KEY as string;
      const response = await sendZenTextQuery(apiKey, text, culturalMode, language);
      
      setZenData(response);
      haptic('success');
      setStatus('idle');
      
      return response;
    } catch (e) {
      console.error(e);
      onError("Không thể xử lý yêu cầu", "error");
      setStatus('idle');
      return null;
    }
  }, [culturalMode, language, onError, setStatus, setZenData]);

  return {
    connect,
    disconnect,
    sendText,
    analyserRef
  };
}