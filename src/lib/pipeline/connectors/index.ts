import type { MessageSource } from "@/types";
import type { MessageConnector } from "./types";
import { whatsappConnector } from "./whatsapp";

const registry: Record<string, MessageConnector> = {
  whatsapp: whatsappConnector,
};

export function getConnector(source: MessageSource): MessageConnector {
  const connector = registry[source];
  if (!connector) {
    throw new Error(`No connector registered for source: ${source}`);
  }
  return connector;
}

export function registerConnector(connector: MessageConnector): void {
  registry[connector.source] = connector;
}

export { whatsappConnector };
export type { MessageConnector, NormalizedInboundMessage, ConnectorSendResult } from "./types";
