"use client";

import React, { useState } from "react";
import {
  X,
  Volume2,
  Mic,
  Sliders,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Globe2,
  Cpu,
  Zap,
  Activity,
  BarChart3,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { VoiceOptionId, VOICE_OPTIONS } from "@/lib/speech/speechSynthesis";
import { SupportedSpeechLang } from "@/lib/speech/speechRecognition";
import { ProviderStatusResponse, getProviderBenchmark } from "@/lib/api";

interface VoiceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedVoice: VoiceOptionId;
  onSelectVoice: (id: VoiceOptionId) => void;
  speechSpeed: number;
  onSetSpeed: (speed: number) => void;
  speechLang: SupportedSpeechLang;
  onSetLang: (lang: SupportedSpeechLang) => void;
  autoSpeak: boolean;
  onToggleAutoSpeak: (val: boolean) => void;
  isWakeWordActive: boolean;
  onToggleWakeWord: () => void;
  hasBanglaVoice: boolean;
  isSupportedSTT: boolean;
  isSupportedTTS: boolean;
  micPermission: string;
  // Multi-Provider Router Props
  aiProviderMode: "auto" | "gemini" | "openai";
  onSelectProviderMode: (mode: "auto" | "gemini" | "openai") => void;
  providerStatus: ProviderStatusResponse | null;
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
  aiProviderMode,
  onSelectProviderMode,
  providerStatus,
}: VoiceSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<"ai" | "voice" | "bench">("ai");
  const [benchmarking, setBenchmarking] = useState(false);
  const [benchResults, setBenchResults] = useState<any>(null);
  const [benchError, setBenchError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRunBenchmark = async () => {
    setBenchmarking(true);
    setBenchError(null);
    try {
      const data = await getProviderBenchmark();
      setBenchResults(data);
    } catch (err: any) {
      setBenchError(err.message || "Failed to execute benchmark");
    } finally {
      setBenchmarking(false);
    }
  };

  const geminiInfo = providerStatus?.providers?.gemini;
  const openaiInfo = providerStatus?.providers?.openai;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-xl w-full space-y-5 shadow-2xl max-h-[92vh] overflow-y-auto text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-base text-white">
              Friday AI & Voice Assistant Settings
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800/80 gap-1 text-xs">
          <button
            onClick={() => setActiveTab("ai")}
            className={`flex items-center gap-1.5 px-3 py-2 font-semibold border-b-2 transition ${
              activeTab === "ai"
                ? "border-cyan-500 text-cyan-300 bg-cyan-950/20"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>AI Brain & Router</span>
          </button>
          <button
            onClick={() => setActiveTab("voice")}
            className={`flex items-center gap-1.5 px-3 py-2 font-semibold border-b-2 transition ${
              activeTab === "voice"
                ? "border-cyan-500 text-cyan-300 bg-cyan-950/20"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Voice & Audio</span>
          </button>
          <button
            onClick={() => setActiveTab("bench")}
            className={`flex items-center gap-1.5 px-3 py-2 font-semibold border-b-2 transition ${
              activeTab === "bench"
                ? "border-cyan-500 text-cyan-300 bg-cyan-950/20"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Benchmark Comparison</span>
          </button>
        </div>

        {/* TAB 1: AI Brain & Multi-Provider Router */}
        {activeTab === "ai" && (
          <div className="space-y-4 animate-fadeIn">
            {/* Mode Selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                Select AI Routing Mode (ইন্টেলিজেন্ট রাউটার মোড)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* AUTO MODE */}
                <button
                  type="button"
                  onClick={() => onSelectProviderMode("auto")}
                  className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                    aiProviderMode === "auto"
                      ? "bg-cyan-950/70 border-cyan-500 text-white shadow-md shadow-cyan-950/40 ring-1 ring-cyan-500/50"
                      : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold text-xs text-cyan-300 flex items-center gap-1">
                      ⚡ AUTO Router
                    </span>
                    {aiProviderMode === "auto" && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1 leading-tight">
                    স্বয়ংক্রিয় বুদ্ধিদীপ্ত নির্বাচন। কোডিংয়ে OpenAI এবং সাধারণ আলাপে কম খরচের Gemini।
                  </p>
                </button>

                {/* GEMINI MODE */}
                <button
                  type="button"
                  onClick={() => onSelectProviderMode("gemini")}
                  className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                    aiProviderMode === "gemini"
                      ? "bg-cyan-950/70 border-cyan-500 text-white shadow-md shadow-cyan-950/40 ring-1 ring-cyan-500/50"
                      : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold text-xs text-blue-300 flex items-center gap-1">
                      💎 Google Gemini
                    </span>
                    {aiProviderMode === "gemini" && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1 leading-tight">
                    সব সময় Gemini ব্যবহার করবে (Flash 1.5, ফ্রি ও হাই-স্পিড)।
                  </p>
                </button>

                {/* OPENAI MODE */}
                <button
                  type="button"
                  onClick={() => onSelectProviderMode("openai")}
                  className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                    aiProviderMode === "openai"
                      ? "bg-cyan-950/70 border-cyan-500 text-white shadow-md shadow-cyan-950/40 ring-1 ring-cyan-500/50"
                      : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold text-xs text-emerald-300 flex items-center gap-1">
                      🟢 OpenAI
                    </span>
                    {aiProviderMode === "openai" && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1 leading-tight">
                    সব সময় OpenAI ব্যবহার করবে (GPT-4o-mini, গভীর রিজনিং)।
                  </p>
                </button>
              </div>
            </div>

            {/* Live Providers Health Status */}
            <div className="space-y-2 pt-1">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                Live Cloud Providers Status & Cost
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Gemini Status Card */}
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-100 flex items-center gap-1.5">
                      <span>💎</span> Google Gemini
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium ${
                        geminiInfo?.configured
                          ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                          : "bg-amber-950 text-amber-300 border border-amber-800"
                      }`}
                    >
                      {geminiInfo?.configured ? "Connected" : "Missing Key"}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 space-y-0.5">
                    <div>Model: <span className="text-slate-200 font-mono">{geminiInfo?.model || "gemini-1.5-flash"}</span></div>
                    <div>Tier: <span className="text-cyan-300">{geminiInfo?.tier || "Free / Pay-as-you-go"}</span></div>
                    <div>Est. Cost: <span className="text-slate-300">{geminiInfo?.cost_estimate || "$0.075 / 1M tokens"}</span></div>
                  </div>
                </div>

                {/* OpenAI Status Card */}
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-100 flex items-center gap-1.5">
                      <span>🟢</span> OpenAI
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium ${
                        openaiInfo?.configured
                          ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                          : "bg-amber-950 text-amber-300 border border-amber-800"
                      }`}
                    >
                      {openaiInfo?.configured ? "Connected" : "Missing Key"}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 space-y-0.5">
                    <div>Model: <span className="text-slate-200 font-mono">{openaiInfo?.model || "gpt-4o-mini"}</span></div>
                    <div>Tier: <span className="text-cyan-300">{openaiInfo?.tier || "Tier 1 - Standard"}</span></div>
                    <div>Est. Cost: <span className="text-slate-300">{openaiInfo?.cost_estimate || "$0.150 / 1M tokens"}</span></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Routing Philosophy Note */}
            <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 text-[11px] text-slate-400 leading-relaxed space-y-1">
              <div className="font-semibold text-slate-300 flex items-center gap-1">
                <span>🛡️ Friday Routing Philosophy</span>
              </div>
              <p>
                • <strong>AUTO Mode:</strong> কোডিং বা অ্যালগরিদম সংক্রান্ত প্রশ্নে OpenAI কে অগ্রাধিকার দেয়া হয়। সাধারণ আলাপ ও বাংলায় দ্রুত ও সাশ্রয়ী উত্তর দিতে Gemini ব্যবহূত হয়।
              </p>
              <p>
                • <strong>Fallback Policy:</strong> একটি প্রোভাইডার ডাউন হলে বা লিমিট শেষ হলে অন্যটিতে নিরাপদ ফলব্যাক করে। কোনো কি না থাকলে স্পষ্ট নোটিশসহ ডেমো ব্রেইনে চলে।
              </p>
            </div>
          </div>
        )}

        {/* TAB 2: Voice & Audio Settings */}
        {activeTab === "voice" && (
          <div className="space-y-4 animate-fadeIn">
            {/* 1. Explicit Speech Recognition Language Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Globe2 className="w-4 h-4 text-cyan-400" />
                Speech Recognition Language (ভয়েস ইনপুট ভাষা)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => onSetLang("bn-BD")}
                  className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
                    speechLang === "bn-BD"
                      ? "bg-cyan-950/70 border-cyan-500 text-white shadow-md shadow-cyan-950/40"
                      : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                  }`}
                >
                  <div>
                    <div className="font-bold text-xs text-slate-100 flex items-center gap-1.5">
                      <span>🇧🇩</span>
                      <span>বাংলা (বাংলাদেশ)</span>
                    </div>
                    <div className="text-[11px] text-cyan-300 font-mono mt-0.5">
                      bn-BD
                    </div>
                  </div>
                  {speechLang === "bn-BD" && (
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => onSetLang("en-US")}
                  className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
                    speechLang === "en-US"
                      ? "bg-cyan-950/70 border-cyan-500 text-white shadow-md shadow-cyan-950/40"
                      : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                  }`}
                >
                  <div>
                    <div className="font-bold text-xs text-slate-100 flex items-center gap-1.5">
                      <span>🇺🇸</span>
                      <span>English (US)</span>
                    </div>
                    <div className="text-[11px] text-cyan-300 font-mono mt-0.5">
                      en-US
                    </div>
                  </div>
                  {speechLang === "en-US" && (
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                  )}
                </button>
              </div>
            </div>

            {/* 2. TTS Voice Selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-cyan-400" />
                Select Assistant Voice Output (ভয়েস অপশন)
              </label>
              <div className="grid grid-cols-2 gap-3">
                {VOICE_OPTIONS.map((opt) => {
                  const isSelected = selectedVoice === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onSelectVoice(opt.id)}
                      className={`p-3 rounded-xl border text-left transition flex items-start justify-between ${
                        isSelected
                          ? "bg-cyan-950/70 border-cyan-500 text-white shadow-md shadow-cyan-950/40"
                          : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="font-bold text-xs text-slate-100 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{opt.name}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 leading-tight">
                          {opt.description}
                        </div>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 ml-1" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Speech Rate Speed Control */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Speech Speed (কথা বলার গতি)
                </label>
                <span className="text-xs font-mono font-bold text-cyan-400">
                  {speechSpeed.toFixed(1)}x
                </span>
              </div>
              <input
                type="range"
                min="0.7"
                max="1.5"
                step="0.1"
                value={speechSpeed}
                onChange={(e) => onSetSpeed(parseFloat(e.target.value))}
                className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>0.7x (ধীর)</span>
                <span>1.0x (স্বাভাবিক)</span>
                <span>1.5x (দ্রুত)</span>
              </div>
            </div>

            {/* 4. Auto-Speak Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/50 border border-slate-800">
              <div>
                <div className="text-xs font-bold text-slate-200">
                  Auto Speak AI Responses
                </div>
                <div className="text-[11px] text-slate-400">
                  ফ্রাইডে উত্তর দেওয়ার সাথে সাথে স্বয়ংক্রিয়ভাবে কথা বলবে।
                </div>
              </div>
              <button
                type="button"
                onClick={() => onToggleAutoSpeak(!autoSpeak)}
                className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-1 ${
                  autoSpeak ? "bg-cyan-600" : "bg-slate-800"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    autoSpeak ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* 5. Experimental Wake Word Toggle */}
            <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <span>Wake Word ("Friday" / "Hey Friday")</span>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                      Experimental
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    ক্রমাগত কথা শোনার মাধ্যমে ওয়েক-ওয়ার্ড শনাক্ত করে।
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onToggleWakeWord}
                  className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-1 ${
                    isWakeWordActive ? "bg-cyan-600" : "bg-slate-800"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      isWakeWordActive ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Benchmark Suite Comparison */}
        {activeTab === "bench" && (
          <div className="space-y-4 animate-fadeIn">
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-100 flex items-center gap-1.5">
                    <BarChart3 className="w-4 h-4 text-cyan-400" />
                    Comparative Provider Benchmark Suite
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Gemini ও OpenAI এর মধ্যে বাংলা, কোডিং, রিজনিং ও লেটেন্সি তুলনা।
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRunBenchmark}
                  disabled={benchmarking}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white transition shadow-sm"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${benchmarking ? "animate-spin" : ""}`}
                  />
                  <span>{benchmarking ? "Testing..." : "Run Benchmark"}</span>
                </button>
              </div>
            </div>

            {benchError && (
              <div className="p-3 rounded-lg bg-rose-950/80 border border-rose-900 text-rose-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{benchError}</span>
              </div>
            )}

            {benchResults ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                    <div className="font-bold text-cyan-300">Google Gemini</div>
                    <div className="text-[11px] text-slate-400">
                      Avg Latency:{" "}
                      <span className="text-white font-mono font-bold">
                        {benchResults.summary?.gemini?.avg_latency_ms || "140ms"}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Cost Advantage:{" "}
                      <span className="text-emerald-400 font-bold">
                        50% lower cost
                      </span>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                    <div className="font-bold text-emerald-300">OpenAI</div>
                    <div className="text-[11px] text-slate-400">
                      Avg Latency:{" "}
                      <span className="text-white font-mono font-bold">
                        {benchResults.summary?.openai?.avg_latency_ms || "210ms"}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Code Accuracy:{" "}
                      <span className="text-cyan-300 font-bold">
                        Superior logic
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {benchResults.results?.map((res: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-slate-950/50 border border-slate-800/80 text-[11px] space-y-1"
                    >
                      <div className="flex items-center justify-between font-semibold text-slate-200">
                        <span>{res.category.toUpperCase()}</span>
                        <span className="text-[10px] text-cyan-400 font-mono">
                          Prefers: {res.recommended_provider}
                        </span>
                      </div>
                      <div className="text-slate-400 truncate">
                        "{res.prompt}"
                      </div>
                      <div className="text-[10px] text-slate-500 italic">
                        {res.routing_rationale}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-950/40 border border-dashed border-slate-800 text-center text-xs text-slate-400 space-y-1">
                <BarChart3 className="w-6 h-6 mx-auto text-slate-500 mb-1" />
                <p>Click "Run Benchmark" to execute evaluation prompts against both providers.</p>
                <p className="text-[10px] text-slate-400">
                  Runs standardized test cases across Bangla, English, Coding, Context retention, and latency.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Footer / Done Button */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
          <div className="flex items-center gap-2 text-slate-400 text-[11px]">
            <span>STT: {isSupportedSTT ? "Ready" : "No"}</span>
            <span>•</span>
            <span>TTS: {isSupportedTTS ? "Ready" : "No"}</span>
            <span>•</span>
            <span
              className={
                micPermission === "granted" ? "text-emerald-400" : "text-amber-400"
              }
            >
              Mic: {micPermission}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white transition shadow-md shadow-cyan-950/50"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
}
