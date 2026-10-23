"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bot, Cpu, Activity, CheckCircle2 } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import {
  subscribeToAiExtractions,
  subscribeToProcessingLogs,
} from "@/lib/services/pipelineClient";
import type { AiExtractionRecord, ProcessingLog } from "@/types";

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

const OUTCOME_STYLES: Record<string, string> = {
  auto_created: "bg-harbor-success/10 text-emerald-700 dark:text-emerald-300 border-harbor-success/25",
  both_created: "bg-harbor-success/10 text-emerald-700 dark:text-emerald-300 border-harbor-success/25",
  contact_created: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/25",
  updated_existing: "bg-primary/10 text-primary border-primary/25",
  needs_review: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25",
  ignored: "bg-muted text-muted-foreground border-border",
  duplicate: "bg-muted text-muted-foreground border-border",
  failed: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/25",
};

function outcomeClass(outcome: string): string {
  return OUTCOME_STYLES[outcome] || "bg-muted text-muted-foreground border-border";
}

export default function AILogsPage() {
  const { user } = useAuthStore();
  const [logs, setLogs] = useState<AiExtractionRecord[]>([]);
  const [pipelineLogs, setPipelineLogs] = useState<ProcessingLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.orgId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    let extractionsReady = false;
    let pipelineReady = false;

    const markReady = () => {
      if (extractionsReady && pipelineReady) setLoading(false);
    };

    const unsubExtractions = subscribeToAiExtractions(
      user.orgId,
      (rows) => {
        setLogs(rows);
        setError(null);
        extractionsReady = true;
        markReady();
      },
      (err) => {
        setError(err.message);
        extractionsReady = true;
        markReady();
      }
    );

    const unsubPipeline = subscribeToProcessingLogs(
      user.orgId,
      (rows) => {
        setPipelineLogs(rows);
        pipelineReady = true;
        markReady();
      },
      (err) => {
        setError((current) => current || err.message);
        pipelineReady = true;
        markReady();
      }
    );

    return () => {
      unsubExtractions();
      unsubPipeline();
    };
  }, [user?.orgId]);

  const errorCount = useMemo(
    () =>
      logs.filter((log) => log.outcome === "failed" || Boolean(log.error)).length +
      pipelineLogs.filter((log) => log.level === "error").length,
    [logs, pipelineLogs]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight flex items-center space-x-2">
            <Bot className="h-6 w-6 text-primary" />
            <span>AI Extraction Telemetry &amp; Logs</span>
          </h1>
          <p className="text-xs text-muted-foreground">
            Live Gemini extractions and pipeline processing records for your organization.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {errorCount > 0 ? (
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/25 flex items-center space-x-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>{errorCount} error{errorCount === 1 ? "" : "s"}</span>
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-harbor-success/10 text-emerald-700 dark:text-emerald-300 border border-harbor-success/25 flex items-center space-x-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>No errors</span>
            </span>
          )}
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/25 flex items-center space-x-1.5">
            <Cpu className="h-3.5 w-3.5" />
            <span>Pipeline Worker</span>
          </span>
        </div>
      </div>

      {error && (
        <div className="p-3 text-xs text-red-700 dark:text-red-300 bg-red-500/10 border border-red-500/25 rounded-xl">
          {error}
        </div>
      )}

      <div className="harbor-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Extraction records</h2>
          <span className="text-xs text-muted-foreground">{logs.length} records</span>
        </div>

        {loading && (
          <p className="text-sm text-muted-foreground">Loading extraction logs...</p>
        )}
        {!loading && logs.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No extractions yet. Inbound WhatsApp messages will appear here after the worker runs.
          </p>
        )}

        <div className="divide-y divide-border">
          {logs.map((log) => (
            <div key={log.id} className="py-4 space-y-3">
              <div className="flex items-center justify-between text-xs gap-2 flex-wrap">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-primary">{log.model}</span>
                  <span className="text-muted-foreground">|</span>
                  <span className="text-muted-foreground">{timeAgo(log.createdAt)}</span>
                  <span className="text-muted-foreground">|</span>
                  <span className="text-muted-foreground">{log.latencyMs}ms</span>
                  <span className="text-muted-foreground">|</span>
                  <span className="text-muted-foreground font-mono text-[10px]">
                    msg {log.messageId.slice(0, 8)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize ${outcomeClass(
                      log.outcome
                    )}`}
                  >
                    {log.outcome.replace(/_/g, " ")}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-primary/10 text-primary font-semibold border border-primary/20">
                    {Math.round((log.action?.confidenceScore || 0) * 100)}% confidence
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-muted border border-border text-xs font-mono text-muted-foreground break-words">
                &quot;{log.inputText || "[empty message]"}&quot;
              </div>

              {log.error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span className="break-words">{log.error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-muted/70 border border-border text-xs">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                    Intent
                  </span>
                  <span className="font-medium text-foreground capitalize">
                    {(log.action?.intent || "-").replace(/_/g, " ")}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                    Extracted Title
                  </span>
                  <span className="font-medium text-foreground">
                    {log.action?.title || "-"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                    Priority / Due
                  </span>
                  <span className="font-medium text-foreground capitalize">
                    {log.action?.priority || "-"}
                    {log.action?.dueDate ? ` | ${log.action.dueDate}` : ""}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                    Assignee
                  </span>
                  <span className="font-medium text-foreground">
                    {log.action?.assigneeName || "-"}
                  </span>
                </div>
              </div>

              {(log.taskId || log.contactId) && (
                <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground font-mono">
                  {log.taskId && <span>task: {log.taskId}</span>}
                  {log.contactId && <span>contact: {log.contactId}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="harbor-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Pipeline activity
          </h2>
          <span className="text-xs text-muted-foreground">
            {pipelineLogs.length} records
          </span>
        </div>

        {!loading && pipelineLogs.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No processing records yet. Webhook persistence and worker stages will appear here.
          </p>
        )}

        <div className="divide-y divide-border">
          {pipelineLogs.map((log) => (
            <div
              key={log.id}
              className="py-3 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs"
            >
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border uppercase ${
                    log.level === "error"
                      ? "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/25"
                      : log.level === "warn"
                      ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25"
                      : "bg-primary/10 text-primary border-primary/25"
                  }`}
                >
                  {log.level}
                </span>
                <span className="font-medium text-foreground capitalize min-w-[80px]">
                  {log.stage}
                </span>
                <span className="text-muted-foreground">{timeAgo(log.createdAt)}</span>
              </div>
              <span className="text-muted-foreground break-words">{log.detail}</span>
              <span className="text-muted-foreground font-mono text-[10px] sm:ml-auto shrink-0">
                msg {log.messageId.slice(0, 8)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
