import React, { useState, useMemo } from 'react';
import { History, TrendingUp, X, Trash2, Fingerprint, Map } from 'lucide-react';
import { ConversationEntry, ConsciousnessArchetype } from '../types';
import { dbService } from '../services/db';

interface Props {
  history: ConversationEntry[];
  onClear: () => void;
}

export const HistoryPanel: React.FC<Props> = ({ history, onClear }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Memoize the heavy analysis logic so it doesn't run on every render
  const analysis = useMemo(() => {
    if (history.length === 0) return null;

    // Use history prop directly
    const displayData = history;

    // Helper for safe access
    const safeMetric = (entry: ConversationEntry, key: 'coherence' | 'presence' | 'entanglement') => {
        return entry.quantum_metrics ? entry.quantum_metrics[key] : 0;
    };

    const avgCoherence = displayData.reduce((sum, e) => sum + safeMetric(e, 'coherence'), 0) / (displayData.length || 1);
    const avgPresence = displayData.reduce((sum, e) => sum + safeMetric(e, 'presence'), 0) / (displayData.length || 1);
    const avgEntanglement = displayData.reduce((sum, e) => sum + safeMetric(e, 'entanglement'), 0) / (displayData.length || 1);
    
    // DETERMINE CONSCIOUSNESS DNA ARCHETYPE
    let archetype: ConsciousnessArchetype = 'The Seeker';
    let description = "Bạn đang trên hành trình tìm kiếm sự bình an.";

    if (avgPresence > 0.7 && avgCoherence > 0.7) {
        archetype = 'The Warrior'; // High discipline
        description = "Bạn có khả năng định tâm vững chãi như núi.";
    } else if (avgEntanglement > 0.7) {
        archetype = 'The Healer'; // High connection
        description = "Trái tim bạn rộng mở và kết nối sâu sắc với vạn vật.";
    } else if (avgCoherence > 0.8) {
        archetype = 'The Observer'; // High coherence
        description = "Bạn nhìn thấu bản chất vấn đề với sự tĩnh lặng.";
    }

    return {
      displayData,
      avgCoherence,
      avgPresence,
      avgEntanglement,
      archetype,
      description
    };
  }, [history]);

  if (!analysis) return null;

  const { displayData, avgCoherence, avgPresence, avgEntanglement, archetype, description } = analysis;

  const emotionColor = {
    anxious: 'border-orange-400 bg-orange-50',
    sad: 'border-blue-400 bg-blue-50',
    joyful: 'border-yellow-400 bg-yellow-50',
    calm: 'border-emerald-400 bg-emerald-50',
    neutral: 'border-stone-300 bg-stone-50'
  };

  const handleClear = async () => {
    if (window.confirm('Xóa toàn bộ lịch sử? (Không thể hoàn tác)')) {
      await dbService.clearAll();
      onClear(); 
      setIsOpen(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2.5 rounded-full bg-white/40 backdrop-blur-md text-stone-600 hover:bg-white/80 transition-colors shadow-sm border border-white/40"
        aria-label="View history"
      >
        {isOpen ? <Map size={18} /> : <History size={18} />}
      </button>

      {isOpen && (
        <div className="absolute top-20 right-4 z-50 w-80 max-h-[70vh] flex flex-col bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-stone-100 animate-[fadeIn_0.3s_ease-out]">
          {/* Header */}
          <div className="bg-gradient-to-r from-stone-800 to-stone-900 text-amber-50 p-4 rounded-t-2xl flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <Fingerprint size={18} className="text-amber-400" />
              <h3 className="font-bold text-sm tracking-wide uppercase">Consciousness DNA</h3>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-white/10 rounded-full p-1 transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* DNA Profile (New Feature) */}
          <div className="bg-stone-50 p-5 border-b border-stone-200">
             <div className="text-center mb-3">
                <span className="text-[10px] uppercase tracking-[0.2em] text-stone-400">Your Archetype</span>
                <h4 className="text-xl font-serif font-bold text-stone-800 mt-1">{archetype}</h4>
                <p className="text-xs text-stone-500 italic mt-1">{description}</p>
             </div>
             
             {/* Mini DNA Bar Chart */}
             <div className="space-y-2 mt-4">
                <DnaBar label="Presence" value={avgPresence} color="bg-emerald-500" />
                <DnaBar label="Connection" value={avgEntanglement} color="bg-purple-500" />
                <DnaBar label="Clarity" value={avgCoherence} color="bg-blue-500" />
             </div>
          </div>

          {/* History list */}
          <div className="overflow-y-auto p-4 space-y-3 flex-1 custom-scrollbar">
            <div className="flex items-center gap-2 mb-2 text-stone-400">
               <TrendingUp size={12} />
               <span className="text-[10px] uppercase font-bold tracking-wider">Journey Log</span>
            </div>
            
            {[...displayData].reverse().map((entry) => {
              const date = new Date(entry.timestamp);
              const isToday = date.toDateString() === new Date().toDateString();
              const timeStr = isToday 
                ? date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) 
                : date.toLocaleDateString('vi-VN', { month: 'numeric', day: 'numeric' });
              
              return (
                <div key={entry.id} className={`border-l-[3px] ${emotionColor[entry.emotion] || emotionColor.neutral} rounded-r-lg p-3 transition-all hover:bg-stone-50`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-stone-600 uppercase tracking-widest">{entry.emotion}</span>
                    <span className="text-[10px] text-stone-400 font-mono">{timeStr}</span>
                  </div>
                  <div className="flex gap-3 text-[10px] font-medium opacity-80">
                    <span className="text-blue-600">C: {Math.round((entry.quantum_metrics?.coherence || 0) * 100)}</span>
                    <span className="text-purple-600">E: {Math.round((entry.quantum_metrics?.entanglement || 0) * 100)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Clear button */}
          <div className="border-t border-stone-100 p-3 bg-stone-50/50 rounded-b-2xl">
            <button
              onClick={handleClear}
              className="w-full py-2 text-xs font-medium text-stone-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 size={14} /> Xóa lịch sử
            </button>
          </div>
        </div>
      )}
    </>
  );
};

const DnaBar = ({ label, value, color }: { label: string, value: number, color: string }) => (
    <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold text-stone-400 w-16 text-right">{label}</span>
        <div className="flex-1 h-1.5 bg-stone-200 rounded-full overflow-hidden">
            <div 
                className={`h-full ${color} rounded-full`} 
                style={{ width: `${value * 100}%` }}
            />
        </div>
    </div>
);