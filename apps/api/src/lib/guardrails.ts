import type { GarmentAnalysis } from "../services/GeminiVisionService";

const NO_EVIDENCE = /^\s*(none|n\/a|not visible|no\b.*\bvisible|unknown)/i;

/**
 * Rules the model cannot be trusted to apply to itself. Returns a new object.
 * - A brand with no cited visible mark is dropped (a wrong brand inflates the price).
 * - Unbranded / generic items get a confidence ceiling, because their comparables are loose.
 */
export function applyGuardrails(a: GarmentAnalysis): GarmentAnalysis {
  const out: GarmentAnalysis = { ...a };
  if (out.brand && NO_EVIDENCE.test(out.brandEvidence)) out.brand = null;
  if (out.brand === null || out.category === "generic_fashion") {
    out.confidenceScore = Math.min(out.confidenceScore, 0.5);
  }
  return out;
}
