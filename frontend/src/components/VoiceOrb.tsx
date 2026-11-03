"use client";

import React from "react";
import { Mic, MicOff, Volume2, VolumeX, Sparkles, AlertTriangle } from "lucide-react";
import { AssistantVoiceState } from "@/lib/speech/useVoiceAssistant";

interface VoiceOrbProps {
  state: AssistantVoiceState;
  isListening: boolean;
  isSpeaking: boolean;
  liveTranscript: string;
  isWakeWordActive: boolean;
  onMicClick: () => void;
  onStopSpeaking: () => void;
  onOpenSettings: () => void;
}

export function VoiceOrb({
  state,
  isListening,
  isSpeaking,
  liveTranscript,
  isWakeWordActive,
  onMicClick,
  onStopSpeaking,
  onOpenSettings,
}: VoiceOrbProps) {
  // Determine orb visual styling based on state
  const getOrbStyles = () => {
    switch (state) {
      case "listening":
        return {
          glow: "bg-emerald-500/20 shadow-[0_0_50px_rgba(16,185,129,0.5)] border-emerald-400",
          core: "bg-gradient-to-tr from-emerald-500 to-teal-400 animate-pulse",
          label: "Listening...",
          badgeColor: "bg-emerald-950 text-emerald-400 border-emerald-800",
        };
      case "thinking":
        return {
          glow: "bg-cyan-500/20 shadow-[0_0_50px_rgba(6,182,212,0.5)] border-cyan-400",
          core: "bg-gradient-to-tr from-cyan-600 to-blue-500 animate-spin",
          label: "Thinking...",
          badgeColor: "bg-cyan-950 text-cyan-400 border-cyan-800",
        };
      case "speaking":
        return {
          glow: "bg-cyan-400/25 shadow-[0_0_60px_rgba(56,189,248,0.6)] border-cyan-300",
          core: "bg-gradient-to-tr from-cyan-400 via-sky-300 to-indigo-500 animate-pulse",
          label: "Speaking...",
          badgeColor: "bg-sky-950 text-sky-400 border-sky-800",
        };
      case "error":
        return {
          glow: "bg-rose-500/20 shadow-[0_0_40px_rgba(244,63,94,0.4)] border-rose-400",
          core: "bg-gradient-to-tr from-rose-600 to-red-500",
          label: "Voice Error",
          badgeColor: "bg-rose-950 text-rose-400 border-rose-800",
        };
      default: // idle
        return {
          glow: "bg-cyan-600/10 shadow-[0_0_30px_rgba(6,182,212,0.2)] border-cyan-800/60",
          core: "bg-gradient-to-tr from-cyan-950 via-slate-900 to-cyan-900",
          label: isWakeWordActive ? "Wake-word Active ('Friday')" : "Push to Talk",
          badgeColor: isWakeWordActive
            ? "bg-emerald-950/80 text-emerald-400 border-emerald-800/60"
            : "bg-slate-900 text-slate-400 border-slate-800",
        };
    }
  };

  const currentStyles = getOrbStyles();

  return (
    <div className="flex flex-col items-center justify-center p-4 my-2 select-none relative">
      {/* Outer Pulse Rings when Listening or Speaking */}
      {(isListening || isSpeaking) && (
        <div className="absolute w-36 h-36 rounded-full border border-cyan-500/30 animate-ping pointer-events-none"></div>
      )}

      {/* Main Interactive Orb */}
      <button
        onClick={onMicClick}
        className={`relative w-24 h-24 rounded-full flex items-center justify-center border-2 transition-all duration-500 active:scale-95 group focus:outline-none ${currentStyles.glow}`}
        title={isListening ? "Click to stop listening" : "Click to speak with Friday"}
      >
        {/* Core circle */}
        <div
          className={`w-20 h-20 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-105 shadow-inner ${currentStyles.core}`}
        >
          {isListening ? (
            <Mic className="w-8 h-8 text-white animate-bounce" />
          ) : isSpeaking ? (
            <Volume2 className="w-8 h-8 text-white animate-pulse" />
          ) : (
            <Mic className="w-7 h-7 text-cyan-300 group-hover:text-white transition" />
          )}
        </div>
      </button>

      {/* State Badge */}
      <div className="mt-3 flex items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${currentStyles.badgeColor}`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isListening
                ? "bg-emerald-400 animate-ping"
                : isSpeaking
                ? "bg-cyan-400 animate-pulse"
                : isWakeWordActive
                ? "bg-emerald-400"
                : "bg-slate-500"
            }`}
          ></span>
          {currentStyles.label}
        </span>

        {/* Stop Speaking Button (when actively speaking) */}
        {isSpeaking && (
          <button
            onClick={onStopSpeaking}
            className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-full bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800 transition"
            title="Stop Friday speaking"
          >
            <VolumeX className="w-3.5 h-3.5" />
            <span>Stop</span>
          </button>
        )}
      </div>

      {/* Live Recognized Transcript Preview */}
      {liveTranscript && (
        <div className="mt-3 max-w-md px-4 py-2 rounded-xl bg-slate-900/90 border border-cyan-800/60 text-xs text-cyan-200 text-center animate-fadeIn shadow-lg">
          <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 block mb-0.5">
            Hearing:
          </span>
          <span className="italic font-medium font-sans">"{liveTranscript}"</span>
        </div>
      )}
    </div>
  );
}
