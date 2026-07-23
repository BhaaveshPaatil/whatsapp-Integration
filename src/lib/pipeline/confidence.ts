export const CONFIDENCE_AUTO = 0.85;
export const CONFIDENCE_REVIEW = 0.6;

export type ConfidenceRoute = "auto" | "needs_review" | "ignore";

export function routeByConfidence(score: number): ConfidenceRoute {
  if (score >= CONFIDENCE_AUTO) return "auto";
  if (score >= CONFIDENCE_REVIEW) return "needs_review";
  return "ignore";
}
