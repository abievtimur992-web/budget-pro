import React from 'react';

interface TrendData {
  label: string; // e.g. "Авг"
  income: number;
  expense: number;
}

export const TrendBarChart = ({ data }: { data: TrendData[] }) => {
  const maxVal = Math.max(...data.map(d => Math.max(d.income, d.expense)), 1);

  return (
    <div className="w-full h-48 flex items-end justify-between gap-2 pt-4">
      {data.map((item, idx) => {
        const incomeHeight = (item.income / maxVal) * 100;
        const expenseHeight = (item.expense / maxVal) * 100;
        
        return (
          <div key={idx} className="flex flex-col items-center flex-1 group">
            <div className="flex w-full items-end justify-center gap-1 h-32 mb-2 relative">
              {/* Tooltip on hover */}
              <div className="absolute -top-10 bg-gray-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                +{item.income} / -{item.expense}
              </div>
              
              <div 
                className="w-1/2 max-w-[12px] bg-green-500 rounded-t-sm transition-all" 
                style={{ height: `${incomeHeight}%` }} 
              />
              <div 
                className="w-1/2 max-w-[12px] bg-red-500 rounded-t-sm transition-all" 
                style={{ height: `${expenseHeight}%` }} 
              />
            </div>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">{item.label}</span>
          </div>
        );
      })}
    </div>
  );
};




