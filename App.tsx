import * as React from 'react';
import { useState, useRef, useEffect, Suspense } from 'react';
import { VoiceButton } from './components/VoiceButton';
import { ZenCard } from './components/ZenCard';
import { Snackbar } from './components/Snackbar'; 
import { CameraScan } from './components/CameraScan';
import { ReasoningPanel } from './components/ReasoningPanel';
import { BottomSheet } from './components/PandoraParts';
// Lazy load heavy audio engine
const AudioEngine = React.lazy(() => import('./components/AudioEngine'));
import { BreathingCircle } from './components/BreathingCircle';
import { EmergencyProtocol } from './components/EmergencyProtocol';
import { HistoryPanel } from './components/HistoryPanel';
import { LoadingScreen } from './components/LoadingScreen';
import { MicroPractices } from './components/MicroPractices';
import { ConversationEntry, ZenResponse } from './types';
import { detectEmergency } from './data/emergencyKeywords';
import { Keyboard, Mic, Languages, SendHorizontal, Brain, Sparkles, Wifi, WifiOff } from 'lucide-react';
import { haptic, TOKENS } from './utils/designSystem'; 
import { dbService } from './services/db'; 
import { useZenSession } from './hooks/useZenSession';
import { useUIStore, useZenStore } from './store/zenStore';

const OrbViz = React.lazy(() => import('./components/OrbViz'));

export default function App() {
  // --- Global State ---
  const { 
    culturalMode, language, inputMode, snackbar, isLoading, showBreathing, emergencyActive,
    setCulturalMode, setLanguage, setInputMode, setSnackbar, setIsLoading, setShowBreathing, setEmergencyActive 
  } = useUIStore();

  const { status, connectionState, zenData, history, setHistory, addToHistory, setZenData } = useZenStore();

  // --- Local UI State ---
  const [inputText, setInputText] = useState('');
  const [isReasoningOpen, setIsReasoningOpen] = useState(false);
  const [showPractices, setShowPractices] = useState(false);
  
  // Audio Viz State
  const [frequencyData, setFrequencyData] = useState<Uint8Array>(new Uint8Array(64));
  const animationFrameRef = useRef<number | null>(null);

  // --- Session Hook ---
  const { 
    connect, 
    disconnect, 
    sendText, 
    analyserRef 
  } = useZenSession({
    onEmergencyDetected: () => setEmergencyActive(true),
    onError: (msg, kind) => {
       haptic('light');
       setSnackbar({ text: msg, kind });
    }
  });

  // --- Effects ---
  useEffect(() => {
    dbService.getAllEntries().then(entries => {
      setHistory(entries);
      setIsLoading(false);
    }).catch(e => {
       console.error("DB Load failed", e);
       setIsLoading(false);
    });
  }, [setHistory, setIsLoading]);

  useEffect(() => {
    if (zenData && zenData.emotion && zenData.quantum_metrics && zenData.reasoning_steps) {
        if (zenData.reasoning_steps[0] === 'Offline Mode') return;
        const newEntry: ConversationEntry = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            emotion: zenData.emotion!,
            quantum_metrics: zenData.quantum_metrics!,
            stage: zenData.awareness_stage,
            consciousness_dimensions: zenData.consciousness_dimensions
        };
        const last = history[history.length - 1];
        if (!last || Date.now() - last.timestamp > 5000) {
           dbService.saveEntry(newEntry);
           addToHistory(newEntry);
        }
    }
    if (zenData?.breathing && zenData.breathing !== 'none') {
        setShowBreathing(true);
    }
  }, [zenData, history, addToHistory, setShowBreathing]);

  // Visualizer Loop
  useEffect(() => {
    const updateViz = () => {
      if (!analyserRef.current && status === 'processing' && inputMode === 'text') {
         const data = new Uint8Array(64).map(() => Math.random() * 50 + 50);
         setFrequencyData(data);
         animationFrameRef.current = requestAnimationFrame(updateViz);
         return;
      }
      if (!analyserRef.current) return;
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);
      if (Date.now() % 33 < 16) { 
        setFrequencyData(dataArray.slice(0, 64));
      }
      animationFrameRef.current = requestAnimationFrame(updateViz);
    };

    if (status !== 'idle') {
      if (!animationFrameRef.current) updateViz();
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
        setFrequencyData(new Uint8Array(64));
      }
    }
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [status, inputMode, analyserRef]); 

  // --- Handlers ---
  const toggleConnection = () => {
      if (status === 'idle') connect();
      else disconnect();
  };

  const toggleLanguage = () => {
    const newLang = language === 'vi' ? 'en' : 'vi';
    setLanguage(newLang);
    setSnackbar({ text: newLang === 'vi' ? "Ngôn ngữ: Tiếng Việt" : "Language: English", kind: "success" });
    if (status !== 'idle') {
        disconnect();
        setTimeout(() => connect(), 500);
    }
  };

  const toggleInputMode = () => {
    disconnect();
    setInputMode(inputMode === 'voice' ? 'text' : 'voice');
    haptic('selection');
  };

  const handleModeChange = (mode: any, items: string[]) => {
    setCulturalMode(mode);
    setSnackbar({ text: `Chế độ: ${mode}`, kind: "success" });
    haptic('success');
    if (status !== 'idle') {
        disconnect();
        setTimeout(() => connect(), 500);
    }
  };

  const handleSendText = async (text: string) => {
    if (!text.trim()) return;
    if (!navigator.onLine) {
       const offlineResponse: ZenResponse = {
          emotion: 'calm',
          wisdom_text: language === 'vi' 
            ? "Mạng không ổn định. Hãy quay về nương tựa nơi hơi thở." 
            : "Connection lost. Return to the island of self through breathing.",
          wisdom_english: "Breathing in, I calm my body.",
          user_transcript: text,
          breathing: '4-7-8',
          confidence: 1,
          reasoning_steps: ['Offline Mode', 'Triggering Local Breathing'],
          quantum_metrics: { coherence: 0.8, entanglement: 0.5, presence: 0.9 },
          awareness_stage: 'mindful',
          consciousness_dimensions: { contextual: 0.5, emotional: 0.5, cultural: 0.5, wisdom: 0.5, uncertainty: 0.5, relational: 0.5 },
          ambient_sound: 'rain'
       };
       setZenData(offlineResponse);
       setInputText('');
       setSnackbar({ text: "Chế độ Offline: Tập thở", kind: "info" });
       return;
    }
    const response = await sendText(text);
    if (response) {
        setInputText('');
        if (detectEmergency(text) || detectEmergency(response.wisdom_text)) {
            setEmergencyActive(true);
        }
    }
  };

  const handlePracticeSelect = (txt: string) => {
    setShowPractices(false);
    handleSendText(txt);
  };

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-stone-50 select-none font-sans text-stone-900">
      
      {/* --- LAYER 0: Background & Overlays --- */}
      {isLoading && <LoadingScreen />}
      
      <div className="absolute inset-0 z-0">
         <Suspense fallback={<div className="absolute inset-0 bg-stone-50" />}>
            <OrbViz 
              analyser={analyserRef.current} 
              emotion={zenData?.emotion || 'neutral'} 
              frequencyData={frequencyData}
            />
         </Suspense>
      </div>

      <Suspense fallback={null}>
        <AudioEngine 
          emotion={zenData?.emotion} 
          breathing={zenData?.breathing} 
          ambientSound={zenData?.ambient_sound}
          isSpeaking={status === 'speaking'} 
          isEmergency={emergencyActive}
        />
      </Suspense>

      {showBreathing && (
        <BreathingCircle 
          type={zenData?.breathing || '4-7-8'} 
          isActive={showBreathing} 
          onComplete={() => setShowBreathing(false)} 
        />
      )}
      
      <EmergencyProtocol 
        isActive={emergencyActive} 
        onComplete={() => {
          setEmergencyActive(false);
          disconnect();
        }} 
      />

      {/* --- LAYER 1: Top Floating Bar (Split Layout) --- */}
      
      {/* ROW A: Controls (Corners) */}
      <div className="absolute top-0 left-0 right-0 p-4 pt-6 z-50 pointer-events-none flex justify-between items-start">
        {/* Left: Tools */}
        <div className="pointer-events-auto flex items-center gap-1 bg-white/40 backdrop-blur-md rounded-full p-1 shadow-sm border border-white/40 transition-transform hover:scale-105">
           <CameraScan onModeChange={handleModeChange} currentMode={culturalMode} />
           <div className="h-4 w-px bg-stone-400/30 mx-0.5"></div>
           <button 
            onClick={toggleLanguage}
            className="p-2.5 rounded-full text-stone-600 hover:bg-white/80 transition-all"
            aria-label="Toggle Language"
          >
            <Languages size={18} />
          </button>
        </div>

        {/* Right: History */}
        <div className="pointer-events-auto">
          <HistoryPanel history={history} onClear={() => setHistory([])} />
        </div>
      </div>

      {/* ROW B: Status Indicator (Centered & Lower) */}
      <div className="absolute top-20 left-0 right-0 z-40 pointer-events-none flex justify-center">
        <div className="pointer-events-auto flex flex-col items-center pt-2">
             {connectionState === 'reconnecting' && (
                 <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-100/90 text-amber-700 rounded-full text-[10px] font-bold shadow-sm animate-pulse backdrop-blur border border-amber-200">
                     <Wifi size={10} /> Reconnecting...
                 </div>
             )}
             {connectionState === 'offline' && (
                 <div className="flex items-center gap-1.5 px-3 py-1 bg-red-100/90 text-red-700 rounded-full text-[10px] font-bold shadow-sm backdrop-blur border border-red-200">
                     <WifiOff size={10} /> Offline Mode
                 </div>
             )}
        </div>
      </div>

      {/* --- LAYER 2: Main Content (Scrollable) --- */}
      {/* Increased padding-top to 32 (128px) to clear the top bar controls */}
      <div className="absolute inset-0 z-30 flex flex-col items-center justify-center pointer-events-none pt-32 pb-36">
         <div className="w-full max-w-lg px-4 pointer-events-auto overflow-y-auto h-full no-scrollbar flex flex-col items-center gap-6 justify-center">
            {zenData ? (
               <>
                  <ZenCard data={zenData} isGenerating={status === 'processing' || status === 'speaking' || connectionState === 'reconnecting'} />
                  
                  <button 
                    onClick={() => setIsReasoningOpen(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white/50 backdrop-blur-md rounded-full text-xs font-bold text-stone-500 uppercase tracking-widest hover:bg-white hover:text-orange-600 hover:shadow-lg transition-all transform hover:-translate-y-0.5"
                  >
                     <Brain size={14} />
                     Xem phân tích tâm thức
                  </button>
               </>
            ) : (
               <div className="text-center opacity-60 animate-[pulse_3s_infinite]">
                  <p className="font-serif text-xl italic text-stone-600">
                     {language === 'vi' ? '"Thở vào, tâm tĩnh lặng..."' : '"Breathing in, I calm my body..."'}
                  </p>
               </div>
            )}
         </div>
      </div>

      {/* --- LAYER 3: Bottom Floating Dock --- */}
      <div className="absolute bottom-8 left-0 right-0 z-50 flex flex-col items-center pointer-events-none px-4">
         
         {/* Popup: Micro Practices */}
         {showPractices && (
            <div className="pointer-events-auto mb-4 bg-white/90 backdrop-blur-xl rounded-[24px] p-2 shadow-2xl border border-white/60 animate-[slideUp_0.3s_ease-out] max-w-full origin-bottom">
               <MicroPractices 
                 onSelect={handlePracticeSelect} 
                 disabled={status !== 'idle' && navigator.onLine}
                 lang={language}
               />
            </div>
         )}

         {/* Dock Container */}
         <div 
           className="pointer-events-auto bg-white/60 backdrop-blur-2xl border border-white/40 shadow-[0_8px_32px_rgba(249,115,22,0.15)] rounded-[32px] p-2 flex items-center justify-center gap-4 transition-all duration-300 ease-out"
           style={{ minWidth: inputMode === 'voice' ? '240px' : '320px' }}
         >
            {inputMode === 'voice' ? (
               <>
                 <button 
                   onClick={() => setShowPractices(!showPractices)} 
                   className={`p-4 rounded-full text-stone-500 hover:bg-white transition-all duration-300 ${showPractices ? 'bg-white text-orange-500 shadow-sm' : ''}`}
                   title="Gợi ý thực hành"
                 >
                    <Sparkles size={24} strokeWidth={1.5} />
                 </button>
                 
                 {/* Voice Button needs to break out slightly or sit tight. We let it sit tight. */}
                 <div className="-my-4"> 
                    <VoiceButton state={connectionState === 'reconnecting' ? 'processing' : status} onClick={toggleConnection} /> 
                 </div>

                 <button 
                   onClick={toggleInputMode} 
                   className="p-4 rounded-full text-stone-500 hover:bg-white transition-all duration-300"
                   title="Chuyển sang gõ phím"
                 >
                    <Keyboard size={24} strokeWidth={1.5} />
                 </button>
               </>
            ) : (
               <div className="flex items-center gap-2 px-2 w-full max-w-md">
                  <div className="flex-1 relative">
                     <input 
                       type="text" 
                       value={inputText}
                       onChange={(e) => setInputText(e.target.value)}
                       onKeyDown={(e) => e.key === 'Enter' && handleSendText(inputText)}
                       placeholder={language === 'vi' ? "Viết cho Thầy..." : "Write to Thầy..."}
                       className="w-full bg-transparent border-none focus:ring-0 text-stone-800 placeholder:text-stone-400/70 text-base py-3 px-2 font-serif"
                       autoFocus
                     />
                     {inputText.length > 0 && (
                        <button 
                          onClick={() => setInputText('')} 
                          className="absolute right-0 top-1/2 -translate-y-1/2 p-1 text-stone-300 hover:text-stone-500"
                        >
                           {/* Clear icon if needed */}
                        </button>
                     )}
                  </div>
                  
                  <button 
                    onClick={() => handleSendText(inputText)}
                    disabled={!inputText.trim() || status === 'processing'}
                    className="p-3 bg-stone-800 text-white rounded-full hover:bg-orange-600 disabled:opacity-50 disabled:bg-stone-300 transition-colors shadow-lg"
                  >
                     <SendHorizontal size={20} />
                  </button>
                  
                  <div className="w-px h-6 bg-stone-300/50 mx-1" />
                  
                  <button 
                    onClick={toggleInputMode}
                    className="p-2 text-stone-400 hover:text-stone-600 transition-colors"
                  >
                     <Mic size={24} strokeWidth={1.5} />
                  </button>
               </div>
            )}
         </div>
      </div>
      
      {/* --- LAYER 4: Overlays --- */}
      <BottomSheet 
        open={isReasoningOpen} 
        onClose={() => setIsReasoningOpen(false)}
        title="Phân tích Tâm thức"
      >
         {zenData && <ReasoningPanel data={zenData} />}
      </BottomSheet>

      {snackbar && (
        <Snackbar 
          text={snackbar.text} 
          kind={snackbar.kind} 
          onClose={() => setSnackbar(null)} 
        />
      )}
    </div>
  );
}