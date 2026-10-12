import React, { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { localStore } from "@/lib/storage";
import { soundSynth } from "@/lib/audio-synthesizer";
import { supabase } from "@/integrations/supabase/client";

export interface TimerPreset {
  label: string;
  focus: number; // in minutes
  brk: number;   // in minutes
}

export const DEFAULT_PRESETS: TimerPreset[] = [
  { label: "Pomodoro", focus: 25, brk: 5 },
  { label: "Deep Work", focus: 50, brk: 10 },
  { label: "Sprint", focus: 15, brk: 3 },
];

export type AmbientTrack = "none" | "alpha" | "white" | "rain";

interface TimerContextValue {
  running: boolean;
  mode: "focus" | "break";
  preset: TimerPreset;
  seconds: number;
  subject: string;
  completed: number;
  ambientTrack: AmbientTrack;
  volume: number;
  start: () => void;
  pause: () => void;
  reset: () => void;
  choosePreset: (p: TimerPreset) => void;
  setSubject: (s: string) => void;
  setAmbientTrack: (track: AmbientTrack) => void;
  setVolume: (val: number) => void;
}

const TimerContext = createContext<TimerContextValue | null>(null);

export function TimerProvider({ children }: { children: ReactNode }) {
  const [preset, setPreset] = useState<TimerPreset>(DEFAULT_PRESETS[0]);
  const [mode, setMode] = useState<"focus" | "break">("focus");
  const [seconds, setSeconds] = useState(DEFAULT_PRESETS[0].focus * 60);
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(0);
  const [subject, setSubject] = useState("Cellular Biology");
  const [ambientTrack, setAmbientTrack] = useState<AmbientTrack>("none");
  const [volume, setVolume] = useState(35);

  const targetEndTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync ambient audio synthesizer
  useEffect(() => {
    soundSynth.setVolume(volume / 100);
    if (!running) {
      soundSynth.stopAmbient();
      return;
    }
    if (ambientTrack === "alpha") soundSynth.playAlphaWave();
    else if (ambientTrack === "white") soundSynth.playWhiteNoise();
    else if (ambientTrack === "rain") soundSynth.playRain();
    else soundSynth.stopAmbient();
  }, [ambientTrack, running, volume]);

  // Main high-precision background timer loop
  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      document.title = "Focus Sync — Don't Scroll Your Dreams Away";
      return;
    }

    // Set target timestamp
    targetEndTimeRef.current = Date.now() + seconds * 1000;

    intervalRef.current = setInterval(() => {
      if (!targetEndTimeRef.current) return;
      const remainingMs = targetEndTimeRef.current - Date.now();
      const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));

      setSeconds(remainingSec);

      // Update browser tab title for background visibility
      const mm = String(Math.floor(remainingSec / 60)).padStart(2, "0");
      const ss = String(remainingSec % 60).padStart(2, "0");
      document.title = `(${mm}:${ss}) ${mode === "focus" ? "Focus" : "Break"} · Focus Sync`;

      if (remainingSec <= 0) {
        soundSynth.playCompletionBell();

        if (mode === "focus") {
          setCompleted((c) => c + 1);
          toast.success(`🎉 Focus session complete! Logged ${preset.focus}m for ${subject}. Take a break!`);

          // Save to local store
          localStore.addSession({
            study_minutes: preset.focus,
            screen_minutes: 0,
            focus_score: 100,
            concentration_score: 95,
            subject: subject || "Deep Work",
            notes: `${preset.label} timer session`,
            session_date: new Date().toISOString().split("T")[0],
          });

          // Save to Supabase
          supabase.auth.getSession().then(({ data }) => {
            if (data?.session?.user) {
              supabase.from("study_sessions").insert({
                user_id: data.session.user.id,
                study_minutes: preset.focus,
                screen_minutes: 0,
                focus_score: 100,
                concentration_score: 95,
                subject: subject || "Deep Work",
                notes: `${preset.label} timer session`,
              }).then();
            }
          });

          // Switch to break
          setMode("break");
          const nextSec = preset.brk * 60;
          setSeconds(nextSec);
          targetEndTimeRef.current = Date.now() + nextSec * 1000;
        } else {
          toast.info("☕ Break complete! Back to deep work mode.");
          setMode("focus");
          const nextSec = preset.focus * 60;
          setSeconds(nextSec);
          targetEndTimeRef.current = Date.now() + nextSec * 1000;
        }
      }
    }, 500);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, mode, preset, subject]);

  const start = () => {
    setRunning(true);
  };

  const pause = () => {
    setRunning(false);
    targetEndTimeRef.current = null;
    soundSynth.stopAmbient();
  };

  const reset = () => {
    setRunning(false);
    soundSynth.stopAmbient();
    setMode("focus");
    targetEndTimeRef.current = null;
    setSeconds(preset.focus * 60);
    document.title = "Focus Sync — Don't Scroll Your Dreams Away";
  };

  const choosePreset = (p: TimerPreset) => {
    setPreset(p);
    setMode("focus");
    setSeconds(p.focus * 60);
    setRunning(false);
    targetEndTimeRef.current = null;
    soundSynth.stopAmbient();
  };

  return (
    <TimerContext.Provider
      value={{
        running,
        mode,
        preset,
        seconds,
        subject,
        completed,
        ambientTrack,
        volume,
        start,
        pause,
        reset,
        choosePreset,
        setSubject,
        setAmbientTrack,
        setVolume,
      }}
    >
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer() {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error("useTimer must be used within a TimerProvider");
  return ctx;
}
