
import React from 'react';
import { Mic, Volume2, Sparkles, Radio } from 'lucide-react';
import { AppState } from '../types';
import { haptic, TOKENS } from '../utils/designSystem';

interface Props {
  state: AppState;
  onClick: () => void;
}

export const VoiceButton: React.FC<Props> = ({ state, onClick }) => {
  const isListening = state === 'listening';
  const isSpeaking = state === 'speaking';
  const isProcessing = state === 'processing';
  const isIdle = state === 'idle';

  const handleClick = () => {
    // Haptic Feedback on interaction
    if (isListening) haptic('warn'); // Stopping
    else haptic('success'); // Starting
    onClick();
  };

  return (
    <div className="relative flex items-center justify-center group touch-manipulation">
      {/* Outer Ripple (Listening) */}
      {isListening && (
        <div className="absolute inset-0 rounded-full bg-red-500/10 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]" />
      )}
      
      {/* Glow (Speaking) */}
      {isSpeaking && (
        <div className="absolute inset-0 rounded-full bg-orange-400/20 blur-xl animate-pulse" />
      )}

      {/* Main Button */}
      <button
        onClick={handleClick}
        className={`
          relative z-10 w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center transition-all duration-300
          shadow-xl hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-4 focus-visible:ring-orange-200
        `}
        style={{
          background: isListening ? '#fef2f2' : isProcessing ? '#f5f5f4' : 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
          color: isListening ? '#ef4444' : isProcessing ? '#78716c' : '#ffffff',
          boxShadow: isIdle ? TOKENS.elevation.float : 'none',
          border: isListening ? '2px solid #fee2e2' : 'none'
        }}
        aria-label={isListening ? "Dừng nghe" : "Bắt đầu"}
      >
        {isIdle && <Mic size={32} strokeWidth={1.5} />}
        
        {isListening && (
           <div className="flex items-center justify-center">
              <Radio className="animate-pulse" size={32} />
           </div>
        )}
        
        {isProcessing && <Sparkles size={28} className="animate-spin-slow text-stone-400" />}
        
        {isSpeaking && <Volume2 size={32} className="animate-bounce" />}
      </button>

      {/* Label Capsule */}
      <div className={`
        absolute -bottom-12 px-4 py-1.5 rounded-full backdrop-blur-md bg-white/60 border border-white/50
        text-[12px] font-medium tracking-wide text-stone-600 shadow-sm transition-all duration-300
        ${isIdle ? 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0' : 'opacity-100 translate-y-0'}
      `}>
         {isListening ? 'Đang nghe...' : isSpeaking ? 'Thầy đang nói' : isProcessing ? 'Đang suy ngẫm' : 'Chạm để nói'}
      </div>
    </div>
  );
};
