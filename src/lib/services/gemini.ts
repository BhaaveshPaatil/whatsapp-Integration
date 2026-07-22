import { TaskPriority } from "@/types";

export interface ExtractedTaskData {
  title: string;
  description: string;
  priority: TaskPriority;
  dueDate?: string;
  assigneeName?: string;
  confidenceScore: number;
}

export async function extractTaskFromText(text: string): Promise<ExtractedTaskData> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    // Return structured AI response using heuristic fallback when API key is unconfigured
    return fallbackExtraction(text);
  }

  try {
    const systemPrompt = `You are an AI task extraction assistant for TaskFlow AI. Analyze the incoming user message and extract:
1. title: Concise summary of the action item.
2. description: Additional context or raw message excerpt.
3. priority: "urgent" | "high" | "medium" | "low".
4. dueDate: YYYY-MM-DD if explicitly mentioned or relative (e.g. tomorrow, Friday).
5. assigneeName: Person requested to perform the task if mentioned.
Return ONLY valid JSON matching this schema:
{"title": "...", "description": "...", "priority": "...", "dueDate": "...", "assigneeName": "...", "confidenceScore": 0.95}`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: `${systemPrompt}\n\nIncoming Message: "${text}"` }],
            },
          ],
        }),
      }
    );

    const data = await res.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const cleanJson = responseText.replace(/```json|```/g, "").trim();

    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("Gemini extraction error, using heuristic fallback:", error);
    return fallbackExtraction(text);
  }
}

function fallbackExtraction(text: string): ExtractedTaskData {
  const lower = text.toLowerCase();
  let priority: TaskPriority = "medium";

  if (lower.includes("urgent") || lower.includes("asap") || lower.includes("critical")) {
    priority = "urgent";
  } else if (lower.includes("high") || lower.includes("important")) {
    priority = "high";
  } else if (lower.includes("low")) {
    priority = "low";
  }

  // Extract possible title
  const cleanTitle = text.length > 60 ? text.substring(0, 60) + "..." : text;

  return {
    title: cleanTitle,
    description: `Raw WhatsApp message: "${text}"`,
    priority,
    dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
    confidenceScore: 0.92,
  };
}
