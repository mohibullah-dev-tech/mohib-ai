"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Send,
  Plus,
  Trash2,
  Copy,
  Check,
  RotateCcw,
  Menu,
  X,
  Sparkles,
  Bot,
  User,
  ShieldCheck,
  AlertCircle,
  Mic,
  Volume2,
  VolumeX,
  Sliders,
  Radio,
  Globe2,
  Cpu,
  Zap,
  Laptop,
  FolderLock,
  ShieldAlert,
  Globe,
} from "lucide-react";
import {
  ChatMessage,
  ChatResponse,
  HealthResponse,
  ProviderStatusResponse,
  ApprovalRequest,
  sendChatMessage,
  getBackendHealth,
  getProviderStatus,
  getPendingActions,
  approveAction,
  rejectAction,
} from "@/lib/api";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { useVoiceAssistant } from "@/lib/speech/useVoiceAssistant";
import { VoiceOrb } from "@/components/VoiceOrb";
import { VoiceSettingsModal } from "@/components/VoiceSettingsModal";
import { ComputerControlModal } from "@/components/ComputerControlModal";
import { BrowserControlModal } from "@/components/BrowserControlModal";
import { ApprovalDialog } from "@/components/ApprovalDialog";

interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
}

export default function FridayWorkspace() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [input, setInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [backendHealth, setBackendHealth] = useState<HealthResponse | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState<boolean>(false);
  const [voiceSettingsOpen, setVoiceSettingsOpen] = useState<boolean>(false);
  const [showVoiceOrb, setShowVoiceOrb] = useState<boolean>(false);
  const [wakeWordNotice, setWakeWordNotice] = useState<string | null>(null);
  const [aiProviderMode, setAiProviderMode] = useState<"auto" | "gemini" | "openai">("auto");
  const [providerStatus, setProviderStatus] = useState<ProviderStatusResponse | null>(null);

  // Milestone 4: Windows Computer Control States
  const [computerModalOpen, setComputerModalOpen] = useState<boolean>(false);
  const [browserModalOpen, setBrowserModalOpen] = useState<boolean>(false);
  const [activeApproval, setActiveApproval] = useState<ApprovalRequest | null>(null);
  const [pendingApprovals, setPendingApprovals] = useState<ApprovalRequest[]>([]);
  const [isApprovalProcessing, setIsApprovalProcessing] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Initialize Voice Assistant Hook
  const voice = useVoiceAssistant();

  // Initialize provider mode from localStorage
  useEffect(() => {
    try {
      const savedMode = localStorage.getItem("friday_ai_provider") as
        | "auto"
        | "gemini"
        | "openai";
      if (savedMode && ["auto", "gemini", "openai"].includes(savedMode)) {
        setAiProviderMode(savedMode);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleSelectProviderMode = (mode: "auto" | "gemini" | "openai") => {
    setAiProviderMode(mode);
    try {
      localStorage.setItem("friday_ai_provider", mode);
    } catch {
      // ignore
    }
  };

  // Initialize conversations from localStorage or default
  useEffect(() => {
    try {
      const saved = localStorage.getItem("friday_conversations");
      if (saved) {
        const parsed: Conversation[] = JSON.parse(saved);
        if (parsed.length > 0) {
          setConversations(parsed);
          setActiveId(parsed[0].id);
          return;
        }
      }
    } catch {
      // ignore parse errors
    }

    const defaultSession: Conversation = {
      id: "session-" + Date.now(),
      title: "New Conversation",
      messages: [],
      updatedAt: Date.now(),
    };
    setConversations([defaultSession]);
    setActiveId(defaultSession.id);
  }, []);

  // Save conversations to localStorage
  useEffect(() => {
    if (conversations.length > 0) {
      localStorage.setItem("friday_conversations", JSON.stringify(conversations));
    }
  }, [conversations]);

  // Check backend health, providers status, and pending approvals periodically
  const checkHealth = useCallback(async () => {
    try {
      const data = await getBackendHealth();
      setBackendHealth(data);
    } catch {
      setBackendHealth(null);
    }

    try {
      const pStatus = await getProviderStatus();
      setProviderStatus(pStatus);
    } catch {
      setProviderStatus(null);
    }

    try {
      const pending = await getPendingActions();
      setPendingApprovals(pending);
      // If there is an urgent pending approval and no modal is active, display it
      if (pending.length > 0 && !activeApproval) {
        setActiveApproval(pending[0]);
      }
    } catch {
      setPendingApprovals([]);
    }
  }, [activeApproval]);

  const handleApproveAction = async (id: string) => {
    setIsApprovalProcessing(true);
    try {
      await approveAction(id);
      setActiveApproval(null);
      // Refresh pending list
      const updated = await getPendingActions();
      setPendingApprovals(updated);
      voice.speak("Action approved and executed successfully.");
    } catch (err: any) {
      alert(err.message || "Approval failed");
    } finally {
      setIsApprovalProcessing(false);
    }
  };

  const handleRejectAction = async (id: string, reason?: string) => {
    setIsApprovalProcessing(true);
    try {
      await rejectAction(id, reason);
      setActiveApproval(null);
      // Refresh pending list
      const updated = await getPendingActions();
      setPendingApprovals(updated);
      voice.speak("Action rejected.");
    } catch (err: any) {
      alert(err.message || "Rejection failed");
    } finally {
      setIsApprovalProcessing(false);
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversations, loading, voice.liveHearing]);

  const activeConversation =
    conversations.find((c) => c.id === activeId) || conversations[0];
  const messages = activeConversation ? activeConversation.messages : [];

  // Create new conversation
  const createNewChat = () => {
    voice.stopSpeaking();
    const newSession: Conversation = {
      id: "session-" + Date.now(),
      title: "New Conversation",
      messages: [],
      updatedAt: Date.now(),
    };
    setConversations((prev) => [newSession, ...prev]);
    setActiveId(newSession.id);
    setError(null);
    setSidebarOpen(false);
  };

  // Clear all chats
  const clearAllChats = () => {
    voice.stopSpeaking();
    const freshSession: Conversation = {
      id: "session-" + Date.now(),
      title: "New Conversation",
      messages: [],
      updatedAt: Date.now(),
    };
    setConversations([freshSession]);
    setActiveId(freshSession.id);
    setError(null);
    setConfirmClearOpen(false);
    localStorage.removeItem("friday_conversations");
  };

  // Send message
  const handleSendMessage = async (textToSend?: string) => {
    const content = (textToSend || input).trim();
    if (!content || loading) return;

    setError(null);
    setInput("");

    // Stop speaking any previous message to prevent double speech
    voice.stopSpeaking();

    // Auto-adjust title if first message
    const currentMessages = activeConversation.messages;
    let newTitle = activeConversation.title;
    if (currentMessages.length === 0) {
      newTitle = content.length > 28 ? content.substring(0, 28) + "..." : content;
    }

    const userMessage: ChatMessage = {
      role: "user",
      content,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...currentMessages, userMessage];

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeId
          ? { ...c, title: newTitle, messages: updatedMessages, updatedAt: Date.now() }
          : c
      )
    );

    setLoading(true);
    voice.setVoiceState("thinking");

    try {
      const response: ChatResponse = await sendChatMessage(
        content,
        currentMessages,
        activeId,
        aiProviderMode
      );

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: response.reply,
        timestamp: response.timestamp || new Date().toISOString(),
        provider: response.provider,
        model: response.model,
        routing_mode: response.routing_mode,
      };

      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeId
            ? {
                ...c,
                messages: [...updatedMessages, assistantMessage],
                updatedAt: Date.now(),
              }
            : c
        )
      );

      // Speak response out loud using TTS (single trigger)
      voice.speak(response.reply);
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to receive response from Friday";
      setError(errorMsg);
      voice.setVoiceState("error");
    } finally {
      setLoading(false);
    }
  };

  // When speech recognition produces final text: put it into input for user editing
  const handleSpeechResult = (transcript: string) => {
    if (!transcript.trim()) return;
    setInput((prev) => {
      const cleanedPrev = prev.trim();
      return cleanedPrev ? `${cleanedPrev} ${transcript.trim()}` : transcript.trim();
    });
    textareaRef.current?.focus();
  };

  // Mic Button toggle handler
  const handleMicToggle = () => {
    voice.toggleListening(handleSpeechResult);
  };

  // Wake word activation callback
  const handleWakeWordDetected = () => {
    setWakeWordNotice("Wake Word Detected ('Friday'): Listening for your voice...");
    setShowVoiceOrb(true);
    setTimeout(() => setWakeWordNotice(null), 3500);
    voice.startListening(handleSpeechResult);
  };

  // Retry last message
  const handleRetry = () => {
    if (messages.length === 0) return;
    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
    if (lastUserMessage) {
      handleSendMessage(lastUserMessage.content);
    }
  };

  // Copy message to clipboard
  const handleCopy = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(`msg-${index}`);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // ignore
    }
  };

  // Handle textarea key down (Enter to submit, Shift+Enter for new line)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500 selection:text-black">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 flex flex-col w-72 bg-slate-900 border-r border-slate-800 transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
            </span>
            <div>
              <h2 className="font-bold text-sm tracking-wide text-white">
                Mohib AI
              </h2>
              <p className="text-[11px] text-cyan-400">Assistant Friday</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-3">
          <button
            onClick={createNewChat}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-cyan-950/40 transition active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-2 py-1">
            Recent Conversations
          </div>
          {conversations.map((c) => {
            const isActive = c.id === activeId;
            return (
              <button
                key={c.id}
                onClick={() => {
                  voice.stopSpeaking();
                  setActiveId(c.id);
                  setError(null);
                  setSidebarOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition flex items-center justify-between group ${
                  isActive
                    ? "bg-slate-800 text-cyan-300 font-medium border border-slate-700/60"
                    : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                }`}
              >
                <span className="truncate pr-2">{c.title}</span>
                <span className="text-[10px] opacity-0 group-hover:opacity-100 text-slate-400 transition">
                  {c.messages.length} msg
                </span>
              </button>
            );
          })}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/60 flex flex-col gap-2">
          {/* Voice Mode Quick Toggle */}
          <button
            onClick={() => setShowVoiceOrb(!showVoiceOrb)}
            className={`flex items-center justify-between w-full px-3 py-2 text-xs rounded-xl border transition ${
              showVoiceOrb
                ? "bg-cyan-950/70 border-cyan-700 text-cyan-300"
                : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-cyan-400" />
              <span>Voice Orb Mode</span>
            </span>
            <span className="text-[10px] font-mono font-semibold">
              {showVoiceOrb ? "ON" : "OFF"}
            </span>
          </button>

          {/* Laptop Control Sidebar Button */}
          <button
            onClick={() => {
              setComputerModalOpen(true);
              setSidebarOpen(false);
            }}
            className="flex items-center justify-between w-full px-3 py-2 text-xs rounded-xl bg-slate-950/60 border border-slate-800 hover:border-cyan-700/60 transition"
          >
            <span className="flex items-center gap-1.5">
              <Laptop className="w-3.5 h-3.5 text-cyan-400" />
              <span>Laptop Control</span>
            </span>
            {pendingApprovals.length > 0 ? (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[10px] font-bold animate-pulse">
                {pendingApprovals.length}
              </span>
            ) : (
              <span className="text-[10px] text-emerald-400 font-mono">Safe</span>
            )}
          </button>

          {/* Backend Status indicator */}
          <div className="flex items-center justify-between text-xs px-2 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800">
            <span className="text-slate-400 text-[11px] flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  backendHealth?.status === "healthy"
                    ? "bg-emerald-400"
                    : "bg-rose-400"
                }`}
              ></span>
              Backend
            </span>
            <span
              className={`text-[11px] font-mono ${
                backendHealth?.status === "healthy"
                  ? "text-emerald-400"
                  : "text-rose-400"
              }`}
            >
              {backendHealth?.status === "healthy" ? "127.0.0.1:8000" : "Offline"}
            </span>
          </div>

          {/* Clear All Chats Button */}
          <button
            onClick={() => setConfirmClearOpen(true)}
            className="flex items-center justify-center gap-1.5 w-full py-1.5 text-xs text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Conversations</span>
          </button>
        </div>
      </aside>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden relative">
        {/* Background glow decoration */}
        <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[550px] h-[300px] bg-cyan-600/5 blur-[120px] rounded-full"></div>

        {/* Top Header */}
        <header className="h-14 border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-cyan-400" />
              <span className="font-semibold text-sm text-slate-100">
                Friday
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 font-mono">
                Voice Assistant
              </span>
            </div>
          </div>

          {/* Header Action Controls */}
          <div className="flex items-center gap-2">
            {/* Quick AI Provider Switcher Pill in Header */}
            <div className="hidden sm:flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs">
              <button
                onClick={() => handleSelectProviderMode("auto")}
                className={`px-2 py-1 rounded-md transition text-[11px] font-medium flex items-center gap-1 ${
                  aiProviderMode === "auto"
                    ? "bg-cyan-600 text-white shadow-sm font-semibold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="Intelligent Auto Router: Gemini + OpenAI"
              >
                <span>⚡</span>
                <span>Auto</span>
              </button>
              <button
                onClick={() => handleSelectProviderMode("gemini")}
                className={`px-2 py-1 rounded-md transition text-[11px] font-medium flex items-center gap-1 ${
                  aiProviderMode === "gemini"
                    ? "bg-cyan-600 text-white shadow-sm font-semibold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="Gemini Mode: Always use Google Gemini"
              >
                <span>💎</span>
                <span>Gemini</span>
              </button>
              <button
                onClick={() => handleSelectProviderMode("openai")}
                className={`px-2 py-1 rounded-md transition text-[11px] font-medium flex items-center gap-1 ${
                  aiProviderMode === "openai"
                    ? "bg-cyan-600 text-white shadow-sm font-semibold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="OpenAI Mode: Always use OpenAI GPT"
              >
                <span>🟢</span>
                <span>OpenAI</span>
              </button>
            </div>

            {/* Direct Language Switcher Pill in Header */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs">
              <button
                onClick={() => voice.setSpeechLang("bn-BD")}
                className={`px-2.5 py-1 rounded-md transition text-[11px] font-medium flex items-center gap-1 ${
                  voice.speechLang === "bn-BD"
                    ? "bg-cyan-600 text-white shadow-sm font-semibold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="বাংলা ভাষায় ভয়েস ইনপুট সক্রিয় করুন"
              >
                <span>🇧🇩</span>
                <span>বাংলা</span>
              </button>
              <button
                onClick={() => voice.setSpeechLang("en-US")}
                className={`px-2.5 py-1 rounded-md transition text-[11px] font-medium flex items-center gap-1 ${
                  voice.speechLang === "en-US"
                    ? "bg-cyan-600 text-white shadow-sm font-semibold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="Switch voice input to English (US)"
              >
                <span>🇺🇸</span>
                <span>EN</span>
              </button>
            </div>

            {/* Global Stop Speaking Button (when active) */}
            {voice.isSpeaking && (
              <button
                onClick={voice.stopSpeaking}
                className="flex items-center gap-1 px-3 py-1 text-xs rounded-full bg-rose-950 text-rose-300 border border-rose-800/80 hover:bg-rose-900 transition animate-pulse"
                title="Stop Speaking"
              >
                <VolumeX className="w-3.5 h-3.5" />
                <span>Stop</span>
              </button>
            )}

            {/* Voice Settings Button */}
            <button
              onClick={() => setVoiceSettingsOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 transition"
              title="Voice Settings"
            >
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Settings</span>
            </button>

            {/* Laptop Control Button */}
            <button
              onClick={() => setComputerModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 transition relative"
              title="Windows Laptop Agent Control & Permissions"
            >
              <Laptop className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Laptop Control</span>
              {pendingApprovals.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[10px] font-bold animate-pulse">
                  {pendingApprovals.length}
                </span>
              )}
            </button>

            {/* Browser Control Button (Milestone 5) */}
            <button
              onClick={() => setBrowserModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 transition"
              title="Safe Browser Automation & Web Inspection"
            >
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Browser</span>
            </button>
          </div>
        </header>

        {/* Pending Permission Approval Action Banner */}
        {pendingApprovals.length > 0 && (
          <div className="bg-amber-950/90 border-b border-amber-800 text-amber-200 text-xs px-4 py-2.5 flex items-center justify-between animate-fadeIn">
            <span className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 animate-bounce" />
              <span>
                <strong>Action Requires Approval:</strong> Friday requests permission for{" "}
                <span className="font-mono text-cyan-300 uppercase">{pendingApprovals[0].action_name}</span> on{" "}
                <code className="text-amber-300 font-mono">{pendingApprovals[0].target}</code>
              </span>
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveApproval(pendingApprovals[0])}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-xs transition shadow-sm"
              >
                Review & Decide
              </button>
            </div>
          </div>
        )}

        {/* Wake Word Toast Notice */}
        {wakeWordNotice && (
          <div className="bg-emerald-950/90 border-b border-emerald-800 text-emerald-200 text-xs px-4 py-2 text-center animate-fadeIn">
            ✨ {wakeWordNotice}
          </div>
        )}

        {/* Voice Error Banner */}
        {voice.voiceError && (
          <div className="bg-rose-950/80 border-b border-rose-900 text-rose-200 text-xs px-4 py-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              {voice.voiceError}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleMicToggle}
                className="px-2 py-0.5 rounded bg-rose-900 text-xs font-medium text-rose-100 hover:bg-rose-800"
              >
                Retry
              </button>
              <button
                onClick={() => voice.setVoiceError(null)}
                className="text-xs underline text-rose-300"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Optional Collapsible Voice Orb Display */}
        {showVoiceOrb && (
          <div className="border-b border-slate-800/80 bg-slate-900/30 backdrop-blur-md">
            <VoiceOrb
              state={voice.voiceState}
              isListening={voice.isListening}
              isSpeaking={voice.isSpeaking}
              liveHearing={voice.liveHearing}
              isWakeWordActive={voice.isWakeWordActive}
              speechLang={voice.speechLang}
              onMicClick={handleMicToggle}
              onStopSpeaking={voice.stopSpeaking}
              onOpenSettings={() => setVoiceSettingsOpen(true)}
            />
          </div>
        )}

        {/* Chat Messages Scroll Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="max-w-xl mx-auto my-auto pt-6 flex flex-col items-center text-center">
              {/* Central Voice Orb in empty state */}
              <VoiceOrb
                state={voice.voiceState}
                isListening={voice.isListening}
                isSpeaking={voice.isSpeaking}
                liveHearing={voice.liveHearing}
                isWakeWordActive={voice.isWakeWordActive}
                speechLang={voice.speechLang}
                onMicClick={handleMicToggle}
                onStopSpeaking={voice.stopSpeaking}
                onOpenSettings={() => setVoiceSettingsOpen(true)}
              />

              <h2 className="text-xl font-bold text-white tracking-tight mt-2">
                Hello Mohib, Friday is ready to listen.
              </h2>
              <p className="text-sm text-slate-400 mt-1 mb-6">
                মাইক্রোফোনে ক্লিক করে বাংলায় কথা বলুন, অথবা টেক্সট বক্সে টাইপ করে যেকোনো কিছু জিজ্ঞাসা করুন।
              </p>

              {/* Starter Suggestions for Phase 4 Test Scenarios */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full text-left">
                {[
                  {
                    title: "তুমি কি আমাকে চিনতে পারো?",
                    desc: "আইডেন্টিটি ও রিকগনিশন টেস্ট",
                    prompt: "তুমি কি আমাকে চিনতে পারো?",
                  },
                  {
                    title: "আজকে আমাকে JavaScript শেখাও।",
                    desc: "কোডিং টিউটোরিয়াল টেস্ট",
                    prompt: "আজকে আমাকে JavaScript শেখাও।",
                  },
                  {
                    title: "আমি একটা ওয়েবসাইট তৈরি করতে চাই।",
                    desc: "ওয়েব ডেভেলপমেন্ট রোডম্যাপ",
                    prompt: "আমি একটা ওয়েবসাইট তৈরি করতে চাই।",
                  },
                  {
                    title: "Frontend vs Backend",
                    desc: "Technical difference test",
                    prompt: "What is the difference between frontend and backend?",
                  },
                ].map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(item.prompt)}
                    className="p-3.5 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-cyan-700/60 transition group text-left"
                  >
                    <div className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300">
                      {item.title}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {item.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((msg, index) => {
                const isUser = msg.role === "user";
                return (
                  <div
                    key={index}
                    className={`flex items-start gap-3 ${
                      isUser ? "flex-row-reverse" : "flex-row"
                    }`}
                  >
                    {/* Avatar */}
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                        isUser
                          ? "bg-gradient-to-tr from-cyan-600 to-blue-600 text-white"
                          : "bg-slate-900 border border-cyan-800/80 text-cyan-400 shadow-sm"
                      }`}
                    >
                      {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>

                    {/* Bubble */}
                    <div
                      className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                        isUser
                          ? "bg-cyan-600 text-white shadow-md rounded-tr-none"
                          : "bg-slate-900/90 border border-slate-800 text-slate-200 shadow-lg rounded-tl-none"
                      }`}
                    >
                      {!isUser ? (
                        <>
                          <MarkdownRenderer content={msg.content} />
                          {/* Message actions footer with Replay and Copy */}
                          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px]">
                                {msg.timestamp
                                  ? new Date(msg.timestamp).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })
                                  : ""}
                              </span>
                              {msg.model && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800/90 text-cyan-300 border border-slate-700/80">
                                  <Cpu className="w-2.5 h-2.5 text-cyan-400" />
                                  <span>{msg.model}</span>
                                  {msg.routing_mode && (
                                    <span className="text-[9px] text-slate-400">
                                      ({msg.routing_mode})
                                    </span>
                                  )}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              {/* Replay Voice button */}
                              <button
                                onClick={() => voice.forceSpeak(msg.content)}
                                className="flex items-center gap-1 hover:text-cyan-400 transition"
                                title="Replay voice audio"
                              >
                                <Volume2 className="w-3.5 h-3.5" />
                                <span>Speak</span>
                              </button>

                              {/* Copy response */}
                              <button
                                onClick={() => handleCopy(msg.content, index)}
                                className="flex items-center gap-1 hover:text-cyan-400 transition"
                                title="Copy response"
                              >
                                {copiedId === `msg-${index}` ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    <span className="text-emerald-400">Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>Copy</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Thinking / Loading indicator */}
              {loading && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 border border-cyan-800/80 text-cyan-400 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 animate-spin" />
                  </div>
                  <div className="bg-slate-900/90 border border-slate-800 rounded-2xl rounded-tl-none p-4 text-xs text-slate-400 flex items-center gap-2">
                    <span className="flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce"></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.2s]"></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.4s]"></span>
                    </span>
                    <span>Friday is thinking...</span>
                  </div>
                </div>
              )}

              {/* Error Banner with Retry */}
              {error && (
                <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-900/60 flex items-center justify-between text-xs text-rose-300">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{error}</span>
                  </div>
                  <button
                    onClick={handleRetry}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-rose-900/60 hover:bg-rose-900 text-rose-200 transition font-medium"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Retry</span>
                  </button>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Bar with Speech Microphone integration */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/40 backdrop-blur-md">
          <div className="max-w-3xl mx-auto space-y-2">
            {/* Live hearing indicator banner above input while mic is active */}
            {voice.isListening && (
              <div className="px-3.5 py-2 rounded-xl bg-cyan-950/90 border border-cyan-600/80 text-cyan-200 text-xs flex items-center justify-between animate-fadeIn shadow-lg">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0"></span>
                  <span className="font-semibold text-emerald-300">
                    {voice.speechLang === "bn-BD" ? "শুনছি (বাংলা):" : "Hearing (English):"}
                  </span>
                  <span className="italic font-medium">
                    {voice.liveHearing || "কথা বলুন..."}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleMicToggle}
                  className="px-2 py-0.5 rounded bg-rose-950 hover:bg-rose-900 text-rose-300 text-[11px] border border-rose-800 transition"
                >
                  Stop
                </button>
              </div>
            )}

            <div className="relative flex items-end rounded-2xl bg-slate-900 border border-slate-800 focus-within:border-cyan-600 transition shadow-inner">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  voice.speechLang === "bn-BD"
                    ? "বাংলায় প্রশ্ন লিখুন বা মাইকে বলুন... (Enter চাপলে সেন্ড হবে)"
                    : "Ask Friday in English... (Enter to send, Shift+Enter for newline)"
                }
                rows={1}
                className="w-full resize-none bg-transparent px-4 py-3.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none max-h-36 overflow-y-auto"
                style={{ minHeight: "52px" }}
              />

              <div className="p-2 shrink-0 flex items-center gap-1.5">
                {/* Speech Microphone Toggle Button */}
                <button
                  type="button"
                  onClick={handleMicToggle}
                  className={`p-2.5 rounded-xl transition ${
                    voice.isListening
                      ? "bg-rose-600 text-white shadow-lg shadow-rose-900/50 animate-pulse"
                      : "bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-white border border-slate-700"
                  }`}
                  title={
                    voice.isListening
                      ? "Listening... Click to stop"
                      : `Click to speak in ${voice.speechLang === "bn-BD" ? "Bangla (bn-BD)" : "English (en-US)"}`
                  }
                >
                  {voice.isListening ? (
                    <Mic className="w-4 h-4 animate-bounce" />
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                </button>

                {/* Send Button */}
                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  disabled={loading || !input.trim()}
                  className="p-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-40 text-white transition active:scale-95 shadow-md shadow-cyan-950/50"
                  title="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center text-[10px] text-slate-400 px-2">
              <span className="flex items-center gap-2">
                <span>
                  Language: <strong className="text-cyan-400">{voice.speechLang === "bn-BD" ? "বাংলা (bn-BD)" : "English (en-US)"}</strong>
                </span>
                {voice.isWakeWordActive && (
                  <span className="text-emerald-400 font-medium">
                    ● Wake Word Active
                  </span>
                )}
              </span>
              <span>{input.length}/4000</span>
            </div>
          </div>
        </div>
      </div>

      {/* Voice Settings Modal */}
      <VoiceSettingsModal
        isOpen={voiceSettingsOpen}
        onClose={() => setVoiceSettingsOpen(false)}
        selectedVoice={voice.selectedVoice}
        onSelectVoice={voice.setSelectedVoice}
        speechSpeed={voice.speechSpeed}
        onSetSpeed={voice.setSpeechSpeed}
        speechLang={voice.speechLang}
        onSetLang={voice.setSpeechLang}
        autoSpeak={voice.autoSpeak}
        onToggleAutoSpeak={voice.setAutoSpeak}
        isWakeWordActive={voice.isWakeWordActive}
        onToggleWakeWord={() => voice.toggleWakeWord(handleWakeWordDetected)}
        hasBanglaVoice={voice.hasBanglaVoice}
        isSupportedSTT={voice.isSupportedSTT}
        isSupportedTTS={voice.isSupportedTTS}
        micPermission={voice.micPermission}
        aiProviderMode={aiProviderMode}
        onSelectProviderMode={handleSelectProviderMode}
        providerStatus={providerStatus}
      />

      {/* Safe Windows Computer Control Modal (Milestone 4) */}
      <ComputerControlModal
        isOpen={computerModalOpen}
        onClose={() => setComputerModalOpen(false)}
        onOpenApproval={(req) => setActiveApproval(req)}
        pendingCount={pendingApprovals.length}
        onRefreshPending={checkHealth}
      />

      {/* Safe Browser Automation Modal (Milestone 5) */}
      <BrowserControlModal
        isOpen={browserModalOpen}
        onClose={() => setBrowserModalOpen(false)}
        onOpenApproval={(req) => setActiveApproval(req)}
      />

      {/* Permission Approval Dialog (Single-Use Confirmation) */}
      <ApprovalDialog
        request={activeApproval}
        onApprove={handleApproveAction}
        onReject={handleRejectAction}
        isProcessing={isApprovalProcessing}
      />

      {/* Clear Confirmation Modal */}
      {confirmClearOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="font-bold text-white text-base">
              Clear All Conversations?
            </h3>
            <p className="text-xs text-slate-400">
              This will remove all saved chat history from your browser session. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmClearOpen(false)}
                className="px-4 py-2 text-xs font-medium rounded-lg text-slate-300 hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={clearAllChats}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition"
              >
                Yes, Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
