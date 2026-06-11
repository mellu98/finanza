/**
 * `ai-coach` — the orchestrator that turns the rules engine's
 * `CoachDecision` into 1–3 user-facing sentences.
 *
 * The orchestrator is intentionally thin:
 *   1. `buildCoachPayload(decision, daily?)` — serializes the engine
 *      output into a JSON object with the spec-required fields. Used
 *      both by `narrate` (to send to Ollama) and by callers that want
 *      to log or preview the payload.
 *   2. `deterministicNarrator(decision)` — pure template-based
 *      narrator that always returns 1–3 sentences. Used as the
 *      fallback whenever Ollama is unreachable / disabled / errors.
 *   3. `narrate(decision, settings, port, signal)` — the public entry
 *      point. If `settings.aiEnabled` is `false`, returns the
 *      deterministic result without touching the port. Otherwise,
 *      sends the prompt to the port; on ANY error (CORS, network,
 *      5xx, timeout, model missing) it falls back to the
 *      deterministic narrator.
 *
 * The model can NEVER recompute numbers: the payload is the engine's
 * JSON, the system prompt forbids invention, and the action count
 * parity (1..3) is enforced on both paths.
 */
import type { CoachSettings } from "../coach/coachSettings";
import { buildCoachUserPrompt, COACH_SYSTEM_PROMPT } from "./coach-prompts";
import type { CoachAction, CoachDecision } from "./coach-rules-engine";
import type { DailyBudgetResult } from "./daily-budget-engine";

/* ------------------------- OllamaPort contract ------------------------- */

/**
 * Re-export the `OllamaPort` contract from the infrastructure layer.
 * Defining it once in `ollamaService.ts` keeps the wire format
 * (URL, model, signal) and the consumer contract (orchestrator) in
 * lockstep — only this file re-exports it, so consumers always
 * import from the same place.
 */
export type { OllamaPort } from "./infrastructure/ollamaService";

/* ----------------------------- narration I/O ---------------------------- */

/** Where the narration came from. */
export type NarrationSource = "ollama" | "deterministic";

/** The orchestrator's output to the UI. */
export interface NarrationResult {
  /** The narration text. 1–3 sentences (newline or full-stop separated). */
  text: string;
  /** Where the text came from. Drives the yellow "Ollama not reachable" banner. */
  source: NarrationSource;
  /** Count of action sentences actually rendered. Always 1..3. */
  actionCount: number;
}

/* --------------------------- payload shape ----------------------------- */

/**
 * The JSON payload the orchestrator sends to the model. The model is
 * forbidden from altering any of these numbers; it only narrates.
 *
 * Fields marked `| null` are present in the JSON (the spec mandates
 * the keys exist) but may be `null` when the orchestrator runs
 * without a `DailyBudgetResult` (e.g. in tests, or before the plan
 * is loaded). The UI never relies on these being non-null.
 */
export interface CoachPayload {
  dailyBudget: number | null;
  spentToday: number | null;
  overspend: number | null;
  daysRemaining: number | null;
  newDailyBudget: number | null;
  worstCategory: string | null;
  goal: string | null;
  status: "ok" | "warn" | "error";
  mode: CoachDecision["mode"];
  topActions: ReadonlyArray<{
    kind: CoachAction["kind"];
    label: string;
    category?: string;
    amount?: number;
    durationDays?: number;
  }>;
}

/** Build the spec-shaped payload from a `CoachDecision` and (optionally) the daily result. */
export const buildCoachPayload = (
  decision: CoachDecision,
  daily?: DailyBudgetResult,
): CoachPayload => {
  const spent = daily?.spentToday ?? null;
  const budget = daily?.dailyBudgetRounded ?? null;
  const overspend =
    spent !== null && budget !== null && spent > budget
      ? Number((spent - budget).toFixed(2))
      : null;
  const newDaily =
    daily && overspend !== null && daily.daysRemaining > 0
      ? Number(
          (
            (budget ?? 0) -
            overspend / Math.max(daily.daysRemaining, 1)
          ).toFixed(2),
        )
      : null;
  const worstCategory =
    decision.actions.find((a) => a.kind === "freeze-category")?.category ??
    null;
  const status: CoachPayload["status"] =
    decision.alerts.length > 0
      ? decision.alerts.some((a) => a.severity === "error")
        ? "error"
        : "warn"
      : "ok";

  return {
    dailyBudget: budget,
    spentToday: spent,
    overspend,
    daysRemaining: daily?.daysRemaining ?? null,
    newDailyBudget: newDaily,
    worstCategory,
    goal: null,
    status,
    mode: decision.mode,
    topActions: decision.actions.map((a) => {
      const action: CoachPayload["topActions"][number] = {
        kind: a.kind,
        label: a.label,
      };
      if (a.category !== undefined) action.category = a.category;
      if (a.amount !== undefined) action.amount = a.amount;
      if (a.durationDays !== undefined) action.durationDays = a.durationDays;
      return action;
    }),
  };
};

/* --------------------- deterministic narrator (pure) ------------------ */

/** Hard cap on the deterministic narrator's output. The engine already caps at 3. */
const MAX_ACTIONS = 3;

/** Fallback sentence when the engine emits zero actions. */
const NO_ACTIONS_SENTINEL = "Stay on track with your current budget.";

/**
 * Pure template-based narrator. No IO, no settings, no port. Returns
 * 1–3 sentences derived from the engine's action list. Used as the
 * universal fallback so the UI always has something to show.
 *
 * The output sentences are the action labels verbatim, joined by
 * newlines. The action count is `min(decision.actions.length, 3)`.
 * When the engine emits zero actions, the narrator returns a single
 * generic sentence so the user never sees a blank panel.
 */
export const deterministicNarrator = (
  decision: CoachDecision,
): NarrationResult => {
  const actions = decision.actions.slice(0, MAX_ACTIONS);
  if (actions.length === 0) {
    return {
      text: NO_ACTIONS_SENTINEL,
      source: "deterministic",
      actionCount: 1,
    };
  }
  const text = actions.map((a) => a.label).join("\n");
  return {
    text,
    source: "deterministic",
    actionCount: actions.length,
  };
};

/* ----------------------------- orchestrator ----------------------------- */

/** Internal: assemble the prompt body (system + user JSON). */
const buildPrompt = (
  decision: CoachDecision,
  daily?: DailyBudgetResult,
): string => {
  const payload = buildCoachPayload(decision, daily);
  const userBody = buildCoachUserPrompt(payload);
  // The OllamaPort is a single-prompt API; prepend the system prompt
  // verbatim so the model sees the full context. The COACH_SYSTEM_PROMPT
  // is byte-pinned by coach-prompts.test.ts.
  return `${COACH_SYSTEM_PROMPT}\n\n${userBody}`;
};

/**
 * Narrate a `CoachDecision`. Returns a `NarrationResult` with a
 * `source` field that drives the UI's "Ollama not reachable" banner.
 *
 * Fallback rules (any of these → `deterministicNarrator`):
 *   - `settings.aiEnabled === false` → no port call
 *   - `port.generate` throws (CORS, network, 5xx, timeout, model
 *     missing, malformed body)
 */
export const narrate = async (
  decision: CoachDecision,
  settings: CoachSettings,
  port: import("./infrastructure/ollamaService").OllamaPort,
  signal: AbortSignal,
): Promise<NarrationResult> => {
  if (!settings.aiEnabled) {
    return deterministicNarrator(decision);
  }

  const prompt = buildPrompt(decision);
  let response: string;
  try {
    response = await port.generate(prompt, signal);
  } catch {
    return deterministicNarrator(decision);
  }

  // Clamp the model's text to 1..3 action sentences. The LLM might
  // ramble past 3; the action count is bounded by splitting on the
  // sentence terminator and taking the first 3 non-empty fragments.
  // If the model returns nothing, fall back to a generic sentence.
  const sentences = response
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .slice(0, MAX_ACTIONS);
  if (sentences.length === 0) {
    return deterministicNarrator(decision);
  }
  const text = sentences.join("\n");
  const actionCount = Math.min(sentences.length, MAX_ACTIONS);

  return { text, source: "ollama", actionCount };
};
