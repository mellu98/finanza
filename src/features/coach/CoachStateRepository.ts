/**
 * `CoachStateRepository` — the contract for persisting the user's
 * coach chat history.
 *
 * The repository holds a single `CoachState` (a list of up to 20
 * `CoachTurn`s) under a single localforage key. The 20-turn cap is
 * enforced in `save`: callers may pass more, but the persisted list
 * is truncated to the latest 20.
 */
import type { CoachState, CoachTurn } from "./coachState";

export interface CoachStateRepository {
  /** The persisted state, or `[]` when none. */
  get(): Promise<CoachState>;

  /**
   * Persist the state. The list is truncated to the latest
   * `COACH_HISTORY_CAP` turns before writing, so callers may pass
   * any length.
   */
  save(state: CoachState): Promise<void>;

  /**
   * Append a single turn. Convenience for the UI; equivalent to
   * `get → state.concat(turn) → save`.
   */
  appendTurn(turn: CoachTurn): Promise<void>;
}
