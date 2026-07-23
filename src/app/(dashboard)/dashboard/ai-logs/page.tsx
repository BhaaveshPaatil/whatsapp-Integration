"use client";

import { useEffect, useState } from "react";
import { Bot, Cpu } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { subscribeToAiExtractions } from "@/lib/services/pipelineClient";
import type { AiExtractionRecord } from "@/types";

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms) || ms < 0) return "just now";
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? "" : "s"} ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AILogsPage() {
  const { user } = useAuthStore();
  const [logs, setLogs] = useState<AiExtractionRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.orgId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsub = subscribeToAiExtractions(
      user.orgId,
      (rows) => {
        setLogs(rows);
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user?.orgId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight flex items-center space-x-2">
            <Bot className="h-6 w-6 text-indigo-300" />
            <span>AI Extraction Telemetry & Logs</span>
          </h1>
          <p className="text-xs text-muted-foreground">
            Live Gemini intent extractions from the async processing pipeline.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-indigo-200 border border-primary/25 flex items-center space-x-1.5">
            <Cpu className="h-3.5 w-3.5" />
            <span>Pipeline Worker</span>
          </span>
        </div>
      </div>

      <div className="harbor-card p-6 space-y-4">
        {loading && (
          <p className="text-sm text-muted-foreground">Loading extraction logs…</p>
        )}
        {error && <p className="text-sm text-red-400">{error}</p>}
        {!loading && !error && logs.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No extractions yet. Inbound WhatsApp messages will appear here after the worker runs.
          </p>
        )}

        <div className="divide-y divide-border">
          {logs.map((log) => (
            <div key={log.id} className="py-4 space-y-3">
              <div className="flex items-center justify-between text-xs gap-2 flex-wrap">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-indigo-300">{log.model}</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-muted-foreground">{timeAgo(log.createdAt)}</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-muted-foreground">{log.latencyMs}ms</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-harbor-surfaceAlt text-muted-foreground font-semibold border border-border capitalize">
                    {log.outcome.replace(/_/g, " ")}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-primary/10 text-indigo-200 font-semibold border border-primary/20">
                    {Math.round((log.action?.confidenceScore || 0) * 100)}% Confidence
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-harbor-surfaceAlt border border-border text-xs font-mono text-harbor-secondary">
                &quot;{log.inputText}&quot;
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-harbor-surfaceAlt/70 border border-border text-xs">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                    Intent
                  </span>
                  <span className="font-medium text-foreground capitalize">
                    {(log.action?.intent || "—").replace(/_/g, " ")}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                    Extracted Title
                  </span>
                  <span className="font-medium text-foreground">{log.action?.title || "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                    Priority / Due
                  </span>
                  <span className="font-medium text-foreground capitalize">
                    {log.action?.priority || "—"}
                    {log.action?.dueDate ? ` • ${log.action.dueDate}` : ""}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                    Assignee
                  </span>
                  <span className="font-medium text-foreground">
                    {log.action?.assigneeName || "—"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
