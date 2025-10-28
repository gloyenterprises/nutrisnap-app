
import React from 'react';

interface SpinnerProps {
  borderColor?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ borderColor = 'border-white' }) => {
  return (
    <div className={`animate-spin rounded-full h-5 w-5 border-b-2 ${borderColor}`}></div>
  );
};