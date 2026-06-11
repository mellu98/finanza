/**
 * localforage-backed `CoachStateRepository`.
 *
 * Persists the single `CoachState` (a list of `CoachTurn`s) under
 * `STATE_KEY` in a dedicated localforage instance
 * (`daily-financial-coach/dfc:coachState`).
 *
 * The 20-turn cap (`COACH_HISTORY_CAP`) is enforced in `save` so the
 * cap survives any caller that doesn't know about it.
 *
 * No `Big` is involved, so the serialise/deserialise helpers are
 * straight pass-throughs; the helpers exist so a future addition of
 * a money field on a turn (e.g. an action amount) can be migrated
 * with the same `__big` envelope used in the other repos without
 * changing the public API.
 */
import localforage from "localforage";
import type { CoachStateRepository } from "./CoachStateRepository";
import {
  COACH_HISTORY_CAP,
  type CoachState,
  type CoachTurn,
} from "./coachState";

const STATE_KEY = "__state__";
const DB_NAME = "daily-financial-coach";
const STORE_NAME = "dfc:coachState";

const EMPTY_STATE: CoachState = Object.freeze([]) as CoachState;

/** Truncate a list to the latest `COACH_HISTORY_CAP` items. */
const capToLatest = <T>(items: ReadonlyArray<T>): ReadonlyArray<T> =>
  items.length > COACH_HISTORY_CAP
    ? items.slice(items.length - COACH_HISTORY_CAP)
    : items;

/**
 * Pull a `CoachState` out of localforage. If the persisted value is
 * missing or malformed, returns the empty state (matches the
 * "no settings → empty list" pattern of the other repos).
 */
const deserialise = (raw: unknown): CoachState => {
  if (!raw || typeof raw !== "object") return EMPTY_STATE;
  // Two on-disk shapes are tolerated:
  //   - new: { turns: [...] }
  //   - bare: [...]   (legacy / accidental writes)
  const candidate = Array.isArray(raw)
    ? raw
    : (raw as { turns?: unknown }).turns;
  if (!Array.isArray(candidate)) return EMPTY_STATE;
  return candidate as ReadonlyArray<CoachTurn> as CoachState;
};

export class localForageCoachStateRepository implements CoachStateRepository {
  private readonly db;

  constructor() {
    this.db = localforage.createInstance({
      name: DB_NAME,
      storeName: STORE_NAME,
    });
  }

  async get(): Promise<CoachState> {
    const raw = await this.db.getItem<unknown>(STATE_KEY);
    return deserialise(raw);
  }

  async save(state: CoachState): Promise<void> {
    const capped = capToLatest(state);
    await this.db.setItem(STATE_KEY, { turns: capped });
  }

  async appendTurn(turn: CoachTurn): Promise<void> {
    const current = await this.get();
    const next: CoachState = [...current, turn];
    await this.save(next);
  }
}
