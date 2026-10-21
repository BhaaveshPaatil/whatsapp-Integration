import { NextRequest, NextResponse } from "next/server";

interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
}

interface ClientRecord {
  count: number;
  resetTime: number;
}

const clients = new Map<string, ClientRecord>();

export function createRateLimiter(options: RateLimiterOptions) {
  const { windowMs, maxRequests } = options;

  return function rateLimit(req: NextRequest): NextResponse | null {
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
    const now = Date.now();

    const record = clients.get(ip) || { count: 0, resetTime: now + windowMs };

    if (now > record.resetTime) {
      record.count = 0;
      record.resetTime = now + windowMs;
    }

    record.count += 1;
    clients.set(ip, record);

    if (record.count > maxRequests) {
      return NextResponse.json(
        { error: "Too many requests, please try again later." },
        { status: 429 }
      );
    }

    return null;
  };
}

export function getRateLimitHeaders(
  remaining: number,
  resetTime: number
): Record<string, string> {
  return {
    "X-RateLimit-Remaining": String(Math.max(0, remaining)),
    "X-RateLimit-Reset": String(Math.ceil(resetTime / 1000)),
  };
}
