/**
 * Object Mother for `CoachSettings` fixtures.
 *
 * Mirrors the other `*.mother.ts` classes: static factory methods
 * with sensible defaults and per-field overrides.
 *
 * Defaults match the v1 product spec: Ollama on `localhost:11434`,
 * `llama3.2` model, AI enabled, zero emergency buffer, EUR currency.
 */
import Big from "big.js";
import type { Money } from "../daily-coach/money";
import type { CoachSettings } from "./coachSettings";

const ZERO: Money = new Big(0);

const DEFAULTS = {
  ollamaBaseUrl: "http://localhost:11434",
  modelName: "llama3.2",
  aiEnabled: true,
  emergencyBuffer: ZERO,
  baseCurrency: "EUR",
} as const;

/** Partial-override shape for `CoachSettings` test fixtures. */
export type CoachSettingsOverrides = Partial<CoachSettings>;

/**
 * Object Mother for `CoachSettings`. Static methods mirror the Guitos
 * `BudgetMother` pattern.
 */
export class CoachSettingsMother {
  /**
   * Valid `CoachSettings` with the v1 product defaults and per-field
   * overrides. Defaults: `ollamaBaseUrl=http://localhost:11434`,
   * `modelName=llama3.2`, `aiEnabled=true`, `emergencyBuffer=0`,
   * `baseCurrency=EUR`.
   */
  static testSettings(overrides: CoachSettingsOverrides = {}): CoachSettings {
    return {
      ollamaBaseUrl: overrides.ollamaBaseUrl ?? DEFAULTS.ollamaBaseUrl,
      modelName: overrides.modelName ?? DEFAULTS.modelName,
      aiEnabled: overrides.aiEnabled ?? DEFAULTS.aiEnabled,
      emergencyBuffer: overrides.emergencyBuffer ?? DEFAULTS.emergencyBuffer,
      baseCurrency: overrides.baseCurrency ?? DEFAULTS.baseCurrency,
      actionPriorityOrder: overrides.actionPriorityOrder,
    };
  }

  /**
   * Settings with the AI coach disabled. Used by tests that need to
   * verify the deterministic rules-engine fallback path.
   */
  static rulesEngineOnly(): CoachSettings {
    return CoachSettingsMother.testSettings({ aiEnabled: false });
  }

  /**
   * Settings with a non-zero emergency buffer (€500). Used by tests
   * that exercise the buffer subtraction in the daily-budget engine.
   */
  static withEmergencyBuffer500(): CoachSettings {
    return CoachSettingsMother.testSettings({
      emergencyBuffer: new Big("500"),
    });
  }
}
