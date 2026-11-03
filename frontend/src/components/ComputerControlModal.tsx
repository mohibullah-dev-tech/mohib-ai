"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Laptop,
  FolderLock,
  FileText,
  ShieldCheck,
  AlertTriangle,
  Search,
  HardDrive,
  Cpu,
  Terminal,
  Activity,
  Plus,
  Trash2,
  Folder,
  File,
  Code2,
  Layers,
  CheckCircle2,
  XCircle,
  RefreshCw,
  FolderCheck,
} from "lucide-react";
import {
  SystemInfoResponse,
  AllowedDirectory,
  FileEntry,
  ApprovalRequest,
  ActionAuditEntry,
  ProjectInspectionResponse,
  getSystemInfo,
  getAllowedDirectories,
  addAllowedDirectory,
  removeAllowedDirectory,
  listDirectory,
  searchFiles,
  readTextFile,
  getPendingActions,
  approveAction,
  rejectAction,
  getActionHistory,
  inspectProject,
} from "@/lib/api";

interface ComputerControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenApproval: (req: ApprovalRequest) => void;
  pendingCount: number;
  onRefreshPending: () => void;
}

export function ComputerControlModal({
  isOpen,
  onClose,
  onOpenApproval,
  pendingCount,
  onRefreshPending,
}: ComputerControlModalProps) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "folders" | "files" | "inspector" | "history"
  >("overview");

  const [sysInfo, setSysInfo] = useState<SystemInfoResponse | null>(null);
  const [allowedDirs, setAllowedDirs] = useState<AllowedDirectory[]>([]);
  const [newDirInput, setNewDirInput] = useState<string>("");
  const [pendingReqs, setPendingReqs] = useState<ApprovalRequest[]>([]);
  const [auditLog, setAuditLog] = useState<ActionAuditEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // File explorer states
  const [currentFolder, setCurrentFolder] = useState<string>("");
  const [filesList, setFilesList] = useState<FileEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filePreview, setFilePreview] = useState<{
    path: string;
    content: string;
    lines: number;
  } | null>(null);

  // Project inspector state
  const [projectData, setProjectData] = useState<ProjectInspectionResponse | null>(null);
  const [inspecting, setInspecting] = useState<boolean>(false);

  // Load initial data when modal opens
  useEffect(() => {
    if (isOpen) {
      loadInitialData();
    }
  }, [isOpen]);

  const loadInitialData = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [info, dirs, pending, history] = await Promise.all([
        getSystemInfo().catch(() => null),
        getAllowedDirectories().catch(() => []),
        getPendingActions().catch(() => []),
        getActionHistory().catch(() => []),
      ]);

      if (info) setSysInfo(info);
      setAllowedDirs(dirs);
      setPendingReqs(pending);
      setAuditLog(history);

      if (dirs.length > 0 && !currentFolder) {
        setCurrentFolder(dirs[0].path);
        loadFiles(dirs[0].path);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load computer agent data");
    } finally {
      setLoading(false);
    }
  };

  const loadFiles = async (folderPath: string) => {
    try {
      const entries = await listDirectory(folderPath);
      setFilesList(entries);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to list directory");
    }
  };

  const handleAddFolder = async () => {
    if (!newDirInput.trim()) return;
    setErrorMessage(null);
    try {
      await addAllowedDirectory(newDirInput.trim());
      setNewDirInput("");
      const updated = await getAllowedDirectories();
      setAllowedDirs(updated);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to add directory");
    }
  };

  const handleRemoveFolder = async (path: string) => {
    setErrorMessage(null);
    try {
      await removeAllowedDirectory(path);
      const updated = await getAllowedDirectories();
      setAllowedDirs(updated);
      if (currentFolder === path) {
        setCurrentFolder(updated[0]?.path || "");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to remove directory");
    }
  };

  const handleFileSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      if (currentFolder) loadFiles(currentFolder);
      return;
    }
    try {
      const results = await searchFiles(searchQuery.trim(), currentFolder || undefined);
      setFilesList(results);
    } catch (err: any) {
      setErrorMessage(err.message || "Search failed");
    }
  };

  const handleReadFile = async (path: string) => {
    setErrorMessage(null);
    try {
      const res = await readTextFile(path);
      setFilePreview({
        path: res.path,
        content: res.content,
        lines: res.lines,
      });
    } catch (err: any) {
      setErrorMessage(err.message || "Cannot read file");
    }
  };

  const handleRunInspector = async () => {
    setInspecting(true);
    setErrorMessage(null);
    try {
      const data = await inspectProject(currentFolder || undefined);
      setProjectData(data);
    } catch (err: any) {
      setErrorMessage(err.message || "Inspection failed");
    } finally {
      setInspecting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-3xl w-full space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-800 text-cyan-400 flex items-center justify-center">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">
                  Safe Windows Computer Control
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                  {sysInfo?.agent_status === "online" ? "● LOCAL AGENT ONLINE" : "OFFLINE"}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Safe desktop automation confined to user-permitted folders only.
              </p>
            </div>
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
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-1.5 px-3 py-2 font-semibold border-b-2 transition ${
              activeTab === "overview"
                ? "border-cyan-500 text-cyan-300 bg-cyan-950/20"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Dashboard & Approvals</span>
            {pendingReqs.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[10px] font-bold animate-pulse">
                {pendingReqs.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("folders")}
            className={`flex items-center gap-1.5 px-3 py-2 font-semibold border-b-2 transition ${
              activeTab === "folders"
                ? "border-cyan-500 text-cyan-300 bg-cyan-950/20"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <FolderLock className="w-3.5 h-3.5" />
            <span>Allowed Folders ({allowedDirs.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("files")}
            className={`flex items-center gap-1.5 px-3 py-2 font-semibold border-b-2 transition ${
              activeTab === "files"
                ? "border-cyan-500 text-cyan-300 bg-cyan-950/20"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>File Browser</span>
          </button>
          <button
            onClick={() => setActiveTab("inspector")}
            className={`flex items-center gap-1.5 px-3 py-2 font-semibold border-b-2 transition ${
              activeTab === "inspector"
                ? "border-cyan-500 text-cyan-300 bg-cyan-950/20"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Project Inspector</span>
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-1.5 px-3 py-2 font-semibold border-b-2 transition ${
              activeTab === "history"
                ? "border-cyan-500 text-cyan-300 bg-cyan-950/20"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Audit Trail</span>
          </button>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-900 text-rose-200 text-xs flex items-center justify-between">
            <span className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              {errorMessage}
            </span>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-xs underline text-rose-300"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* TAB 1: OVERVIEW & PENDING APPROVALS */}
        {activeTab === "overview" && (
          <div className="space-y-4 animate-fadeIn">
            {/* System Status Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Laptop className="w-3.5 h-3.5 text-cyan-400" /> Host System
                </div>
                <div className="font-bold text-slate-100 truncate">
                  {sysInfo?.os || "Windows"} {sysInfo?.os_release || ""}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Cpu className="w-3.5 h-3.5 text-cyan-400" /> CPU Cores
                </div>
                <div className="font-bold text-slate-100">
                  {sysInfo?.cpu_cores || 1} Logical Cores
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                  <HardDrive className="w-3.5 h-3.5 text-cyan-400" /> Disk Free
                </div>
                <div className="font-bold text-slate-100">
                  {sysInfo?.disk ? `${sysInfo.disk.free_gb} GB` : "Accessible"}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Local Binding
                </div>
                <div className="font-mono text-cyan-300 truncate">
                  {sysInfo?.binding || "127.0.0.1:8000"}
                </div>
              </div>
            </div>

            {/* Pending Approvals Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  Pending Permission Requests ({pendingReqs.length})
                </label>
                <button
                  onClick={loadInitialData}
                  className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Refresh
                </button>
              </div>

              {pendingReqs.length === 0 ? (
                <div className="p-5 rounded-xl bg-slate-950/40 border border-dashed border-slate-800 text-center text-xs text-slate-400 space-y-1">
                  <CheckCircle2 className="w-5 h-5 mx-auto text-emerald-400 mb-1" />
                  <p className="font-medium text-slate-300">No actions waiting for approval.</p>
                  <p className="text-[11px] text-slate-400">
                    Whenever Friday proposes writing files, modifying code, or running commands, an approval card will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingReqs.map((req) => (
                    <div
                      key={req.id}
                      className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5 truncate">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded font-mono ${
                              req.risk_level === "critical"
                                ? "bg-rose-950 text-rose-300 border border-rose-800"
                                : req.risk_level === "high"
                                ? "bg-amber-950 text-amber-300 border border-amber-800"
                                : "bg-cyan-950 text-cyan-300 border border-cyan-800"
                            }`}
                          >
                            {req.risk_level} Risk
                          </span>
                          <span className="font-bold text-slate-200">
                            {req.action_name}
                          </span>
                        </div>
                        <div className="text-[11px] text-cyan-400 font-mono truncate">
                          {req.target}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => onOpenApproval(req)}
                          className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition shadow-sm"
                        >
                          Review & Decide
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Strict Confinement Security Rules Notice */}
            <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
              <div className="font-bold text-slate-200 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Windows Agent Confinement & Safety Guarantees
              </div>
              <ul className="list-disc pl-5 space-y-0.5 text-slate-400 leading-relaxed">
                <li><strong>Localhost Only:</strong> সার্ভিসটি কেবল <code>127.0.0.1</code> এ আবদ্ধ এবং বাইরের ইন্টারনেট থেকে নিরাপদ।</li>
                <li><strong>No Directory Traversal:</strong> অনুমোদিত ফোল্ডারের বাইরে (যেমন <code>C:\Windows</code>) কোনো অ্যাক্সেস সম্ভব নয়।</li>
                <li><strong>Zero Auto-Execution:</strong> কোনো ফাইল সংশোধন বা কমান্ড আপনার অনুমোদন ছাড়া কখনই নিজে নিজে রান হবে না।</li>
                <li><strong>Protected Secrets:</strong> <code>.env</code> ফাইল, ব্রাউজার ডাটা বা পাসওয়ার্ড কখনই রিড বা এক্সপোজ করা হয় না।</li>
              </ul>
            </div>
          </div>
        )}

        {/* TAB 2: ALLOWED FOLDERS */}
        {activeTab === "folders" && (
          <div className="space-y-4 animate-fadeIn">
            {/* Add folder input */}
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-cyan-400" />
                Add Permitted Folder Path (অনুমোদিত ফোল্ডার পাথ যোগ করুন)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. C:\Mohibullah\Projects\my-project"
                  value={newDirInput}
                  onChange={(e) => setNewDirInput(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
                <button
                  onClick={handleAddFolder}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs rounded-xl transition shadow-sm"
                >
                  Add Folder
                </button>
              </div>
            </div>

            {/* Folders List */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Active Allowed Folders
              </label>
              <div className="space-y-2">
                {allowedDirs.map((dir, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <FolderLock className="w-4 h-4 text-cyan-400 shrink-0" />
                      <div className="truncate">
                        <div className="font-bold text-slate-200 truncate">
                          {dir.name}
                        </div>
                        <div className="font-mono text-[11px] text-slate-400 truncate">
                          {dir.path}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-slate-400">
                        {dir.files_count ?? 0} files / {dir.folders_count ?? 0} folders
                      </span>
                      {allowedDirs.length > 1 && (
                        <button
                          onClick={() => handleRemoveFolder(dir.path)}
                          className="p-1 rounded text-rose-400 hover:bg-rose-950 hover:text-rose-300 transition"
                          title="Remove from allowed list"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: FILE EXPLORER */}
        {activeTab === "files" && (
          <div className="space-y-3 animate-fadeIn text-xs">
            {/* Search Bar */}
            <form onSubmit={handleFileSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search files by name within allowed folders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs rounded-xl transition"
              >
                Search
              </button>
            </form>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Files list */}
              <div className="border border-slate-800 rounded-xl bg-slate-950/60 p-2 max-h-80 overflow-y-auto space-y-1">
                <div className="text-[11px] font-semibold text-slate-400 px-2 py-1">
                  Directory Files:
                </div>
                {filesList.map((f, idx) => (
                  <button
                    key={idx}
                    onClick={() => (!f.is_dir && f.is_text ? handleReadFile(f.path) : null)}
                    className="w-full text-left p-2 rounded-lg hover:bg-slate-900 flex items-center justify-between text-xs transition"
                  >
                    <div className="flex items-center gap-2 truncate">
                      {f.is_dir ? (
                        <Folder className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      ) : (
                        <File className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      )}
                      <span className="truncate text-slate-300">{f.name}</span>
                    </div>
                    {!f.is_dir && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        {Math.round(f.size_bytes / 1024)} KB
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Text File Preview */}
              <div className="border border-slate-800 rounded-xl bg-slate-950/80 p-3 max-h-80 overflow-y-auto font-mono text-[11px] text-slate-300">
                {filePreview ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-1">
                      <span className="truncate">{filePreview.path}</span>
                      <span>{filePreview.lines} lines</span>
                    </div>
                    <pre className="whitespace-pre-wrap select-text">
                      {filePreview.content}
                    </pre>
                  </div>
                ) : (
                  <div className="text-center text-slate-400 pt-16">
                    Click any text or code file on the left to preview contents safely.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: DEVELOPER PROJECT INSPECTOR */}
        {activeTab === "inspector" && (
          <div className="space-y-4 animate-fadeIn text-xs">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
              <div>
                <h4 className="font-bold text-slate-100 flex items-center gap-1.5">
                  <Code2 className="w-4 h-4 text-cyan-400" />
                  Codebase & Project Architecture Inspector
                </h4>
                <p className="text-[11px] text-slate-400">
                  Analyze permitted project structure, identify technology stack, and review key files.
                </p>
              </div>
              <button
                onClick={handleRunInspector}
                disabled={inspecting}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl transition flex items-center gap-1.5 shadow-sm"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${inspecting ? "animate-spin" : ""}`} />
                <span>{inspecting ? "Analyzing..." : "Inspect Project"}</span>
              </button>
            </div>

            {projectData ? (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <div className="font-bold text-slate-200">
                    Detected Tech Stack:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {projectData.tech_stack.map((item, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-300 font-mono text-[11px] font-semibold"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                  <div className="font-bold text-slate-200">
                    Friday Project Overview:
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    🇧🇩 {projectData.summary_bn}
                  </p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    🇺🇸 {projectData.summary_en}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <div className="font-bold text-slate-200">
                    Key Configuration Files ({projectData.key_files.length}):
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                    {projectData.key_files.map((kf, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded bg-slate-900 border border-slate-800 text-slate-300 truncate"
                      >
                        📄 {kf.relative_path} ({Math.round(kf.size_bytes / 1024)} KB)
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-slate-950/40 border border-dashed border-slate-800 text-center text-xs text-slate-400 space-y-1">
                <Layers className="w-6 h-6 mx-auto text-slate-500 mb-1" />
                <p>Click "Inspect Project" to analyze the current workspace architecture.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: AUDIT LOG */}
        {activeTab === "history" && (
          <div className="space-y-2 animate-fadeIn text-xs">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-300 uppercase tracking-wider text-xs">
                Recent Security Audit Events
              </label>
              <button
                onClick={loadInitialData}
                className="text-cyan-400 hover:underline flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Refresh
              </button>
            </div>

            <div className="space-y-1.5 max-h-80 overflow-y-auto">
              {auditLog.map((entry, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center justify-between text-[11px]"
                >
                  <div className="space-y-0.5 truncate pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-200">
                        {entry.action_name}
                      </span>
                      <span
                        className={`font-mono text-[9px] px-1 rounded uppercase ${
                          entry.status === "executed" || entry.status === "success"
                            ? "bg-emerald-950 text-emerald-300"
                            : entry.status === "rejected"
                            ? "bg-rose-950 text-rose-300"
                            : "bg-amber-950 text-amber-300"
                        }`}
                      >
                        {entry.status}
                      </span>
                    </div>
                    <div className="font-mono text-[10px] text-slate-400 truncate">
                      {entry.target}
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono shrink-0">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs text-slate-400">
          <span>Confined to {allowedDirs.length} permitted folders.</span>
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

