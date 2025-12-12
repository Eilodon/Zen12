import React, { useEffect, useState, useRef } from 'react';
import { AlertCircle, Phone, HeartHandshake } from 'lucide-react';
import { playEmergencyAlert } from './AudioEngine';

interface Props {
  isActive: boolean;
  onComplete: () => void;
}

export const EmergencyProtocol: React.FC<Props> = ({ isActive, onComplete }) => {
  const [phase, setPhase] = useState<'alert' | 'breathing' | 'resources'>('alert');
  const [breathCount, setBreathCount] = useState(4);
  const [instruction, setInstruction] = useState('HÍT VÀO');
  
  // Timer refs to prevent memory leaks
  const alertTimerRef = useRef<number | null>(null);
  const resourceTimerRef = useRef<number | null>(null);
  const breathingIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isActive) {
      // Reset state when closed
      setPhase('alert');
      return;
    }

    if (phase === 'alert') {
      playEmergencyAlert();
      alertTimerRef.current = window.setTimeout(() => setPhase('breathing'), 3000);
    }

    if (phase === 'breathing') {
      // 4-7-8 Breathing Logic (Simplified for crisis: 4-4-4 to stabilize hyperventilation)
      // Cycle: Inhale (4) -> Hold (4) -> Exhale (4)
      let counter = 4;
      let cycleState = 'in'; // in, hold, out
      
      const runBreathing = () => {
        if (counter <= 1) {
          if (cycleState === 'in') {
            cycleState = 'hold';
            counter = 4;
            setInstruction('GIỮ / HOLD');
          } else if (cycleState === 'hold') {
            cycleState = 'out';
            counter = 4; // Shorter exhale for panic stabilization
            setInstruction('THỞ RA / EXHALE');
          } else {
            cycleState = 'in';
            counter = 4;
            setInstruction('HÍT VÀO / INHALE');
          }
        } else {
          counter--;
        }
        setBreathCount(counter);
      };

      breathingIntervalRef.current = window.setInterval(runBreathing, 1000);
      
      // Auto-transition to resources after 45 seconds
      resourceTimerRef.current = window.setTimeout(() => setPhase('resources'), 45000);
    }

    return () => {
      if (alertTimerRef.current !== null) clearTimeout(alertTimerRef.current);
      if (resourceTimerRef.current !== null) clearTimeout(resourceTimerRef.current);
      if (breathingIntervalRef.current !== null) clearInterval(breathingIntervalRef.current);
    };
  }, [isActive, phase]);

  if (!isActive) return null;

  if (phase === 'alert') {
    return (
      <div className="fixed inset-0 z-[60] bg-red-900/95 backdrop-blur-md flex flex-col items-center justify-center text-white p-8 animate-[fadeIn_0.3s]">
        <div className="bg-red-800 p-6 rounded-full mb-6 animate-pulse shadow-[0_0_50px_rgba(239,68,68,0.5)]">
          <AlertCircle className="w-20 h-20 text-white" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mb-4 text-center tracking-tight">
          BẠN KHÔNG MỘT MÌNH
        </h1>
        <p className="text-lg md:text-xl text-center max-w-md leading-relaxed text-red-100">
          Cảm xúc này sẽ qua. Hãy thở cùng Thầy...
        </p>
      </div>
    );
  }

  if (phase === 'breathing') {
    return (
      <div className="fixed inset-0 z-[60] bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 flex flex-col items-center justify-center text-white p-8 transition-colors duration-1000">
        <div className="relative">
          {/* Breathing Circle Visualization */}
          <div className={`w-64 h-64 rounded-full border-4 flex items-center justify-center transition-all duration-1000 ${
            instruction.includes('HÍT') ? 'border-cyan-400 scale-110 bg-cyan-500/10' :
            instruction.includes('GIỮ') ? 'border-violet-400 scale-110 bg-violet-500/10' :
            'border-emerald-400 scale-100 bg-emerald-500/10'
          }`}>
            <span className="text-8xl font-bold tabular-nums drop-shadow-lg">
              {breathCount}
            </span>
          </div>
        </div>

        <p className="text-3xl font-bold mt-12 mb-4 animate-pulse tracking-widest text-center">
          {instruction}
        </p>
        
        <p className="text-sm text-white/50 mt-8 max-w-xs text-center">
          Tập trung vào lồng ngực. Bạn đang an toàn.
        </p>

        <button
          onClick={() => setPhase('resources')}
          className="absolute bottom-8 px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full text-white font-medium transition-colors"
        >
          Tôi đã đỡ hơn / I feel better
        </button>
      </div>
    );
  }

  // Resources Phase
  return (
    <div className="fixed inset-0 z-[60] bg-gradient-to-br from-emerald-900 to-teal-950 flex flex-col items-center justify-center text-white p-8 animate-[fadeIn_0.5s]">
      <HeartHandshake className="w-16 h-16 mb-6 text-emerald-300" />
      <h2 className="text-2xl md:text-3xl font-bold mb-6 text-center">BẠN ĐÃ LÀM RẤT TỐT</h2>
      
      <p className="text-base mb-8 text-center max-w-md leading-relaxed text-emerald-100">
        Cơn bão cảm xúc đang đi qua. Nếu bạn vẫn cảm thấy bế tắc, hãy chia sẻ với chuyên gia:
      </p>

      <div className="bg-white/10 rounded-2xl p-6 mb-6 backdrop-blur-sm w-full max-w-sm border border-emerald-500/30">
        <div className="flex items-center gap-4 mb-2">
          <div className="bg-emerald-500/20 p-2 rounded-full">
            <Phone className="w-6 h-6 text-emerald-300" />
          </div>
          <div>
            <span className="font-bold text-lg block">Tổng đài tâm lý 24/7</span>
            <span className="text-xs text-emerald-200">Hỗ trợ khủng hoảng (VN)</span>
          </div>
        </div>
        <a href="tel:19009095" className="block text-3xl font-bold text-white text-center py-2 hover:scale-105 transition-transform">
          1900 9095
        </a>
      </div>

      <button
        onClick={onComplete}
        className="w-full max-w-xs px-8 py-4 bg-white text-emerald-900 rounded-full font-bold text-lg hover:bg-emerald-50 transition-colors shadow-lg shadow-emerald-900/50"
      >
        Quay lại với Thầy
      </button>
    </div>
  );
};