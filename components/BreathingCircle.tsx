
import React, { useEffect, useState } from 'react';

interface Props {
  type: '4-7-8' | 'box-breathing' | 'coherent-breathing' | 'none' | null;
  isActive: boolean;
  onComplete?: () => void;
}

export const BreathingCircle: React.FC<Props> = ({ type, isActive, onComplete }) => {
  const [phase, setPhase] = useState<'inhale' | 'hold' | 'exhale' | 'rest'>('inhale');
  const [countdown, setCountdown] = useState(4);
  const [cycleCount, setCycleCount] = useState(0);

  // Normalize type
  const normalizedType = type === 'box-breathing' ? 'box' : type;
  
  const timings = type === '4-7-8' 
    ? { inhale: 4, hold: 7, exhale: 8, rest: 0 }
    : type === 'coherent-breathing'
    ? { inhale: 5, hold: 0, exhale: 5, rest: 0 }
    : { inhale: 4, hold: 4, exhale: 4, rest: 4 }; // Default to box

  useEffect(() => {
    if (!isActive || !type || type === 'none') {
      setPhase('inhale');
      setCycleCount(0);
      setCountdown(4);
      return;
    }

    // Reset for start
    setPhase('inhale');
    setCountdown(timings.inhale);
    setCycleCount(0);
    
    let currentPhase: typeof phase = 'inhale';
    
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          // Move to next phase
          let nextPhase: typeof phase = 'inhale';
          
          if (currentPhase === 'inhale') {
            nextPhase = timings.hold > 0 ? 'hold' : 'exhale';
          } else if (currentPhase === 'hold') {
            nextPhase = 'exhale';
          } else if (currentPhase === 'exhale') {
            nextPhase = (timings.rest > 0) ? 'rest' : 'inhale';
            if (nextPhase === 'inhale') setCycleCount(c => c + 1);
          } else if (currentPhase === 'rest') {
            nextPhase = 'inhale';
            setCycleCount(c => c + 1);
          }
          
          currentPhase = nextPhase;
          setPhase(nextPhase);
          return timings[nextPhase];
        }
        return prev - 1;
      });
    }, 1000);

    // Auto-complete logic (approximate duration + buffer)
    const cycleDuration = (timings.inhale + timings.hold + timings.exhale + timings.rest);
    const totalDuration = cycleDuration * 3 * 1000;
    
    const completeTimer = setTimeout(() => {
      onComplete?.();
    }, totalDuration + 1500);

    return () => {
      clearInterval(interval);
      clearTimeout(completeTimer);
    };
  }, [isActive, type]);

  if (!isActive || !type || type === 'none') return null;

  const getScale = () => {
    switch (phase) {
      case 'inhale': return 2.0;
      case 'hold': return 2.0;
      case 'exhale': return 1.0;
      default: return 1.0;
    }
  };

  // Set transition duration to match phase length for smooth organic movement
  const getTransitionDuration = () => {
    if (phase === 'inhale') return `${timings.inhale}s`;
    if (phase === 'exhale') return `${timings.exhale}s`;
    return '0.5s'; 
  };

  const phaseText = {
    inhale: 'Hít vào / Inhale',
    hold: 'Giữ / Hold',
    exhale: 'Thở ra / Exhale',
    rest: 'Nghỉ / Rest'
  };

  const phaseColor = {
    inhale: 'from-cyan-400 to-blue-500',
    hold: 'from-violet-400 to-purple-600',
    exhale: 'from-emerald-400 to-teal-600',
    rest: 'from-stone-300 to-stone-400'
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center animate-[fadeIn_0.5s_ease-out] touch-none">
      {/* Progress */}
      <div className="absolute top-12 text-white/50 text-sm font-medium tracking-widest uppercase">
        Chu kỳ {Math.min(cycleCount + 1, 3)} / 3
      </div>

      {/* Main Circle */}
      <div 
        className={`rounded-full bg-gradient-to-br ${phaseColor[phase]} shadow-[0_0_60px_rgba(255,255,255,0.15)] flex items-center justify-center transition-all ease-in-out`}
        style={{
          width: '160px',
          height: '160px',
          transform: `scale(${getScale()})`,
          transitionDuration: getTransitionDuration()
        }}
      >
        <span className="text-white font-bold text-6xl tabular-nums drop-shadow-md">
          {countdown}
        </span>
      </div>

      {/* Instruction */}
      <p className="mt-16 text-white text-2xl font-light tracking-widest animate-pulse">
        {phaseText[phase]}
      </p>

      {/* Controls */}
      <button
        onClick={onComplete}
        className="absolute bottom-16 px-8 py-3 bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-sm text-white rounded-full text-sm font-medium transition-all active:scale-95 touch-manipulation"
      >
        Bỏ qua / Skip
      </button>
    </div>
  );
};
