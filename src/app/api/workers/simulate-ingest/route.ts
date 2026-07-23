import { NextRequest, NextResponse } from "next/server";
import { isAdminConfigured } from "@/lib/firebase-admin";
import { saveInboundMessage } from "@/lib/pipeline/store";
import { publishEvent } from "@/lib/pipeline/events";
import { enqueueWorkerProcessing } from "@/lib/pipeline/worker";
import type { NormalizedInboundMessage } from "@/lib/pipeline/connectors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Dev/admin helper to inject a normalized inbound message into the pipeline
 * without going through Meta (tests queue + AI worker end-to-end).
 */
export async function POST(req: NextRequest) {
  const secret = process.env.PIPELINE_WORKER_SECRET || "dev-pipeline-secret";
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  if (token !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isAdminConfigured()) {
    return NextResponse.json({ error: "Firebase Admin not configured" }, { status: 503 });
  }

  const body = await req.json();
  const orgId = body.orgId || process.env.DEFAULT_ORG_ID;
  const text = body.text;

  if (!orgId || !text) {
    return NextResponse.json({ error: "orgId and text are required" }, { status: 400 });
  }

  const normalized: NormalizedInboundMessage = {
    source: "whatsapp",
    externalId: body.externalId || `sim_${Date.now()}`,
    sender: body.sender || "sim_sender",
    senderName: body.senderName || "Simulator",
    text,
    type: "text",
    phoneNumberId: body.phoneNumberId,
    rawPayload: { simulated: true },
    receivedAt: new Date().toISOString(),
  };

  const { message, queueItem, isDuplicate } = await saveInboundMessage(orgId, normalized);

  await publishEvent({
    orgId,
    type: isDuplicate ? "duplicate_detected" : "message_received",
    messageId: message.id,
    meta: { simulated: true },
  });

  if (!isDuplicate && queueItem.id) {
    await publishEvent({
      orgId,
      type: "message_queued",
      messageId: message.id,
      meta: { queueId: queueItem.id },
    });
    enqueueWorkerProcessing(queueItem.id, req.nextUrl.origin);
  }

  return NextResponse.json({
    messageId: message.id,
    queueId: queueItem.id || null,
    isDuplicate,
  });
}
