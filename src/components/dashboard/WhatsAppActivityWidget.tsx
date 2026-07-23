"use client";

import { useEffect, useState } from "react";
import { MessageSquare, Bot } from "lucide-react";
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
      20
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
          <div className="p-1.5 rounded-xl bg-harbor-success/10 text-emerald-700 dark:text-emerald-700 dark:text-emerald-700 dark:text-emerald-300 border border-harbor-success/20">
            <MessageSquare className="h-4 w-4" />
          </div>
          <h3 className="text-base font-semibold text-foreground">
            WhatsApp & Gemini Extraction Feed
          </h3>
        </div>
      </div>

      <div className="space-y-3">
        {feed.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No inbound WhatsApp messages yet. Messages appear here after the webhook persists them.
          </p>
        )}

        {feed.map((msg) => {
          const extraction = byMessage.get(msg.id);
          return (
            <div
              key={msg.id}
              className="p-4 rounded-xl bg-muted border border-border space-y-2.5 hover:border-primary/20 transition-colors duration-200"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">
                  {msg.senderName || msg.sender}
                </span>
                <span className="text-muted-foreground capitalize">
                  {msg.status.replace(/_/g, " ")} · {timeAgo(msg.createdAt)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground italic font-mono bg-muted/70 p-2.5 rounded-xl border border-border">
                &quot;{msg.text || "[non-text message]"}&quot;
              </p>
              {extraction && (
                <div className="flex items-center justify-between pt-1 text-xs">
                  <div className="flex items-center space-x-1.5 text-primary">
                    <Bot className="h-3.5 w-3.5" />
                    <span className="font-medium">
                      {extraction.action?.intent?.replace(/_/g, " ")}: {extraction.action?.title}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-primary/10 text-primary font-semibold border border-primary/20">
                    {Math.round((extraction.action?.confidenceScore || 0) * 100)}% Match
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
