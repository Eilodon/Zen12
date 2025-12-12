import React, { useEffect, useRef } from 'react';

interface Props {
  analyser: AnalyserNode;
  isListening: boolean;
}

export const WaveformViz: React.FC<Props> = ({ analyser, isListening }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!isListening || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let animationId: number;

    const draw = () => {
      animationId = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const bars = 32;
      const barWidth = canvas.width / bars;
      
      for (let i = 0; i < bars; i++) {
        // Sample roughly evenly across the spectrum
        const index = Math.floor(i * (bufferLength / bars));
        const value = dataArray[index];
        const percent = value / 255;
        const height = percent * canvas.height;
        
        ctx.fillStyle = `rgba(249, 115, 22, ${0.5 + percent * 0.5})`; // orange-500
        const x = i * barWidth;
        const y = (canvas.height - height) / 2;
        
        // Rounded bars
        ctx.beginPath();
        ctx.roundRect(x + 2, y, barWidth - 4, height, 4);
        ctx.fill();
      }
    };

    draw();
    return () => cancelAnimationFrame(animationId);
  }, [analyser, isListening]);

  return <canvas ref={canvasRef} width={300} height={100} className="w-full h-full" />;
};