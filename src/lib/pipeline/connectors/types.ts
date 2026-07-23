import type { InboundMessageType, MessageSource } from "@/types";

/** Normalized payload every channel connector must produce */
export interface NormalizedInboundMessage {
  source: MessageSource;
  externalId: string;
  sender: string;
  senderName?: string;
  text: string;
  type: InboundMessageType;
  phoneNumberId?: string;
  attachmentRefs?: string[];
  rawPayload: Record<string, unknown>;
  receivedAt: string;
}

export interface ConnectorSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Plugin interface for message sources (WhatsApp, Slack, Email, …).
 * Pipeline code depends only on this contract.
 */
export interface MessageConnector {
  readonly source: MessageSource;
  normalize(raw: unknown): NormalizedInboundMessage[];
  send?(to: string, text: string): Promise<ConnectorSendResult>;
  verifyWebhook?(req: {
    headers: Headers;
    rawBody: string;
    searchParams: URLSearchParams;
  }): Promise<{ ok: boolean; challenge?: string; status?: number; body?: string }>;
}
