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

  // Idempotency: a worker retry after a partial failure must not create a
  // second task for the same inbound message.
  if (input.messageId) {
    // Inbound message IDs are globally unique Firestore IDs, so a single-field
    // query is enough and needs no new composite index.
    const existing = await db
      .collection("tasks")
      .where("sourceMessageId", "==", input.messageId)
      .limit(1)
      .get();
    const existingOrgId = existing.docs[0]?.data().orgId;
    if (!existing.empty && existingOrgId === input.orgId) {
      return (existing.docs[0].data().id as string) || existing.docs[0].id;
    }
  }

  const ref = db.collection("tasks").doc();
  const now = FieldValue.serverTimestamp();
  const dueDate = input.action.dueDate
    ? new Date(`${input.action.dueDate}T00:00:00`)
    : null;

  // Resolve assignee against org members (local improvement: inline resolution)
  let assigneeId = "";
  let assigneeName = input.action.assigneeName || "";

  if (assigneeName) {
    try {
      const usersSnap = await db
        .collection("users")
        .where("orgId", "==", input.orgId)
        .get();

      const normalizedAssignee = assigneeName.toLowerCase().trim();
      const matched = usersSnap.docs.find((d) => {
        const name = (d.data().displayName || "").toLowerCase().trim();
        return name === normalizedAssignee || name.includes(normalizedAssignee) || normalizedAssignee.includes(name);
      });

      if (matched) {
        assigneeId = matched.id;
        assigneeName = matched.data().displayName || assigneeName;
      }
    } catch (e) {
      console.warn("Failed to match assignee to org user:", e);
    }
  }

  await ref.set({
    id: ref.id,
    orgId: input.orgId,
    title: input.action.title,
    description: input.action.description,
    status: "todo",
    priority: input.action.priority,
    assigneeId,
    assigneeName,
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