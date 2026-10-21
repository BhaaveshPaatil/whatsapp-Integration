import { NextRequest, NextResponse } from "next/server";
import { createRateLimiter } from "@/lib/rate-limit";
import { extractStructuredAction } from "@/lib/services/gemini";

const aiRateLimitMiddleware = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30,
});

export async function POST(req: NextRequest) {
  const rateLimitResponse = aiRateLimitMiddleware(req);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const { text } = await req.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Text prompt is required" }, { status: 400 });
    }

    const extraction = await extractStructuredAction(text);
    return NextResponse.json({ success: true, extraction }, { status: 200 });
  } catch (error) {
    console.error("Error in AI extraction endpoint:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
