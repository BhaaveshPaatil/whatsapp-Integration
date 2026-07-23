import type { StructuredAiAction, TaskPriority } from "@/types";

const VALID_INTENTS: StructuredAiAction["intent"][] = [
  "create_task",
  "update_task",
  "close_task",
  "ask_question",
  "schedule_meeting",
  "create_note",
  "ignore",
];

const VALID_PRIORITIES: TaskPriority[] = ["low", "medium", "high", "urgent"];

/** @deprecated Prefer extractStructuredAction — kept for /api/ai/extract compatibility */
export interface ExtractedTaskData {
  title: string;
  description: string;
  priority: TaskPriority;
  dueDate?: string;
  assigneeName?: string;
  confidenceScore: number;
}

export async function extractTaskFromText(text: string): Promise<ExtractedTaskData> {
  const action = await extractStructuredAction(text);
  return {
    title: action.title,
    description: action.description,
    priority: action.priority,
    dueDate: action.dueDate,
    assigneeName: action.assigneeName,
    confidenceScore: action.confidenceScore,
  };
}

export async function extractStructuredAction(
  text: string,
  context?: { history?: string[]; openTasks?: string[] }
): Promise<StructuredAiAction> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    return fallbackExtraction(text);
  }

  try {
    const historyBlock =
      context?.history && context.history.length > 0
        ? `\nConversation history (oldest → newest):\n${context.history.join("\n")}`
        : "";
    const tasksBlock =
      context?.openTasks && context.openTasks.length > 0
        ? `\nOpen tasks in this org:\n${context.openTasks.map((t, i) => `${i + 1}. ${t}`).join("\n")}`
        : "";

    const systemPrompt = `You are TaskFlow AI's intent engine. Analyze the inbound message and return ONLY valid JSON:
{
  "intent": "create_task" | "update_task" | "close_task" | "ask_question" | "schedule_meeting" | "create_note" | "ignore",
  "title": "short action title",
  "description": "context / details",
  "priority": "urgent" | "high" | "medium" | "low",
  "dueDate": "YYYY-MM-DD or omit",
  "assigneeName": "name or omit",
  "labels": ["optional","tags"],
  "relatedTaskHint": "title of existing task if updating/closing, else omit",
  "confidenceScore": 0.0-1.0
}
Rules:
- Use conversation history for pronouns like "it", "that", "move it to Friday".
- Prefer update_task/close_task when the message clearly refers to an open task.
- Use ignore for greetings, spam, or no actionable content.
- confidenceScore reflects certainty of the intent and fields.`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `${systemPrompt}${historyBlock}${tasksBlock}\n\nIncoming message: "${text}"`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    const data = await res.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const cleanJson = responseText.replace(/```json|```/g, "").trim();
    return sanitizeAction(JSON.parse(cleanJson), text);
  } catch (error) {
    console.error("Gemini extraction error, using heuristic fallback:", error);
    return fallbackExtraction(text);
  }
}

function sanitizeAction(raw: Partial<StructuredAiAction>, text: string): StructuredAiAction {
  const intent = VALID_INTENTS.includes(raw.intent as StructuredAiAction["intent"])
    ? (raw.intent as StructuredAiAction["intent"])
    : "create_task";
  const priority = VALID_PRIORITIES.includes(raw.priority as TaskPriority)
    ? (raw.priority as TaskPriority)
    : "medium";
  const confidence =
    typeof raw.confidenceScore === "number"
      ? Math.min(1, Math.max(0, raw.confidenceScore))
      : 0.7;

  return {
    intent,
    title: (raw.title || text).slice(0, 120),
    description: raw.description || text,
    priority,
    dueDate: raw.dueDate,
    assigneeName: raw.assigneeName,
    labels: Array.isArray(raw.labels) ? raw.labels.slice(0, 8) : [],
    relatedTaskHint: raw.relatedTaskHint,
    confidenceScore: confidence,
  };
}

function fallbackExtraction(text: string): StructuredAiAction {
  const lower = text.toLowerCase().trim();

  if (!lower || lower.length < 3 || /^(hi|hello|hey|thanks|ok|okay)\b/.test(lower)) {
    return {
      intent: "ignore",
      title: "Ignored message",
      description: text,
      priority: "low",
      labels: [],
      confidenceScore: 0.9,
    };
  }

  let priority: TaskPriority = "medium";
  if (lower.includes("urgent") || lower.includes("asap") || lower.includes("critical")) {
    priority = "urgent";
  } else if (lower.includes("high") || lower.includes("important")) {
    priority = "high";
  } else if (lower.includes("low")) {
    priority = "low";
  }

  let intent: StructuredAiAction["intent"] = "create_task";
  if (/\b(done|completed|close|finished)\b/.test(lower)) intent = "close_task";
  else if (/\b(update|change|move|reschedule|instead)\b/.test(lower)) intent = "update_task";
  else if (/\b(meeting|call|schedule)\b/.test(lower)) intent = "schedule_meeting";
  else if (/\?$/.test(text.trim())) intent = "ask_question";

  return {
    intent,
    title: text.length > 60 ? `${text.substring(0, 60)}...` : text,
    description: `Raw message: "${text}"`,
    priority,
    dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
    labels: ["whatsapp"],
    confidenceScore: 0.72,
  };
}
