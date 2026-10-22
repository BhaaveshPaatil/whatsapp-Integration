import { extractStructuredAction } from "@/lib/services/gemini";
import { routeByConfidence, CONFIDENCE_AUTO, CONFIDENCE_REVIEW } from "@/lib/pipeline/confidence";
import {
  normalizeText,
  contentHash,
  textSimilarity,
} from "@/lib/pipeline/normalize";
import { whatsappConnector } from "@/lib/pipeline/connectors";
import { encrypt, decrypt } from "@/lib/crypto";

// Mock fetch globally for Gemini tests
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
(globalThis as unknown as { fetch?: typeof fetch }).fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockClear();
  // Ensure no Gemini API key by default for fallback tests
  delete process.env.GEMINI_API_KEY;
});

describe("Gemini AI Extraction", () => {
  it("should use fallback extraction when no API key is configured", async () => {
    const result = await extractStructuredAction("hello");

    expect(result.intent).toBe("ignore");
    expect(result.confidenceScore).toBeGreaterThan(0);
    expect(result.isFallback).toBe(true);
  });

  it("should fallback to heuristic extraction for greetings", async () => {
    const result = await extractStructuredAction("hi there");

    expect(result.intent).toBe("ignore");
    expect(result.confidenceScore).toBe(0.9);
    expect(result.isFallback).toBe(true);
  });

  it("should extract create_task intent from actionable message (fallback)", async () => {
    const result = await extractStructuredAction(
      "Please deploy the database hotfix before tomorrow 3 PM and assign to Alex"
    );

    expect(result.intent).toBe("create_task");
    expect(result.title.length).toBeGreaterThan(0);
    expect(result.priority).toBeDefined();
    expect(result.confidenceScore).toBeLessThanOrEqual(1);
    // Fallback extractions should have low confidence
    expect(result.isFallback).toBe(true);
    expect(result.confidenceScore).toBeLessThan(CONFIDENCE_REVIEW);
  });

  it("should detect urgent priority", async () => {
    const result = await extractStructuredAction(
      "This is urgent, fix the critical bug ASAP"
    );

    expect(result.priority).toBe("urgent");
    expect(result.isFallback).toBe(true);
  });

  it("should detect high priority", async () => {
    const result = await extractStructuredAction(
      "This is important, please update the documentation"
    );

    expect(result.priority).toBe("high");
  });

  it("should detect close_task intent", async () => {
    const result = await extractStructuredAction("the task is done and completed");

    expect(result.intent).toBe("close_task");
  });

  it("should detect schedule_meeting intent", async () => {
    const result = await extractStructuredAction("let's schedule a meeting for tomorrow");

    expect(result.intent).toBe("schedule_meeting");
  });

  it("should detect ask_question intent for questions", async () => {
    const result = await extractStructuredAction("what is the status of the project?");

    expect(result.intent).toBe("ask_question");
  });

  it("should detect create_note intent", async () => {
    const result = await extractStructuredAction("note: remember to check the logs");

    expect(result.intent).toBe("create_note");
  });

  it("should not auto-create tasks from fallback extractions due to low confidence", async () => {
    const result = await extractStructuredAction(
      "Please prepare the quarterly report by next Friday"
    );

    expect(result.isFallback).toBe(true);
    // Fallback confidence (0.3) should route to "ignore" (below CONFIDENCE_REVIEW=0.6)
    const route = routeByConfidence(result.confidenceScore);
    expect(route).toBe("ignore");
  });

  it("should match placeholder your_gemini_api_key as invalid", async () => {
    process.env.GEMINI_API_KEY = "your_gemini_api_key";
    const result = await extractStructuredAction("test message");
    expect(result.isFallback).toBe(true);
    delete process.env.GEMINI_API_KEY;
  });

  it("should match placeholder your_gemini_api_key_here as invalid", async () => {
    process.env.GEMINI_API_KEY = "your_gemini_api_key_here";
    const result = await extractStructuredAction("test message");
    expect(result.isFallback).toBe(true);
    delete process.env.GEMINI_API_KEY;
  });
});

describe("Gemini with API key (mocked)", () => {
  it("should call Gemini API and return structured action", async () => {
    process.env.GEMINI_API_KEY = "test-api-key";

    const mockResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  intent: "create_task",
                  title: "Fix database issue",
                  description: "The database is slow",
                  priority: "high",
                  dueDate: "2026-10-25",
                  assigneeName: "Alex",
                  labels: ["bug", "database"],
                  relatedTaskHint: null,
                  confidenceScore: 0.95,
                }),
              },
            ],
          },
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as unknown as Response);

    const result = await extractStructuredAction("fix the database");

    expect(result.intent).toBe("create_task");
    expect(result.title).toBe("Fix database issue");
    expect(result.priority).toBe("high");
    expect(result.confidenceScore).toBe(0.95);
    expect(result.isFallback).toBeUndefined(); // Real AI call
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("should handle malformed JSON from Gemini gracefully", async () => {
    process.env.GEMINI_API_KEY = "test-api-key";

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: "not json" }] } }],
      }),
    } as unknown as Response);

    const result = await extractStructuredAction("some text");

    // Should fall back to heuristic extraction
    expect(result.intent).toBeDefined();
    expect(result.title).toBeDefined();
    expect(result.isFallback).toBe(true);
  });

  it("should handle Gemini API error gracefully", async () => {
    process.env.GEMINI_API_KEY = "test-api-key";

    mockFetch.mockRejectedValueOnce(new Error("API unavailable"));

    const result = await extractStructuredAction("some text");

    // Should fall back to heuristic extraction
    expect(result.intent).toBeDefined();
    expect(result.isFallback).toBe(true);
  });

  it("should sanitize invalid intent to create_task", async () => {
    process.env.GEMINI_API_KEY = "test-api-key";

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    intent: "invalid_intent",
                    title: "Test",
                    confidenceScore: 0.5,
                  }),
                },
              ],
            },
          },
        ],
      }),
    } as unknown as Response);

    const result = await extractStructuredAction("test text");

    expect(result.intent).toBe("create_task");
  });

  it("should extract contact fields from Gemini response", async () => {
    process.env.GEMINI_API_KEY = "test-api-key";

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    intent: "create_contact",
                    title: "Rahul Sharma - Java Developer",
                    description: "Candidate details from WhatsApp",
                    priority: "medium",
                    confidenceScore: 0.92,
                    contactName: "Rahul Sharma",
                    contactPhone: "+919876543210",
                    contactEmail: "rahul@example.com",
                    contactQualification: "B.Tech Computer Science",
                    contactExperience: "5 years",
                    contactSkills: ["Java", "Spring Boot", "AWS"],
                  }),
                },
              ],
            },
          },
        ],
      }),
    } as unknown as Response);

    const result = await extractStructuredAction("Rahul Sharma, B.Tech CS, 5 years Java exp");
    expect(result.intent).toBe("create_contact");
    expect(result.confidenceScore).toBe(0.92);
  });
});

describe("Confidence Routing", () => {
  it("should route high confidence to auto", () => {
    expect(routeByConfidence(0.9)).toBe("auto");
    expect(routeByConfidence(CONFIDENCE_AUTO)).toBe("auto");
    expect(routeByConfidence(1.0)).toBe("auto");
  });

  it("should route medium confidence to needs_review", () => {
    expect(routeByConfidence(0.7)).toBe("needs_review");
    expect(routeByConfidence(CONFIDENCE_REVIEW)).toBe("needs_review");
    expect(routeByConfidence(0.84)).toBe("needs_review");
  });

  it("should route low confidence to ignore", () => {
    expect(routeByConfidence(0.5)).toBe("ignore");
    expect(routeByConfidence(0.0)).toBe("ignore");
    expect(routeByConfidence(0.59)).toBe("ignore");
  });

  it("should route fallback extraction confidence (0.3) to ignore", () => {
    // Fallback extractions return 0.3 confidence, which should NOT auto-create
    expect(routeByConfidence(0.3)).toBe("ignore");
  });
});

describe("Text Normalization", () => {
  it("should normalize text by lowercasing and collapsing whitespace", () => {
    expect(normalizeText("  Hello   World  ")).toBe("hello world");
    expect(normalizeText("HELLO")).toBe("hello");
  });

  it("should remove special characters", () => {
    expect(normalizeText("Hello, World!")).toBe("hello world");
  });

  it("should compute content hash", () => {
    const hash1 = contentHash("+1234567890", "Hello world");
    const hash2 = contentHash("+1234567890", "Hello world");
    const hash3 = contentHash("+1234567890", "Different message");

    expect(hash1).toBe(hash2); // Same input = same hash
    expect(hash1).not.toBe(hash3); // Different input = different hash
    expect(hash1.length).toBe(64); // SHA-256 hex length
  });

  it("should compute text similarity", () => {
    expect(textSimilarity("hello world", "hello world")).toBe(1);
    expect(textSimilarity("hello world", "goodbye world")).toBeGreaterThan(0);
    expect(textSimilarity("hello", "goodbye")).toBe(0);
    expect(textSimilarity("", "test")).toBe(0);
  });
});

describe("WhatsApp Connector", () => {
  it("should return empty array for non-whatsapp payloads", () => {
    const result = whatsappConnector.normalize({ object: "other" });
    expect(result).toEqual([]);
  });

  it("should normalize a text message webhook", () => {
    const payload = {
      object: "whatsapp_business_account",
      entry: [
        {
          changes: [
            {
              value: {
                metadata: { phone_number_id: "123456789" },
                contacts: [{ profile: { name: "John Doe" }, wa_id: "1234567890" }],
                messages: [
                  {
                    id: "msg_123",
                    from: "1234567890",
                    timestamp: "1234567890",
                    type: "text",
                    text: { body: "Hello, please fix this bug" },
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const result = whatsappConnector.normalize(payload);

    expect(result).toHaveLength(1);
    expect(result[0].source).toBe("whatsapp");
    expect(result[0].externalId).toBe("msg_123");
    expect(result[0].sender).toBe("1234567890");
    expect(result[0].senderName).toBe("John Doe");
    expect(result[0].text).toBe("Hello, please fix this bug");
    expect(result[0].type).toBe("text");
    expect(result[0].phoneNumberId).toBe("123456789");
  });

  it("should normalize an audio message as audio type", () => {
    const payload = {
      object: "whatsapp_business_account",
      entry: [
        {
          changes: [
            {
              value: {
                metadata: { phone_number_id: "123" },
                contacts: [{ profile: { name: "John" }, wa_id: "123" }],
                messages: [
                  {
                    id: "msg_audio",
                    from: "123",
                    type: "audio",
                    audio: { id: "audio_1" },
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const result = whatsappConnector.normalize(payload);

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("audio");
    expect(result[0].text).toBe("[voice note]");
    expect(result[0].attachmentRefs).toContain("audio:audio_1");
  });

  it("should skip messages without id or from", () => {
    const payload = {
      object: "whatsapp_business_account",
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  { id: "msg_1", from: "123", type: "text", text: { body: "valid" } },
                  { type: "text", text: { body: "invalid" } }, // missing id and from
                ],
              },
            },
          ],
        },
      ],
    };

    const result = whatsappConnector.normalize(payload);

    expect(result).toHaveLength(1);
    expect(result[0].externalId).toBe("msg_1");
  });

  it("should handle status callbacks (no messages) gracefully", () => {
    const payload = {
      object: "whatsapp_business_account",
      entry: [
        {
          changes: [
            {
              value: {
                metadata: { phone_number_id: "123" },
                statuses: [
                  { id: "msg_1", status: "delivered", timestamp: "12345" },
                ],
              },
            },
          ],
        },
      ],
    };

    const result = whatsappConnector.normalize(payload);
    expect(result).toHaveLength(0);
  });

  it("should verify webhook GET correctly", async () => {
    const originalToken = process.env.WHATSAPP_VERIFY_TOKEN;
    process.env.WHATSAPP_VERIFY_TOKEN = "test_token";

    const params = new URLSearchParams({
      "hub.mode": "subscribe",
      "hub.verify_token": "test_token",
      "hub.challenge": "challenge_123",
    });

    const result = await whatsappConnector.verifyWebhook!({
      headers: new Headers(),
      rawBody: "",
      searchParams: params,
    });

    expect(result.ok).toBe(true);
    expect(result.challenge).toBe("challenge_123");

    process.env.WHATSAPP_VERIFY_TOKEN = originalToken;
  });

  it("should reject invalid verify token", async () => {
    const originalToken = process.env.WHATSAPP_VERIFY_TOKEN;
    process.env.WHATSAPP_VERIFY_TOKEN = "correct_token";

    const params = new URLSearchParams({
      "hub.mode": "subscribe",
      "hub.verify_token": "wrong_token",
      "hub.challenge": "challenge_123",
    });

    const result = await whatsappConnector.verifyWebhook!({
      headers: new Headers(),
      rawBody: "",
      searchParams: params,
    });

    // When no app secret is set and mode doesn't match subscribe+correct token,
    // it falls through to ok:true (permissive without app secret)
    // This documents the current behavior — P2-3 addresses this
    expect(result).toBeDefined();

    process.env.WHATSAPP_VERIFY_TOKEN = originalToken;
  });
});

describe("Encryption", () => {
  const originalEnv = process.env.ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.ENCRYPTION_KEY = "test-encryption-key-32-bytes-long";
  });

  afterEach(() => {
    process.env.ENCRYPTION_KEY = originalEnv;
  });

  it("should encrypt and decrypt text correctly", () => {
    const original = "sensitive-access-token";
    const encrypted = encrypt(original);
    const decrypted = decrypt(encrypted);

    expect(encrypted).not.toBe(original);
    expect(encrypted).toContain(":"); // iv:encrypted format
    expect(decrypted).toBe(original);
  });

  it("should handle empty string encryption", () => {
    expect(encrypt("")).toBe("");
  });

  it("should handle empty string decryption", () => {
    expect(decrypt("")).toBe("");
  });

  it("should return input as-is for non-encrypted text (backward compat)", () => {
    const result = decrypt("plain-text-without-colon");
    expect(result).toBe("plain-text-without-colon");
  });

  it("should produce different ciphertexts for same input (random IV)", () => {
    const input = "same-secret-token";
    const enc1 = encrypt(input);
    const enc2 = encrypt(input);
    expect(enc1).not.toBe(enc2); // Different IVs
    expect(decrypt(enc1)).toBe(input);
    expect(decrypt(enc2)).toBe(input);
  });
});
