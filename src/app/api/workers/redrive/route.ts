import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, isAdminConfigured } from "@/lib/firebase-admin";
import {
  enqueueWorkerProcessing,
  LEASE_DURATION_MS,
} from "@/lib/pipeline/worker";
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

  // Retryable jobs whose backoff has elapsed, plus jobs stuck in "processing"
  // because the worker crashed before clearing its lease.
  const [retryableSnap, processingSnap] = await Promise.all([
    db
      .collection("processingQueue")
      .where("status", "in", ["pending", "failed"])
      .where("scheduledAt", "<=", now)
      .limit(limit)
      .get(),
    db
      .collection("processingQueue")
      .where("status", "==", "processing")
      .limit(limit)
      .get(),
  ]);

  const leaseExpired = (item: ProcessingQueueItem): boolean => {
    if (!item.lockedAt) return true;
    const lockedMs = Date.parse(item.lockedAt);
    return Number.isNaN(lockedMs) || Date.now() - lockedMs >= LEASE_DURATION_MS;
  };

  const seen = new Set<string>();
  const due = [...retryableSnap.docs, ...processingSnap.docs]
    .filter((doc) => {
      if (seen.has(doc.id)) return false;
      seen.add(doc.id);

      const item = doc.data() as ProcessingQueueItem;
      return item.status !== "processing" || leaseExpired(item);
    })
    .slice(0, limit);

  const results: { id: string; ok: boolean }[] = [];
  for (const doc of due) {
    const item = doc.data() as ProcessingQueueItem;
    const queueId = item.id || doc.id;
    const maxAttempts = item.maxAttempts || 5;

    // Never redrive a job that has exhausted its retry budget; expire it so it
    // stops consuming cron slots.
    if ((item.attempts || 0) >= maxAttempts) {
      try {
        await doc.ref.update({
          status: "dead",
          lastError: item.lastError || "Maximum attempts exceeded",
          completedAt: now,
          updatedAt: now,
        });
        if (item.messageId) {
          await db.collection("whatsappMessages").doc(item.messageId).update({
            status: "failed",
            error: item.lastError || "Maximum attempts exceeded",
            updatedAt: now,
          });
        }
      } catch (error) {
        console.error(`Unable to mark queue item ${queueId} dead:`, error);
      }
      results.push({ id: queueId, ok: false });
      continue;
    }

    // enqueueWorkerProcessing returns false instead of throwing, so report the
    // real outcome rather than assuming every attempt succeeded.
    const ok = await enqueueWorkerProcessing(queueId, origin);
    results.push({ id: queueId, ok });
  }

  return NextResponse.json({
    redriven: due.length,
    enqueued: results.filter((r) => r.ok).length,
    results,
  });
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
