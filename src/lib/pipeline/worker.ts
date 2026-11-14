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
import { decrypt } from "@/lib/crypto";
import type { AiExtractionOutcome, ProcessingQueueItem, StructuredAiAction } from "@/types";

/** Lease duration: if a worker crashes, the job becomes claimable after this period */
export const LEASE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

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

    // Respect the retry backoff. Redrive already filters due jobs, but a direct
    // worker call must not process a job before its scheduled time either.
    if (item.status !== "processing" && item.scheduledAt) {
      const scheduledMs = new Date(item.scheduledAt).getTime();
      if (!Number.isNaN(scheduledMs) && scheduledMs > Date.now()) return null;
    }

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

/**
 * Atomically claim a queue job and process it inline.
 * Prefer inline processing — fire-and-forget self-fetch is unreliable on serverless.
 */
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

  // Scope the message lookup to the queue item's org so a corrupt or forged
  // queue record can never cause cross-tenant processing.
  const message = await getInboundMessage(queueItem.messageId, queueItem.orgId);
  if (!message) {
    // A missing/foreign message is permanent: retrying cannot fix it.
    await updateQueueItem(queueId, {
      status: "dead",
      lastError: "Message not found for this organization",
      completedAt: new Date().toISOString(),
    });
    return { ok: false, error: "Message not found for this organization" };
  }

  const maxAttempts = queueItem.maxAttempts || 5;
  if (attempts > maxAttempts) {
    await updateQueueItem(queueId, {
      status: "dead",
      lastError: "Maximum attempts exceeded",
      completedAt: new Date().toISOString(),
    });
    await updateMessageStatus(message.id, "failed", {
      error: "Maximum attempts exceeded",
    });
    await publishEvent({
      orgId: message.orgId,
      type: "processing_failed",
      messageId: message.id,
      meta: { error: "Maximum attempts exceeded", attempts, dead: true },
    });
    return { ok: false, error: "Maximum attempts exceeded" };
  }

  // Duplicate messages are persisted for audit but must never be re-processed.
  if (message.status === "duplicate") {
    await updateQueueItem(queueId, {
      status: "completed",
      completedAt: new Date().toISOString(),
    });
    await writeProcessingLog({
      orgId: message.orgId,
      messageId: message.id,
      stage: "complete",
      level: "info",
      detail: "Duplicate message skipped",
    });
    return { ok: true, outcome: "duplicate" };
  }

  let maxAttemptsLimit = maxAttempts;
  if (attempts > maxAttemptsLimit) {
    await updateQueueItem(queueId, {
      status: "dead",
      lastError: "Maximum attempts exceeded",
      completedAt: new Date().toISOString(),
    });
    await updateMessageStatus(message.id, "failed", {
      error: "Maximum attempts exceeded",
    });
    await publishEvent({
      orgId: message.orgId,
      type: "processing_failed",
      messageId: message.id,
      meta: { error: "Maximum attempts exceeded", attempts, dead: true },
    });
    return { ok: false, error: "Maximum attempts exceeded" };
  }

  // Duplicate messages are persisted for audit but must never be re-processed.
  if (message.status === "duplicate") {
    await updateQueueItem(queueId, {
      status: "completed",
      completedAt: new Date().toISOString(),
    });
    await writeProcessingLog({
      orgId: message.orgId,
      messageId: message.id,
      stage: "complete",
      level: "info",
      detail: "Duplicate message skipped",
    });
    return { ok: true, outcome: "duplicate" };
  }

  const attemptsCount = (queueItem.attempts || 0) + 1;
  await updateQueueItem(queueId, {
    status: "processing",
    attempts: attemptsCount,
    lockedAt: new Date().toISOString(),
  });
  await updateMessageStatus(message.id, "processing");
  await writeProcessingLog({
    orgId: message.orgId,
    messageId: message.id,
    stage: "normalize",
    level: "info",
    detail: `Processing attempt ${attemptsCount}`,
  });

  const started = Date.now();
  let action: StructuredAiAction | null = null;
  let extractionSaved = false;

  try {
    if (!message.text?.trim()) {
      const latencyMs = Date.now() - started;
      await saveAiExtraction({
        orgId: message.orgId,
        messageId: message.id,
        model: "pipeline",
        inputText: message.text || "",
        action: {
          intent: "ignore",
          title: "Empty message body",
          description: "Attachment-only message; OCR/ASR stage is not implemented.",
          priority: "low",
          confidenceScore: 1,
          labels: ["empty"],
        },
        outcome: "ignored",
        latencyMs,
        createdAt: new Date().toISOString(),
      });
      extractionSaved = true;

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

    const orgApiKey = await getOrgGeminiKey(message.orgId);

    await writeProcessingLog({
      orgId: message.orgId,
      messageId: message.id,
      stage: "gemini",
      level: "info",
      detail: `Calling Gemini with ${history.length} history msgs, ${openTasks.length} open tasks`,
    });

    action = await extractStructuredAction(message.text, {
      history,
      openTasks: openTaskLines,
      apiKey: orgApiKey,
    });

    const latencyMs = Date.now() - started;
    const confidenceRoute = routeByConfidence(action.confidenceScore);

    let outcome: AiExtractionOutcome = "ignored";
    let taskId: string | undefined;
    let contactId: string | undefined;

    // 3-way classification:
    // 1. Non-actionable: ignore / store without creating a task
    if (
      action.classification === "non_actionable" ||
      action.intent === "ignore" ||
      confidenceRoute === "ignore"
    ) {
      outcome = "ignored";
    }
    // 2. Ambiguous: save for admin review, do not create task
    else if (
      action.classification === "ambiguous" ||
      confidenceRoute === "needs_review"
    ) {
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
        meta: { confidence: action.confidenceScore, intent: action.intent, classification: "ambiguous" },
      });
    }
    // 3. Actionable: automatically create or update task
    else {
      const result = await applyAction(message.orgId, message.id, action, {
        phone: message.sender,
        name: message.senderName,
      });
      outcome = result.outcome;
      taskId = result.taskId;
      contactId = result.contactId;
    }

    await saveAiExtraction({
      orgId: message.orgId,
      messageId: message.id,
      model: process.env.GEMINI_API_KEY ? "gemini-2.5-flash" : "heuristic-fallback",
      inputText: message.text,
      action,
      outcome,
      taskId,
      contactId,
      latencyMs,
      createdAt: new Date().toISOString(),
    });
    extractionSaved = true;

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
    const latencyMs = Date.now() - started;

    try {
      await writeProcessingLog({
        orgId: message.orgId,
        messageId: message.id,
        stage: "error",
        level: "error",
        detail: errMsg,
      });
    } catch (logError) {
      console.error("Unable to persist processing error log:", logError);
    }

    // Persist a failed extraction record so the AI logs page reflects real
    // processing failures. Never overwrite a record that already succeeded.
    if (!extractionSaved) {
      const failedAction: StructuredAiAction =
        action ?? {
          intent: "ignore",
          title: (message.text || "Processing failed").slice(0, 120),
          description: errMsg,
          priority: "medium",
          confidenceScore: 0,
          labels: ["error"],
          isFallback: true,
        };

      try {
        await saveAiExtraction({
          orgId: message.orgId,
          messageId: message.id,
          model: action?.isFallback ? "heuristic-fallback" : "gemini-2.5-flash",
          inputText: message.text || "",
          action: failedAction,
          outcome: "failed",
          latencyMs,
          error: errMsg,
          createdAt: new Date().toISOString(),
        });
      } catch (logError) {
        console.error("Unable to persist failed AI extraction record:", logError);
      }
    }

    const dead = attempts >= maxAttempts;

    // Best-effort bookkeeping: if Firestore is unavailable these calls can
    // fail too. Don't let that mask the original processing error; the stale
    // lease will be reclaimed by redrive once it expires.
    try {
      await updateQueueItem(queueId, {
        status: dead ? "dead" : "pending",
        lastError: errMsg,
        scheduledAt: new Date(Date.now() + attempts * 15_000).toISOString(),
        ...(dead ? { completedAt: new Date().toISOString() } : {}),
      });
    } catch (queueError) {
      console.error("Unable to update queue item after failure:", queueError);
    }

    try {
      // While a retry is scheduled the message is queued, not permanently failed.
      await updateMessageStatus(message.id, dead ? "failed" : "queued", {
        error: errMsg,
      });
    } catch (statusError) {
      console.error("Unable to update message status after failure:", statusError);
    }

    try {
      await publishEvent({
        orgId: message.orgId,
        type: "processing_failed",
        messageId: message.id,
        meta: { error: errMsg, attempts, dead },
      });
    } catch (eventError) {
      console.error("Unable to publish processing_failed event:", eventError);
    }

    return { ok: false, error: errMsg };
  }
}

/** Extract contact fields from the raw AI action (Gemini returns them as extra fields) */
function extractContactFields(
  action: StructuredAiAction,
  defaults?: { phone?: string; name?: string }
): {
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
    name:
      (raw.contactName as string) ||
      defaults?.name ||
      action.title ||
      "",
    // For WhatsApp contacts, the sender's number is the most reliable phone
    // when Gemini does not repeat it in the message body.
    phone: (raw.contactPhone as string) || defaults?.phone || undefined,
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
 * Run the AI worker for a queue item.
 * Prefer inline processing — fire-and-forget self-fetch is unreliable on serverless.
 */
export async function runWorkerForQueue(queueId: string): Promise<void> {
  try {
    const result = await processQueueJob(queueId);
    if (!result.ok) {
      console.error("Worker finished with error:", result.error);
    }
  } catch (err) {
    console.error("Worker crashed:", err);
  }
}

/** @deprecated Use runWorkerForQueue — kept for manual/cron HTTP triggers */
export function enqueueWorkerProcessing(queueId: string, origin: string) {
  const secret = process.env.PIPELINE_WORKER_SECRET || "dev-pipeline-secret";
  const url = `${origin}/api/workers/process-message`;

  void fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({ queueId }),
  }).catch((err) => {
    console.error("Failed to enqueue worker via HTTP, running inline:", err);
    void runWorkerForQueue(queueId);
  });
}