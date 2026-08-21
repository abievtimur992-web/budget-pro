import React from 'react';

interface DataItem {
  label: string;
  value: number;
  color: string;
}

export const ExpenseDonutChart = ({ data }: { data: DataItem[] }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-48 bg-gray-50 dark:bg-gray-800 rounded-xl">
        <p className="text-gray-400 dark:text-gray-500 text-sm">Мағлыўмат жоқ</p>
      </div>
    );
  }

  let currentAngle = 0;

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 100 100" className="w-48 h-48 transform -rotate-90">
        {data.map((item, index) => {
          if (item.value === 0) return null;
          const percentage = item.value / total;
          const angle = percentage * 360;
          
          // SVG Circle Math for paths
          const x1 = 50 + 40 * Math.cos((Math.PI * currentAngle) / 180);
          const y1 = 50 + 40 * Math.sin((Math.PI * currentAngle) / 180);
          
          currentAngle += angle;
          
          const x2 = 50 + 40 * Math.cos((Math.PI * currentAngle) / 180);
          const y2 = 50 + 40 * Math.sin((Math.PI * currentAngle) / 180);
          
          const largeArcFlag = percentage > 0.5 ? 1 : 0;
          
          const d = [
            `M 50 50`,
            `L ${x1} ${y1}`,
            `A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2}`,
            'Z'
          ].join(' ');

          // If there's only one item and it's 100%, render a circle instead to avoid path math glitches
          if (percentage === 1) {
             return <circle key={index} cx="50" cy="50" r="40" fill={item.color} />;
          }

          return (
            <path
              key={index}
              d={d}
              fill={item.color}
              className="hover:opacity-80 transition-opacity cursor-pointer"
            >
              <title>{item.label}: {item.value}</title>
            </path>
          );
        })}
        {/* Inner circle to make it a donut */}
        <circle cx="50" cy="50" r="25" className="fill-white dark:fill-gray-800" />
      </svg>
      
      {/* Legend */}
      <div className="mt-4 w-full grid grid-cols-2 gap-2">
        {data.filter(d => d.value > 0).map((item, index) => (
          <div key={index} className="flex items-center text-xs text-gray-600 dark:text-gray-300">
            <span className="w-3 h-3 rounded-full mr-2 shrink-0" style={{ backgroundColor: item.color }} />
            <span className="truncate">{item.label}</span>
            <span className="ml-auto font-medium">{Math.round((item.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};
