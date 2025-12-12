import React, { useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';
import { Volume2, VolumeX, Wind, Waves, CloudRain, Droplets, Bell } from 'lucide-react';
import { getSharedAudioContext } from '../services/audioContext';

interface Props {
  emotion?: string;
  breathing?: string | null;
  ambientSound?: 'rain' | 'bowl' | 'bell' | 'silence' | 'mekong' | 'monsoon';
  isSpeaking: boolean;
  isEmergency?: boolean;
}

// Global helper for emergency sound (Low grounding hum)
export const playEmergencyAlert = async () => {
  await getSharedAudioContext();
  await Tone.start();
  
  const osc = new Tone.Oscillator(150, "sine").toDestination();
  const lfo = new Tone.LFO(2, 140, 160).connect(osc.frequency); // Gentle vibrato
  
  osc.volume.value = -10;
  lfo.start();
  osc.start();
  osc.stop("+3"); // Play for 3 seconds
  lfo.stop("+3");
};

export default function AudioEngine({ 
  emotion, 
  breathing, 
  ambientSound = 'silence', 
  isSpeaking,
  isEmergency = false 
}: Props) {
  const [isMuted, setIsMuted] = useState(false);
  const [initialized, setInitialized] = useState(false);
  
  // Synths Refs
  const rainSynth = useRef<Tone.Noise | null>(null);
  const rainFilter = useRef<Tone.AutoFilter | null>(null);
  
  const droneSynth = useRef<Tone.Oscillator | null>(null); // For Mekong/Bowl
  const droneLfo = useRef<Tone.LFO | null>(null);
  
  const masterVol = useRef<Tone.Volume | null>(null);

  // 1. Initialization
  useEffect(() => {
    const initAudio = async () => {
      await getSharedAudioContext();
      
      masterVol.current = new Tone.Volume(0).toDestination();

      // Rain / Monsoon Generator (Brown Noise)
      rainSynth.current = new Tone.Noise("brown");
      rainFilter.current = new Tone.AutoFilter({
        frequency: 0.5,
        baseFrequency: 400,
        octaves: 2
      }).connect(masterVol.current);
      rainSynth.current.connect(rainFilter.current);
      rainSynth.current.volume.value = -20;

      // Drone Generator (Mekong/Bowl)
      droneSynth.current = new Tone.Oscillator(110, "sine"); // A2
      droneLfo.current = new Tone.LFO(0.1, 108, 112).connect(droneSynth.current.frequency);
      droneSynth.current.connect(masterVol.current);
      droneSynth.current.volume.value = -20;

      setInitialized(true);
    };

    initAudio();

    return () => {
      rainSynth.current?.dispose();
      rainFilter.current?.dispose();
      droneSynth.current?.dispose();
      droneLfo.current?.dispose();
      masterVol.current?.dispose();
    };
  }, []);

  // 2. Handle Ambient Sound Changes
  useEffect(() => {
    if (!initialized || !masterVol.current) return;

    // Default: Stop all
    rainSynth.current?.stop();
    rainFilter.current?.stop();
    droneSynth.current?.stop();
    droneLfo.current?.stop();

    if (isMuted || isEmergency) return;

    const fadeTime = 2; // seconds

    try {
      if (ambientSound === 'rain' || ambientSound === 'monsoon') {
        rainSynth.current?.start();
        rainFilter.current?.start();
        rainSynth.current?.volume.rampTo(ambientSound === 'monsoon' ? -15 : -20, fadeTime);
      } 
      else if (ambientSound === 'mekong') {
        droneSynth.current?.set({ type: "triangle", frequency: 60 }); // Low hum
        droneLfo.current?.start();
        droneSynth.current?.start();
        droneSynth.current?.volume.rampTo(-25, fadeTime);
      }
      else if (ambientSound === 'bowl') {
        droneSynth.current?.set({ type: "sine", frequency: 220 }); // Singing bowl
        droneSynth.current?.start();
        droneSynth.current?.volume.rampTo(-30, fadeTime);
      }
      // 'bell' is usually a one-shot, we handle it as silence for continuous loop
      // 'silence' falls through here (stopped)
      
    } catch (e) {
      console.warn("Audio engine state error", e);
    }

  }, [ambientSound, initialized, isMuted, isEmergency]);

  // 3. Ducking Logic (Lower volume when AI speaks)
  useEffect(() => {
    if (!masterVol.current) return;
    
    // If speaking, drop volume by 10db
    const targetVol = isSpeaking ? -15 : 0;
    masterVol.current.volume.rampTo(targetVol, 0.5);
    
  }, [isSpeaking]);

  const toggleMute = () => {
    setIsMuted(!isMuted);
    Tone.Destination.mute = !isMuted;
  };

  if (!initialized) return null;

  return (
    <div className="absolute top-4 left-4 z-50 pointer-events-auto">
      <div className="flex flex-col gap-2">
         {/* Mute Toggle */}
         <button 
           onClick={toggleMute}
           className="p-2 bg-white/40 backdrop-blur-md rounded-full text-stone-600 hover:bg-white/80 transition-colors shadow-sm border border-white/40"
         >
           {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
         </button>

         {/* Ambient Indicator (Only if playing) */}
         {!isMuted && !isEmergency && ambientSound !== 'silence' && (
           <div className="p-2 bg-white/20 backdrop-blur-sm rounded-full text-stone-500 animate-[fadeIn_1s]">
              {ambientSound === 'rain' && <CloudRain size={18} />}
              {ambientSound === 'monsoon' && <Droplets size={18} />}
              {ambientSound === 'mekong' && <Waves size={18} />}
              {ambientSound === 'bowl' && <Bell size={18} />}
              {ambientSound === 'bell' && <Bell size={18} />}
           </div>
         )}
      </div>
    </div>
  );
}