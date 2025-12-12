import React, { useState, useEffect } from 'react';

export const LoadingScreen: React.FC = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 5;
      });
    }, 50);
    return () => clearInterval(interval);
  }, []);

  if (progress >= 100) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-gradient-to-br from-amber-50 to-orange-100 flex flex-col items-center justify-center">
      <div className="text-6xl mb-6 animate-pulse">🪷</div>
      <h1 className="text-3xl font-bold text-orange-600 mb-2">Thầy.AI</h1>
      <p className="text-stone-600 mb-8">Đang kết nối với trí tuệ...</p>
      
      <div className="w-64 h-2 bg-stone-200 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};