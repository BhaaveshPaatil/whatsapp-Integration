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
import type { AiExtractionOutcome, StructuredAiAction } from "@/types";

export async function processQueueJob(queueId: string): Promise<{
  ok: boolean;
  outcome?: AiExtractionOutcome;
  error?: string;
}> {
  const queueItem = await getQueueItem(queueId);
  if (!queueItem) {
    return { ok: false, error: "Queue item not found" };
  }

  if (queueItem.status === "completed") {
    return { ok: true, outcome: "duplicate" };
  }

  const message = await getInboundMessage(queueItem.messageId);
  if (!message) {
    await updateQueueItem(queueId, {
      status: "failed",
      lastError: "Message not found",
      completedAt: new Date().toISOString(),
    });
    return { ok: false, error: "Message not found" };
  }

  const attempts = (queueItem.attempts || 0) + 1;
  await updateQueueItem(queueId, {
    status: "processing",
    attempts,
    lockedAt: new Date().toISOString(),
  });
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
    }

    await saveAiExtraction({
      orgId: message.orgId,
      messageId: message.id,
      model: process.env.GEMINI_API_KEY ? "gemini-1.5-flash" : "heuristic-fallback",
      inputText: message.text,
      action,
      outcome,
      taskId,
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
): Promise<{ outcome: AiExtractionOutcome; taskId?: string }> {
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
    (action.intent === "update_task" && !match) ||
    (action.intent === "close_task" && !match)
  ) {
    const labels = [...(action.labels || [])];
    if (action.intent === "schedule_meeting" && !labels.includes("meeting")) labels.push("meeting");
    if (action.intent === "create_note" && !labels.includes("note")) labels.push("note");
    if (action.intent === "ask_question" && !labels.includes("question")) labels.push("question");

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

/** Fire-and-forget enqueue of async worker HTTP call */
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
    console.error("Failed to enqueue worker:", err);
  });
}
