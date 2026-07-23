import crypto from "crypto";
import type { MessageConnector, NormalizedInboundMessage } from "./types";
import { sendWhatsAppMessage } from "@/lib/services/whatsapp";

type WhatsAppWebhookBody = {
  object?: string;
  entry?: Array<{
    changes?: Array<{
      value?: {
        metadata?: { phone_number_id?: string };
        contacts?: Array<{ profile?: { name?: string }; wa_id?: string }>;
        messages?: Array<{
          id?: string;
          from?: string;
          timestamp?: string;
          type?: string;
          text?: { body?: string };
          image?: { id?: string; caption?: string };
          document?: { id?: string; filename?: string; caption?: string };
          audio?: { id?: string };
          video?: { id?: string; caption?: string };
        }>;
      };
    }>;
  }>;
};

function mapType(type?: string): NormalizedInboundMessage["type"] {
  switch (type) {
    case "text":
      return "text";
    case "image":
      return "image";
    case "audio":
      return "audio";
    case "document":
      return "document";
    case "video":
      return "video";
    default:
      return "unknown";
  }
}

type WaMessage = {
  type?: string;
  text?: { body?: string };
  image?: { id?: string; caption?: string };
  document?: { id?: string; filename?: string; caption?: string };
  audio?: { id?: string };
  video?: { id?: string; caption?: string };
};

function extractText(message: WaMessage): string {
  if (message.text?.body) return message.text.body;
  if (message.image?.caption) return message.image.caption;
  if (message.document?.caption) {
    return message.document.caption || message.document.filename || "[document]";
  }
  if (message.video?.caption) return message.video.caption;
  if (message.type === "audio") return "[voice note]";
  if (message.type === "image") return "[image]";
  if (message.type === "document") return "[document]";
  return "";
}

export const whatsappConnector: MessageConnector = {
  source: "whatsapp",

  normalize(raw: unknown): NormalizedInboundMessage[] {
    const body = raw as WhatsAppWebhookBody;
    if (body?.object !== "whatsapp_business_account") return [];

    const results: NormalizedInboundMessage[] = [];
    const receivedAt = new Date().toISOString();

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value;
        const phoneNumberId = value?.metadata?.phone_number_id;
        const contactName = value?.contacts?.[0]?.profile?.name;

        for (const message of value?.messages || []) {
          if (!message?.id || !message.from) continue;

          const text = extractText(message);
          const attachmentRefs: string[] = [];
          if (message.image?.id) attachmentRefs.push(`image:${message.image.id}`);
          if (message.document?.id) attachmentRefs.push(`document:${message.document.id}`);
          if (message.audio?.id) attachmentRefs.push(`audio:${message.audio.id}`);
          if (message.video?.id) attachmentRefs.push(`video:${message.video.id}`);

          results.push({
            source: "whatsapp",
            externalId: message.id,
            sender: message.from,
            senderName: contactName,
            text,
            type: mapType(message.type),
            phoneNumberId,
            attachmentRefs: attachmentRefs.length ? attachmentRefs : undefined,
            rawPayload: message as unknown as Record<string, unknown>,
            receivedAt,
          });
        }
      }
    }

    return results;
  },

  async send(to, text) {
    return sendWhatsAppMessage(to, text);
  },

  async verifyWebhook({ searchParams, headers, rawBody }) {
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || "taskflow_verify_token_secret";

    if (mode === "subscribe" && token === verifyToken && challenge) {
      return { ok: true, challenge, status: 200 };
    }

    // Signature check for POST (when app secret is configured)
    const appSecret = process.env.WHATSAPP_APP_SECRET;
    if (appSecret && rawBody) {
      const signature = headers.get("x-hub-signature-256") || "";
      const expected =
        "sha256=" + crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
      const valid =
        signature.length === expected.length &&
        crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
      if (!valid) {
        return { ok: false, status: 401, body: "Invalid signature" };
      }
    }

    return { ok: true };
  },
};
