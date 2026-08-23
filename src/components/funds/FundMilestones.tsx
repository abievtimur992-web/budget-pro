import React from 'react';
import { Trophy, Star, Target, Crown } from 'lucide-react';

export const FundMilestones = ({ current, target }: { current: number, target: number }) => {
  const percentage = Math.min((current / target) * 100, 100);
  
  const milestones = [
    { percent: 25, icon: Star, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30' },
    { percent: 50, icon: Target, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { percent: 75, icon: Trophy, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30' },
    { percent: 100, icon: Crown, color: 'text-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
  ];

  return (
    <div className="mt-4 border-t dark:border-gray-700 pt-4">
      <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Жетискенликлер</h4>
      <div className="flex justify-between relative px-2">
        {/* Background line */}
        <div className="absolute top-1/2 left-4 right-4 h-1 bg-gray-200 dark:bg-gray-700 -translate-y-1/2 z-0" />
        {/* Progress line */}
        <div 
          className="absolute top-1/2 left-4 h-1 bg-primary-500 -translate-y-1/2 z-0 transition-all duration-1000 ease-out" 
          style={{ width: `calc(${percentage}% - 32px)` }} 
        />
        
        {milestones.map((m, idx) => {
          const isReached = percentage >= m.percent;
          const Icon = m.icon;
          return (
            <div key={idx} className="relative z-10 flex flex-col items-center group">
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 ${
                  isReached ? `${m.bg} ${m.color} ring-4 ring-white dark:ring-gray-800 scale-110 shadow-lg` : 'bg-gray-100 dark:bg-gray-700 text-gray-400 ring-4 ring-white dark:ring-gray-800'
                }`}
              >
                <Icon size={14} className={isReached ? 'animate-bounce-short' : ''} />
              </div>
              
              {/* Tooltip */}
              <div className="absolute -bottom-8 bg-gray-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                {m.percent}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};



