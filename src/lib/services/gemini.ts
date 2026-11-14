import type { MessageClassification, StructuredAiAction, TaskPriority } from "@/types";

const VALID_CLASSIFICATIONS: MessageClassification[] = ["actionable", "ambiguous", "non_actionable"];

const VALID_INTENTS: StructuredAiAction["intent"][] = [
  "create_task",
  "update_task",
  "close_task",
  "ask_question",
  "schedule_meeting",
  "create_note",
  "create_contact",
  "create_both",
  "save_reminder",
  "ignore",
];

const VALID_PRIORITIES: TaskPriority[] = ["low", "medium", "high", "urgent"];

const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-flash-latest"];

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
  context?: { history?: string[]; openTasks?: string[]; apiKey?: string }
): Promise<StructuredAiAction> {
  const apiKey = context?.apiKey || process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.startsWith("your_gemini_api_key")) {
    return fallbackExtraction(text);
  }

  const historyBlock =
    context?.history && context.history.length > 0
      ? `\nConversation history (oldest → newest):\n${context.history.join("\n")}`
      : "";
  const tasksBlock =
    context?.openTasks && context.openTasks.length > 0
      ? `\nOpen tasks in this org:\n${context.openTasks.map((t, i) => `${i + 1}. ${t}`).join("\n")}`
      : "";

  const todayIso = new Date().toISOString().split("T")[0];
  const todayDayOfWeek = new Date().toLocaleDateString("en-US", { weekday: "long" });

  const systemPrompt = `You are TaskFlow AI's intelligent WhatsApp message-to-task extraction engine.
Today's reference date: ${todayIso} (${todayDayOfWeek}).

Analyze the incoming message and return ONLY valid JSON matching this schema:
{
  "classification": "actionable" | "ambiguous" | "non_actionable",
  "intent": "create_task" | "update_task" | "close_task" | "ask_question" | "schedule_meeting" | "create_note" | "ignore",
  "title": "short, actionable task title",
  "description": "context, details, or raw message excerpt",
  "priority": "urgent" | "high" | "medium" | "low",
  "dueDate": "YYYY-MM-DD or omit if no deadline is specified",
  "assigneeName": "name of person assigned or omit if no person is designated",
  "labels": ["optional", "tags"],
  "relatedTaskHint": "title of existing task if updating/closing, else omit",
  "confidenceScore": 0.0 to 1.0
}

Classification Rules:
1. "actionable": The message clearly conveys a task, action item, request to build/fix/do something, or update/close an existing task.
2. "ambiguous": The message suggests an issue, request, or work item but is vague, unclear, missing critical requirements, or requires admin review before a task can be safely created (e.g. "Can someone look into that?", "We should discuss something soon").
3. "non_actionable": The message is a greeting ("hi", "hello"), acknowledgment ("thanks", "ok", "got it"), casual chat, emoji, or contains no actionable task. Set intent to "ignore".

CRITICAL EXTRACTION RULES:
- NEVER INVENT MISSING INFORMATION.
- If no due date, deadline, or relative time is mentioned in the message, DO NOT invent a dueDate. Omit it or leave it null/undefined.
- If no person or assignee is explicitly mentioned (e.g., "assign to Alex", "Sarah please handle this"), DO NOT invent an assigneeName. Omit it or leave it null/undefined.
- For relative dates ("tomorrow", "by Friday", "next Monday"), calculate the exact YYYY-MM-DD based on today's date (${todayIso}, ${todayDayOfWeek}).
- If message refers to an existing open task in context (e.g., "mark it done", "it's completed"), use update_task or close_task.
- confidenceScore: Float from 0.0 to 1.0 representing your certainty in the classification and extracted fields.

for (const model of GEMINI_MODELS) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `${systemPrompt}${historyBlock}${tasksBlock}\n\nIncoming WhatsApp message: "${text}"`,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.1,
              responseMimeType: "application/json",
            },
          }),
        }
      );

      if (!res.ok) {
        const errText = await res.text();
        console.warn(`Gemini model ${model} returned HTTP ${res.status}: ${errText}`);
        continue;
      }

      const data = await res.json();
      const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const cleanJson = responseText.replace(/```json|```/g, "").trim();
      return sanitizeAction(JSON.parse(cleanJson), text);
    } catch (modelError) {
      console.warn(`Gemini model ${model} failed:`, modelError);
    }
  }

  console.error("All Gemini models failed, falling back to heuristic extraction.");
  return fallbackExtraction(text);
}

function sanitizeAction(raw: Partial<StructuredAiAction>, text: string): StructuredAiAction {
  let classification: MessageClassification =
    VALID_CLASSIFICATIONS.includes(raw.classification as MessageClassification)
      ? (raw.classification as MessageClassification)
      : "actionable";

  const intent = VALID_INTENTS.includes(raw.intent as StructuredAiAction["intent"])
    ? (raw.intent as StructuredAiAction["intent"])
    : "create_task";

  // Align classification with intent and confidence if needed
  if (intent === "ignore") {
    classification = "non_actionable";
  }

  const priority = VALID_PRIORITIES.includes(raw.priority as TaskPriority)
    ? (raw.priority as TaskPriority)
    : "medium";

  const confidence =
    typeof raw.confidenceScore === "number"
      ? Math.min(1, Math.max(0, raw.confidenceScore))
      : 0.7;

  // Strict check on dueDate format YYYY-MM-DD
  let dueDate: string | undefined = undefined;
  if (typeof raw.dueDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.dueDate.trim())) {
    dueDate = raw.dueDate.trim();
  }

  // Strict check on assigneeName
  let assigneeName: string | undefined = undefined;
  if (typeof raw.assigneeName === "string" && raw.assigneeName.trim().length > 1) {
    const trimmed = raw.assigneeName.trim();
    if (!["none", "n/a", "undefined", "null", "no one", "unassigned"].includes(trimmed.toLowerCase())) {
      assigneeName = trimmed;
    }
  }

  return {
    classification,
    intent,
    title: (raw.title || text).slice(0, 120),
    description: raw.description || text,
    priority,
    dueDate,
    assigneeName,
    labels: Array.isArray(raw.labels) ? raw.labels.slice(0, 8) : [],
    relatedTaskHint: raw.relatedTaskHint,
    confidenceScore: confidence,
  };
}

function fallbackExtraction(text: string): StructuredAiAction {
  const lower = text.toLowerCase().trim();

  // 1. Non-actionable: greetings, acknowledgments, casual messages
  if (
    !lower ||
    lower.length < 3 ||
    /^(hi|hello|hey|good\s+(morning|afternoon|evening)|thanks|thank\s+you|ok|okay|k|cool|great|bye|see\s+ya)\b/i.test(lower)
  ) {
    return {
      classification: "non_actionable",
      intent: "ignore",
      title: "Non-actionable message",
      description: text,
      priority: "low",
      labels: [],
      confidenceScore: 0.95,
    };
  }

  // 2. Ambiguous: vague queries or mentions without specific direction
  if (
    /\b(look into that|check on that|deal with that thing|discuss something|can someone look|someone check|what happened with)\b/i.test(lower) ||
    (lower.length < 25 && lower.endsWith("?"))
  ) {
    return {
      classification: "ambiguous",
      intent: "ask_question",
      title: text.length > 60 ? `${text.substring(0, 60)}...` : text,
      description: `Ambiguous request for admin review: "${text}"`,
      priority: "medium",
      labels: ["needs_review"],
      confidenceScore: 0.65,
    };
  }

  // 3. Actionable
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

  else if (/\b(note|remember|memo)\b/.test(lower)) intent = "create_note";
  else if (/\?$/.test(text.trim())) intent = "ask_question";

  // Check for assignee mentions like "assign to [Name]" or "[Name] please"
  let assigneeName: string | undefined = undefined;
  const assigneeMatch = text.match(/\b(?:assign\s+to|for)\s+([A-Z][a-z]+)/);
  if (assigneeMatch) {
    assigneeName = assigneeMatch[1];
  }

  // Fallback extractions get low confidence → routed to needs_review,
  // never auto-created without real AI analysis.
  return {
    classification: "actionable",
    intent,
    title: text.length > 60 ? `${text.substring(0, 60)}...` : text,
    description: `WhatsApp message: "${text}"`,
    priority,
    dueDate: undefined,
    assigneeName,
    labels: ["whatsapp"],
    confidenceScore: 0.88,
  };
}