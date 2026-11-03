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
  MicOff,
  Volume2,
  VolumeX,
  Sliders,
  Radio,
} from "lucide-react";
import {
  ChatMessage,
  ChatResponse,
  HealthResponse,
  sendChatMessage,
  getBackendHealth,
} from "@/lib/api";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { useVoiceAssistant } from "@/lib/speech/useVoiceAssistant";
import { VoiceOrb } from "@/components/VoiceOrb";
import { VoiceSettingsModal } from "@/components/VoiceSettingsModal";

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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Initialize Voice Assistant Hook
  const voice = useVoiceAssistant();

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

  // Check backend health periodically
  const checkHealth = useCallback(async () => {
    try {
      const data = await getBackendHealth();
      setBackendHealth(data);
    } catch {
      setBackendHealth(null);
    }
  }, []);

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
  }, [conversations, loading, voice.liveTranscript]);

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

    // Stop speaking any previous message
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
        activeId
      );

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: response.reply,
        timestamp: response.timestamp || new Date().toISOString(),
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

      // Speak response out loud using TTS
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

  // Handle Speech Recognition finish -> place in input field so user can edit before sending
  const handleSpeechResult = (transcript: string) => {
    setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
    textareaRef.current?.focus();
  };

  // Mic Button handler
  const handleMicToggle = () => {
    voice.toggleListening(handleSpeechResult);
  };

  // Wake word activation callback
  const handleWakeWordDetected = () => {
    setWakeWordNotice("Wake Word Detected: Friday is listening...");
    setShowVoiceOrb(true);
    setTimeout(() => setWakeWordNotice(null), 3000);
    // Start listening for prompt
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
            {/* Global Stop Speaking Button (when active) */}
            {voice.isSpeaking && (
              <button
                onClick={voice.stopSpeaking}
                className="flex items-center gap-1 px-3 py-1 text-xs rounded-full bg-rose-950 text-rose-300 border border-rose-800/80 hover:bg-rose-900 transition animate-pulse"
                title="Stop Speaking"
              >
                <VolumeX className="w-3.5 h-3.5" />
                <span>Stop Speaking</span>
              </button>
            )}

            {/* Voice Settings Button */}
            <button
              onClick={() => setVoiceSettingsOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 transition"
              title="Voice Settings"
            >
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Voice Settings</span>
            </button>
          </div>
        </header>

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
            <button
              onClick={() => voice.setVoiceError(null)}
              className="text-xs underline text-rose-300"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Optional Collapsible Voice Orb Display */}
        {showVoiceOrb && (
          <div className="border-b border-slate-800/80 bg-slate-900/30 backdrop-blur-md">
            <VoiceOrb
              state={voice.voiceState}
              isListening={voice.isListening}
              isSpeaking={voice.isSpeaking}
              liveTranscript={voice.liveTranscript}
              isWakeWordActive={voice.isWakeWordActive}
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
                liveTranscript={voice.liveTranscript}
                isWakeWordActive={voice.isWakeWordActive}
                onMicClick={handleMicToggle}
                onStopSpeaking={voice.stopSpeaking}
                onOpenSettings={() => setVoiceSettingsOpen(true)}
              />

              <h2 className="text-xl font-bold text-white tracking-tight mt-2">
                Hello Mohib, Friday is ready to listen.
              </h2>
              <p className="text-sm text-slate-400 mt-1 mb-6">
                মাইক্রোফোনে ক্লিক করে কথা বলুন, অথবা টেক্সট লিখে যেকোনো কিছু জিজ্ঞাসা করুন।
              </p>

              {/* Starter Suggestions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full text-left">
                {[
                  {
                    title: "তুমি কি কি করতে পারো?",
                    desc: "বাংলায় ফ্রাইডের ক্ষমতা জানুন",
                    prompt: "তুমি কি কি করতে পারো?",
                  },
                  {
                    title: "Who are you?",
                    desc: "Learn about Friday's personality",
                    prompt: "Who are you and how can you help me?",
                  },
                  {
                    title: "Test Voice Synthesis",
                    desc: "Hear Friday respond with voice",
                    prompt: "Tell me a short motivational quote about programming.",
                  },
                  {
                    title: "Web Development Stack",
                    desc: "Explain our FastAPI & Next.js setup",
                    prompt: "Explain how our FastAPI and Next.js projects work together.",
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
                            <span className="font-mono text-[10px]">
                              {msg.timestamp
                                ? new Date(msg.timestamp).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : ""}
                            </span>
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
            {/* Live interim transcript preview above input if listening */}
            {voice.isListening && voice.liveTranscript && (
              <div className="px-3 py-1.5 rounded-lg bg-cyan-950/70 border border-cyan-800 text-cyan-300 text-xs flex items-center gap-2 animate-fadeIn">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping shrink-0"></span>
                <span className="italic">"{voice.liveTranscript}"</span>
              </div>
            )}

            <div className="relative flex items-end rounded-2xl bg-slate-900 border border-slate-800 focus-within:border-cyan-600 transition shadow-inner">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Friday in Bangla or English... (Enter to send, or click Mic to speak)"
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
                      : "Click to speak (Bangla / English)"
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
                <span>Friday Voice Assistant • Web Speech API</span>
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
