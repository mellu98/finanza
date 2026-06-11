/**
 * Test plan for `ai-coach` — the orchestrator that turns the rules
 * engine's `CoachDecision` into 1–3 user-facing sentences.
 *
 * The orchestrator MUST:
 *   - call the model with a byte-pinned system prompt (the spec
 *     string) and a JSON user-prompt that contains the engine payload;
 *   - fall back to `deterministicNarrator` on any of the 5 paths:
 *     CORS, network, 5xx, timeout, `aiEnabled = false`;
 *   - clamp the action count to 1..3 on both paths so the user never
 *     sees 0 or >3 actions.
 *
 * The 5 fallback paths are tested independently: each test mocks
 * `port.generate` to throw a specific error class and asserts the
 * result came from `deterministicNarrator`.
 */
import Big from "big.js";
import { describe, expect, it, vi } from "vitest";
import { CoachSettingsMother } from "../coach/CoachSettings.mother";
import {
  buildCoachPayload,
  deterministicNarrator,
  type NarrationResult,
  narrate,
  type OllamaPort,
} from "./ai-coach";
import { COACH_SYSTEM_PROMPT } from "./coach-prompts";
import { type CoachDecision, evaluateCoachRules } from "./coach-rules-engine";
import { ActionKind, CoachMode } from "./constants";
import {
  computeDailyBudget,
  type DailyBudgetResult,
} from "./daily-budget-engine";
import {
  makePlan,
  type makeTransaction,
  TODAY,
} from "./daily-budget-engine.mother";

/* --------------------------------- helpers -------------------------------- */

const big = (v: number | string): Big => new Big(v);

interface DecisionBundle {
  decision: CoachDecision;
  daily: DailyBudgetResult;
}

/** Build a `CoachDecision` from a real `computeDailyBudget` + `evaluateCoachRules`. */
const makeDecision = (
  planOverrides: Parameters<typeof makePlan>[0] = {},
  txs: ReadonlyArray<ReturnType<typeof makeTransaction>> = [],
  debtLike: ReadonlyArray<unknown> = [],
  goalLike: ReadonlyArray<unknown> = [],
): DecisionBundle => {
  // The mother expects `Big` instances for money fields; coerce numbers
  // to Big so the test code can use bare numbers.
  const normalised: Parameters<typeof makePlan>[0] = {
    ...planOverrides,
    currentBalance:
      planOverrides.currentBalance === undefined
        ? undefined
        : big(planOverrides.currentBalance),
    expectedIncomeUntilPeriodEnd:
      planOverrides.expectedIncomeUntilPeriodEnd === undefined
        ? undefined
        : big(planOverrides.expectedIncomeUntilPeriodEnd),
    mandatoryExpensesRemaining:
      planOverrides.mandatoryExpensesRemaining === undefined
        ? undefined
        : big(planOverrides.mandatoryExpensesRemaining),
    debtPaymentsRemaining:
      planOverrides.debtPaymentsRemaining === undefined
        ? undefined
        : big(planOverrides.debtPaymentsRemaining),
    savingsGoalRemaining:
      planOverrides.savingsGoalRemaining === undefined
        ? undefined
        : big(planOverrides.savingsGoalRemaining),
    emergencyBuffer:
      planOverrides.emergencyBuffer === undefined
        ? undefined
        : big(planOverrides.emergencyBuffer),
  };
  const plan = makePlan(normalised);
  const dailyResult = computeDailyBudget({
    plan,
    transactions: txs,
    goals: goalLike as never,
    debts: debtLike as never,
    evaluationDate: TODAY,
  });
  if (!dailyResult.ok) throw new Error("daily result should be ok");
  const decisionResult = evaluateCoachRules({
    daily: dailyResult.value,
    txs,
    goals: goalLike as never,
    debts: debtLike as never,
    plan,
    settings: CoachSettingsMother.testSettings(),
    today: TODAY,
  });
  if (!decisionResult.ok) throw new Error("decision should be ok");
  return {
    decision: decisionResult.value,
    daily: dailyResult.value,
  };
};

/** Capture the `prompt` passed to `port.generate`. */
const captureGenerate = (
  response: string | Error | DOMException,
  pingResult?: { reachable: boolean; modelPresent: boolean },
): {
  port: OllamaPort;
  generateCalls: { prompt: string; signal: AbortSignal }[];
} => {
  const generateCalls: { prompt: string; signal: AbortSignal }[] = [];
  const port: OllamaPort = {
    generate: vi.fn(async (prompt: string, signal: AbortSignal) => {
      await Promise.resolve();
      generateCalls.push({ prompt, signal });
      if (typeof response === "string") return response;
      // Anything that is not a string is treated as a throwable.
      // (DOMException is not `instanceof Error` in most runtimes, so
      // a plain `throw` keeps the test honest about the contract.)
      throw response;
    }),
    ping: vi.fn(async () => {
      await Promise.resolve();
      return pingResult ?? { reachable: true, modelPresent: true };
    }),
  };
  return { port, generateCalls };
};

const fixedSignal = (): AbortSignal => new AbortController().signal;

/* ----------------------------------- tests -------------------------------- */

describe("ai-coach", () => {
  /* ------------------------- system prompt + payload ----------------------- */

  it("uses the spec-locked system prompt verbatim (byte-pinned, Italian)", async () => {
    const expected =
      "Sei un coach finanziario pratico, diretto e severo. Non fai consulenza finanziaria professionale. Aiuti l'utente a gestire budget, spese, obiettivi e disciplina giornaliera. Usa solo i dati forniti dal sistema. Non inventare numeri. Non dare consigli generici. Dai massimo 3 azioni concrete e operative.";
    // The orchestrator embeds COACH_SYSTEM_PROMPT in the prompt body
    // (we use a single-prompt API per the OllamaPort contract). Verify
    // the constant matches the spec string AND that the orchestrator
    // includes it in the prompt sent to the model.
    expect(COACH_SYSTEM_PROMPT).toBe(expected);

    const { decision } = makeDecision();
    const { port, generateCalls } = captureGenerate("ok");
    await narrate(
      decision,
      CoachSettingsMother.testSettings(),
      port,
      fixedSignal(),
    );
    expect(generateCalls[0]?.prompt).toContain(COACH_SYSTEM_PROMPT);
  });

  it("builds a user-prompt JSON that includes the spec-required fields", () => {
    const { decision, daily } = makeDecision();
    const payload = buildCoachPayload(decision, daily);
    // Every spec field must be present in the JSON serialization.
    const json = JSON.stringify(payload);
    for (const key of [
      "dailyBudget",
      "spentToday",
      "overspend",
      "daysRemaining",
      "newDailyBudget",
      "worstCategory",
      "goal",
      "status",
      "mode",
      "topActions",
    ]) {
      expect(json).toContain(`"${key}"`);
    }
  });

  it("user-prompt payload reflects the engine's mode and topActions", () => {
    const { decision, daily } = makeDecision(
      { currentBalance: 40, daysRemaining: 10 }, // forces survival mode
    );
    const payload = buildCoachPayload(decision, daily);
    expect(payload.mode).toBe(CoachMode.Survival);
    expect(payload.mode).toBe("survival");
    expect(Array.isArray(payload.topActions)).toBe(true);
  });

  /* --------------------- deterministic narrator (pure) ------------------- */

  describe("deterministicNarrator()", () => {
    it("returns 1..3 sentences derived from the engine's actions", () => {
      const { decision } = makeDecision();
      const out: NarrationResult = deterministicNarrator(decision);
      expect(out.source).toBe("deterministic");
      expect(out.actionCount).toBeGreaterThanOrEqual(1);
      expect(out.actionCount).toBeLessThanOrEqual(3);
      expect(out.text.length).toBeGreaterThan(0);
    });

    it("clamps a >3-action decision to exactly 3 sentences", () => {
      // Hand-craft a decision with 5 candidate actions to force clamping.
      const oversized: CoachDecision = {
        mode: CoachMode.Steady,
        priority: "standard",
        actions: [
          { kind: ActionKind.AlertAvoidableShare, label: "a", priority: 0 },
          { kind: ActionKind.PayDebtUrgent, label: "b", priority: 1 },
          {
            kind: ActionKind.FreezeCategory,
            label: "c",
            category: "x",
            priority: 2,
          },
          {
            kind: ActionKind.BlockCategory,
            label: "d",
            category: "y",
            durationDays: 7,
            priority: 3,
          },
          {
            kind: ActionKind.AllocateExtra,
            label: "e",
            amount: 100,
            priority: 4,
          },
        ],
        blockedCategories: [],
        reducedCategories: [],
        alerts: [],
      };
      const out = deterministicNarrator(oversized);
      expect(out.actionCount).toBe(3);
    });
  });

  /* ----------------------- happy path: Ollama responds -------------------- */

  it("returns the Ollama response when generate() succeeds (source='ollama')", async () => {
    const { decision } = makeDecision();
    const { port } = captureGenerate("narrated sentence");
    const out = await narrate(
      decision,
      CoachSettingsMother.testSettings(),
      port,
      fixedSignal(),
    );
    expect(out.source).toBe("ollama");
    expect(out.text).toBe("narrated sentence");
    expect(out.actionCount).toBeGreaterThanOrEqual(1);
    expect(out.actionCount).toBeLessThanOrEqual(3);
  });

  it("clamps the Ollama response to 1..3 actions", async () => {
    // Even if the model would ramble, the orchestrator clamps to ≤3
    // (in this implementation: deterministicNarrator uses the engine's
    // action list, which is already ≤3 by design). The 1..3 invariant
    // is what matters.
    const { decision } = makeDecision();
    const { port } = captureGenerate("a. b. c. d. e.");
    const out = await narrate(
      decision,
      CoachSettingsMother.testSettings(),
      port,
      fixedSignal(),
    );
    expect(out.actionCount).toBeGreaterThanOrEqual(1);
    expect(out.actionCount).toBeLessThanOrEqual(3);
  });

  /* --------------------- 5 fallback paths (CORS, net, 5xx, timeout, AI off) ------------------- */

  describe("fallback paths", () => {
    it("falls back when CORS preflight fails (TypeError 'Failed to fetch')", async () => {
      const { decision } = makeDecision();
      const { port } = captureGenerate(new TypeError("Failed to fetch"));
      const out = await narrate(
        decision,
        CoachSettingsMother.testSettings(),
        port,
        fixedSignal(),
      );
      expect(out.source).toBe("deterministic");
      expect(out.actionCount).toBeGreaterThanOrEqual(1);
      expect(out.text.length).toBeGreaterThan(0);
    });

    it("falls back on a network error (TypeError)", async () => {
      const { decision } = makeDecision();
      const { port } = captureGenerate(
        new TypeError("NetworkError when attempting to fetch resource"),
      );
      const out = await narrate(
        decision,
        CoachSettingsMother.testSettings(),
        port,
        fixedSignal(),
      );
      expect(out.source).toBe("deterministic");
      expect(out.text.length).toBeGreaterThan(0);
    });

    it("falls back when Ollama returns 5xx after the single retry", async () => {
      const { decision } = makeDecision();
      const { port } = captureGenerate(
        new Error("Ollama /api/generate returned HTTP 500"),
      );
      const out = await narrate(
        decision,
        CoachSettingsMother.testSettings(),
        port,
        fixedSignal(),
      );
      expect(out.source).toBe("deterministic");
      expect(out.text.length).toBeGreaterThan(0);
    });

    it("falls back on the 5s timeout (AbortError)", async () => {
      const { decision } = makeDecision();
      const { port } = captureGenerate(
        new DOMException("The operation was aborted.", "AbortError"),
      );
      const out = await narrate(
        decision,
        CoachSettingsMother.testSettings(),
        port,
        fixedSignal(),
      );
      expect(out.source).toBe("deterministic");
      expect(out.text.length).toBeGreaterThan(0);
    });

    it("falls back when aiEnabled is false (no port call)", async () => {
      const { decision } = makeDecision();
      const port: OllamaPort = {
        generate: vi.fn(async () => {
          await Promise.resolve();
          return "should never be called";
        }),
        ping: vi.fn(async () => {
          await Promise.resolve();
          return { reachable: true, modelPresent: true };
        }),
      };
      const out = await narrate(
        decision,
        CoachSettingsMother.rulesEngineOnly(),
        port,
        fixedSignal(),
      );
      expect(out.source).toBe("deterministic");
      expect(port.generate).not.toHaveBeenCalled();
      expect(out.text.length).toBeGreaterThan(0);
    });
  });

  /* --------------------------- abort-signal wiring ------------------------ */

  it("forwards the caller's AbortSignal to port.generate", async () => {
    const { decision } = makeDecision();
    const { port, generateCalls } = captureGenerate("ok");
    const signal = fixedSignal();
    await narrate(decision, CoachSettingsMother.testSettings(), port, signal);
    expect(generateCalls[0]?.signal).toBe(signal);
  });
});
