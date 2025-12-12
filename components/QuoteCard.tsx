
import React, { useEffect, useState } from 'react';
import { ZenResponse } from '../types';
import { MessageSquareQuote, RefreshCw } from 'lucide-react';

interface Props {
  data: ZenResponse;
}

export const QuoteCard: React.FC<Props> = ({ data }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [showTranscript, setShowTranscript] = useState(false);

  useEffect(() => {
    let i = 0;
    setDisplayedText('');
    const timer = setInterval(() => {
      setDisplayedText(data.wisdom_text.slice(0, i));
      i++;
      if (i > data.wisdom_text.length) clearInterval(timer);
    }, 30); // Faster for smoother reading
    return () => clearInterval(timer);
  }, [data]);

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-xl shadow-orange-900/5 border border-white/60 p-6 md:p-8 w-full animate-[fadeIn_400ms_ease-out] relative overflow-hidden transition-all duration-300 group">
      
      {/* Decorative Blur blob */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-orange-200/30 rounded-full blur-3xl pointer-events-none group-hover:bg-orange-300/30 transition-colors duration-1000"></div>

      {/* Header Tags */}
      <div className="flex items-center justify-between mb-6 relative z-10">
        <div className="flex gap-2 flex-wrap">
          <span className="px-3 py-1 bg-orange-50 text-orange-700 border border-orange-100 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-sm">
            {data.emotion}
          </span>
          {data.breathing && data.breathing !== 'none' && (
            <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-sm flex items-center gap-1">
               <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
               Breath {data.breathing}
            </span>
          )}
        </div>
        
        <button 
          onClick={() => setShowTranscript(!showTranscript)}
          className={`p-2 rounded-full transition-all duration-300 ${showTranscript ? 'bg-stone-100 text-stone-800 rotate-180' : 'text-stone-400 hover:text-stone-600 hover:bg-stone-50'}`}
          title="Xem lại lời bạn nói"
        >
          <MessageSquareQuote size={18} />
        </button>
      </div>
      
      {/* Transcript (Collapsible) */}
      <div className={`overflow-hidden transition-all duration-500 ease-in-out ${showTranscript ? 'max-h-32 mb-6 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="p-4 bg-stone-50/80 rounded-2xl border border-stone-100">
          <p className="text-[10px] text-stone-400 font-bold uppercase mb-1 tracking-wider">Bạn đã chia sẻ:</p>
          <p className="text-sm text-stone-600 italic leading-relaxed font-serif">"{data.user_transcript}"</p>
        </div>
      </div>

      {/* Main Wisdom Text */}
      <div className="relative min-h-[100px] z-10">
        {/* Quote Icon Background */}
        <span className="absolute -top-4 -left-2 text-6xl text-orange-500/10 font-serif leading-none select-none">“</span>
        
        <p className="font-serif text-xl md:text-2xl leading-relaxed text-stone-800 tracking-wide">
          {displayedText}
          <span className="inline-block w-1.5 h-5 ml-1 align-middle bg-orange-400 animate-pulse"></span>
        </p>

        {/* English Translation (Subtle) */}
        {data.wisdom_english && (
            <p className="mt-4 text-sm text-stone-400 font-light italic leading-relaxed border-t border-stone-100 pt-3">
                {data.wisdom_english}
            </p>
        )}
      </div>
      
      {/* Footer */}
      <div className="mt-6 flex justify-end items-center gap-3 opacity-60">
        <div className="h-px w-12 bg-gradient-to-r from-transparent to-stone-400"></div>
        <p className="text-stone-500 text-xs font-medium tracking-widest uppercase">
          Thích Nhất Hạnh Inspired
        </p>
      </div>
    </div>
  );
};
