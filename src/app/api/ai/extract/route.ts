import { NextRequest, NextResponse } from "next/server";
import { extractTaskFromText } from "@/lib/services/gemini";

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Text prompt is required" }, { status: 400 });
    }

    const extraction = await extractTaskFromText(text);
    return NextResponse.json({ success: true, extraction }, { status: 200 });
  } catch (error) {
    console.error("Error in AI extraction endpoint:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
