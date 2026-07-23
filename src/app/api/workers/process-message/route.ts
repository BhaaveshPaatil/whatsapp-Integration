import { NextRequest, NextResponse } from "next/server";
import { processQueueJob } from "@/lib/pipeline/worker";
import { isAdminConfigured } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Async AI / automation worker.
 * Invoked by the webhook after raw message persistence (or by a cron re-driver).
 */
export async function POST(req: NextRequest) {
  const secret = process.env.PIPELINE_WORKER_SECRET || "dev-pipeline-secret";
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  if (token !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isAdminConfigured()) {
    return NextResponse.json(
      { error: "Firebase Admin is not configured (FIREBASE_SERVICE_ACCOUNT_JSON)" },
      { status: 503 }
    );
  }

  try {
    const { queueId } = await req.json();
    if (!queueId || typeof queueId !== "string") {
      return NextResponse.json({ error: "queueId is required" }, { status: 400 });
    }

    const result = await processQueueJob(queueId);
    return NextResponse.json(result, { status: result.ok ? 200 : 500 });
  } catch (error) {
    console.error("Worker error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
