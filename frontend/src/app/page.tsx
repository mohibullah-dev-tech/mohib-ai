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
  ExternalLink,
} from "lucide-react";
import {
  ChatMessage,
  ChatResponse,
  HealthResponse,
  sendChatMessage,
  getBackendHealth,
} from "@/lib/api";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";

interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
}

export default function FridayChat() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [input, setInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [backendHealth, setBackendHealth] = useState<HealthResponse | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Initialize conversation from localStorage or default
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
  }, [conversations, loading]);

  const activeConversation =
    conversations.find((c) => c.id === activeId) || conversations[0];
  const messages = activeConversation ? activeConversation.messages : [];

  // Create new conversation
  const createNewChat = () => {
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
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to receive response from Friday";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
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

      {/* Main Chat Workspace */}
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
                AI Brain
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Local & Secure
            </span>
          </div>
        </header>

        {/* Chat Messages Scroll Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="max-w-xl mx-auto my-auto pt-8 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-cyan-950/60 border border-cyan-800/50 flex items-center justify-center text-cyan-400 shadow-xl shadow-cyan-950/40 mb-4">
                <Sparkles className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Hello Mohib, Friday is ready.
              </h2>
              <p className="text-sm text-slate-400 mt-1 mb-6">
                হ্যালো মহিব! আমি আপনার এআই সহকারী ফ্রাইডে। কোডিং, ডিবাগিং বা যেকোনো প্রশ্ন জিজ্ঞাসা করুন।
              </p>

              {/* Starter Suggestions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full text-left">
                {[
                  {
                    title: "তুমি কি কি করতে পারো?",
                    desc: "বাংলায় ফ্রাইডের সামর্থ্য জানুন",
                    prompt: "তুমি কি কি করতে পারো?",
                  },
                  {
                    title: "Who are you?",
                    desc: "Learn about Friday's identity",
                    prompt: "Who are you and how can you help me?",
                  },
                  {
                    title: "FastAPI + Next.js",
                    desc: "Explain the architecture",
                    prompt: "Explain how our FastAPI backend communicates with Next.js",
                  },
                  {
                    title: "Debug a Python issue",
                    desc: "Get coding guidance",
                    prompt: "How do I securely validate environment variables in FastAPI?",
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
                          {/* Message actions footer */}
                          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                            <span className="font-mono text-[10px]">
                              {msg.timestamp
                                ? new Date(msg.timestamp).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : ""}
                            </span>
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

        {/* Input Bar */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/40 backdrop-blur-md">
          <div className="max-w-3xl mx-auto">
            <div className="relative flex items-end rounded-2xl bg-slate-900 border border-slate-800 focus-within:border-cyan-600 transition shadow-inner">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Friday in Bangla or English... (Enter to send, Shift+Enter for new line)"
                rows={1}
                className="w-full resize-none bg-transparent px-4 py-3.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none max-h-36 overflow-y-auto"
                style={{ minHeight: "52px" }}
              />

              <div className="p-2 shrink-0">
                <button
                  onClick={() => handleSendMessage()}
                  disabled={loading || !input.trim()}
                  className="p-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-40 text-white transition active:scale-95 shadow-md shadow-cyan-950/50"
                  title="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center text-[10px] text-slate-400 px-2 mt-1.5">
              <span>Friday personal AI • No terminal commands executed automatically</span>
              <span>{input.length}/4000</span>
            </div>
          </div>
        </div>
      </div>

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
