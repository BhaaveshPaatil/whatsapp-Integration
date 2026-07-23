import type { AnalyticsEvent, AnalyticsEventType } from "@/types";
import { getAdminDb } from "@/lib/firebase-admin";

type EventHandler = (event: AnalyticsEvent) => Promise<void> | void;

const handlers = new Map<AnalyticsEventType | "*", Set<EventHandler>>();

export function onEvent(type: AnalyticsEventType | "*", handler: EventHandler): () => void {
  if (!handlers.has(type)) handlers.set(type, new Set());
  handlers.get(type)!.add(handler);
  return () => handlers.get(type)?.delete(handler);
}

export async function publishEvent(input: {
  orgId: string;
  type: AnalyticsEventType;
  messageId?: string;
  taskId?: string;
  meta?: Record<string, unknown>;
}): Promise<AnalyticsEvent> {
  const db = getAdminDb();
  const ref = db.collection("analyticsEvents").doc();
  const event: AnalyticsEvent = {
    id: ref.id,
    orgId: input.orgId,
    type: input.type,
    messageId: input.messageId,
    taskId: input.taskId,
    meta: input.meta,
    createdAt: new Date().toISOString(),
  };

  await ref.set(event);

  const specific = handlers.get(input.type);
  const wildcard = handlers.get("*");
  await Promise.allSettled([
    ...(specific ? Array.from(specific).map((h) => h(event)) : []),
    ...(wildcard ? Array.from(wildcard).map((h) => h(event)) : []),
  ]);

  return event;
}
