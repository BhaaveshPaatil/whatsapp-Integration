"use client";

import { useState } from "react";
import { Bot, Sparkles, CheckCircle2, RefreshCw, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AILogsPage() {
  const [logs] = useState([
    {
      id: "ai-1",
      model: "Gemini 1.5 Flash",
      inputPrompt: "Please review the Q3 marketing budget deck by Friday 5 PM and assign to Sarah.",
      extractedTitle: "Review Q3 marketing budget deck",
      detectedPriority: "high",
      detectedDueDate: "2026-07-25",
      detectedAssignee: "Sarah Miller",
      confidence: "98%",
      timestamp: "10 mins ago",
    },
    {
      id: "ai-2",
      model: "Gemini 1.5 Flash",
      inputPrompt: "Can someone fix the auth login bug reported on staging as soon as possible?",
      extractedTitle: "Fix auth login bug on staging",
      detectedPriority: "urgent",
      detectedDueDate: "2026-07-23",
      detectedAssignee: "Alex Johnson",
      confidence: "95%",
      timestamp: "45 mins ago",
    },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
            <Bot className="h-6 w-6 text-purple-400" />
            <span>AI Extraction Telemetry & Logs</span>
          </h1>
          <p className="text-xs text-slate-400">
            Real-time Gemini NLP parsing logs, extracted entities, and confidence scores.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-500/10 text-purple-300 border border-purple-500/30 flex items-center space-x-1.5">
            <Cpu className="h-3.5 w-3.5" />
            <span>Gemini Engine Active</span>
          </span>
        </div>
      </div>

      <div className="glass-card rounded-xl p-6 space-y-4">
        <div className="divide-y divide-slate-800">
          {logs.map((log) => (
            <div key={log.id} className="py-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-purple-400">{log.model}</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-400">{log.timestamp}</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-500/10 text-indigo-300 font-semibold border border-indigo-500/20">
                  {log.confidence} Confidence
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-xs font-mono text-slate-300">
                "{log.inputPrompt}"
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-slate-900/40 border border-slate-800/60 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                    Extracted Task Title
                  </span>
                  <span className="font-medium text-slate-200">{log.extractedTitle}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                    Priority / Due Date
                  </span>
                  <span className="font-medium text-slate-200 capitalize">
                    {log.detectedPriority} • {log.detectedDueDate}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                    Detected Assignee
                  </span>
                  <span className="font-medium text-slate-200">{log.detectedAssignee}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
