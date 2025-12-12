import React from 'react';
import { ZenResponse } from '../types';
import { MessageSquareQuote, Share2, Sparkles, Wind, Brain } from 'lucide-react';
import { useStreamingText, TOKENS, haptic } from '../utils/designSystem';
import { SecurityCue, FeedbackRow } from './PandoraParts';

interface Props {
  data: ZenResponse;
  isGenerating?: boolean;
}

const STAGE_CONFIG = {
  reflexive: { color: 'bg-red-100 text-red-800 border-red-200', label: 'Reflexive' },
  aware: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Aware' },
  mindful: { color: 'bg-emerald-100 text-emerald-800 border-emerald-200', label: 'Mindful' },
  contemplative: { color: 'bg-purple-100 text-purple-800 border-purple-200', label: 'Contemplative' }
};

export const ZenCard: React.FC<Props> = ({ data, isGenerating = false }) => {
  const { stream, isDone } = useStreamingText(data.wisdom_text, isGenerating);
  
  const caret = (
    <span className="inline-block w-2 h-5 ml-0.5 align-middle bg-orange-500 animate-pulse rounded-full" aria-hidden="true" />
  );
  
  const stage = STAGE_CONFIG[data.awareness_stage || 'reflexive'];

  return (
    <div 
      className="relative w-full overflow-hidden transition-all duration-500 group rounded-[32px] md:rounded-[40px]"
      style={{
        background: 'rgba(255, 255, 255, 0.85)',
        boxShadow: TOKENS.elevation.card,
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.6)'
      }}
    >
      {/* Top Bar: Emotion & Status */}
      <div className="flex flex-wrap items-center justify-between p-5 pb-2 border-b border-stone-100/50 gap-2 relative z-10">
        <div className="flex flex-wrap items-center gap-2">
           <SecurityCue mode="cloud" />
           
           <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1
            ${data.emotion === 'anxious' ? 'bg-orange-100 text-orange-700' : 
              data.emotion === 'sad' ? 'bg-blue-100 text-blue-700' : 
              'bg-stone-100 text-stone-600'}`}>
            {data.emotion}
          </span>
          
          {data.breathing && data.breathing !== 'none' && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cyan-50 text-cyan-700 border border-cyan-100 flex items-center gap-1">
              <Wind size={8} className="animate-spin-slow" />
              Breath
            </span>
          )}
        </div>
        
        <button 
          onClick={() => haptic('selection')}
          className="text-stone-300 hover:text-orange-600 transition-colors"
          title="Share"
        >
          <Share2 size={16} />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="p-6 md:p-8 relative z-10">
        <div className="relative min-h-[100px]">
           <MessageSquareQuote className="absolute -top-3 -left-3 text-orange-500/5 w-20 h-20 pointer-events-none" />
           
           <div 
             className="relative text-[18px] md:text-[22px] leading-relaxed text-stone-800 font-serif font-medium"
           >
             {stream}
             {!isDone && caret}
           </div>

           {/* English Translation */}
           {isDone && data.wisdom_english && (
             <div className="mt-6 animate-[fadeIn_0.8s_ease-out]">
                <p className="text-[14px] text-stone-500 italic font-sans font-light leading-relaxed">
                  "{data.wisdom_english}"
                </p>
             </div>
           )}
        </div>

        {/* Feedback Row (Only when done) */}
        {isDone && <FeedbackRow />}
      </div>

      {/* User Transcript */}
      <div className="bg-stone-50/60 p-4 border-t border-stone-100/50">
         <div className="flex items-start gap-3 opacity-70">
            <div className="w-5 h-5 rounded-full bg-stone-200 flex items-center justify-center mt-0.5 shrink-0 text-[8px] font-bold text-stone-500">
               YOU
            </div>
            <p className="text-xs text-stone-500 leading-relaxed line-clamp-2 italic">
               "{data.user_transcript}"
            </p>
         </div>
      </div>
      
      {/* Shimmer Overlay */}
      {isGenerating && (
         <div className="absolute inset-0 pointer-events-none z-0">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
         </div>
      )}
      
      <style>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};
