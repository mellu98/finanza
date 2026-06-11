/**
 * CoachState DTO + the `CoachTurn` value object.
 *
 * A `CoachTurn` is one round-trip in the coach chat: the user's
 * prompt and the orchestrator's narration. v1 keeps only the last
 * 20 turns in IndexedDB (per the `ai-coach` spec's "out of scope"
 * clause: persistent chat history beyond 20 turns is v1.1).
 *
 * The narration reuses the shape from `ai-coach.ts` (the
 * `NarrationResult` type). Keeping the narration embedded in the
 * turn means the chat history survives a page reload with the full
 * source label and the displayed text — no need to re-narrate.
 */
import type { IsoDateTime } from "../daily-coach/isoDate";

/** Mirrors `ai-coach.ts` `NarrationResult`. Kept as a value type so the repository is engine-agnostic. */
export interface NarrationRecord {
  text: string;
  source: "ollama" | "deterministic";
  actionCount: number;
}

/**
 * One round-trip in the coach chat.
 *
 * `timestamp` is an `IsoDateTime` (branded) so consumers can rely on
 * the format. `id` is a stable UUID; the context mints new ids when
 * the user adds a turn.
 */
export interface CoachTurn {
  id: string;
  timestamp: IsoDateTime;
  userPrompt: string;
  narration: NarrationRecord;
}

/** The whole `CoachState` — v1 is just a list of turns (kept as a type alias for readability). */
export type CoachState = ReadonlyArray<CoachTurn>;

/** Hard cap from the spec: persistent history beyond this is out of scope. */
export const COACH_HISTORY_CAP = 20;
