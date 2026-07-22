import { NextRequest, NextResponse } from "next/server";

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "taskflow_verify_token_secret";

// GET: Webhook verification step required by Meta Business API
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("WhatsApp Webhook verified successfully.");
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Forbidden: Verification token mismatch", { status: 403 });
}

// POST: Real-time message payload receiver from WhatsApp Cloud API
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Check if body is a WhatsApp message event
    if (body.object === "whatsapp_business_account") {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const message = value?.messages?.[0];

      if (message) {
        const fromPhone = message.from;
        const textBody = message.text?.body || "";

        console.log(`Received WhatsApp message from ${fromPhone}: "${textBody}"`);

        // Trigger AI extraction logic or queueing here
      }

      return NextResponse.json({ status: "EVENT_RECEIVED" }, { status: 200 });
    }

    return NextResponse.json({ status: "NOT_WHATSAPP_EVENT" }, { status: 404 });
  } catch (error) {
    console.error("Error processing WhatsApp webhook payload:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
