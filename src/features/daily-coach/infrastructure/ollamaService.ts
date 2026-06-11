/**
 * Ollama HTTP client — the only network side-effect in the coach stack.
 *
 * The client is a thin fetch wrapper with two responsibilities:
 *   1. `generate(prompt, signal)` — POST to `${baseUrl}/api/generate`
 *      with a 5s per-attempt timeout. On a 5xx response, wait 250ms
 *      and retry exactly once. On a 4xx response, no retry. On any
 *      network/timeout error, throw an `Error` so the caller (the
 *      `ai-coach` orchestrator) can catch and fall back to the
 *      deterministic narrator.
 *   2. `ping(url, signal)` — GET `${url}/api/tags` with a 2s timeout.
 *      NEVER retries. Returns `{ reachable, modelPresent }` and never
 *      throws (network errors become `{ reachable: false, modelPresent: false }`).
 *
 * Both methods refuse non-http(s) URLs:
 *   - `createOllamaService` throws `TypeError` when its `baseUrl` is
 *     not http(s) (defence-in-depth: construction-time validation).
 *   - `generate` throws on a bad URL (it should never see one because
 *     the factory validates, but a hot-reload could pass a stale value).
 *   - `ping` returns the not-reachable status (it accepts any URL the
 *     user pastes into the settings form).
 *
 * The constants `CHAT_TIMEOUT_MS`, `PING_TIMEOUT_MS`, and `BACKOFF_MS`
 * are exported so tests can advance `vi.useFakeTimers()` deterministically.
 *
 * The client is a factory: `createOllamaService({ baseUrl, model })`
 * returns an `OllamaPort` (the contract `ai-coach` consumes). The
 * factory is the implementation; the port is the interface.
 */

/* --------------------- Tunables (exported for tests) --------------------- */

/** 5s per-attempt timeout for `generate`. */
export const CHAT_TIMEOUT_MS = 5_000;

/** 2s timeout for `ping`. `ping` does not retry on timeout. */
export const PING_TIMEOUT_MS = 2_000;

/** Backoff between the first attempt and the single retry on 5xx. */
export const BACKOFF_MS = 250;

/* --------------------------- OllamaPort contract ------------------------- */

/** Minimal config the factory needs to build a port. */
export interface OllamaConfig {
  /** Base URL of the Ollama server (e.g. `http://localhost:11434`). */
  baseUrl: string;
  /** Model name to call (e.g. `llama3.2`, `qwen2.5:7b`). */
  model: string;
}

/** Result of a `ping()` call. */
export interface OllamaPing {
  reachable: boolean;
  modelPresent: boolean;
}

/**
 * The Ollama HTTP client contract consumed by `ai-coach`.
 *
 * `ai-coach` only ever sees the port; tests can swap in a stub port
 * that satisfies this interface. The factory below is the production
 * implementation.
 */
export interface OllamaPort {
  /**
   * Generate a completion for the given prompt. Throws on any
   * non-recoverable error (timeout, network, non-2xx after retry,
   * malformed body). Callers MUST catch and fall back.
   */
  generate(prompt: string, signal: AbortSignal): Promise<string>;

  /**
   * Health-check the given Ollama URL. Returns `{ reachable, modelPresent }`
   * and NEVER throws — network errors become `reachable: false`.
   */
  ping(url: string, signal: AbortSignal): Promise<OllamaPing>;
}

/* --------------------------- internal helpers --------------------------- */

const isHttpUrl = (raw: string): boolean => {
  try {
    const parsed = new URL(raw);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const requireHttpUrl = (raw: string, label: string): void => {
  if (!isHttpUrl(raw)) {
    throw new TypeError(`${label} must be an http(s) URL — got "${raw}"`);
  }
};

interface TaggedAbortSignal {
  readonly signal: AbortSignal;
  readonly cancel: () => void;
}

/**
 * Combine the caller's AbortSignal with an internal timeout. When
 * either side aborts, the returned `signal` aborts, and the internal
 * timer is cleared. The returned `cancel` clears the timer without
 * aborting the caller's signal — call it from a `finally` block.
 */
const withTimeout = (
  callerSignal: AbortSignal,
  timeoutMs: number,
): TaggedAbortSignal => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const cancel = (): void => {
    clearTimeout(timer);
  };
  if (callerSignal.aborted) {
    controller.abort();
  } else {
    callerSignal.addEventListener("abort", () => controller.abort(), {
      once: true,
    });
  }
  return { signal: controller.signal, cancel };
};

/** Pull the `{ response: string }` field from a 2xx Ollama body. */
const readGenerateBody = async (response: Response): Promise<string> => {
  const data = (await response.json()) as { response?: unknown };
  if (typeof data.response !== "string") {
    throw new Error(
      'Ollama /api/generate response is missing the "response" string field',
    );
  }
  return data.response;
};

/* --------------------------- factory / impl --------------------------- */

/**
 * Build the Ollama HTTP client.
 *
 * The factory validates the config and returns an `OllamaPort`. Both
 * methods are pure with respect to their arguments — concurrent calls
 * to the same port each get their own timeout/retry bookkeeping.
 */
export const createOllamaService = (config: OllamaConfig): OllamaPort => {
  requireHttpUrl(config.baseUrl, "Ollama baseUrl");

  return {
    async generate(prompt: string, signal: AbortSignal): Promise<string> {
      requireHttpUrl(config.baseUrl, "Ollama baseUrl");
      const url = `${config.baseUrl}/api/generate`;
      const body = JSON.stringify({
        model: config.model,
        prompt,
        stream: false,
      });

      // First attempt.
      const firstAttempt = withTimeout(signal, CHAT_TIMEOUT_MS);
      let response: Response;
      try {
        response = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body,
          signal: firstAttempt.signal,
        });
      } finally {
        firstAttempt.cancel();
      }

      // Retry once on 5xx, with a 250ms backoff.
      if (response.status >= 500) {
        await new Promise<void>((resolve) => {
          setTimeout(resolve, BACKOFF_MS);
        });

        const retryAttempt = withTimeout(signal, CHAT_TIMEOUT_MS);
        try {
          response = await fetch(url, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body,
            signal: retryAttempt.signal,
          });
        } finally {
          retryAttempt.cancel();
        }
      }

      if (!response.ok) {
        throw new Error(
          `Ollama /api/generate returned HTTP ${response.status}`,
        );
      }
      return readGenerateBody(response);
    },

    async ping(url: string, signal: AbortSignal): Promise<OllamaPing> {
      if (!isHttpUrl(url)) {
        return { reachable: false, modelPresent: false };
      }
      const tagsUrl = `${url}/api/tags`;
      const attempt = withTimeout(signal, PING_TIMEOUT_MS);
      try {
        const response = await fetch(tagsUrl, { signal: attempt.signal });
        if (!response.ok) {
          return { reachable: false, modelPresent: false };
        }
        const data = (await response.json()) as {
          models?: ReadonlyArray<{ name?: unknown }>;
        };
        const models = Array.isArray(data.models) ? data.models : [];
        const modelPresent = models.some(
          (m) =>
            typeof m === "object" &&
            m !== null &&
            (m as { name?: unknown }).name === config.model,
        );
        return { reachable: true, modelPresent };
      } catch {
        return { reachable: false, modelPresent: false };
      } finally {
        attempt.cancel();
      }
    },
  };
};
