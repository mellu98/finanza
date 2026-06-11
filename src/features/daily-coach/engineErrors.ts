/**
 * Engine error types and codes.
 *
 * All engines return `Result<T, EngineErrorDetail>` and never throw. The
 * `code` field is a stable string the UI can switch on (e.g. for
 * localized toasts), and `message` is the developer-facing reason.
 */
import { err, ok, type Result } from "./result";

/**
 * Stable error codes shared across engines. Defined as `as const` because
 * TS 6 `erasableSyntaxOnly: true` forbids enums.
 */
export const EngineError = {
  InvalidInput: "invalid-input",
  DivisionByZero: "division-by-zero",
  PeriodEnded: "period-ended",
  NegativeBalance: "negative-balance",
  UnknownCategory: "unknown-category",
  InvalidUrl: "invalid-url",
  NetworkUnreachable: "network-unreachable",
  OllamaError: "ollama-error",
} as const;

export type EngineError = (typeof EngineError)[keyof typeof EngineError];

/** Detailed error returned on the `err` arm of an engine `Result`. */
export interface EngineErrorDetail {
  code: EngineError;
  message: string;
  context?: Readonly<Record<string, unknown>>;
}

/** Convenience helper: wrap an `EngineErrorDetail` in a `Result.err`. */
export const engineErr = (
  code: EngineError,
  message: string,
  context?: Readonly<Record<string, unknown>>,
): Result<never, EngineErrorDetail> =>
  err(context === undefined ? { code, message } : { code, message, context });

/** Re-export so engine modules import errors and Result from one place. */
export { err, ok, type Result };
