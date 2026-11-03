"use client";

import React from "react";
import {
  X,
  Volume2,
  Mic,
  Sliders,
  Sparkles,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { VoiceOptionId, VOICE_OPTIONS } from "@/lib/speech/speechSynthesis";
import { SpeechLang } from "@/lib/speech/speechRecognition";

interface VoiceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedVoice: VoiceOptionId;
  onSelectVoice: (id: VoiceOptionId) => void;
  speechSpeed: number;
  onSetSpeed: (speed: number) => void;
  speechLang: SpeechLang;
  onSetLang: (lang: SpeechLang) => void;
  autoSpeak: boolean;
  onToggleAutoSpeak: (val: boolean) => void;
  isWakeWordActive: boolean;
  onToggleWakeWord: () => void;
  hasBanglaVoice: boolean;
  isSupportedSTT: boolean;
  isSupportedTTS: boolean;
  micPermission: string;
}

export function VoiceSettingsModal({
  isOpen,
  onClose,
  selectedVoice,
  onSelectVoice,
  speechSpeed,
  onSetSpeed,
  speechLang,
  onSetLang,
  autoSpeak,
  onToggleAutoSpeak,
  isWakeWordActive,
  onToggleWakeWord,
  hasBanglaVoice,
  isSupportedSTT,
  isSupportedTTS,
  micPermission,
}: VoiceSettingsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-base text-white">
              Friday Voice Settings
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Voice Selection (Dual Voices) */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Volume2 className="w-4 h-4 text-cyan-400" />
            Friday Voice Personality
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {VOICE_OPTIONS.map((voice) => {
              const isSelected = selectedVoice === voice.id;
              return (
                <button
                  key={voice.id}
                  onClick={() => onSelectVoice(voice.id)}
                  className={`p-3 rounded-xl text-left border transition ${
                    isSelected
                      ? "bg-cyan-950/60 border-cyan-500 text-white shadow-md shadow-cyan-950/40"
                      : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-slate-100">
                      {voice.name}
                    </span>
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {voice.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Speech Speed */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-300 uppercase tracking-wider">
              Speech Speed
            </span>
            <span className="font-mono text-cyan-400">{speechSpeed.toFixed(1)}x</span>
          </div>
          <div className="flex gap-2">
            {[0.8, 1.0, 1.2, 1.5].map((s) => (
              <button
                key={s}
                onClick={() => onSetSpeed(s)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition ${
                  speechSpeed === s
                    ? "bg-cyan-600 text-white border-cyan-500 font-semibold"
                    : "bg-slate-950/80 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                {s.toFixed(1)}x
              </button>
            ))}
          </div>
        </div>

        {/* 3. Speech Recognition Language */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Mic className="w-4 h-4 text-cyan-400" />
            Speech Recognition Language
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "auto", label: "Auto (BN/EN)" },
              { id: "bn-BD", label: "বাংলা (bn-BD)" },
              { id: "en-US", label: "English (en-US)" },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => onSetLang(item.id as SpeechLang)}
                className={`py-2 text-xs font-medium rounded-lg border text-center transition ${
                  speechLang === item.id
                    ? "bg-cyan-600 text-white border-cyan-500 font-semibold"
                    : "bg-slate-950/80 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* 4. Auto-Speak Toggle */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
          <div>
            <div className="text-xs font-semibold text-slate-200">
              Auto-Speak AI Responses
            </div>
            <div className="text-[11px] text-slate-400">
              Friday will automatically read answers out loud when finished.
            </div>
          </div>
          <button
            onClick={() => onToggleAutoSpeak(!autoSpeak)}
            className={`w-11 h-6 rounded-full transition-colors relative focus:outline-none ${
              autoSpeak ? "bg-cyan-600" : "bg-slate-800"
            }`}
          >
            <span
              className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                autoSpeak ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* 5. Experimental Wake Word Toggle & Disclosure */}
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-semibold text-slate-200">
                Wake Word ("Friday" / "ফ্রাইডে")
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800">
                Experimental
              </span>
            </div>
            <button
              onClick={onToggleWakeWord}
              className={`w-11 h-6 rounded-full transition-colors relative focus:outline-none ${
                isWakeWordActive ? "bg-emerald-600" : "bg-slate-800"
              }`}
            >
              <span
                className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                  isWakeWordActive ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
          <p className="text-[11px] text-slate-400 leading-normal">
            <strong>সীমাবদ্ধতা ও স্বচ্ছতা:</strong> ব্রাউজার স্পিচ রিকগনিশন নিরবতার পর স্বয়ংক্রিয়ভাবে বন্ধ হতে পারে। এটি সর্বদা চালু থাকা প্রডাকশন ইঞ্জিন নয়। কোনো অডিও বাইরে পাঠানো হয় না। <strong>Push-to-talk</strong> হচ্ছে সবচেয়ে বিশ্বস্ত ও জিরো-কস্ট পদ্ধতি।
          </p>
        </div>

        {/* 6. Browser Diagnostics Checklist */}
        <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/80 space-y-2 text-xs">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Browser Capabilities
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="flex items-center gap-1.5">
              {isSupportedSTT ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
              )}
              <span>Speech Recognition: {isSupportedSTT ? "Supported" : "Unsupported"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              {isSupportedTTS ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
              )}
              <span>Text-to-Speech: {isSupportedTTS ? "Supported" : "Unsupported"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              {hasBanglaVoice ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>
                Bangla Voice: {hasBanglaVoice ? "Installed" : "Default Fallback"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  micPermission === "granted"
                    ? "bg-emerald-400"
                    : micPermission === "denied"
                    ? "bg-rose-400"
                    : "bg-amber-400"
                }`}
              ></span>
              <span>Mic Permission: {micPermission}</span>
            </div>
          </div>
        </div>

        {/* Close Button */}
        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white transition shadow-md shadow-cyan-950/50"
          >
            Save & Done
          </button>
        </div>
      </div>
    </div>
  );
}
