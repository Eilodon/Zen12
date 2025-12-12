
import React, { useEffect, useState } from 'react';
import { TOKENS } from '../utils/designSystem';
import { Check, AlertCircle, Info, X } from 'lucide-react';

interface SnackbarProps {
  kind?: "success" | "warn" | "error" | "info";
  text: string;
  onClose?: () => void;
}

export const Snackbar: React.FC<SnackbarProps> = ({ kind = "success", text, onClose }) => {
  const [closing, setClosing] = useState(false);
  
  // Custom easings from Linh Quang Design Kit
  const easingIn = kind === "success" 
    ? "cubic-bezier(0.22, 1, 0.36, 1)" 
    : "cubic-bezier(0.4, 0, 0.2, 1)";
  const easingOut = "cubic-bezier(0.4, 0, 1, 1)";
  
  useEffect(() => {
    const SHOW_TIME = 4000;
    // Start exit animation before unmounting
    const t1 = setTimeout(() => setClosing(true), Math.max(0, SHOW_TIME - 300));
    // Unmount
    const t2 = setTimeout(() => onClose?.(), SHOW_TIME);
    
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onClose]);

  const colors = {
    success: "border-emerald-500 text-emerald-900 bg-emerald-50/90",
    warn: "border-amber-500 text-amber-900 bg-amber-50/90",
    error: "border-red-500 text-red-900 bg-red-50/90",
    info: "border-stone-400 text-stone-900 bg-white/90"
  };

  const icons = {
    success: <Check size={18} className="text-emerald-600" />,
    warn: <AlertCircle size={18} className="text-amber-600" />,
    error: <AlertCircle size={18} className="text-red-600" />,
    info: <Info size={18} className="text-stone-600" />
  };

  return (
    <>
      <style>{`
        @keyframes snackIn {
          from { opacity: 0; transform: translate(-50%, 20px) scale(0.95); }
          to { opacity: 1; transform: translate(-50%, 0) scale(1); }
        }
        @keyframes snackOut {
          from { opacity: 1; transform: translate(-50%, 0) scale(1); }
          to { opacity: 0; transform: translate(-50%, 10px) scale(0.95); }
        }
      `}</style>
      <div 
        role="status" 
        aria-live="polite"
        className={`fixed left-1/2 bottom-24 z-[100] min-w-[300px] max-w-[90vw]
          rounded-[16px] px-4 py-3 border shadow-xl flex items-center justify-between gap-3 backdrop-blur-md
          ${colors[kind]}
        `}
        style={{
          transform: 'translateX(-50%)',
          animation: `${closing ? 'snackOut' : 'snackIn'} ${closing ? 200 : 350}ms ${closing ? easingOut : easingIn} forwards`
        }}
      >
        <div className="flex items-center gap-3">
          {icons[kind]}
          <span className="text-[14px] font-medium font-sans">{text}</span>
        </div>
        <button onClick={() => setClosing(true)} className="opacity-50 hover:opacity-100 p-1">
          <X size={14} />
        </button>
      </div>
    </>
  );
};
