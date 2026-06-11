/**
 * Quick questions — the 8 chips the user can tap on the Coach page.
 *
 * Each chip is a `QuickQuestion`:
 *   - `id`            — stable key for React lists and testids
 *   - `label`         — the chip's user-facing label (Italian, per the
 *                       spec — the coach is an Italian persona)
 *   - `systemPrompt`  — verbatim Italian system prompt (pinned by
 *                       `coach-prompts.test.ts`); always the same for
 *                       every question (the model sees one system
 *                       prompt regardless of which question the user
 *                       picks)
 *   - `userPrompt`    — a user-prompt TEMPLATE that the CoachPage
 *                       fills with the current engine payload (via
 *                       `ai-coach.buildCoachPayload`). The template
 *                       carries a stable prefix so the model
 *                       understands the question type.
 *
 * The 8 questions cover the user's most common coaching needs:
 *   1. Daily allowance     — "how much can I spend today?"
 *   2. Diagnosis           — "where am I going wrong?"
 *   3. Cutting plan        — "what should I cut immediately?"
 *   4. End of month        — "will I make it to the end of the month?"
 *   5. Save quota          — "how much should I set aside today?"
 *   6. Affordability       — "if I spend X, what happens?"
 *   7. 7-day recovery      — "give me a 7-day recovery plan"
 *   8. Next income plan    — "give me a plan until my next income"
 *
 * The 8 questions mirror the spec's "Quick Questions" module
 * (see `sdd/daily-coach/spec/ai-coach`).
 */
import { COACH_SYSTEM_PROMPT } from "../daily-coach/coach-prompts";

/** A single quick-question chip. */
export interface QuickQuestion {
  id: string;
  label: string;
  systemPrompt: string;
  /** Template — the CoachPage substitutes the engine payload here. */
  userPrompt: string;
}

/** The 8 quick questions, in display order. */
export const QUICK_QUESTIONS: ReadonlyArray<QuickQuestion> = [
  {
    id: "daily-allowance",
    label: "Quanto posso spendere oggi?",
    systemPrompt: COACH_SYSTEM_PROMPT,
    userPrompt:
      "Focus: how much can I spend TODAY, given my current daily budget, today's spending so far, and the days remaining in the period. Narrate the engine payload into 1-3 sentences.",
  },
  {
    id: "diagnose",
    label: "Dove sto sbagliando?",
    systemPrompt: COACH_SYSTEM_PROMPT,
    userPrompt:
      "Focus: diagnose my biggest money mistake. Look at the avoidable share, the dominant category, and the recovery mode. Narrate the engine payload into 1-3 sentences.",
  },
  {
    id: "cut-now",
    label: "Cosa devo tagliare subito?",
    systemPrompt: COACH_SYSTEM_PROMPT,
    userPrompt:
      "Focus: what should I cut IMMEDIATELY? Prioritise avoidable spend, blocked categories, and any freeze action the engine emitted. Narrate into 1-3 sentences.",
  },
  {
    id: "end-of-month",
    label: "Riesco ad arrivare a fine mese?",
    systemPrompt: COACH_SYSTEM_PROMPT,
    userPrompt:
      "Focus: will I make it to the end of the month? Use the forecast field, the days remaining, and the end-of-period balance. Narrate into 1-3 sentences.",
  },
  {
    id: "save-today",
    label: "Quanto devo mettere da parte oggi?",
    systemPrompt: COACH_SYSTEM_PROMPT,
    userPrompt:
      "Focus: how much should I set aside today? Use the surplus (or shortfall) and the savings goal quota. Narrate into 1-3 sentences.",
  },
  {
    id: "afford-x",
    label: "Se spendo X euro adesso, cosa succede?",
    systemPrompt: COACH_SYSTEM_PROMPT,
    userPrompt:
      "Focus: if I spend X euros right now, what happens? Use the daily budget, the new daily budget after the purchase, and the verdict. Narrate into 1-3 sentences.",
  },
  {
    id: "recovery-7d",
    label: "Fammi un piano di recupero 7 giorni.",
    systemPrompt: COACH_SYSTEM_PROMPT,
    userPrompt:
      "Focus: 7-day recovery plan. Distribute the overspend or shortfall across the next 7 days. Narrate into 1-3 sentences with concrete per-day numbers.",
  },
  {
    id: "until-income",
    label: "Fammi un piano per arrivare al prossimo incasso.",
    systemPrompt: COACH_SYSTEM_PROMPT,
    userPrompt:
      "Focus: plan to reach the next income. Use daysToNextIncome, mandatory expenses, and savings. Narrate into 1-3 sentences with a concrete daily cadence.",
  },
];

/** Look up a chip by id. Returns `undefined` if not found. */
export const findQuickQuestion = (id: string): QuickQuestion | undefined =>
  QUICK_QUESTIONS.find((q) => q.id === id);
