import { getAdminDb } from "@/lib/firebase-admin";

// Log environment on startup
console.log({
  FIREBASE_SERVICE_ACCOUNT_JSON: !!process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
  DEFAULT_ORG_ID: process.env.DEFAULT_ORG_ID,
  NODE_ENV: process.env.NODE_ENV,
});
import type {
  AiExtractionRecord,
  Conversation,
  InboundMessage,
  ProcessingLog,
  ProcessingQueueItem,
  WhatsAppConnection,
} from "@/types";
import { contentHash, normalizeText } from "@/lib/pipeline/normalize";
import type { NormalizedInboundMessage } from "@/lib/pipeline/connectors";

const DUPLICATE_WINDOW_MS = 30 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export async function resolveOrgIdForWhatsApp(
  phoneNumberId?: string
): Promise<string> {
  const db = getAdminDb();

  if (phoneNumberId) {
    console.log("Searching whatsappConnections for phoneNumberId:", phoneNumberId);
    const connSnap = await db
      .collection("whatsappConnections")
      .where("phoneNumberId", "==", phoneNumberId)
      .where("active", "==", true)
      .limit(2)
      .get();

    if (!connSnap.empty) {
      if (connSnap.size > 1) {
        console.warn(`[DUPLICATE MAPPING WARNING] Multiple active whatsappConnections found for Phone Number ID: ${phoneNumberId}`);
      }
      return connSnap.docs[0].data().orgId as string;
    }

    console.log("Searching organizations for whatsappPhoneNumberId:", phoneNumberId);
    const orgSnap = await db
      .collection("organizations")
      .where("whatsappPhoneNumberId", "==", phoneNumberId)
      .limit(2)
      .get();

    if (!orgSnap.empty) {
      if (orgSnap.size > 1) {
        console.warn(`[DUPLICATE MAPPING WARNING] Multiple organizations found with whatsappPhoneNumberId: ${phoneNumberId}`);
      }
      return orgSnap.docs[0].id;
    }
  }

  // Fallback to DEFAULT_ORG_ID in development/local testing
  if (process.env.DEFAULT_ORG_ID) {
    console.log("resolveOrgIdForWhatsApp fallback: using DEFAULT_ORG_ID:", process.env.DEFAULT_ORG_ID);
    return process.env.DEFAULT_ORG_ID;
  }

  const errorMsg = `[RESOLVE ORG FAILED] No active organization mapping found for WhatsApp Phone Number ID: ${phoneNumberId || "undefined"}`;
  console.error(errorMsg);
  throw new Error(errorMsg);
}

export async function findDuplicateByExternalId(
  orgId: string,
  externalId: string
): Promise<InboundMessage | null> {
  const db = getAdminDb();
  const snap = await db
    .collection("whatsappMessages")
    .where("orgId", "==", orgId)
    .where("externalId", "==", externalId)
    .limit(1)
    .get();

  if (snap.empty) return null;
  return snap.docs[0].data() as InboundMessage;
}

export async function findDuplicateByContentHash(
  orgId: string,
  hash: string,
  withinMs = DUPLICATE_WINDOW_MS
): Promise<InboundMessage | null> {
  const db = getAdminDb();
  const since = new Date(Date.now() - withinMs).toISOString();
  const snap = await db
    .collection("whatsappMessages")
    .where("orgId", "==", orgId)
    .where("contentHash", "==", hash)
    .where("createdAt", ">=", since)
    .limit(1)
    .get();

  if (snap.empty) return null;
  return snap.docs[0].data() as InboundMessage;
}

export async function upsertConversation(input: {
  orgId: string;
  source: InboundMessage["source"];
  participant: string;
  messageId: string;
}): Promise<string> {
  const db = getAdminDb();
  const threadKey = `${input.source}:${input.participant}`;
  const existing = await db
    .collection("conversations")
    .where("orgId", "==", input.orgId)
    .where("externalThreadKey", "==", threadKey)
    .limit(1)
    .get();

  const now = new Date().toISOString();

  if (!existing.empty) {
    const doc = existing.docs[0];
    const data = doc.data() as Conversation;
    const recent = [input.messageId, ...(data.recentMessageIds || [])].slice(0, 20);
    await doc.ref.update({
      lastMessageAt: now,
      updatedAt: now,
      recentMessageIds: recent,
    });
    return doc.id;
  }

  const ref = db.collection("conversations").doc();
  const conversation: Conversation = {
    id: ref.id,
    orgId: input.orgId,
    source: input.source,
    externalThreadKey: threadKey,
    participant: input.participant,
    lastMessageAt: now,
    recentMessageIds: [input.messageId],
    createdAt: now,
    updatedAt: now,
  };
  await ref.set(conversation);
  return ref.id;
}

export async function getConversationContext(
  orgId: string,
  conversationId: string,
  limit = 8
): Promise<string[]> {
  const db = getAdminDb();
  const convSnap = await db.collection("conversations").doc(conversationId).get();
  if (!convSnap.exists) return [];

  const conv = convSnap.data() as Conversation;
  const ids = (conv.recentMessageIds || []).slice(0, limit);
  if (ids.length === 0) return [];

  const texts: string[] = [];
  for (const id of ids.reverse()) {
    const msg = await db.collection("whatsappMessages").doc(id).get();
    if (msg.exists) {
      const data = msg.data() as InboundMessage;
      if (data.text) texts.push(`${data.sender}: ${data.text}`);
    }
  }
  return texts;
}

export async function saveInboundMessage(
  orgId: string,
  normalized: NormalizedInboundMessage
): Promise<{ message: InboundMessage; queueItem: ProcessingQueueItem; isDuplicate: boolean }> {
  console.log("saveInboundMessage transaction started");
  const db = getAdminDb();
  const now = new Date().toISOString();
  const hash = contentHash(normalized.sender, normalized.text);

  let resultMessage: InboundMessage;
  let resultQueueItem: ProcessingQueueItem;
  let isDuplicate = false;

  try {
    await db.runTransaction(async (transaction) => {
      // --- READ PHASE ---
      // 1. Check duplicate externalId
      const externalQuery = db
        .collection("whatsappMessages")
        .where("orgId", "==", orgId)
        .where("externalId", "==", normalized.externalId)
        .limit(1);
      const externalSnap = await transaction.get(externalQuery);

      if (!externalSnap.empty) {
        isDuplicate = true;
        const byExternal = externalSnap.docs[0].data() as InboundMessage;
        resultMessage = byExternal;
        resultQueueItem = {
          id: "",
          orgId,
          messageId: byExternal.id,
          attempts: 0,
          maxAttempts: MAX_ATTEMPTS,
          status: "completed",
          scheduledAt: now,
          createdAt: now,
          updatedAt: now,
        };
        return;
      }

      // 2. Check duplicate by content hash
      const since = new Date(Date.now() - DUPLICATE_WINDOW_MS).toISOString();
      const hashQuery = db
        .collection("whatsappMessages")
        .where("orgId", "==", orgId)
        .where("contentHash", "==", hash)
        .where("createdAt", ">=", since)
        .limit(1);
      const hashSnap = await transaction.get(hashQuery);
      const byHash = !hashSnap.empty ? (hashSnap.docs[0].data() as InboundMessage) : null;

      // 3. Get conversation
      const threadKey = `${normalized.source}:${normalized.sender}`;
      const convQuery = db
        .collection("conversations")
        .where("orgId", "==", orgId)
        .where("externalThreadKey", "==", threadKey)
        .limit(1);
      const convSnap = await transaction.get(convQuery);

      // --- WRITE PHASE ---
      const msgRef = db.collection("whatsappMessages").doc();
      let conversationId: string;

      if (!convSnap.empty) {
        const convDoc = convSnap.docs[0];
        const convData = convDoc.data() as Conversation;
        conversationId = convDoc.id;
        const recent = [msgRef.id, ...(convData.recentMessageIds || [])].slice(0, 20);
        transaction.update(convDoc.ref, {
          lastMessageAt: now,
          updatedAt: now,
          recentMessageIds: recent,
        });
      } else {
        const convRef = db.collection("conversations").doc();
        conversationId = convRef.id;
        const conversation: Conversation = {
          id: convRef.id,
          orgId,
          source: normalized.source,
          externalThreadKey: threadKey,
          participant: normalized.sender,
          lastMessageAt: now,
          recentMessageIds: [msgRef.id],
          createdAt: now,
          updatedAt: now,
        };
        transaction.set(convRef, conversation);
      }

      const message: InboundMessage = {
        id: msgRef.id,
        orgId,
        source: normalized.source,
        externalId: normalized.externalId,
        sender: normalized.sender,
        senderName: normalized.senderName,
        text: normalized.text,
        normalizedText: normalizeText(normalized.text),
        type: normalized.type,
        status: byHash ? "duplicate" : "pending",
        contentHash: hash,
        phoneNumberId: normalized.phoneNumberId,
        conversationId,
        rawPayload: normalized.rawPayload,
        attachmentRefs: normalized.attachmentRefs,
        createdAt: now,
        updatedAt: now,
      };

      transaction.set(msgRef, message);

      if (byHash) {
        isDuplicate = true;
        resultMessage = message;
        resultQueueItem = {
          id: "",
          orgId,
          messageId: message.id,
          attempts: 0,
          maxAttempts: MAX_ATTEMPTS,
          status: "completed",
          scheduledAt: now,
          createdAt: now,
          updatedAt: now,
        };
        return;
      }

      const queueRef = db.collection("processingQueue").doc();
      const queueItem: ProcessingQueueItem = {
        id: queueRef.id,
        orgId,
        messageId: message.id,
        attempts: 0,
        maxAttempts: MAX_ATTEMPTS,
        status: "pending",
        scheduledAt: now,
        createdAt: now,
        updatedAt: now,
      };

      transaction.set(queueRef, queueItem);
      transaction.update(msgRef, { status: "queued", updatedAt: now });

      resultMessage = { ...message, status: "queued" };
      resultQueueItem = queueItem;
    });

    console.log("saveInboundMessage completed successfully");
    return { message: resultMessage!, queueItem: resultQueueItem!, isDuplicate };
  } catch (error) {
    console.error("========== SAVE INBOUND MESSAGE TRANSACTION ERROR ==========");
    console.error(error);
    if (error instanceof Error) {
      console.error(error.message);
      console.error(error.stack);
    }
    throw error;
  }
}
// Duplicate saveInboundMessage implementation removed

export async function writeProcessingLog(input: Omit<ProcessingLog, "id" | "createdAt">) {
  const db = getAdminDb();
  const ref = db.collection("processingLogs").doc();
  const log: ProcessingLog = {
    id: ref.id,
    createdAt: new Date().toISOString(),
    ...input,
  };
  await ref.set(log);
  return log;
}

export async function saveAiExtraction(record: Omit<AiExtractionRecord, "id">): Promise<AiExtractionRecord> {
  const db = getAdminDb();
  const ref = db.collection("aiExtractions").doc();
  const full: AiExtractionRecord = { id: ref.id, ...record };
  await ref.set(full);
  return full;
}

export async function updateMessageStatus(
  messageId: string,
  status: InboundMessage["status"],
  extra?: Partial<InboundMessage>
) {
  const db = getAdminDb();
  await db.collection("whatsappMessages").doc(messageId).update({
    status,
    updatedAt: new Date().toISOString(),
    ...extra,
  });
}

export async function updateQueueItem(
  queueId: string,
  updates: Partial<ProcessingQueueItem>
) {
  const db = getAdminDb();
  await db.collection("processingQueue").doc(queueId).update({
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

export async function getQueueItem(queueId: string): Promise<ProcessingQueueItem | null> {
  const db = getAdminDb();
  const snap = await db.collection("processingQueue").doc(queueId).get();
  if (!snap.exists) return null;
  return snap.data() as ProcessingQueueItem;
}

export async function getInboundMessage(messageId: string): Promise<InboundMessage | null> {
  const db = getAdminDb();
  const snap = await db.collection("whatsappMessages").doc(messageId).get();
  if (!snap.exists) return null;
  return snap.data() as InboundMessage;
}

export async function ensureWhatsAppConnection(orgId: string, phoneNumberId: string) {
  const db = getAdminDb();
  const existing = await db
    .collection("whatsappConnections")
    .where("orgId", "==", orgId)
    .where("phoneNumberId", "==", phoneNumberId)
    .limit(1)
    .get();

  if (!existing.empty) return existing.docs[0].id;

  const now = new Date().toISOString();
  const ref = db.collection("whatsappConnections").doc();
  const conn: WhatsAppConnection = {
    id: ref.id,
    orgId,
    phoneNumberId,
    active: true,
    createdAt: now,
    updatedAt: now,
  };
  await ref.set(conn);
  return ref.id;
}
