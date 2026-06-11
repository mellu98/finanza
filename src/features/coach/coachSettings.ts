/**
 * CoachSettings DTO.
 *
 * User-tunable settings for the local Ollama coach and the rules
 * engine fallback. Persisted in a single localforage record.
 *
 * Relocated from `src/features/daily-coach/domain.ts` in PR3
 * (carry-forward of PR2 deviation #6).
 */
import type { Money } from "../daily-coach/money";

export interface CoachSettings {
  /** Base URL of the local Ollama server. Default: `http://localhost:11434`. */
  ollamaBaseUrl: string;
  /** Model name to call (e.g. `llama3.2`, `qwen2.5:7b`). */
  modelName: string;
  /** When `false`, the AI coach is bypassed and the rules engine is used. */
  aiEnabled: boolean;
  /** Money reserved for emergencies. Subtracted from the daily budget. */
  emergencyBuffer: Money;
  /** ISO 4217 currency code (e.g. `EUR`, `USD`). Default: `EUR`. */
  baseCurrency: string;
  /** Optional override for the action priority order. */
  actionPriorityOrder?: ReadonlyArray<string>;
}
