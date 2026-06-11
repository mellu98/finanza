/**
 * localforage-backed `CoachSettingsRepository`.
 *
 * Stores the single `CoachSettings` record under `SETTINGS_KEY` in a
 * dedicated localforage instance (`daily-financial-coach/dfc:settings`).
 *
 * Money is preserved via a `{ __big: "<value>" }` envelope
 * (matches the other feature repos).
 */
import Big from "big.js";
import localforage from "localforage";
import type { CoachSettingsRepository } from "./CoachSettingsRepository";
import type { CoachSettings } from "./coachSettings";

const SETTINGS_KEY = "__settings__";
const DB_NAME = "daily-financial-coach";
const STORE_NAME = "dfc:settings";

const serialise = (value: unknown): unknown => {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(serialise);
  // big.js 7 shadows `Big.prototype.constructor` to `Object`, so a
  // class-name check is unreliable. We duck-type by the internal
  // `s`/`e`/`c` fields (sign, exponent, coefficient) that every
  // Big instance carries.
  if (
    "s" in (value as Record<string, unknown>) &&
    "e" in (value as Record<string, unknown>) &&
    "c" in (value as Record<string, unknown>) &&
    Array.isArray((value as Record<string, unknown>).c)
  ) {
    return { __big: (value as { toString: () => string }).toString() };
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = serialise(v);
  }
  return out;
};

const deserialise = (value: unknown): unknown => {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(deserialise);
  if (
    "__big" in (value as Record<string, unknown>) &&
    typeof (value as Record<string, unknown>).__big === "string"
  ) {
    return new Big((value as { __big: string }).__big);
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = deserialise(v);
  }
  return out;
};

const deserialiseSettings = (raw: unknown): CoachSettings =>
  deserialise(raw) as CoachSettings;

export class localForageCoachSettingsRepository
  implements CoachSettingsRepository
{
  private readonly db;

  constructor() {
    this.db = localforage.createInstance({
      name: DB_NAME,
      storeName: STORE_NAME,
    });
  }

  async get(): Promise<CoachSettings | undefined> {
    const raw = await this.db.getItem<unknown>(SETTINGS_KEY);
    if (!raw) return undefined;
    return deserialiseSettings(raw);
  }

  async save(settings: CoachSettings): Promise<void> {
    await this.db.setItem(SETTINGS_KEY, serialise(settings));
  }
}
