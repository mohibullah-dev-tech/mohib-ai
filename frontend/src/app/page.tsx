"use client";

import { useEffect, useState, useCallback } from "react";
import {
  HealthResponse,
  AssistantInfoResponse,
  getBackendHealth,
  getAssistantInfo,
} from "@/lib/api";

export default function Home() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [info, setInfo] = useState<AssistantInfoResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [latency, setLatency] = useState<number | null>(null);

  const checkStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    const startTime = performance.now();
    try {
      const [healthData, infoData] = await Promise.all([
        getBackendHealth(),
        getAssistantInfo(),
      ]);
      const endTime = performance.now();
      setLatency(Math.round(endTime - startTime));
      setHealth(healthData);
      setInfo(infoData);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to connect to Friday backend");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 15000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-between p-6 sm:p-12 font-sans selection:bg-cyan-500 selection:text-black">
      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none flex justify-center">
        <div className="w-[600px] h-[350px] bg-cyan-600/10 blur-[130px] rounded-full mt-10"></div>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-4xl relative z-10 flex flex-col gap-8">
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-3">
              <span className="w-3.5 h-3.5 rounded-full bg-cyan-400 animate-pulse"></span>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-cyan-400 bg-clip-text text-transparent">
                Mohib AI — Friday
              </h1>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Personal Desktop AI Assistant • বাংলা ও ইংরেজি
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
                health?.status === "healthy"
                  ? "bg-emerald-950/70 text-emerald-400 border-emerald-800/80"
                  : error
                  ? "bg-rose-950/70 text-rose-400 border-rose-800/80"
                  : "bg-amber-950/70 text-amber-400 border-amber-800/80"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  health?.status === "healthy"
                    ? "bg-emerald-400"
                    : error
                    ? "bg-rose-400"
                    : "bg-amber-400"
                }`}
              ></span>
              {loading
                ? "Connecting..."
                : health?.status === "healthy"
                ? "Backend Connected"
                : "Disconnected"}
            </span>

            <button
              onClick={checkStatus}
              disabled={loading}
              className="px-3 py-1 text-xs font-medium rounded-md bg-slate-800 hover:bg-slate-700 transition border border-slate-700 text-slate-200 disabled:opacity-50"
            >
              {loading ? "Checking..." : "Refresh"}
            </button>
          </div>
        </header>

        {/* Bilingual Welcome Hero */}
        <section className="bg-gradient-to-b from-slate-900 to-slate-900/60 border border-slate-800/80 rounded-2xl p-6 sm:p-8 backdrop-blur-md shadow-xl">
          <div className="flex flex-col gap-3">
            <span className="text-xs uppercase font-semibold tracking-wider text-cyan-400">
              Milestone 1 — Foundation Active
            </span>
            <h2 className="text-xl sm:text-2xl font-semibold text-white">
              Hello Mohib, Friday is initialized.
            </h2>
            <p className="text-lg text-slate-300 font-normal">
              হ্যালো মহিব, ফ্রাইডে প্রস্তুত। আপনার সকল কমান্ড সুরক্ষিতভাবে পরিচালনা করতে প্রস্তুত।
            </p>
          </div>
        </section>

        {/* Diagnostics & Connection Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Backend Status Card */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
                Backend Service
              </h3>
              {latency !== null && (
                <span className="text-xs text-slate-400">
                  Latency: <span className="text-cyan-400">{latency} ms</span>
                </span>
              )}
            </div>

            {error ? (
              <div className="p-3 bg-rose-950/40 border border-rose-900/50 rounded-lg text-rose-300 text-xs">
                {error}
                <div className="mt-2 text-[11px] text-slate-400">
                  Ensure the FastAPI backend is running at{" "}
                  <code>http://127.0.0.1:8000</code>.
                </div>
              </div>
            ) : health ? (
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Status</span>
                  <span className="text-emerald-400 font-medium">
                    {health.status}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Assistant Name</span>
                  <span className="text-slate-200 font-mono">
                    {health.assistant}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Version</span>
                  <span className="text-slate-200 font-mono">
                    v{health.version}
                  </span>
                </div>
                {health.details && (
                  <>
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">Python Version</span>
                      <span className="text-slate-200 font-mono">
                        {health.details.python_version}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">Environment</span>
                      <span className="text-slate-200 font-mono">
                        {health.details.environment}
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400">Host OS</span>
                      <span className="text-slate-200">
                        {health.details.os} ({health.details.platform_release})
                      </span>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="text-xs text-slate-500 py-4 text-center">
                Waiting for backend connection...
              </div>
            )}
          </div>

          {/* Security & System Guardrails */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
              Safety Guardrails
            </h3>
            <ul className="space-y-2.5 text-xs text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>
                  <strong>Strict Local Binding:</strong> Backend bound only to{" "}
                  <code className="text-cyan-300">127.0.0.1:8000</code>.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>
                  <strong>Explicit Approvals:</strong> No automatic terminal or file execution.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>
                  <strong>Zero-Cost Architecture:</strong> Browser-native speech and lightweight services.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>
                  <strong>Secret Isolation:</strong> Environment keys never leaked to frontend.
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Feature Matrix / Next Milestones */}
        <section className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-5">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Active Roadmap
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-cyan-950/40 border border-cyan-800/40 text-cyan-200">
              <div className="font-semibold">Milestone 1</div>
              <div className="text-slate-400 text-[11px] mt-1">Foundation (Ready)</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/40 text-slate-400">
              <div className="font-semibold text-slate-300">Milestone 2</div>
              <div className="text-[11px] mt-1">Friday Dashboard</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/40 text-slate-400">
              <div className="font-semibold text-slate-300">Milestone 3</div>
              <div className="text-[11px] mt-1">Voice Engine</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/40 text-slate-400">
              <div className="font-semibold text-slate-300">Milestone 4</div>
              <div className="text-[11px] mt-1">AI Brain</div>
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="w-full max-w-4xl pt-6 pb-2 text-center text-xs text-slate-500 border-t border-slate-900 relative z-10">
        Mohib AI • Built by Mohibullah • Secure Personal Desktop Assistant
      </footer>
    </main>
  );
}
