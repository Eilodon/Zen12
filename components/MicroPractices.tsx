
import React from 'react';
import { Coffee, Car, Footprints, Briefcase, Moon, Utensils } from 'lucide-react';
import { haptic } from '../utils/designSystem';
import { Language } from '../types';

interface Props {
  onSelect: (context: string) => void;
  disabled: boolean;
  lang: Language;
}

const PRACTICES = [
  { 
    id: 'coffee', 
    icon: <Coffee size={16} />, 
    vi: { label: 'Uống trà', prompt: 'Con đang uống trà. Xin Thầy dạy con nhìn thấy cả vũ trụ trong chén trà này.' },
    en: { label: 'Morning Tea', prompt: 'I am drinking tea. Teach me to see the universe in this cup.' }
  },
  { 
    id: 'traffic', 
    icon: <Car size={16} />, 
    vi: { label: 'Kẹt xe', prompt: 'Con đang kẹt xe và thấy bực bội. Xin giúp con biến tiếng còi xe thành tiếng chuông chánh niệm.' },
    en: { label: 'In Traffic', prompt: 'I am stuck in traffic and feeling frustrated. Transform this into a bell of mindfulness.' }
  },
  { 
    id: 'walking', 
    icon: <Footprints size={16} />, 
    vi: { label: 'Thiền hành', prompt: 'Con đang bước đi. Xin hướng dẫn con hôn mặt đất bằng bàn chân mình.' },
    en: { label: 'Walking', prompt: 'I am walking. Guide me to kiss the earth with my feet.' }
  },
  { 
    id: 'stress', 
    icon: <Briefcase size={16} />, 
    vi: { label: 'Áp lực', prompt: 'Công việc làm con căng thẳng quá. Xin giúp con trở về nương tựa nơi hơi thở.' },
    en: { label: 'Work Stress', prompt: 'I am overwhelmed at work. Help me return to the present moment.' }
  },
  { 
    id: 'eating', 
    icon: <Utensils size={16} />, 
    vi: { label: 'Ăn cơm', prompt: 'Con đang ăn. Xin giúp con ăn trong chánh niệm và biết ơn muôn loài.' },
    en: { label: 'Mindful Eating', prompt: 'I am eating. Help me eat with gratitude for all beings who made this food.' }
  },
  { 
    id: 'sleep', 
    icon: <Moon size={16} />, 
    vi: { label: 'Mất ngủ', prompt: 'Con trằn trọc không ngủ được. Xin ru con vào đại dương bình an.' },
    en: { label: 'Sleep', prompt: 'I cannot sleep. Guide me to rest in the ocean of consciousness.' }
  },
];

export const MicroPractices: React.FC<Props> = ({ onSelect, disabled, lang }) => {
  return (
    <div className="w-full overflow-x-auto no-scrollbar py-2">
      <div className="flex gap-3 px-4 min-w-max">
        {PRACTICES.map((p) => {
          const content = p[lang];
          return (
            <button
              key={p.id}
              disabled={disabled}
              onClick={() => {
                haptic('selection');
                onSelect(content.prompt);
              }}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-300
                ${disabled 
                  ? 'opacity-50 cursor-not-allowed bg-stone-100 border-stone-200 text-stone-400' 
                  : 'bg-white/80 border-stone-200 text-stone-600 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-700 shadow-sm active:scale-95'}
              `}
            >
              {p.icon}
              <span className="text-xs font-medium whitespace-nowrap">{content.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
