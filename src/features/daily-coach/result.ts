/**
 * `Result<T, E>` — a discriminated union for fallible operations.
 *
 * Engines return `Result<T, EngineErrorDetail>` instead of throwing.
 * Callers branch on `r.ok` and read either `r.value` (success) or
 * `r.error` (failure). The two arms are sealed: the success arm has no
 * `error` field and the failure arm has no `value` field (enforced by
 * TypeScript's discriminated-union narrowing — see `result.test.ts` for
 * the compile-time leak checks).
 */

/** A successful result carrying a value of type `T`. */
export interface Ok<T> {
  readonly ok: true;
  readonly value: T;
}

/** A failed result carrying an error of type `E`. */
export interface Err<E> {
  readonly ok: false;
  readonly error: E;
}

/** Discriminated union: exactly one arm is active at a time. */
export type Result<T, E> = Ok<T> | Err<E>;

/** Wrap a value in a successful `Result<T, never>`. */
export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });

/** Wrap an error in a failed `Result<never, E>`. */
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });
