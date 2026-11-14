import { NextRequest, NextResponse } from "next/server";
import { createRateLimiter as whatsappRateLimit } from "@/lib/rate-limit";
import { whatsappConnector } from "@/lib/pipeline/connectors";
import { publishEvent } from "@/lib/pipeline/events";
import { resolveOrgIdForWhatsApp, saveInboundMessage } from "@/lib/pipeline/store";
import { runWorkerForQueue } from "@/lib/pipeline/worker";
import { isAdminConfigured } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const webhookRateLimit = whatsappRateLimit({
  windowMs: 60 * 1000,
  maxRequests: 100,
});

export async function GET(req: NextRequest) {
  const result = await whatsappConnector.verifyWebhook!({
    headers: req.headers,
    rawBody: "",
    searchParams: req.nextUrl.searchParams,
    method: req.method,
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

function logStructured(level: "info" | "warn" | "error", message: string, meta: Record<string, unknown> = {}) {
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
  const rateLimitResponse = webhookRateLimit(req);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  logStructured("info", "Inbound WhatsApp webhook POST request received", { requestId });

  const rawBody = await req.text();

  const verified = await whatsappConnector.verifyWebhook!({
    headers: req.headers,
    rawBody,
    searchParams: req.nextUrl.searchParams,
    method: req.method,
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

  // NOTE: When FIREBASE_SERVICE_ACCOUNT_JSON is missing, return 503 instead of 200 so that
  // Meta retries delivery and operators see the failure in server logs (rather than
  // silently acknowledging and discarding every inbound message).
  if (!isAdminConfigured()) {
    if (process.env.NODE_ENV === "production") {
      logStructured("error", "Firebase Admin is not configured; refusing to acknowledge webhook in production.", {
        requestId,
        durationMs: Date.now() - startTime,
      });
      return NextResponse.json(
        { status: "PERSIST_UNAVAILABLE", error: "Firebase Admin is not configured" },
        { status: 503 }
      );
    }

    logStructured("warn", "FIREBASE_SERVICE_ACCOUNT_JSON is not configured; acknowledging webhook without persistence.", {
      requestId,
      durationMs: Date.now() - startTime,
      incomingCount: normalized.length,
    });
  }

  try {
    const accepted: string[] = [];
    const failed: Array<{ externalId: string; error: string }> = [];

    for (const item of normalized) {
      logStructured("info", "Beginning processing loop for inbound WhatsApp item", {
        requestId,
        externalId: item.externalId,
        phoneNumberId: item.phoneNumberId,
        sender: item.sender,
      });

      let orgId: string;
      try {
        orgId = await resolveOrgIdForWhatsApp(item.phoneNumberId);
      } catch (orgErr: any) {
        const reason = orgErr?.message || "org_mapping_failed";
        logStructured("error", "Organization mapping failed for inbound message", {
          requestId,
          phoneNumberId: item.phoneNumberId,
          error: reason,
          hint: "Save WhatsApp settings in Dashboard → Settings to map Phone Number ID to your org, OR set DEFAULT_ORG_ID in .env.local for local dev.",
        });
        failed.push({ externalId: item.externalId, error: `org_mapping_failed: ${reason}` });
        continue;
      }

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

      try {
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

          logStructured("info", "Running AI worker inline for queue item", {
            requestId,
            queueId: queueItem.id,
          });

          await runWorkerForQueue(queueItem.id);
          accepted.push(queueItem.id);
        }
      } catch (persistErr: any) {
        logStructured("error", "Per-message persistence failed", {
          requestId,
          externalId: item.externalId,
          error: persistErr?.message,
        });
        failed.push({ externalId: item.externalId, error: persistErr?.message || "persist_failed" });
      }
    }

    const durationMs = Date.now() - startTime;
    logStructured("info", "Webhook finished processing", {
      requestId,
      queued: accepted.length,
      failed: failed.length,
      durationMs,
    });

    // Only return 500 when EVERY item in the batch genuinely failed.
    // Duplicates count as handled (they don't bump `accepted` but they also don't fail),
    // so compare `failed` against the total normalized count rather than `accepted`.
    if (failed.length === normalized.length && failed.length > 0) {
      return NextResponse.json(
        {
          status: "ERROR",
          error: "all_messages_failed",
          failed,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        status: "EVENT_RECEIVED",
        queued: accepted.length,
        failed: failed.length,
        ...(failed.length > 0 ? { failed } : {}),
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    logStructured("error", "Error encountered processing WhatsApp webhook persistence", {
      requestId,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      durationMs: Date.now() - startTime,
    });
    return NextResponse.json({ status: "ERROR", error: "persist_failed" }, { status: 500 });
  }
}