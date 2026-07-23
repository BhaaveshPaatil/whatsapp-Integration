import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { textSimilarity } from "@/lib/pipeline/normalize";
import type { StructuredAiAction, TaskStatus } from "@/types";

export interface OpenTaskSummary {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: string;
  labels: string[];
}

const OPEN_STATUSES: TaskStatus[] = ["todo", "in_progress", "in_review"];
const LINK_THRESHOLD = 0.5;

export async function listOpenTasks(orgId: string, limit = 40): Promise<OpenTaskSummary[]> {
  const db = getAdminDb();
  const snap = await db.collection("tasks").where("orgId", "==", orgId).limit(80).get();

  return snap.docs
    .map((d) => {
      const data = d.data();
      return {
        id: data.id || d.id,
        title: data.title || "",
        description: data.description || "",
        status: data.status as TaskStatus,
        priority: data.priority || "medium",
        labels: data.labels || [],
      };
    })
    .filter((t) => OPEN_STATUSES.includes(t.status))
    .slice(0, limit);
}

export async function findBestMatchingTask(
  orgId: string,
  action: StructuredAiAction
): Promise<{ task: OpenTaskSummary; score: number } | null> {
  const open = await listOpenTasks(orgId);
  const hint = action.relatedTaskHint || action.title;
  let best: { task: OpenTaskSummary; score: number } | null = null;

  for (const task of open) {
    const score = Math.max(
      textSimilarity(hint, task.title),
      textSimilarity(action.title, task.title),
      textSimilarity(action.description, `${task.title} ${task.description}`)
    );
    if (!best || score > best.score) {
      best = { task, score };
    }
  }

  if (!best || best.score < LINK_THRESHOLD) return null;
  return best;
}

export async function createTaskFromAction(input: {
  orgId: string;
  action: StructuredAiAction;
  createdBy: string;
  source: "whatsapp" | "ai_extracted";
  messageId?: string;
}): Promise<string> {
  const db = getAdminDb();
  const ref = db.collection("tasks").doc();
  const now = FieldValue.serverTimestamp();
  const dueDate = input.action.dueDate
    ? new Date(`${input.action.dueDate}T00:00:00`)
    : null;

  await ref.set({
    id: ref.id,
    orgId: input.orgId,
    title: input.action.title,
    description: input.action.description,
    status: "todo",
    priority: input.action.priority,
    assigneeId: "",
    assigneeName: input.action.assigneeName || "",
    createdBy: input.createdBy,
    dueDate: dueDate && !Number.isNaN(dueDate.getTime()) ? dueDate : null,
    labels: input.action.labels || [],
    source: input.source,
    sourceMessageId: input.messageId || null,
    createdAt: now,
    updatedAt: now,
  });

  return ref.id;
}

export async function updateTaskFromAction(
  taskId: string,
  action: StructuredAiAction,
  extras?: Record<string, unknown>
): Promise<void> {
  const db = getAdminDb();
  const updates: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
    ...extras,
  };

  if (action.title) updates.title = action.title;
  if (action.description) updates.description = action.description;
  if (action.priority) updates.priority = action.priority;
  if (action.assigneeName) updates.assigneeName = action.assigneeName;
  if (action.labels?.length) updates.labels = action.labels;
  if (action.dueDate) {
    const due = new Date(`${action.dueDate}T00:00:00`);
    if (!Number.isNaN(due.getTime())) updates.dueDate = due;
  }

  await db.collection("tasks").doc(taskId).update(updates);
}

export async function closeTask(taskId: string): Promise<void> {
  const db = getAdminDb();
  await db.collection("tasks").doc(taskId).update({
    status: "completed",
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function createNotification(input: {
  orgId: string;
  userId: string;
  title: string;
  message: string;
  type: "task_assigned" | "whatsapp_message" | "comment" | "ai_extraction" | "needs_review";
  relatedId?: string;
}) {
  const db = getAdminDb();
  const ref = db.collection("notifications").doc();
  await ref.set({
    id: ref.id,
    orgId: input.orgId,
    userId: input.userId,
    title: input.title,
    message: input.message,
    type: input.type,
    relatedId: input.relatedId || null,
    read: false,
    createdAt: new Date().toISOString(),
  });
}

export async function notifyOrgAdmins(
  orgId: string,
  payload: Omit<Parameters<typeof createNotification>[0], "userId" | "orgId">
) {
  const db = getAdminDb();
  const snap = await db
    .collection("users")
    .where("orgId", "==", orgId)
    .where("role", "==", "admin")
    .get();

  await Promise.all(
    snap.docs.map((d) =>
      createNotification({
        orgId,
        userId: d.id,
        ...payload,
      })
    )
  );
}
