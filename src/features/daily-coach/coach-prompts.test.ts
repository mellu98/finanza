/**
 * Test plan for the coach prompts.
 *
 * The system prompt is byte-pinned to the spec string. The LLM is NEVER
 * allowed to alter it: the verify phase will refuse to let it drift.
 *
 * The user-prompt template wraps the engine's JSON payload so the model
 * narrates the pre-computed decision (it can never recompute numbers).
 */
import { describe, expect, it } from "vitest";
import {
  buildCoachUserPrompt,
  COACH_SYSTEM_PROMPT,
  COACH_USER_PROMPT_HEADER,
} from "./coach-prompts";

describe("coach-prompts", () => {
  describe("COACH_SYSTEM_PROMPT", () => {
    it("matches the spec's verbatim Italian system prompt", () => {
      const expected =
        "Sei un coach finanziario pratico, diretto e severo. Non fai consulenza finanziaria professionale. Aiuti l'utente a gestire budget, spese, obiettivi e disciplina giornaliera. Usa solo i dati forniti dal sistema. Non inventare numeri. Non dare consigli generici. Dai massimo 3 azioni concrete e operative.";
      expect(COACH_SYSTEM_PROMPT).toBe(expected);
    });

    it("explicitly forbids 'professional' advice wording (it says 'Non fai consulenza finanziaria professionale')", () => {
      expect(COACH_SYSTEM_PROMPT).toContain(
        "Non fai consulenza finanziaria professionale",
      );
    });

    it("caps the action count to 3 ('Dai massimo 3 azioni concrete e operative')", () => {
      expect(COACH_SYSTEM_PROMPT).toMatch(/massimo 3 azioni/i);
    });
  });

  describe("COACH_USER_PROMPT_HEADER", () => {
    it("is a non-empty string that frames the JSON payload", () => {
      expect(COACH_USER_PROMPT_HEADER.length).toBeGreaterThan(0);
    });
  });

  describe("buildCoachUserPrompt()", () => {
    it("returns a string that includes the JSON payload", () => {
      const payload = { mode: "steady", actions: [{ kind: "save-surplus" }] };
      const out = buildCoachUserPrompt(payload);
      expect(out).toContain(JSON.stringify(payload));
    });

    it("includes the header text so the model knows it is narrating a payload", () => {
      const out = buildCoachUserPrompt({ hello: "world" });
      expect(out).toContain(COACH_USER_PROMPT_HEADER);
    });

    it("is deterministic: same payload → same string", () => {
      const a = buildCoachUserPrompt({ mode: "growth", actions: [] });
      const b = buildCoachUserPrompt({ mode: "growth", actions: [] });
      expect(a).toBe(b);
    });
  });
});
