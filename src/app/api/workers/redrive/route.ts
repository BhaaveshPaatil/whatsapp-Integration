import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, isAdminConfigured } from "@/lib/firebase-admin";
import { enqueueWorkerProcessing } from "@/lib/pipeline/worker";
import type { ProcessingQueueItem } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Re-drive pending / failed queue jobs.
 *
 * Vercel Cron sends GET requests with `Authorization: Bearer <CRON_SECRET>`.
 * Manual / admin calls use POST with PIPELINE_WORKER_SECRET.
 */

function authorizeRequest(req: NextRequest): boolean {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  // Vercel Cron uses CRON_SECRET
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && token === cronSecret) return true;

  // Manual / admin calls use PIPELINE_WORKER_SECRET
  const workerSecret = process.env.PIPELINE_WORKER_SECRET;
  if (workerSecret && token === workerSecret) return true;

  return false;
}

async function redrive(req: NextRequest, limitOverride?: number): Promise<NextResponse> {
  if (!authorizeRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isAdminConfigured()) {
    return NextResponse.json({ error: "Firebase Admin not configured" }, { status: 503 });
  }

  const limit = typeof limitOverride === "number" ? Math.min(limitOverride, 50) : 10;
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

  const results: { id: string; ok: boolean }[] = [];
  for (const item of due) {
    try {
      await enqueueWorkerProcessing(item.id, origin);
      results.push({ id: item.id, ok: true });
    } catch {
      results.push({ id: item.id, ok: false });
    }
  }

  return NextResponse.json({ redriven: due.length, results });
}

/** Vercel Cron hits GET */
export async function GET(req: NextRequest) {
  return redrive(req);
}

/** Manual / admin tooling hits POST with optional { limit } body */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const limit = typeof body.limit === "number" ? body.limit : undefined;
  return redrive(req, limit);
}
