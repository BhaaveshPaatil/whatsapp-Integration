import { NextResponse } from "next/server";
import { isAdminConfigured } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public pipeline health — no secrets exposed */
export async function GET() {
  const adminOk = isAdminConfigured();
  const geminiOk = Boolean(process.env.GEMINI_API_KEY);
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || "taskflow_verify_token_secret";
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || null;

  const blockers: string[] = [];
  if (!adminOk) {
    blockers.push(
      "FIREBASE_SERVICE_ACCOUNT_JSON missing — inbound messages cannot be saved. Download from Firebase Console → Project Settings → Service accounts → Generate new private key."
    );
  }
  if (!geminiOk) {
    blockers.push("GEMINI_API_KEY missing — AI task extraction will fail.");
  }

  return NextResponse.json({
    ok: blockers.length === 0,
    checks: {
      firebaseAdmin: adminOk,
      gemini: geminiOk,
      whatsappPhoneNumberId: Boolean(phoneId),
      verifyTokenConfigured: Boolean(verifyToken),
    },
    verifyToken,
    blockers,
    webhookPath: "/api/whatsapp/webhook",
  });
}
