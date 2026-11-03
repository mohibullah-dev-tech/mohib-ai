"use client";

import React from "react";
import {
  ShieldAlert,
  AlertTriangle,
  FileCode,
  Terminal,
  Trash2,
  Edit3,
  CheckCircle2,
  XCircle,
  Clock,
  Check,
  X,
} from "lucide-react";
import { ApprovalRequest } from "@/lib/api";

interface ApprovalDialogProps {
  request: ApprovalRequest | null;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string, reason?: string) => Promise<void>;
  isProcessing: boolean;
}

export function ApprovalDialog({
  request,
  onApprove,
  onReject,
  isProcessing,
}: ApprovalDialogProps) {
  if (!request) return null;

  const isDestructive = request.action_type === "destructive";
  const isExecution = request.action_type === "execution";
  const isWrite = request.action_type === "write";

  const renderDetails = () => {
    const details = request.details || {};

    if (details.diff) {
      const diffLines = (details.diff as string).split("\n");
      return (
        <div className="space-y-1.5">
          <div className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">
            <span>Unified Diff Preview:</span>
            <span className="font-mono text-[10px] text-slate-400">
              +{details.new_lines_count ?? 0} / -{details.old_lines_count ?? 0}
            </span>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-[11px] max-h-48 overflow-y-auto space-y-0.5 select-text">
            {diffLines.map((line, idx) => {
              const isAdd = line.startsWith("+");
              const isRem = line.startsWith("-");
              const isHeader = line.startsWith("@") || line.startsWith("---") || line.startsWith("+++");

              return (
                <div
                  key={idx}
                  className={`px-1 py-0.5 rounded ${
                    isAdd
                      ? "bg-emerald-950/60 text-emerald-300"
                      : isRem
                      ? "bg-rose-950/60 text-rose-300"
                      : isHeader
                      ? "text-cyan-400 font-bold"
                      : "text-slate-400"
                  }`}
                >
                  {line}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    if (isExecution) {
      return (
        <div className="space-y-2">
          <div className="text-[11px] font-semibold text-slate-300">
            Command to Execute:
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-xs text-amber-300 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="break-all">{details.command || request.target}</span>
          </div>
          {details.cwd && (
            <div className="text-[10px] text-slate-400 font-mono">
              Working Directory: <span className="text-slate-300">{details.cwd}</span>
            </div>
          )}
        </div>
      );
    }

    if (details.content_preview) {
      return (
        <div className="space-y-1.5">
          <div className="text-[11px] font-semibold text-slate-300">
            Content Preview:
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 max-h-40 overflow-y-auto whitespace-pre-wrap">
            {details.content_preview}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
      <div
        className={`bg-slate-900 border rounded-2xl p-6 max-w-lg w-full space-y-5 shadow-2xl text-slate-200 ${
          isDestructive
            ? "border-rose-700/80 ring-1 ring-rose-500/30"
            : isExecution
            ? "border-amber-700/80 ring-1 ring-amber-500/30"
            : "border-cyan-700/80 ring-1 ring-cyan-500/30"
        }`}
      >
        {/* Header with Risk Icon */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                isDestructive
                  ? "bg-rose-950 text-rose-400 border border-rose-800"
                  : isExecution
                  ? "bg-amber-950 text-amber-400 border border-amber-800"
                  : "bg-cyan-950 text-cyan-400 border border-cyan-800"
              }`}
            >
              {isDestructive ? (
                <Trash2 className="w-5 h-5 animate-pulse" />
              ) : isExecution ? (
                <Terminal className="w-5 h-5" />
              ) : (
                <Edit3 className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">
                  {isDestructive
                    ? "Confirm Destructive Action"
                    : isExecution
                    ? "Authorize Terminal Command"
                    : "Approve File Modification"}
                </h3>
                <span
                  className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full font-bold ${
                    isDestructive
                      ? "bg-rose-950 text-rose-300 border border-rose-700"
                      : isExecution
                      ? "bg-amber-950 text-amber-300 border border-amber-700"
                      : "bg-cyan-950 text-cyan-300 border border-cyan-700"
                  }`}
                >
                  {request.risk_level} Risk
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {request.details.explanation || "Friday requests explicit permission to proceed."}
              </p>
            </div>
          </div>
          <button
            onClick={() => onReject(request.id, "Closed by user")}
            disabled={isProcessing}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Destructive / Execution Warning Banner */}
        {isDestructive && (
          <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-800/80 text-rose-200 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold">সতর্কবার্তা: স্থায়ী ডিলিট অপারেশন!</div>
              <p className="text-[11px] text-rose-300/90 leading-tight">
                এই ফাইলটি আপনার ডিস্ক থেকে স্থায়ীভাবে মুছে ফেলা হবে। এই পরিবর্তন আনডু করা সম্ভব নয়।
              </p>
            </div>
          </div>
        )}

        {isExecution && (
          <div className="p-3 rounded-xl bg-amber-950/70 border border-amber-800/80 text-amber-200 text-xs flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold">টার্মিনাল কমান্ড অনুমোদন</div>
              <p className="text-[11px] text-amber-300/90 leading-tight">
                এই কমান্ডটি আপনার উইন্ডোজ সাব-প্রসেসে চালানো হবে। সম্পূর্ণ কমান্ড ও প্যারামিটার যাচাই করে নিন।
              </p>
            </div>
          </div>
        )}

        {/* Target Details */}
        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs space-y-1">
          <div className="text-[11px] text-slate-400">Target Path:</div>
          <div className="font-mono text-cyan-300 break-all">{request.target}</div>
        </div>

        {/* Diff or Content details */}
        {renderDetails()}

        {/* Single-Use Policy & Expiry Note */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 pt-1">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Single-use permission (expires in 15m)</span>
          </span>
          <span className="text-[10px] text-slate-400">
            ID: <span className="font-mono">{request.id.substring(0, 8)}...</span>
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={() => onReject(request.id, "Rejected by user")}
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition border border-slate-700"
          >
            <XCircle className="w-4 h-4 text-rose-400" />
            <span>Reject (বাতিল করুন)</span>
          </button>
          <button
            type="button"
            onClick={() => onApprove(request.id)}
            disabled={isProcessing}
            className={`flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-xl text-white transition shadow-lg ${
              isDestructive
                ? "bg-rose-600 hover:bg-rose-500 shadow-rose-950/50"
                : isExecution
                ? "bg-amber-600 hover:bg-amber-500 shadow-amber-950/50"
                : "bg-cyan-600 hover:bg-cyan-500 shadow-cyan-950/50"
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {isProcessing
                ? "Executing..."
                : isDestructive
                ? "Confirm & Delete"
                : isExecution
                ? "Authorize & Run"
                : "Approve & Apply"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

