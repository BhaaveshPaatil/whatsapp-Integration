import { extractStructuredAction } from "@/lib/services/gemini";
import { routeByConfidence } from "@/lib/pipeline/confidence";
import { publishEvent } from "@/lib/pipeline/events";
import {
  getConversationContext,
  getInboundMessage,
  getQueueItem,
  saveAiExtraction,
  updateMessageStatus,
  updateQueueItem,
  writeProcessingLog,
} from "@/lib/pipeline/store";
import {
  closeTask,
  createTaskFromAction,
  findBestMatchingTask,
  listOpenTasks,
  notifyOrgAdmins,
  updateTaskFromAction,
} from "@/lib/pipeline/task-actions";
import { getAdminDb } from "@/lib/firebase-admin";
import type { AiExtractionOutcome, ProcessingQueueItem, StructuredAiAction } from "@/types";

/** Lease duration: if a worker crashes, the job becomes claimable after this period */
const LEASE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Atomically claim a queue job using a Firestore transaction.
 * Returns the updated queue item if claimed, or null if already claimed/completed.
 */
async function claimQueueJob(queueId: string): Promise<{ queueItem: ProcessingQueueItem; attempts: number } | null> {
  const db = getAdminDb();
  const ref = db.collection("processingQueue").doc(queueId);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return null;

    const item = snap.data() as ProcessingQueueItem;

    // Already completed or dead — skip
    if (item.status === "completed" || item.status === "dead") return null;

    // Currently processing — check lease expiry
    if (item.status === "processing" && item.lockedAt) {
      const lockTime = new Date(item.lockedAt).getTime();
      if (Date.now() - lockTime < LEASE_DURATION_MS) {
        // Another worker is actively processing this — skip
        return null;
      }
      // Lease expired — reclaim
    }

    const attempts = (item.attempts || 0) + 1;
    const now = new Date().toISOString();
    const leaseExpiresAt = new Date(Date.now() + LEASE_DURATION_MS).toISOString();

    tx.update(ref, {
      status: "processing",
      attempts,
      lockedAt: now,
      leaseExpiresAt,
      updatedAt: now,
    });

    return { queueItem: { ...item, status: "processing" as const, attempts, lockedAt: now }, attempts };
  });
}

export async function processQueueJob(queueId: string): Promise<{
  ok: boolean;
  outcome?: AiExtractionOutcome;
  error?: string;
}> {
  // Atomic claim — prevents duplicate processing by concurrent workers
  const claimed = await claimQueueJob(queueId);

  if (!claimed) {
    const existing = await getQueueItem(queueId);
    if (existing?.status === "completed") {
      return { ok: true, outcome: "duplicate" };
    }
    return { ok: false, error: "Queue item not found or already claimed" };
  }

  const { queueItem, attempts } = claimed;

  const message = await getInboundMessage(queueItem.messageId);
  if (!message) {
    await updateQueueItem(queueId, {
      status: "failed",
      lastError: "Message not found",
      completedAt: new Date().toISOString(),
    });
    return { ok: false, error: "Message not found" };
  }

  await updateMessageStatus(message.id, "processing");
  await writeProcessingLog({
    orgId: message.orgId,
    messageId: message.id,
    stage: "normalize",
    level: "info",
    detail: `Processing attempt ${attempts}`,
  });

  const started = Date.now();

  try {
    if (!message.text?.trim()) {
      await finalize(queueId, message.id, message.orgId, "ignored", {
        detail: "Empty message body — attachment-only messages need OCR/ASR stage",
      });
      await publishEvent({
        orgId: message.orgId,
        type: "ai_extraction",
        messageId: message.id,
        meta: { outcome: "ignored", reason: "empty_text" },
      });
      return { ok: true, outcome: "ignored" };
    }

    const history = message.conversationId
      ? await getConversationContext(message.orgId, message.conversationId)
      : [];
    const openTasks = await listOpenTasks(message.orgId);
    const openTaskLines = openTasks.map((t) => `[${t.id}] ${t.title} (${t.status})`);

    await writeProcessingLog({
      orgId: message.orgId,
      messageId: message.id,
      stage: "gemini",
      level: "info",
      detail: `Calling Gemini with ${history.length} history msgs, ${openTasks.length} open tasks`,
    });

    const action = await extractStructuredAction(message.text, {
      history,
      openTasks: openTaskLines,
    });

    const latencyMs = Date.now() - started;
    const confidenceRoute = routeByConfidence(action.confidenceScore);

    let outcome: AiExtractionOutcome = "ignored";
    let taskId: string | undefined;
    let contactId: string | undefined;

    if (action.intent === "ignore" || confidenceRoute === "ignore") {
      outcome = "ignored";
    } else if (confidenceRoute === "needs_review") {
      outcome = "needs_review";
      await notifyOrgAdmins(message.orgId, {
        title: "AI extraction needs review",
        message: action.title,
        type: "needs_review",
        relatedId: message.id,
      });
      await publishEvent({
        orgId: message.orgId,
        type: "needs_review",
        messageId: message.id,
        meta: { confidence: action.confidenceScore, intent: action.intent },
      });
    } else {
      const result = await applyAction(message.orgId, message.id, action);
      outcome = result.outcome;
      taskId = result.taskId;
      contactId = result.contactId;
    }

    await saveAiExtraction({
      orgId: message.orgId,
      messageId: message.id,
      model: action.isFallback ? "heuristic-fallback" : "gemini-1.5-flash",
      inputText: message.text,
      action,
      outcome,
      taskId,
      contactId,
      latencyMs,
      createdAt: new Date().toISOString(),
    });

    await publishEvent({
      orgId: message.orgId,
      type: "ai_extraction",
      messageId: message.id,
      taskId,
      meta: {
        outcome,
        intent: action.intent,
        confidence: action.confidenceScore,
        latencyMs,
      },
    });

    await finalize(queueId, message.id, message.orgId, outcome === "needs_review" ? "needs_review" : outcome === "ignored" ? "ignored" : "completed", {
      detail: `outcome=${outcome} intent=${action.intent} confidence=${action.confidenceScore}`,
    });

    return { ok: true, outcome };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unknown processing error";
    await writeProcessingLog({
      orgId: message.orgId,
      messageId: message.id,
      stage: "error",
      level: "error",
      detail: errMsg,
    });

    const dead = attempts >= (queueItem.maxAttempts || 5);
    await updateQueueItem(queueId, {
      status: dead ? "dead" : "pending",
      lastError: errMsg,
      scheduledAt: new Date(Date.now() + attempts * 15_000).toISOString(),
      ...(dead ? { completedAt: new Date().toISOString() } : {}),
    });
    await updateMessageStatus(message.id, "failed", { error: errMsg });
    await publishEvent({
      orgId: message.orgId,
      type: "processing_failed",
      messageId: message.id,
      meta: { error: errMsg, attempts, dead },
    });

    return { ok: false, error: errMsg };
  }
}

async function applyAction(
  orgId: string,
  messageId: string,
  action: StructuredAiAction
): Promise<{ outcome: AiExtractionOutcome; taskId?: string; contactId?: string }> {
  const { upsertContact } = await import("@/lib/pipeline/contact-actions");

  // --- Contact-only intent ---
  if (action.intent === "create_contact") {
    const contactData = extractContactFields(action);
    if (contactData.name) {
      const { contact } = await upsertContact({
        orgId,
        ...contactData,
        sourceMessageId: messageId,
      });
      await publishEvent({
        orgId,
        type: "task_created", // reuse event type for now
        messageId,
        meta: { intent: "create_contact", contactId: contact.id },
      });
      return { outcome: "contact_created", contactId: contact.id };
    }
    return { outcome: "ignored" };
  }

  // --- Both contact + task ---
  if (action.intent === "create_both") {
    let contactId: string | undefined;
    const contactData = extractContactFields(action);
    if (contactData.name) {
      const { contact } = await upsertContact({
        orgId,
        ...contactData,
        sourceMessageId: messageId,
      });
      contactId = contact.id;
    }

    const labels = [...(action.labels || [])];
    const taskId = await createTaskFromAction({
      orgId,
      action: { ...action, labels },
      createdBy: "system:whatsapp-pipeline",
      source: "ai_extracted",
      messageId,
    });

    await publishEvent({
      orgId,
      type: "task_created",
      messageId,
      taskId,
      meta: { intent: "create_both", contactId },
    });

    await notifyOrgAdmins(orgId, {
      title: "Contact & task created from WhatsApp",
      message: action.title,
      type: "ai_extraction",
      relatedId: taskId,
    });

    return { outcome: "both_created", taskId, contactId };
  }

  // --- Existing task-based intents ---
  const match = await findBestMatchingTask(orgId, action);

  if (action.intent === "close_task") {
    if (match) {
      await closeTask(match.task.id);
      await publishEvent({
        orgId,
        type: "task_completed",
        messageId,
        taskId: match.task.id,
        meta: { via: "whatsapp_ai", similarity: match.score },
      });
      return { outcome: "updated_existing", taskId: match.task.id };
    }
    // Fall through to create if we can't find what to close
  }

  if (action.intent === "update_task" && match) {
    await updateTaskFromAction(match.task.id, action);
    await publishEvent({
      orgId,
      type: "task_updated",
      messageId,
      taskId: match.task.id,
      meta: { similarity: match.score },
    });
    return { outcome: "updated_existing", taskId: match.task.id };
  }

  // High similarity → update instead of creating a duplicate task
  if (match && match.score >= 0.9 && (action.intent === "create_task" || action.intent === "update_task")) {
    await updateTaskFromAction(match.task.id, action);
    await publishEvent({
      orgId,
      type: "task_updated",
      messageId,
      taskId: match.task.id,
      meta: { similarity: match.score, reason: "auto_link" },
    });
    return { outcome: "updated_existing", taskId: match.task.id };
  }

  if (
    action.intent === "create_task" ||
    action.intent === "schedule_meeting" ||
    action.intent === "create_note" ||
    action.intent === "ask_question" ||
    action.intent === "save_reminder" ||
    (action.intent === "update_task" && !match) ||
    (action.intent === "close_task" && !match)
  ) {
    const labels = [...(action.labels || [])];
    if (action.intent === "schedule_meeting" && !labels.includes("meeting")) labels.push("meeting");
    if (action.intent === "create_note" && !labels.includes("note")) labels.push("note");
    if (action.intent === "ask_question" && !labels.includes("question")) labels.push("question");
    if (action.intent === "save_reminder" && !labels.includes("reminder")) labels.push("reminder");

    const taskId = await createTaskFromAction({
      orgId,
      action: { ...action, labels },
      createdBy: "system:whatsapp-pipeline",
      source: "ai_extracted",
      messageId,
    });

    await publishEvent({
      orgId,
      type: "task_created",
      messageId,
      taskId,
      meta: { intent: action.intent },
    });

    await notifyOrgAdmins(orgId, {
      title: "Task created from WhatsApp",
      message: action.title,
      type: "ai_extraction",
      relatedId: taskId,
    });

    return { outcome: "auto_created", taskId };
  }

  return { outcome: "ignored" };
}

/** Extract contact fields from the raw AI action (Gemini returns them as extra fields) */
function extractContactFields(action: StructuredAiAction): {
  name: string;
  phone?: string;
  email?: string;
  qualification?: string;
  experience?: string;
  skills?: string[];
  businessName?: string;
  notes?: string;
} {
  const raw = action as unknown as Record<string, unknown>;
  return {
    name: (raw.contactName as string) || action.title || "",
    phone: (raw.contactPhone as string) || undefined,
    email: (raw.contactEmail as string) || undefined,
    qualification: (raw.contactQualification as string) || undefined,
    experience: (raw.contactExperience as string) || undefined,
    skills: Array.isArray(raw.contactSkills) ? (raw.contactSkills as string[]) : undefined,
    businessName: (raw.businessName as string) || undefined,
    notes: action.description || undefined,
  };
}

async function finalize(
  queueId: string,
  messageId: string,
  orgId: string,
  status: "completed" | "ignored" | "needs_review",
  opts: { detail: string }
) {
  await updateQueueItem(queueId, {
    status: "completed",
    completedAt: new Date().toISOString(),
  });
  await updateMessageStatus(messageId, status, {
    processedAt: new Date().toISOString(),
  });
  await writeProcessingLog({
    orgId,
    messageId,
    stage: "complete",
    level: "info",
    detail: opts.detail,
  });
}

/**
 * Enqueue async worker processing via HTTP call.
 * Awaited so Vercel doesn't kill the process before the request is sent.
 * Failures are logged but do not throw — the cron redrive recovers pending jobs.
 */
export async function enqueueWorkerProcessing(queueId: string, origin: string): Promise<void> {
  const secret = process.env.PIPELINE_WORKER_SECRET;
  if (!secret) {
    console.error("PIPELINE_WORKER_SECRET is not set; cannot enqueue worker processing.");
    return;
  }
  const url = `${origin}/api/workers/process-message`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({ queueId }),
    });
    if (!res.ok) {
      console.error(`Worker enqueue returned ${res.status} for queueId=${queueId}`);
    }
  } catch (err) {
    // Non-fatal: the cron redrive will pick up pending jobs
    console.error("Failed to enqueue worker:", err);
  }
}
