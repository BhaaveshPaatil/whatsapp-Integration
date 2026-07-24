import { NextRequest, NextResponse } from "next/server";

// Debug banner for webhook entry
console.log("========== WHATSAPP WEBHOOK ==========");
import { whatsappConnector } from "@/lib/pipeline/connectors";
import { publishEvent } from "@/lib/pipeline/events";
import { resolveOrgIdForWhatsApp, saveInboundMessage } from "@/lib/pipeline/store";
import { enqueueWorkerProcessing } from "@/lib/pipeline/worker";
import { isAdminConfigured } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const result = await whatsappConnector.verifyWebhook!({
    headers: req.headers,
    rawBody: "",
    searchParams: req.nextUrl.searchParams,
  });

  if (result.ok && result.challenge) {
    return new NextResponse(result.challenge, { status: 200 });
  }

  return new NextResponse(result.body || "Forbidden", { status: result.status || 403 });
}

/**
 * Webhook responsibility: validate → persist raw message → ack <500ms.
 * AI and task creation run asynchronously via /api/workers/process-message.
 */
import crypto from "crypto";

function logStructured(level: "info" | "warn" | "error", message: string, meta: Record<string, any> = {}) {
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      message,
      ...meta,
    })
  );
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  logStructured("info", "Inbound WhatsApp webhook POST request received", { requestId });

  const rawBody = await req.text();

  const verified = await whatsappConnector.verifyWebhook!({
    headers: req.headers,
    rawBody,
    searchParams: req.nextUrl.searchParams,
  });

  if (!verified.ok) {
    logStructured("warn", "Webhook verification signature check failed", {
      requestId,
      status: verified.status,
      body: verified.body,
      durationMs: Date.now() - startTime,
    });
    return new NextResponse(verified.body || "Unauthorized", {
      status: verified.status || 401,
    });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    logStructured("error", "Webhook request body is not valid JSON", {
      requestId,
      durationMs: Date.now() - startTime,
    });
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const normalized = whatsappConnector.normalize(body);
  logStructured("info", "Successfully normalized WhatsApp webhook payload", {
    requestId,
    count: normalized.length,
    messages: normalized.map((m) => ({ id: m.externalId, sender: m.sender })),
  });

  if (normalized.length === 0) {
    return NextResponse.json({ status: "EVENT_RECEIVED" }, { status: 200 });
  }

  if (!isAdminConfigured()) {
    logStructured("warn", "FIREBASE_SERVICE_ACCOUNT_JSON is not configured; acknowledging webhook without persistence.", {
      requestId,
      durationMs: Date.now() - startTime,
    });
    return NextResponse.json({ status: "EVENT_RECEIVED", persisted: false }, { status: 200 });
  }

  try {
    const origin = req.nextUrl.origin;
    const accepted: string[] = [];

    for (const item of normalized) {
      logStructured("info", "Beginning processing loop for inbound WhatsApp item", {
        requestId,
        externalId: item.externalId,
        phoneNumberId: item.phoneNumberId,
        sender: item.sender,
      });

      const orgId = await resolveOrgIdForWhatsApp(item.phoneNumberId);
      logStructured("info", "Organization mapped successfully", {
        requestId,
        phoneNumberId: item.phoneNumberId,
        orgId,
      });

      logStructured("info", "Saving inbound message via transaction", {
        requestId,
        orgId,
        externalId: item.externalId,
      });

      const { message, queueItem, isDuplicate } = await saveInboundMessage(orgId, item);

      logStructured("info", "Message persistence stage finished", {
        requestId,
        messageId: message.id,
        isDuplicate,
        queueId: queueItem.id,
      });

      await publishEvent({
        orgId,
        type: isDuplicate ? "duplicate_detected" : "message_received",
        messageId: message.id,
        meta: {
          source: "whatsapp",
          sender: message.sender,
          externalId: message.externalId,
        },
      });

      if (!isDuplicate && queueItem.id) {
        await publishEvent({
          orgId,
          type: "message_queued",
          messageId: message.id,
          meta: { queueId: queueItem.id },
        });

        logStructured("info", "Enqueueing worker processing flow", {
          requestId,
          queueId: queueItem.id,
        });

        enqueueWorkerProcessing(queueItem.id, origin);
        accepted.push(queueItem.id);
      }
    }

    logStructured("info", "Webhook finished successfully", {
      requestId,
      queued: accepted.length,
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json(
      { status: "EVENT_RECEIVED", queued: accepted.length },
      { status: 200 }
    );
  } catch (error: any) {
    logStructured("error", "Error encountered processing WhatsApp webhook persistence", {
      requestId,
      errorMessage: error.message,
      errorStack: error.stack,
      durationMs: Date.now() - startTime,
    });
    return NextResponse.json({ status: "EVENT_RECEIVED", error: "persist_failed" }, { status: 200 });
  }
}
