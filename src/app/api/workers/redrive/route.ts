import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, isAdminConfigured } from "@/lib/firebase-admin";
import { enqueueWorkerProcessing } from "@/lib/pipeline/worker";
import type { ProcessingQueueItem } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Re-drive pending / failed queue jobs (call from cron or admin tooling).
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

  const body = await req.json().catch(() => ({}));
  const limit = typeof body.limit === "number" ? Math.min(body.limit, 50) : 10;
  const origin = req.nextUrl.origin;
  const db = getAdminDb();
  const now = new Date().toISOString();

  const snap = await db
    .collection("processingQueue")
    .where("status", "in", ["pending", "failed"])
    .limit(limit)
    .get();

  const due = snap.docs
    .map((d) => d.data() as ProcessingQueueItem)
    .filter((item) => !item.scheduledAt || item.scheduledAt <= now);

  for (const item of due) {
    enqueueWorkerProcessing(item.id, origin);
  }

  return NextResponse.json({ redriven: due.length });
}
