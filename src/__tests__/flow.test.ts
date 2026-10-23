jest.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    serverTimestamp: () => new Date().toISOString(),
  },
}));

jest.mock("@/lib/firebase-admin", () => ({
  getAdminDb: () => (globalThis as { __fakeDb?: unknown }).__fakeDb,
  isAdminConfigured: () => true,
}));

jest.mock("@/lib/services/gemini", () => ({
  extractStructuredAction: jest.fn(),
}));

import { whatsappConnector } from "@/lib/pipeline/connectors";
import { saveInboundMessage } from "@/lib/pipeline/store";
import { processQueueJob } from "@/lib/pipeline/worker";
import { extractStructuredAction } from "@/lib/services/gemini";
import type { StructuredAiAction } from "@/types";
import { FakeFirestore } from "./helpers/fakeFirestore";

const ORG = "org_test";
const mockExtract = extractStructuredAction as jest.MockedFunction<
  typeof extractStructuredAction
>;

let db: FakeFirestore;

function seedOrg(orgId = ORG) {
  db.seed("organizations", orgId, { id: orgId, name: "Acme" });
  db.seed("users", `${orgId}_admin`, {
    uid: `${orgId}_admin`,
    orgId,
    role: "admin",
    displayName: "Ada Admin",
    email: "admin@example.com",
  });
}

function webhookPayload(messageId: string, text: string) {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        changes: [
          {
            value: {
              metadata: { phone_number_id: "phone_1" },
              contacts: [{ profile: { name: "John Doe" }, wa_id: "15550001111" }],
              messages: [
                {
                  id: messageId,
                  from: "15550001111",
                  timestamp: "1700000000",
                  type: "text",
                  text: { body: text },
                },
              ],
            },
          },
        ],
      },
    ],
  };
}

function inboundMessage(messageId: string, text: string) {
  return whatsappConnector.normalize(webhookPayload(messageId, text))[0];
}

function action(overrides: Partial<StructuredAiAction> = {}): StructuredAiAction {
  return {
    intent: "create_task",
    title: "Deploy release",
    description: "Deploy the release build",
    priority: "high",
    confidenceScore: 0.95,
    labels: ["release"],
    ...overrides,
  };
}

function makeDue(queueId: string) {
  db.updateDoc("processingQueue", queueId, {
    scheduledAt: new Date(0).toISOString(),
  });
}

beforeEach(() => {
  db = new FakeFirestore();
  (globalThis as unknown as { __fakeDb: FakeFirestore }).__fakeDb = db;
  mockExtract.mockReset();
});

describe("Complete inbound message flow", () => {
  it("persists a webhook message, runs AI extraction, and creates a task", async () => {
    seedOrg();

    const inbound = inboundMessage(
      "wamid.flow.1",
      "Please create a task to deploy the release tomorrow"
    );
    expect(inbound).toBeDefined();

    const saved = await saveInboundMessage(ORG, inbound);
    expect(saved.isDuplicate).toBe(false);
    expect(saved.message.status).toBe("queued");
    expect(saved.queueItem.status).toBe("pending");
    expect(db.all("whatsappMessages")).toHaveLength(1);
    expect(db.all("processingQueue")).toHaveLength(1);

    mockExtract.mockResolvedValueOnce(action());

    const result = await processQueueJob(saved.queueItem.id);
    expect(result).toEqual({ ok: true, outcome: "auto_created" });

    const message = db.getDoc("whatsappMessages", saved.message.id).data()!;
    expect(message.status).toBe("completed");
    expect(message.processedAt).toBeDefined();

    const queue = db.getDoc("processingQueue", saved.queueItem.id).data()!;
    expect(queue.status).toBe("completed");
    expect(queue.attempts).toBe(1);

    const extractions = db.all("aiExtractions");
    expect(extractions).toHaveLength(1);
    expect(extractions[0].data.messageId).toBe(saved.message.id);
    expect(extractions[0].data.outcome).toBe("auto_created");
    expect(extractions[0].data.taskId).toBeDefined();

    const tasks = db.all("tasks");
    expect(tasks).toHaveLength(1);
    expect(tasks[0].data.orgId).toBe(ORG);
    expect(tasks[0].data.sourceMessageId).toBe(saved.message.id);
    expect(tasks[0].data.title).toBe("Deploy release");

    expect(
      db.all("processingLogs").some((row) => row.data.stage === "complete")
    ).toBe(true);
    expect(
      db.all("analyticsEvents").some((row) => row.data.type === "ai_extraction")
    ).toBe(true);
    expect(
      db.all("analyticsEvents").some((row) => row.data.type === "task_created")
    ).toBe(true);
  });

  it("does not persist or process the same WhatsApp message id twice", async () => {
    seedOrg();

    const inbound = inboundMessage("wamid.duplicate.1", "Hello there");
    const first = await saveInboundMessage(ORG, inbound);
    const second = await saveInboundMessage(ORG, inbound);

    expect(second.isDuplicate).toBe(true);
    expect(second.message.id).toBe(first.message.id);
    expect(second.queueItem.id).toBe("");
    expect(db.all("whatsappMessages")).toHaveLength(1);
    expect(db.all("processingQueue")).toHaveLength(1);
  });

  it("flags repeated content within the duplicate window", async () => {
    seedOrg();

    const inbound = inboundMessage("wamid.content.1", "Same message text");
    await saveInboundMessage(ORG, inbound);

    const duplicate = await saveInboundMessage(ORG, {
      ...inbound,
      externalId: "wamid.content.2",
    });

    expect(duplicate.isDuplicate).toBe(true);
    expect(duplicate.message.status).toBe("duplicate");
    // Only the original message gets a queue job.
    expect(db.all("processingQueue")).toHaveLength(1);
  });

  it("retries failed processing and clears the failed AI record on success", async () => {
    seedOrg();

    const inbound = inboundMessage("wamid.retry.1", "Please deploy the release");
    const saved = await saveInboundMessage(ORG, inbound);

    mockExtract.mockRejectedValueOnce(new Error("Gemini unavailable"));
    const failed = await processQueueJob(saved.queueItem.id);
    expect(failed.ok).toBe(false);

    let queue = db.getDoc("processingQueue", saved.queueItem.id).data()!;
    expect(queue.status).toBe("pending");
    expect(queue.attempts).toBe(1);
    expect(queue.lastError).toBe("Gemini unavailable");
    expect(db.getDoc("whatsappMessages", saved.message.id).data()!.status).toBe(
      "queued"
    );

    let extraction = db.all("aiExtractions")[0].data;
    expect(extraction.outcome).toBe("failed");
    expect(extraction.error).toBe("Gemini unavailable");

    // The retry is scheduled in the future; make it due and let it succeed.
    makeDue(saved.queueItem.id);
    mockExtract.mockResolvedValueOnce(action());

    const retried = await processQueueJob(saved.queueItem.id);
    expect(retried).toEqual({ ok: true, outcome: "auto_created" });

    queue = db.getDoc("processingQueue", saved.queueItem.id).data()!;
    expect(queue.status).toBe("completed");
    expect(queue.attempts).toBe(2);

    extraction = db.all("aiExtractions")[0].data;
    expect(extraction.outcome).toBe("auto_created");
    expect(extraction.error).toBeUndefined();
    expect(extraction.taskId).toBeDefined();
    expect(db.all("tasks")).toHaveLength(1);
  });

  it("stops retrying after the maximum attempt count", async () => {
    seedOrg();

    const inbound = inboundMessage("wamid.dead.1", "This always fails");
    const saved = await saveInboundMessage(ORG, inbound);

    mockExtract.mockRejectedValue(new Error("Gemini is down"));

    for (let attempt = 0; attempt < 5; attempt += 1) {
      makeDue(saved.queueItem.id);
      const result = await processQueueJob(saved.queueItem.id);
      expect(result.ok).toBe(false);
    }

    const queue = db.getDoc("processingQueue", saved.queueItem.id).data()!;
    expect(queue.status).toBe("dead");
    expect(queue.attempts).toBe(5);
    expect(queue.completedAt).toBeDefined();
    expect(db.getDoc("whatsappMessages", saved.message.id).data()!.status).toBe(
      "failed"
    );
  });

  it("refuses to process a queue job from another organization", async () => {
    seedOrg();
    seedOrg("org_other");

    const inbound = inboundMessage("wamid.iso.1", "Tenant A message");
    const saved = await saveInboundMessage(ORG, inbound);

    db.seed("processingQueue", "queue_forged", {
      id: "queue_forged",
      orgId: "org_other",
      messageId: saved.message.id,
      attempts: 0,
      maxAttempts: 5,
      status: "pending",
      scheduledAt: new Date(0).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const result = await processQueueJob("queue_forged");
    expect(result.ok).toBe(false);

    const queue = db.getDoc("processingQueue", "queue_forged").data()!;
    expect(queue.status).toBe("dead");

    // The original tenant's message must remain untouched.
    expect(db.getDoc("whatsappMessages", saved.message.id).data()!.status).toBe(
      "queued"
    );
    expect(db.all("tasks")).toHaveLength(0);
  });
});
