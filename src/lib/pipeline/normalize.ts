import crypto from "crypto";

/** Collapse whitespace and lowercase for hashing / similarity */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .trim();
}

export function contentHash(sender: string, text: string): string {
  const payload = `${sender}|${normalizeText(text)}`;
  return crypto.createHash("sha256").update(payload).digest("hex");
}

/** Simple token Jaccard similarity for task linking */
export function textSimilarity(a: string, b: string): number {
  const tokensA = new Set(normalizeText(a).split(" ").filter(Boolean));
  const tokensB = new Set(normalizeText(b).split(" ").filter(Boolean));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersection = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) intersection += 1;
  }
  const union = tokensA.size + tokensB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}
