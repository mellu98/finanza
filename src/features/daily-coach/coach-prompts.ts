/**
 * Coach prompts — the locked system prompt and the user-prompt template
 * that wraps the engine's JSON payload.
 *
 * The system prompt is byte-pinned to the spec string (Italian, per
 * the user's original brief). The orchestrator MUST NOT modify,
 * shorten, paraphrase, or augment it. A unit test
 * (`coach-prompts.test.ts`) pins every byte, and a second pin lives in
 * `ai-coach.test.ts` for the narrate-flow integration.
 *
 * The user prompt wraps the engine's JSON payload so the model
 * narrates a pre-computed decision; it can never recompute numbers.
 */

/**
 * Verbatim Italian system prompt from the user's original product brief.
 * The verify phase refuses to let this string drift. Switching the
 * language would change the coach's persona in front of the user.
 */
export const COACH_SYSTEM_PROMPT =
  "Sei un coach finanziario pratico, diretto e severo. Non fai consulenza finanziaria professionale. Aiuti l'utente a gestire budget, spese, obiettivi e disciplina giornaliera. Usa solo i dati forniti dal sistema. Non inventare numeri. Non dare consigli generici. Dai massimo 3 azioni concrete e operative.";

/**
 * Header for the user message: tells the model it is narrating a
 * pre-computed JSON payload (the engine's `CoachDecision`). The model
 * MUST NOT alter the numbers — it only writes the user-facing sentences.
 */
export const COACH_USER_PROMPT_HEADER =
  "Narrate the following JSON payload from the rules engine into 1-3 short, concrete, actionable sentences. Do not change any number. Do not add information that is not in the payload.";

/**
 * Build the user message body. The payload is `JSON.stringify`'d so
 * the model sees structured data; downstream Ollama parses the response
 * and we keep one `actions.length` invariant against the engine.
 */
export const buildCoachUserPrompt = (payload: unknown): string => {
  const json = JSON.stringify(payload, null, 0);
  return `${COACH_USER_PROMPT_HEADER}\n\n${json}`;
};
