/**
 * `useAbortController` — creates an `AbortController` whose signal is
 * stable across re-renders and whose `abort()` is called on unmount.
 *
 * Reused by the coach UI (and any other future feature) to cancel
 * in-flight fetches when the user navigates away. Pairing it with
 * `AbortSignal.timeout(...)` in the caller gives both caller-driven
 * and timeout-driven cancellation.
 *
 * The signal is a stable reference so consumers can stash it in a
 * `useRef` and pass it to fetch on every render without losing
 * listeners.
 */
import { useEffect, useMemo } from "react";

/**
 * Returns the `AbortSignal` of a controller that aborts when the
 * host component unmounts. The signal is stable across re-renders
 * (the controller is created once via `useMemo`).
 */
export const useAbortController = (): AbortSignal => {
  const controller = useMemo(() => new AbortController(), []);

  useEffect(() => {
    return () => {
      controller.abort();
    };
  }, [controller]);

  return controller.signal;
};
