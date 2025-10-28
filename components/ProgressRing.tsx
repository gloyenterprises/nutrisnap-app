import React, { useEffect, useState } from 'react';

interface ProgressRingProps {
  label: string;
  value: number;
  goal: number;
  unit?: string;
  color?: string;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  label,
  value,
  goal,
  unit = '',
  color = 'text-teal-500',
}) => {
  const [offset, setOffset] = useState(0);
  const size = 100;
  const strokeWidth = 10;
  const center = size / 2;
  const radius = center - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    const progress = Math.min(value / goal, 1);
    const newOffset = circumference * (1 - progress);
    // Set a timeout to allow the animation to be visible
    const timer = setTimeout(() => setOffset(newOffset), 100);
    return () => clearTimeout(timer);
  }, [value, goal, circumference]);
  
  const formattedValue = Math.round(value);

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative w-24 h-24">
        <svg className="w-full h-full" viewBox={`0 0 ${size} ${size}`}>
          <circle
            className="text-gray-200"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            r={radius}
            cx={center}
            cy={center}
          />
          <circle
            className={`${color} transition-all duration-700 ease-out`}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            fill="transparent"
            r={radius}
            cx={center}
            cy={center}
            transform={`rotate(-90 ${center} ${center})`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
           <span className="text-xl font-bold text-gray-700">{formattedValue}{unit}</span>
           {unit && <span className="text-xs text-gray-400">/{Math.round(goal)}{unit}</span>}
        </div>
      </div>
      <p className="mt-2 text-sm font-semibold text-gray-600">{label}</p>
      {!unit && <p className="text-xs text-gray-400">of {goal} goal</p>}
    </div>
  );
};
