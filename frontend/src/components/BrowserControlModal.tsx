"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Globe,
  Compass,
  Monitor,
  Tablet,
  Smartphone,
  ShieldAlert,
  ShieldCheck,
  Play,
  Square,
  RefreshCw,
  Search,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Eye,
  Layers,
  Clock,
  Sparkles,
} from "lucide-react";
import {
  BrowserStatusResponse,
  BrowserInspectionResponse,
  BrowserInteractiveElements,
  getBrowserStatus,
  launchBrowser,
  closeBrowser,
  navigateBrowser,
  captureBrowserScreenshot,
  getBrowserElements,
  browserScroll,
  browserStop,
  inspectWebpage,
  getBrowserHistory,
} from "@/lib/api";

interface BrowserControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenApproval?: (req: any) => void;
}

export function BrowserControlModal({
  isOpen,
  onClose,
  onOpenApproval,
}: BrowserControlModalProps) {
  const [activeTab, setActiveTab] = useState<"live" | "inspector" | "elements" | "history">("live");
  const [status, setStatus] = useState<BrowserStatusResponse | null>(null);
  const [urlInput, setUrlInput] = useState<string>("https://example.com");
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [elements, setElements] = useState<BrowserInteractiveElements | null>(null);
  const [inspection, setInspection] = useState<BrowserInspectionResponse | null>(null);
  const [selectedViewport, setSelectedViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Poll status when modal open
  useEffect(() => {
    if (!isOpen) return;
    fetchStatus();
    const interval = setInterval(fetchStatus, 4000);
    return () => clearInterval(interval);
  }, [isOpen]);

  async function fetchStatus() {
    try {
      const res = await getBrowserStatus();
      setStatus(res);
      if (res.current_url && res.current_url !== "about:blank") {
        setUrlInput(res.current_url);
      }
    } catch {
      // ignore transient poll failure
    }
  }

  async function handleLaunch() {
    setLoading(true);
    setError(null);
    try {
      const res = await launchBrowser(true);
      setStatus(res);
      setSuccessMsg("Browser session launched successfully.");
      await handleRefreshScreenshot();
    } catch (err: any) {
      setError(err.message || "Failed to launch browser");
    } finally {
      setLoading(false);
    }
  }

  async function handleClose() {
    setLoading(true);
    setError(null);
    try {
      const res = await closeBrowser();
      setStatus(res);
      setScreenshot(null);
      setSuccessMsg("Browser session closed safely.");
    } catch (err: any) {
      setError(err.message || "Failed to close browser");
    } finally {
      setLoading(false);
    }
  }

  async function handleNavigate(targetUrl?: string) {
    const url = targetUrl || urlInput;
    if (!url) return;
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await navigateBrowser(url);
      setUrlInput(res.url);
      await fetchStatus();
      await handleRefreshScreenshot();
      setSuccessMsg(`Navigated to: ${res.url}`);
    } catch (err: any) {
      setError(err.message || "Navigation failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleRefreshScreenshot() {
    try {
      const res = await captureBrowserScreenshot(false);
      setScreenshot(res.screenshot_b64);
    } catch (err: any) {
      // not fatal
    }
  }

  async function handleLoadElements() {
    setLoading(true);
    setError(null);
    try {
      const res = await getBrowserElements();
      setElements(res);
    } catch (err: any) {
      setError(err.message || "Failed to load elements");
    } finally {
      setLoading(false);
    }
  }

  async function handleInspect() {
    setLoading(true);
    setError(null);
    try {
      const res = await inspectWebpage(urlInput || undefined);
      setInspection(res);
      setActiveTab("inspector");
    } catch (err: any) {
      setError(err.message || "Inspection failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleScroll(direction: "up" | "down") {
    try {
      await browserScroll(direction, 600);
      await handleRefreshScreenshot();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleStop() {
    try {
      await browserStop();
      setSuccessMsg("Automation stopped immediately.");
      await fetchStatus();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleFetchHistory() {
    try {
      const data = await getBrowserHistory();
      setHistory(data);
    } catch {
      // ignore
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-5xl h-[88vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Globe className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2 text-white">
                Safe Browser Agent
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-700/40 text-cyan-400 font-normal">
                  Playwright Chromium
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Safe automated browser navigation, responsive UI inspection, and controlled web exploration
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Session status pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-xs">
              <span
                className={`w-2 h-2 rounded-full ${
                  status?.is_active ? "bg-emerald-400 animate-pulse" : "bg-slate-500"
                }`}
              />
              <span className="text-slate-300">
                {status?.is_active ? "Session Active" : "Inactive"}
              </span>
            </div>

            {status?.is_active ? (
              <button
                onClick={handleClose}
                disabled={loading}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 hover:bg-rose-900/60 transition flex items-center gap-1.5"
              >
                <Square className="w-3.5 h-3.5" />
                Close Session
              </button>
            ) : (
              <button
                onClick={handleLaunch}
                disabled={loading}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition flex items-center gap-1.5 shadow-sm shadow-cyan-500/20"
              >
                <Play className="w-3.5 h-3.5" />
                Launch Browser
              </button>
            )}

            <button
              onClick={handleStop}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-950/40 border border-amber-700/50 text-amber-300 hover:bg-amber-900/50 transition flex items-center gap-1.5"
            >
              <Square className="w-3.5 h-3.5" />
              Stop Task
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* URL Bar & Quick Controls */}
        <div className="px-6 py-3 border-b border-slate-800/80 bg-slate-900/80 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[280px] flex items-center gap-2 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm">
            <Compass className="w-4 h-4 text-cyan-400 shrink-0" />
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleNavigate()}
              placeholder="https://example.com"
              className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 outline-none text-xs sm:text-sm font-mono"
            />
            {status?.page_title && (
              <span className="hidden md:inline-block text-[11px] text-slate-400 max-w-[200px] truncate border-l border-slate-800 pl-2">
                {status.page_title}
              </span>
            )}
          </div>

          <button
            onClick={() => handleNavigate()}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium transition flex items-center gap-1.5 shadow-sm"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Go
          </button>

          <button
            onClick={handleInspect}
            disabled={loading}
            className="px-3 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 text-xs font-medium transition flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            Inspect UI & Design
          </button>

          {/* Quick links */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-slate-500 text-[11px]">Quick:</span>
            {[
              { label: "Google", url: "https://google.com" },
              { label: "YouTube", url: "https://youtube.com" },
              { label: "GitHub", url: "https://github.com" },
            ].map((q) => (
              <button
                key={q.label}
                onClick={() => {
                  setUrlInput(q.url);
                  handleNavigate(q.url);
                }}
                className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition"
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>

        {/* Alerts & Messages */}
        {error && (
          <div className="mx-6 mt-3 px-4 py-2.5 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="mx-6 mt-3 px-4 py-2 rounded-xl bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 px-6 mt-2 gap-4 text-xs font-medium">
          <button
            onClick={() => setActiveTab("live")}
            className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition ${
              activeTab === "live"
                ? "border-cyan-400 text-cyan-400 font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Eye className="w-4 h-4" />
            Live View & Preview
          </button>
          <button
            onClick={() => {
              setActiveTab("inspector");
              if (!inspection) handleInspect();
            }}
            className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition ${
              activeTab === "inspector"
                ? "border-purple-400 text-purple-400 font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Responsive Inspector (Desktop/Tablet/Mobile)
          </button>
          <button
            onClick={() => {
              setActiveTab("elements");
              handleLoadElements();
            }}
            className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition ${
              activeTab === "elements"
                ? "border-amber-400 text-amber-400 font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Layers className="w-4 h-4" />
            Interactive Elements
          </button>
          <button
            onClick={() => {
              setActiveTab("history");
              handleFetchHistory();
            }}
            className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition ${
              activeTab === "history"
                ? "border-blue-400 text-blue-400 font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Clock className="w-4 h-4" />
            Action Audit Log
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          
          {/* TAB 1: Live View */}
          {activeTab === "live" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-3">
                  <span>Current URL: <code className="text-cyan-300">{status?.current_url || "about:blank"}</code></span>
                  <span>Title: <strong className="text-slate-200">{status?.page_title || "None"}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleScroll("up")}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                    title="Scroll Up"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleScroll("down")}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                    title="Scroll Down"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleRefreshScreenshot}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 flex items-center gap-1 text-xs"
                    title="Refresh Screenshot"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Capture
                  </button>
                </div>
              </div>

              {screenshot ? (
                <div className="relative border border-slate-700/80 rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center max-h-[56vh]">
                  <img
                    src={`data:image/jpeg;base64,${screenshot}`}
                    alt="Live Browser Screenshot"
                    className="w-full h-auto object-contain max-h-[56vh]"
                  />
                </div>
              ) : (
                <div className="h-64 border border-dashed border-slate-700 rounded-xl flex flex-col items-center justify-center text-slate-500 gap-3">
                  <Globe className="w-10 h-10 text-slate-600" />
                  <p className="text-sm">No active webpage screenshot yet.</p>
                  <p className="text-xs text-slate-600">
                    Type a website URL above and click <strong>Go</strong> or <strong>Launch Browser</strong>.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Responsive Inspector */}
          {activeTab === "inspector" && (
            <div className="space-y-6">
              {inspection ? (
                <>
                  {/* Summary & Viewport Switcher */}
                  <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-purple-300 flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-purple-400" />
                          {inspection.title || "Inspection Results"}
                        </h3>
                        <p className="text-xs text-slate-400">{inspection.summary_en}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{inspection.summary_bn}</p>
                      </div>

                      {/* Viewport selection pills */}
                      <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 p-1 rounded-xl text-xs">
                        <button
                          onClick={() => setSelectedViewport("desktop")}
                          className={`px-3 py-1 rounded-lg flex items-center gap-1.5 transition ${
                            selectedViewport === "desktop"
                              ? "bg-purple-600 text-white font-medium"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          <Monitor className="w-3.5 h-3.5" />
                          Desktop (1280)
                        </button>
                        <button
                          onClick={() => setSelectedViewport("tablet")}
                          className={`px-3 py-1 rounded-lg flex items-center gap-1.5 transition ${
                            selectedViewport === "tablet"
                              ? "bg-purple-600 text-white font-medium"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          <Tablet className="w-3.5 h-3.5" />
                          Tablet (768)
                        </button>
                        <button
                          onClick={() => setSelectedViewport("mobile")}
                          className={`px-3 py-1 rounded-lg flex items-center gap-1.5 transition ${
                            selectedViewport === "mobile"
                              ? "bg-purple-600 text-white font-medium"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          <Smartphone className="w-3.5 h-3.5" />
                          Mobile (375)
                        </button>
                      </div>
                    </div>

                    {/* Viewport screenshot preview */}
                    {inspection.viewports[selectedViewport]?.screenshot_b64 && (
                      <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950 flex justify-center p-2 max-h-[44vh]">
                        <img
                          src={`data:image/jpeg;base64,${inspection.viewports[selectedViewport].screenshot_b64}`}
                          alt={`${selectedViewport} layout preview`}
                          className="h-auto max-h-[42vh] object-contain rounded-lg border border-slate-800"
                        />
                      </div>
                    )}
                  </div>

                  {/* Findings & Accessibility */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-slate-950/60 border border-amber-900/40 space-y-2">
                      <h4 className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                        Accessibility & Layout Observations:
                      </h4>
                      <ul className="space-y-1.5 text-xs text-slate-300">
                        {inspection.issues_en.map((iss, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-amber-400">•</span>
                            <span>{iss}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
                        {inspection.issues_bn.map((iss, i) => (
                          <p key={i}>🇧🇩 {iss}</p>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-950/60 border border-emerald-900/40 space-y-2">
                      <h4 className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        Recommendations & Best Practices:
                      </h4>
                      <ul className="space-y-1.5 text-xs text-slate-300">
                        {inspection.suggestions_en.map((sug, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-emerald-400">✓</span>
                            <span>{sug}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
                        {inspection.suggestions_bn.map((sug, i) => (
                          <p key={i}>🇧🇩 {sug}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="h-64 border border-dashed border-slate-700 rounded-xl flex flex-col items-center justify-center text-slate-500 gap-3">
                  <Sparkles className="w-10 h-10 text-purple-500/60" />
                  <p className="text-sm">Click "Inspect UI & Design" to run multi-viewport audit.</p>
                  <button
                    onClick={handleInspect}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium"
                  >
                    Inspect Webpage Now
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Interactive Elements */}
          {activeTab === "elements" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Extracted Clickable Elements & Forms</span>
                <button
                  onClick={handleLoadElements}
                  className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs"
                >
                  Reload Elements
                </button>
              </div>

              {elements ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Links */}
                  <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                    <h4 className="text-xs font-semibold text-cyan-300">
                      Links ({elements.links.length})
                    </h4>
                    <div className="space-y-1.5 max-h-72 overflow-y-auto text-xs">
                      {elements.links.map((link, i) => (
                        <div key={i} className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                          <p className="font-medium text-slate-200 truncate">{link.text || "(unlabeled link)"}</p>
                          <code className="text-[10px] text-cyan-400 truncate block">{link.href}</code>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                    <h4 className="text-xs font-semibold text-emerald-300">
                      Buttons ({elements.buttons.length})
                    </h4>
                    <div className="space-y-1.5 max-h-72 overflow-y-auto text-xs">
                      {elements.buttons.map((btn, i) => (
                        <div key={i} className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-slate-200 truncate">{btn.text || "Button"}</span>
                            {btn.is_submit && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950 border border-rose-800 text-rose-300">
                                Submit
                              </span>
                            )}
                          </div>
                          <code className="text-[10px] text-slate-400 block mt-1">{btn.selector}</code>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Inputs */}
                  <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                    <h4 className="text-xs font-semibold text-amber-300">
                      Input Fields ({elements.inputs.length})
                    </h4>
                    <div className="space-y-1.5 max-h-72 overflow-y-auto text-xs">
                      {elements.inputs.map((inp, i) => (
                        <div key={i} className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                          <p className="font-medium text-slate-200">
                            {inp.name || inp.placeholder || inp.type}
                          </p>
                          <span className="text-[10px] text-slate-400">Type: {inp.type}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-48 border border-dashed border-slate-700 rounded-xl flex items-center justify-center text-slate-500 text-xs">
                  Loading interactive elements...
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Action History */}
          {activeTab === "history" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Recent Browser Automation Events</span>
                <button
                  onClick={handleFetchHistory}
                  className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-300 text-xs"
                >
                  Refresh Log
                </button>
              </div>

              {history.length > 0 ? (
                <div className="space-y-2">
                  {history.map((item, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-cyan-300 uppercase tracking-wider text-[10px]">
                            {item.action}
                          </span>
                          <span className="text-slate-300 font-mono text-[11px] truncate max-w-md">
                            {item.target}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {new Date(item.timestamp).toLocaleTimeString()} — Status:{" "}
                          <strong className={item.status === "success" ? "text-emerald-400" : "text-amber-400"}>
                            {item.status}
                          </strong>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-48 border border-dashed border-slate-700 rounded-xl flex items-center justify-center text-slate-500 text-xs">
                  No actions logged yet in this session.
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Safety Guard Active: Form submissions & credentials strictly require explicit user approval</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition"
          >
            Close Panel
          </button>
        </div>

      </div>
    </div>
  );
}

