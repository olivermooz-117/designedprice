import test from "node:test";
import assert from "node:assert/strict";
import { applyGuardrails } from "../dist/lib/guardrails.js";

const base = {
  evidence: {},
  category: "branded_streetwear",
  brandEvidence: "Box logo on chest",
  brand: "Supreme",
  garmentType: "hoodie",
  estimatedEra: "2010s",
  confidenceScore: 0.9,
  searchQueryString: "Supreme box logo hoodie",
};

test("keeps a brand that cites a visible mark", () => {
  const out = applyGuardrails(base);
  assert.equal(out.brand, "Supreme");
  assert.equal(out.confidenceScore, 0.9);
});

test("drops a brand with no visible evidence and caps confidence", () => {
  const out = applyGuardrails({ ...base, brandEvidence: "none visible" });
  assert.equal(out.brand, null);
  assert.equal(out.confidenceScore, 0.5);
});

test("caps confidence for generic fashion", () => {
  const out = applyGuardrails({ ...base, category: "generic_fashion", brand: null, brandEvidence: "none visible" });
  assert.equal(out.confidenceScore, 0.5);
});

test("does not mutate its input", () => {
  const input = { ...base, brandEvidence: "N/A" };
  applyGuardrails(input);
  assert.equal(input.brand, "Supreme");
});
