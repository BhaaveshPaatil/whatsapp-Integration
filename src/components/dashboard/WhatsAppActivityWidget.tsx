"use client";

import { useEffect, useState } from "react";
import { MessageSquare, Bot, AlertTriangle, CheckCircle2, HelpCircle, ArrowRight, XCircle } from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import {
  subscribeToAiExtractions,
  subscribeToWhatsAppMessages,
} from "@/lib/services/pipelineClient";
import type { AiExtractionRecord, InboundMessage } from "@/types";

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms) || ms < 0) return "just now";
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function WhatsAppActivityWidget() {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<InboundMessage[]>([]);
  const [extractions, setExtractions] = useState<AiExtractionRecord[]>([]);

  useEffect(() => {
    if (!user?.orgId) return;

    const unsubMsg = subscribeToWhatsAppMessages(
      user.orgId,
      setMessages,
      () => setMessages([])
    );
    const unsubAi = subscribeToAiExtractions(
      user.orgId,
      setExtractions,
      () => setExtractions([]),
      25
    );

    return () => {
      unsubMsg();
      unsubAi();
    };
  }, [user?.orgId]);

  const byMessage = new Map(extractions.map((e) => [e.messageId, e]));
  const feed = messages.slice(0, 5);

  return (
    <div className="harbor-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-xl bg-harbor-success/10 text-emerald-700 dark:text-emerald-300 border border-harbor-success/20">
            <MessageSquare className="h-4 w-4" />
          </div>
          <h3 className="text-base font-semibold text-foreground">
            WhatsApp & AI Task Automation Feed
          </h3>
        </div>
        <Link
          href="/dashboard/whatsapp"
          className="text-xs text-primary hover:underline flex items-center space-x-1"
        >
          <span>View Hub</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="space-y-3">
        {feed.length === 0 && (
          <p className="text-xs text-muted-foreground py-4 text-center">
            No inbound WhatsApp messages yet. Messages sent to your registered Meta number will automatically appear here.
          </p>
        )}

        {feed.map((msg) => {
          const extraction = byMessage.get(msg.id);
          const isFailed = msg.status === "failed";
          const isNeedsReview = msg.status === "needs_review" || extraction?.outcome === "needs_review";
          const isIgnored = msg.status === "ignored" || extraction?.outcome === "ignored";
          const isCompleted = msg.status === "completed" || extraction?.outcome === "auto_created" || extraction?.outcome === "updated_existing";

          return (
            <div
              key={msg.id}
              className="p-4 rounded-xl bg-muted border border-border space-y-2.5 hover:border-primary/20 transition-colors duration-200"
            >
              {/* Header: Sender and Status Badge */}
              <div className="flex items-center justify-between text-xs gap-2 flex-wrap">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-foreground">
                    {msg.senderName || msg.sender}
                  </span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground">{timeAgo(msg.createdAt)}</span>
                </div>

                <div className="flex items-center space-x-2">
                  {isFailed && (
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                      <XCircle className="h-3 w-3" />
                      <span>Failed</span>
                    </span>
                  )}

                  {isNeedsReview && (
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      <AlertTriangle className="h-3 w-3" />
                      <span>Ambiguous (Review Required)</span>
                    </span>
                  )}

                  {isIgnored && (
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-500/20">
                      <HelpCircle className="h-3 w-3" />
                      <span>Non-Actionable (Stored)</span>
                    </span>
                  )}

                  {isCompleted && (
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Actionable (Task Created)</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Message Content */}
              <p className="text-xs text-foreground/90 italic font-mono bg-muted/70 p-2.5 rounded-xl border border-border">
                &quot;{msg.text || "[non-text message]"}&quot;
              </p>

              {/* Error Message if Failed */}
              {isFailed && msg.error && (
                <div className="p-2 text-xs text-red-600 dark:text-red-400 bg-red-500/5 rounded-lg border border-red-500/20">
                  <span className="font-semibold">Error: </span>
                  {msg.error}
                </div>
              )}

              {/* Extraction Details */}
              {extraction && (
                <div className="pt-1 text-xs space-y-1.5 border-t border-border/60">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 text-primary font-medium">
                      <Bot className="h-3.5 w-3.5" />
                      <span>{extraction.action?.title}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-primary/10 text-primary font-semibold border border-primary/20">
                      {Math.round((extraction.action?.confidenceScore || 0) * 100)}% Confidence
                    </span>
                  </div>

                  {/* Metadata: Priority, Due Date, Assignee */}
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                    <span className="capitalize">Priority: <strong className="text-foreground">{extraction.action?.priority}</strong></span>
                    {extraction.action?.dueDate && (
                      <span>Due: <strong className="text-foreground">{extraction.action.dueDate}</strong></span>
                    )}
                    {extraction.action?.assigneeName && (
                      <span>Assignee: <strong className="text-foreground">{extraction.action.assigneeName}</strong></span>
                    )}
                    {extraction.taskId && (
                      <Link
                        href="/dashboard/tasks"
                        className="text-primary hover:underline font-semibold ml-auto flex items-center space-x-1"
                      >
                        <span>View in Tasks</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
