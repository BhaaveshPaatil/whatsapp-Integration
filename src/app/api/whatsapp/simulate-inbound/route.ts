import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getAdminApp, isAdminConfigured } from "@/lib/firebase-admin";
import { getAdminDb } from "@/lib/firebase-admin";
import { saveInboundMessage } from "@/lib/pipeline/store";
import { publishEvent } from "@/lib/pipeline/events";
import { runWorkerForQueue } from "@/lib/pipeline/worker";
import type { NormalizedInboundMessage } from "@/lib/pipeline/connectors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Authenticated end-to-end pipeline test (no Meta webhook required).
 */
export async function POST(req: NextRequest) {
  if (!isAdminConfigured()) {
    return NextResponse.json(
      {
        error:
          "Firebase Admin not configured. Add FIREBASE_SERVICE_ACCOUNT_JSON to .env.local and restart the server.",
      },
      { status: 503 }
    );
  }

  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    return NextResponse.json({ error: "Missing authorization token" }, { status: 401 });
  }

  let uid: string;
  try {
    const decoded = await getAuth(getAdminApp()).verifyIdToken(token);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: "Authentication failed" }, { status: 401 });
  }

  const body = await req.json();
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const db = getAdminDb();
  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists) {
    return NextResponse.json({ error: "User profile not found" }, { status: 404 });
  }

  const user = userDoc.data() || {};
  const orgId = (body.orgId as string) || user.orgId;
  if (!orgId || user.orgId !== orgId) {
    return NextResponse.json({ error: "Invalid orgId for this user" }, { status: 403 });
  }

  const orgDoc = await db.collection("organizations").doc(orgId).get();
  const phoneNumberId =
    String(body.phoneNumberId || orgDoc.data()?.whatsappPhoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || "");

  const normalized: NormalizedInboundMessage = {
    source: "whatsapp",
    externalId: `sim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    sender: String(body.sender || "919545556045"),
    senderName: String(body.senderName || "Test User"),
    text,
    type: "text",
    phoneNumberId: phoneNumberId || undefined,
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

  let workerResult = null;
  if (!isDuplicate && queueItem.id) {
    await publishEvent({
      orgId,
      type: "message_queued",
      messageId: message.id,
      meta: { queueId: queueItem.id },
    });
    await runWorkerForQueue(queueItem.id);
    workerResult = { queueId: queueItem.id, status: "processed" };
  }

  return NextResponse.json({
    ok: true,
    messageId: message.id,
    isDuplicate,
    worker: workerResult,
  });
}
