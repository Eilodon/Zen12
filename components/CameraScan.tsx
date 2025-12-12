
import React, { useState, useRef } from 'react';
import { Camera, X, Check, Loader2, ScanEye } from 'lucide-react';
import { analyzeEnvironment } from '../services/geminiService';
import { CulturalMode } from '../types';

interface Props {
  onModeChange: (mode: CulturalMode, items: string[]) => void;
  currentMode: CulturalMode;
}

export const CameraScan: React.FC<Props> = ({ onModeChange, currentMode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setStream(s);
      setIsOpen(true);
    } catch (e) {
      alert("Camera denied. Using Universal mode.");
    }
  };

  const closeCamera = () => {
    stream?.getTracks().forEach(t => t.stop());
    setStream(null);
    setIsOpen(false);
  };

  const captureAndAnalyze = async () => {
    if (!videoRef.current) return;
    
    // SECURITY CHECK: Ensure API Key is selected before processing
    try {
      const hasKey = await (window as any).aistudio.hasSelectedApiKey();
      if (!hasKey) {
        await (window as any).aistudio.openSelectKey();
        const keyConfirmed = await (window as any).aistudio.hasSelectedApiKey();
        if (!keyConfirmed) {
          alert("Cần có API Key để phân tích hình ảnh.");
          return;
        }
      }
    } catch (e) {
      console.error("Key selection error", e);
      return;
    }

    setIsScanning(true);
    
    // Dynamic Dimension Calculation
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    
    // Limit max dimension to 800px to keep payload light, but preserve aspect ratio
    const MAX_DIMENSION = 800;
    let w = video.videoWidth;
    let h = video.videoHeight;
    
    if (w > h) {
       if (w > MAX_DIMENSION) {
          h = Math.round(h * (MAX_DIMENSION / w));
          w = MAX_DIMENSION;
       }
    } else {
       if (h > MAX_DIMENSION) {
          w = Math.round(w * (MAX_DIMENSION / h));
          h = MAX_DIMENSION;
       }
    }

    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
        ctx.drawImage(video, 0, 0, w, h);
        const base64 = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];
        
        try {
            // Pass the key explicitly (injected at runtime)
            const apiKey = process.env.API_KEY as string;
            const result = await analyzeEnvironment(apiKey, base64);
            onModeChange(result.mode, result.detected_items);
            closeCamera();
        } catch (e) {
            console.error(e);
            alert("Vision failed. Try again.");
        } finally {
            setIsScanning(false);
        }
    } else {
        setIsScanning(false);
    }
  };

  return (
    <>
      <div className="flex items-start gap-2">
        <button 
          onClick={() => !isOpen && startCamera()}
          className={`p-3 rounded-full shadow-lg transition-all hover:scale-105 active:scale-95 ${
            currentMode === 'VN' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-white/80 backdrop-blur text-stone-700 border-stone-200'
          } border`}
          aria-label="Scan Environment"
          title="Quét không gian để chọn Mode"
        >
          <Camera size={20} />
        </button>
        <span className={`text-[10px] font-bold px-2 py-1 rounded-full mt-1.5 shadow-sm transition-colors ${
           currentMode === 'VN' ? 'bg-amber-500 text-white' : 'bg-stone-500 text-white'
        }`}>
          {currentMode}
        </span>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-stone-900 rounded-2xl overflow-hidden border border-stone-700 shadow-2xl">
            {!isScanning ? (
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                onLoadedMetadata={() => videoRef.current?.play()}
                className="w-full h-64 object-cover" 
              />
            ) : (
              <div className="w-full h-64 flex items-center justify-center bg-stone-800">
                <ScanEye className="animate-pulse text-amber-500 w-16 h-16" />
              </div>
            )}
            
            <div className="p-4 flex flex-col gap-3">
              <p className="text-stone-300 text-sm text-center">
                Ảnh được gửi ẩn danh để AI phân tích bối cảnh và bị xóa ngay lập tức.
              </p>
              <div className="flex gap-4 justify-center">
                <button 
                  onClick={closeCamera}
                  disabled={isScanning}
                  className="px-4 py-2 rounded-full bg-stone-700 text-white flex items-center gap-2 hover:bg-stone-600 transition-colors"
                >
                  <X size={16} /> Hủy
                </button>
                <button 
                  onClick={captureAndAnalyze}
                  disabled={isScanning}
                  className="px-6 py-2 rounded-full bg-orange-600 text-white flex items-center gap-2 font-bold hover:bg-orange-700 transition-colors shadow-lg"
                >
                  {isScanning ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  Quét
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
