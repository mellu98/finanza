/**
 * Repository contract for the single `CoachSettings` record.
 *
 * The user has exactly one settings record (their Ollama URL, model
 * name, AI-enabled flag, emergency buffer, and base currency). The
 * repository persists it under a single key; `get` returns
 * `undefined` when the user has never saved settings.
 */
import type { CoachSettings } from "./coachSettings";

export interface CoachSettingsRepository {
  /** The persisted settings, or `undefined` when none. */
  get(): Promise<CoachSettings | undefined>;

  /** Persist the settings (overwrites any existing record). */
  save(settings: CoachSettings): Promise<void>;
}
