import { NextResponse } from "next/server";
import { isAdminConfigured } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const isProduction = process.env.NODE_ENV === "production";
  const adminConfigured = isAdminConfigured();
  const encryptionKeyConfigured = Boolean(
    process.env.ENCRYPTION_KEY || process.env.PIPELINE_WORKER_SECRET
  );
  const geminiApiKey = Boolean(
    process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.startsWith("your_")
  );
  const whatsappToken = Boolean(process.env.WHATSAPP_ACCESS_TOKEN);
  const whatsappAppSecret = Boolean(process.env.WHATSAPP_APP_SECRET);
  const whatsappVerifyToken = Boolean(process.env.WHATSAPP_VERIFY_TOKEN);
  const workerSecret = Boolean(process.env.PIPELINE_WORKER_SECRET);

  const checks = {
    firebaseAdmin: adminConfigured,
    encryptionKey: encryptionKeyConfigured,
    geminiApiKey,
    whatsappToken,
    whatsappAppSecret,
    whatsappVerifyToken,
    workerSecret,
    defaultOrgFallback: Boolean(process.env.DEFAULT_ORG_ID),
    nodeEnv: process.env.NODE_ENV,
  };

  const issues: string[] = [];
  if (!adminConfigured) {
    issues.push(
      "FIREBASE_SERVICE_ACCOUNT_JSON (or GOOGLE_APPLICATION_CREDENTIALS) is missing. Webhook persistence and the worker are disabled."
    );
  }
  if (!encryptionKeyConfigured) {
    issues.push("ENCRYPTION_KEY is missing (PIPELINE_WORKER_SECRET fallback also unset).");
  }
  if (!geminiApiKey) {
    issues.push(
      "GEMINI_API_KEY is missing or still a placeholder. AI extraction will use the low-confidence heuristic fallback."
    );
  }
  if (!whatsappVerifyToken) {
    issues.push("WHATSAPP_VERIFY_TOKEN is missing. Meta webhook subscription handshake will fail.");
  }
  if (!workerSecret) {
    issues.push("PIPELINE_WORKER_SECRET is missing. The worker endpoint rejects all requests.");
  }
  if (isProduction && !whatsappAppSecret) {
    issues.push(
      "WHATSAPP_APP_SECRET is missing. Inbound webhooks will be rejected (fail-closed) in production."
    );
  }

  const criticalReady =
    adminConfigured &&
    encryptionKeyConfigured &&
    whatsappVerifyToken &&
    workerSecret &&
    (!isProduction || whatsappAppSecret);
  const allReady = criticalReady && geminiApiKey;

  return NextResponse.json(
    {
      status: allReady ? "ready" : criticalReady ? "partial" : "not_ready",
      checks,
      issues,
    },
    { status: 200 }
  );
}
