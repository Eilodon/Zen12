import React from 'react';
import { Brain, Zap, Activity, Waves } from 'lucide-react';
import { ZenResponse } from '../types';

interface Props {
  data: ZenResponse;
}

export const ReasoningPanel: React.FC<Props> = ({ data }) => {
  // If no reasoning provided, render nothing
  if (!data.reasoning_steps || data.reasoning_steps.length === 0) return null;

  const dims = data.consciousness_dimensions || { 
     contextual: 0.5, emotional: 0.5, cultural: 0.5, wisdom: 0.5, uncertainty: 0.5, relational: 0.5 
  };

  return (
    <div className="w-full">
      {/* Header Viz */}
      <div className="flex items-center gap-2 mb-4 text-stone-700">
        <Waves size={16} className="text-orange-500" />
        <span className="font-semibold text-sm font-sans uppercase tracking-wider">Quantum Field Dimensions</span>
      </div>

      {/* Dimensions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
        {Object.entries(dims).map(([key, value], idx) => (
          <div key={key} className="bg-stone-50 p-3 rounded-xl border border-stone-100 flex flex-col gap-1.5">
             <div className="flex justify-between items-center text-[10px] uppercase font-bold text-stone-500 tracking-wider">
                <span>{key}</span>
                <span>{Math.round((value as number) * 100)}%</span>
             </div>
             <div className="h-2 w-full bg-stone-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-orange-400 to-red-500 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${(value as number) * 100}%` }}
                />
             </div>
          </div>
        ))}
      </div>

      {/* Reasoning Steps */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4 text-stone-700">
            <Brain size={16} className="text-stone-400" />
            <span className="font-semibold text-sm font-sans uppercase tracking-wider">Reasoning Path</span>
        </div>
        <div className="relative pl-6 border-l-2 border-stone-200 space-y-5">
            {data.reasoning_steps.map((step, idx) => (
            <div 
                key={idx} 
                className="relative"
            >
                <div className="absolute -left-[31px] top-1.5 w-3 h-3 rounded-full bg-stone-300 border-2 border-white shadow-sm z-10" />
                <p className="text-sm text-stone-600 font-sans leading-relaxed bg-stone-50/50 p-3 rounded-lg border border-stone-100">
                {step}
                </p>
            </div>
            ))}
        </div>
      </div>

      {/* Quantum Metrics (Orb Inputs) */}
      {data.quantum_metrics && (
        <div className="pt-6 border-t border-stone-200">
            <div className="flex items-center gap-2 mb-4 text-stone-700">
                <Activity size={16} className="text-stone-400" />
                <span className="font-semibold text-sm font-sans uppercase tracking-wider">Coherence Metrics</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
               <MetricItem 
                 icon={<Activity size={18} />} 
                 label="Coherence" 
                 value={data.quantum_metrics.coherence} 
                 color="text-blue-500"
                 delay={0}
               />
               <MetricItem 
                 icon={<Zap size={18} />} 
                 label="Entanglement" 
                 value={data.quantum_metrics.entanglement} 
                 color="text-purple-500"
                 delay={100}
               />
               <MetricItem 
                 icon={<Brain size={18} />} 
                 label="Presence" 
                 value={data.quantum_metrics.presence} 
                 color="text-emerald-500"
                 delay={200}
               />
            </div>
        </div>
      )}
    </div>
  );
};

const MetricItem = ({ icon, label, value, color, delay }: any) => (
  <div 
    className="flex flex-col items-center bg-stone-50 p-4 rounded-2xl border border-stone-100 animate-[scaleIn_0.5s_ease-out_forwards]"
    style={{ opacity: 0, animationDelay: `${delay}ms` }}
  >
    <div className={`mb-2 ${color}`}>{icon}</div>
    <div className="relative w-12 h-12 flex items-center justify-center mb-1">
      <svg className="absolute inset-0 w-full h-full -rotate-90">
        <circle cx="24" cy="24" r="18" stroke="currentColor" strokeWidth="3" className="text-stone-200 fill-none" />
        <circle 
          cx="24" cy="24" r="18" 
          stroke="currentColor" 
          strokeWidth="3" 
          className={`${color} fill-none transition-all duration-1000`}
          strokeDasharray="113"
          strokeDashoffset={113 - (value * 113)}
          strokeLinecap="round"
        />
      </svg>
      <span className="text-[10px] font-bold text-stone-600">{Math.round(value * 100)}</span>
    </div>
    <span className="text-[10px] uppercase tracking-wider text-stone-500 text-center">{label}</span>
  </div>
);
