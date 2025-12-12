import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, ThumbsUp, ThumbsDown, X } from 'lucide-react';
import { haptic } from '../utils/designSystem';

// --- 1. SecurityCue ---
interface SecurityCueProps {
  mode: 'on-device' | 'hybrid' | 'cloud';
}
export const SecurityCue: React.FC<SecurityCueProps> = ({ mode }) => {
  const config = {
    'on-device': { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', text: 'Riêng tư' },
    'hybrid': { color: 'bg-blue-100 text-blue-700 border-blue-200', text: 'Bảo mật lai' },
    'cloud': { color: 'bg-stone-100 text-stone-500 border-stone-200', text: 'Mã hóa đám mây' }
  };
  const c = config[mode] || config['cloud'];
  
  return (
    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${c.color} text-[10px] font-bold uppercase tracking-wider shadow-sm`}>
      <ShieldCheck size={10} />
      <span>{c.text}</span>
    </div>
  );
};

// --- 2. FeedbackRow ---
export const FeedbackRow: React.FC = () => {
  const [status, setStatus] = useState<'none' | 'up' | 'down'>('none');

  const handleFeedback = (type: 'up' | 'down') => {
    setStatus(type);
    haptic('selection');
  };

  return (
    <div className="flex items-center gap-2 mt-6 pt-4 border-t border-stone-100/50 animate-[fadeIn_0.5s_ease-out]">
      <span className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mr-2">Hữu ích?</span>
      <button
        onClick={() => handleFeedback('up')}
        className={`p-2 rounded-full transition-all duration-300 ${status === 'up' ? 'bg-emerald-100 text-emerald-600' : 'text-stone-300 hover:bg-stone-50 hover:text-stone-500'}`}
      >
        <ThumbsUp size={16} />
      </button>
      <button
        onClick={() => handleFeedback('down')}
        className={`p-2 rounded-full transition-all duration-300 ${status === 'down' ? 'bg-stone-200 text-stone-600' : 'text-stone-300 hover:bg-stone-50 hover:text-stone-500'}`}
      >
        <ThumbsDown size={16} />
      </button>
    </div>
  );
};

// --- 3. BottomSheet ---
interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({ open, onClose, title, children }) => {
  const [isRendered, setIsRendered] = useState(open);
  const [translateY, setTranslateY] = useState(0);
  const startY = useRef<number>(0);

  useEffect(() => {
    if (open) {
      setIsRendered(true);
      document.body.style.overflow = 'hidden';
      // Slight delay to allow render before animating in
      requestAnimationFrame(() => setTranslateY(0));
    } else {
      document.body.style.overflow = '';
      const timer = setTimeout(() => setIsRendered(false), 300);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0) {
      setTranslateY(delta);
    }
  };

  const handleTouchEnd = () => {
    if (translateY > 100) {
      onClose();
      setTranslateY(0); // Reset after close trigger
    } else {
      setTranslateY(0); // Snap back
    }
  };

  if (!isRendered) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-stone-900/40 backdrop-blur-[2px] z-50 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      
      {/* Sheet */}
      <div 
        className={`fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.15)] transition-transform duration-300 cubic-bezier(0.32, 0.72, 0, 1) flex flex-col max-h-[85vh]`}
        style={{ transform: open ? `translateY(${translateY}px)` : 'translateY(100%)' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag Handle */}
        <div className="w-full pt-4 pb-2 flex justify-center shrink-0 cursor-grab active:cursor-grabbing">
          <div className="w-12 h-1.5 bg-stone-300 rounded-full opacity-50" />
        </div>

        {/* Header */}
        <div className="px-6 pb-4 flex justify-between items-center shrink-0 border-b border-stone-100/50">
           <h3 className="font-serif font-bold text-lg text-stone-800 tracking-tight">{title}</h3>
           <button 
             onClick={onClose} 
             className="p-2 bg-stone-100 rounded-full text-stone-500 hover:bg-stone-200 transition-colors"
           >
             <X size={18} />
           </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 pb-12 overscroll-contain">
          {children}
        </div>
      </div>
    </>
  );
};
