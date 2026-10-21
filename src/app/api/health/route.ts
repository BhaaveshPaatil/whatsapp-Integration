import { NextResponse } from "next/server";
import { isAdminConfigured } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const adminConfigured = isAdminConfigured();

  const checks = {
    firebaseAdmin: adminConfigured,
    encryptionKey: Boolean(process.env.ENCRYPTION_KEY || process.env.PIPELINE_WORKER_SECRET),
    geminiApiKey: Boolean(process.env.GEMINI_API_KEY),
    whatsappToken: Boolean(process.env.WHATSAPP_ACCESS_TOKEN),
    nodeEnv: process.env.NODE_ENV,
  };

  const allReady =
    adminConfigured &&
    Boolean(process.env.ENCRYPTION_KEY || process.env.PIPELINE_WORKER_SECRET) &&
    Boolean(process.env.GEMINI_API_KEY);

  return NextResponse.json(
    {
      status: allReady ? "ready" : "partial",
      checks,
    },
    { status: allReady ? 200 : 200 }
  );
}
