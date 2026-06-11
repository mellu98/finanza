/**
 * Tests for the `QuickQuestions` data + lookup helper.
 *
 * The 8 chips are a static, order-stable list used by the CoachPage.
 * The list covers the spec's "Quick Questions" module (see
 * `sdd/daily-coach/spec/ai-coach`).
 */
import { describe, expect, it } from "vitest";
import { findQuickQuestion, QUICK_QUESTIONS } from "./QuickQuestions";

describe("QuickQuestions", () => {
  it("exposes exactly 8 chips (the spec count)", () => {
    expect(QUICK_QUESTIONS).toHaveLength(8);
  });

  it("each chip has the four required fields populated", () => {
    for (const q of QUICK_QUESTIONS) {
      expect(q.id).toBeTruthy();
      expect(q.label).toBeTruthy();
      expect(q.systemPrompt).toBeTruthy();
      expect(q.userPrompt).toBeTruthy();
      // System prompt is the pinned Italian one.
      expect(q.systemPrompt).toMatch(/coach finanziario/);
    }
  });

  it("the 8 labels are the spec verbatim Italian strings", () => {
    const labels = QUICK_QUESTIONS.map((q) => q.label);
    expect(labels).toEqual([
      "Quanto posso spendere oggi?",
      "Dove sto sbagliando?",
      "Cosa devo tagliare subito?",
      "Riesco ad arrivare a fine mese?",
      "Quanto devo mettere da parte oggi?",
      "Se spendo X euro adesso, cosa succede?",
      "Fammi un piano di recupero 7 giorni.",
      "Fammi un piano per arrivare al prossimo incasso.",
    ]);
  });

  it("ids are unique", () => {
    const ids = QUICK_QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("findQuickQuestion returns the chip for a known id", () => {
    const q = findQuickQuestion("daily-allowance");
    expect(q?.label).toBe("Quanto posso spendere oggi?");
  });

  it("findQuickQuestion returns undefined for an unknown id", () => {
    expect(findQuickQuestion("nope")).toBeUndefined();
  });
});
