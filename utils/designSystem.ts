
import { useEffect, useState, useRef } from "react";

/**
 * Linh Quang Design Kit — Adapted for Thầy.AI
 * Philosophy: Glass, Air, Stone, Orange (Monk's Robe)
 */

export const TOKENS = {
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
  radius: { chip: 12, card: 24, round: 999 }, // Increased card radius for softer look
  elevation: { 
    chip: "0 1px 2px rgba(0,0,0,0.08)", 
    card: "0 8px 32px rgba(249, 115, 22, 0.08)", // Orange tinted shadow
    float: "0 12px 48px rgba(0,0,0,0.12)"
  },
  typography: { 
    label: { size: 13, weight: 500, family: 'Inter, sans-serif' }, 
    body: { size: 16, weight: 400, family: 'Noto Serif, serif' },
    heading: { size: 24, weight: 600, family: 'Inter, sans-serif' }
  },
  duration: { in: 300, out: 200 },
  materials: { 
    glassLight: 'rgba(255, 255, 255, 0.85)', 
    glassDark: 'rgba(28, 25, 23, 0.85)',
    borderLight: 'rgba(255, 255, 255, 0.6)'
  },
  colors: {
    primary: "#f97316", // Orange 500
    success: "#10b981", // Emerald 500
    warn: "#f59e0b",    // Amber 500
    error: "#ef4444",   // Red 500
    text: {
      primary: "#1c1917", // Stone 900
      secondary: "#57534e", // Stone 600
      muted: "#a8a29e"     // Stone 400
    }
  }
};

// ----- Haptics util (Design Kit Page 3) -----
export function haptic(kind: 'success' | 'warn' | 'error' | 'selection' | 'light' = 'selection') {
  try {
    if (!('vibrate' in navigator)) return;
    
    switch (kind) {
      case 'success': navigator.vibrate([10, 30, 10]); break;
      case 'warn': navigator.vibrate([15, 50, 15]); break;
      case 'error': navigator.vibrate([50, 100, 50]); break;
      case 'light': navigator.vibrate(5); break;
      case 'selection': navigator.vibrate(10); break;
    }
  } catch (e) {
    // Ignore haptic errors
  }
}

// ----- Long Press util (Design Kit Page 3) -----
export function useLongPress(callback = () => {}, ms = 500) {
  const timerRef = useRef<any>(null);
  
  const start = () => { 
    timerRef.current = setTimeout(() => {
      haptic('success');
      callback();
    }, ms); 
  };
  
  const clear = () => { 
    if (timerRef.current) { 
      clearTimeout(timerRef.current); 
      timerRef.current = null; 
    } 
  };

  return {
    onPointerDown: start,
    onPointerUp: clear,
    onPointerLeave: clear,
    onPointerCancel: clear
  };
}

// ----- Streaming Text Hook (Adapted from ResultCard Page 5) -----
export function useStreamingText(content: string, isGenerating: boolean, speed = 30) {
  const [stream, setStream] = useState("");
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    if (!content) {
      setStream("");
      return;
    }
    
    // If it's already generated previously, just show it (no replay) unless desired
    if (!isGenerating && stream === content) return;

    setStream("");
    setIsDone(false);
    
    let i = 0;
    // Add non-breaking space to ensure caret doesn't jump
    const textToType = content; 
    
    const id = setInterval(() => {
      setStream(s => {
        const next = textToType.slice(0, i + 1);
        return next;
      });
      i++;
      // Randomize speed slightly for human feel
      haptic('light'); 
      if (i >= textToType.length) {
        clearInterval(id);
        setIsDone(true);
      }
    }, speed);

    return () => clearInterval(id);
  }, [content, isGenerating]);

  return { stream, isDone };
}
