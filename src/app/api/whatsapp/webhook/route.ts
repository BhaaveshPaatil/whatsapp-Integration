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
export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  const verified = await whatsappConnector.verifyWebhook!({
    headers: req.headers,
    rawBody,
    searchParams: req.nextUrl.searchParams,
  });

  if (!verified.ok) {
    return new NextResponse(verified.body || "Unauthorized", {
      status: verified.status || 401,
    });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const normalized = whatsappConnector.normalize(body);
  console.log("Normalized messages:", normalized.length);
  console.log("Normalized payload:", normalized);
  if (normalized.length === 0) {
    return NextResponse.json({ status: "EVENT_RECEIVED" }, { status: 200 });
  }

  if (!isAdminConfigured()) {
    console.warn(
      "FIREBASE_SERVICE_ACCOUNT_JSON not set — acknowledging webhook without persistence."
    );
    console.log(
      "Inbound WhatsApp messages:",
      normalized.map((m) => ({ from: m.sender, text: m.text, id: m.externalId }))
    );
    return NextResponse.json({ status: "EVENT_RECEIVED", persisted: false }, { status: 200 });
  }

  try {
    const origin = req.nextUrl.origin;
    const accepted: string[] = [];

    for (const item of normalized) {
      console.log("Processing message");
      console.log("External ID:", item.externalId);
      console.log("Phone Number ID:", item.phoneNumberId);
      console.log("Sender:", item.sender);
      console.log("Text:", item.text);

      const orgId = await resolveOrgIdForWhatsApp(item.phoneNumberId);
      console.log("Resolved Org ID:", orgId);
      console.log("DEFAULT_ORG_ID:", process.env.DEFAULT_ORG_ID);
      if (!orgId) {
        console.error("No organization mapping found.");
        continue;
      }

      console.log("Calling saveInboundMessage()");
      const { message, queueItem, isDuplicate } = await saveInboundMessage(orgId, item);
      console.log("Message saved");
      console.log(message);
      console.log(queueItem);

      console.log("Publishing event:", isDuplicate ? "duplicate_detected" : "message_received");
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
        console.log("Publishing event:", "message_queued");
        await publishEvent({
          orgId,
          type: "message_queued",
          messageId: message.id,
          meta: { queueId: queueItem.id },
        });
        console.log("Queueing worker:", queueItem.id);
        enqueueWorkerProcessing(queueItem.id, origin);
        accepted.push(queueItem.id);
      }
    }

    console.log("Webhook finished successfully");
    return NextResponse.json(
      { status: "EVENT_RECEIVED", queued: accepted.length },
      { status: 200 }
    );
  } catch (error) {
    console.error("========== WEBHOOK ERROR ==========");
    console.error(error);
    if (error instanceof Error) {
      console.error(error.message);
      console.error(error.stack);
    }
    // Still 200 to avoid Meta retry storms when our infra is down mid-write;
    // message may be lost — prefer alerting over duplicate AI work.
    return NextResponse.json({ status: "EVENT_RECEIVED", error: "persist_failed" }, { status: 200 });
  }
}
