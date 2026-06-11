/**
 * Test plan for `ollamaService` — the HTTP client for the local Ollama
 * server.
 *
 * The client is the only network side-effect in the coach stack. It
 * MUST:
 *   - apply a 5s per-attempt timeout via AbortSignal;
 *   - retry once on 5xx with a 250ms backoff;
 *   - expose a `ping()` that returns `{ reachable, modelPresent }`
 *     without throwing (network errors become `{ reachable: false, … }`);
 *   - refuse non-http(s) URLs (throw for `generate`, return not-reachable
 *     for `ping`).
 *
 * Strategy:
 *   - mock `globalThis.fetch` with `vi.stubGlobal` so we can assert on
 *     call count + the signal passed to fetch;
 *   - use `vi.useFakeTimers()` for the 5s timeout and the 250ms backoff
 *     so the tests stay fast and deterministic;
 *   - restore real timers + globals in `afterEach`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BACKOFF_MS,
  CHAT_TIMEOUT_MS,
  createOllamaService,
  PING_TIMEOUT_MS,
} from "./ollamaService";

const DEFAULTS = {
  baseUrl: "http://localhost:11434",
  model: "llama3.2",
} as const;

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const textResponse = (body: string, status = 200): Response =>
  new Response(body, {
    status,
    headers: { "content-type": "text/plain" },
  });

describe("ollamaService", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  /* ----------------------------- generate() ----------------------------- */

  describe("generate()", () => {
    it("POSTs to /api/generate with the model, prompt, and stream:false", async () => {
      const fetchMock = vi.fn(async () =>
        jsonResponse({ response: "hello back" }, 200),
      );
      vi.stubGlobal("fetch", fetchMock);

      const port = createOllamaService(DEFAULTS);
      const out = await port.generate("hi", new AbortController().signal);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:11434/api/generate");
      expect(init.method).toBe("POST");
      expect(JSON.parse(init.body as string)).toEqual({
        model: "llama3.2",
        prompt: "hi",
        stream: false,
      });
      expect(out).toBe("hello back");
    });

    it("returns the model response string from the JSON body", async () => {
      const fetchMock = vi.fn(async () =>
        jsonResponse({ response: "narrated sentence" }, 200),
      );
      vi.stubGlobal("fetch", fetchMock);

      const port = createOllamaService(DEFAULTS);
      const out = await port.generate("payload", new AbortController().signal);
      expect(out).toBe("narrated sentence");
    });

    it("aborts the request after a 5s timeout when the server never responds", async () => {
      const fetchMock = vi.fn(
        (_input: unknown, init?: RequestInit) =>
          new Promise<Response>((_, reject) => {
            const signal = init?.signal as AbortSignal | undefined;
            signal?.addEventListener("abort", () => {
              reject(
                new DOMException("The operation was aborted.", "AbortError"),
              );
            });
          }),
      );
      vi.stubGlobal("fetch", fetchMock);

      const port = createOllamaService(DEFAULTS);
      const promise = port.generate("hi", new AbortController().signal);
      const catchHandler = vi.fn();
      promise.catch(catchHandler);

      // Advance just before the timeout — promise should not be settled
      await vi.advanceTimersByTimeAsync(CHAT_TIMEOUT_MS - 1);
      expect(catchHandler).not.toHaveBeenCalled();

      // Advance past the 5s timeout — abort should fire
      await vi.advanceTimersByTimeAsync(1);
      expect(catchHandler).toHaveBeenCalled();
      const err = catchHandler.mock.calls[0]?.[0] as Error;
      expect(err.name).toBe("AbortError");
    });

    it("retries once on 5xx with a 250ms backoff; second response is returned", async () => {
      let callCount = 0;
      const fetchMock = vi.fn(async () => {
        await Promise.resolve();
        callCount += 1;
        if (callCount === 1) return textResponse("boom", 500);
        return jsonResponse({ response: "ok" }, 200);
      });
      vi.stubGlobal("fetch", fetchMock);

      const port = createOllamaService(DEFAULTS);
      const promise = port.generate("hi", new AbortController().signal);

      // First attempt fails with 500 → implementation must wait BACKOFF_MS
      // then call fetch a second time. Use advanceTimersByTimeAsync to let
      // the retry resolve and the response stream settle.
      await vi.advanceTimersByTimeAsync(BACKOFF_MS);
      const out = await promise;

      expect(callCount).toBe(2);
      expect(out).toBe("ok");
    });

    it("does NOT retry on 4xx; throws with the status code", async () => {
      const fetchMock = vi.fn(async () => textResponse("nope", 400));
      vi.stubGlobal("fetch", fetchMock);

      const port = createOllamaService(DEFAULTS);
      const catchHandler = vi.fn();
      const promise = port.generate("hi", new AbortController().signal);
      promise.catch(catchHandler);

      // No backoff expected on 4xx; the rejection should be visible
      // immediately after the microtask queue drains.
      await vi.advanceTimersByTimeAsync(0);
      expect(catchHandler).toHaveBeenCalled();
      const err = catchHandler.mock.calls[0]?.[0] as Error;
      expect(err.message).toMatch(/400/);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("throws when the response is 5xx on both attempts", async () => {
      const fetchMock = vi.fn(async () => textResponse("boom", 503));
      vi.stubGlobal("fetch", fetchMock);

      const port = createOllamaService(DEFAULTS);
      const catchHandler = vi.fn();
      const promise = port.generate("hi", new AbortController().signal);
      promise.catch(catchHandler);

      // Advance past the 250ms backoff for the retry, then let the second
      // 503 propagate.
      await vi.advanceTimersByTimeAsync(BACKOFF_MS + 1);
      expect(catchHandler).toHaveBeenCalled();
      const err = catchHandler.mock.calls[0]?.[0] as Error;
      expect(err.message).toMatch(/503/);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("throws when the caller's AbortSignal is aborted before the response", async () => {
      const fetchMock = vi.fn(
        (_input: unknown, init?: RequestInit) =>
          new Promise<Response>((_, reject) => {
            const signal = init?.signal as AbortSignal | undefined;
            signal?.addEventListener("abort", () => {
              reject(
                new DOMException("The operation was aborted.", "AbortError"),
              );
            });
          }),
      );
      vi.stubGlobal("fetch", fetchMock);

      const port = createOllamaService(DEFAULTS);
      const controller = new AbortController();
      const catchHandler = vi.fn();
      const promise = port.generate("hi", controller.signal);
      promise.catch(catchHandler);

      // Caller aborts immediately
      controller.abort();
      await vi.advanceTimersByTimeAsync(0);
      expect(catchHandler).toHaveBeenCalled();
      const err = catchHandler.mock.calls[0]?.[0] as Error;
      expect(err.name).toBe("AbortError");
    });

    it("refuses a non-http(s) URL at construction time (throws)", () => {
      expect(() =>
        createOllamaService({ baseUrl: "ftp://x", model: "llama3.2" }),
      ).toThrow(/http/i);
      expect(() =>
        createOllamaService({
          baseUrl: "file:///etc/passwd",
          model: "llama3.2",
        }),
      ).toThrow(/http/i);
    });
  });

  /* ------------------------------ ping() ------------------------------ */

  describe("ping()", () => {
    it("returns { reachable: true, modelPresent: true } when /api/tags lists the model", async () => {
      const fetchMock = vi.fn(async () =>
        jsonResponse(
          { models: [{ name: "llama3.2" }, { name: "qwen2.5:7b" }] },
          200,
        ),
      );
      vi.stubGlobal("fetch", fetchMock);

      const port = createOllamaService(DEFAULTS);
      const out = await port.ping(
        "http://localhost:11434",
        new AbortController().signal,
      );
      expect(out).toEqual({ reachable: true, modelPresent: true });
    });

    it("returns { reachable: true, modelPresent: false } when /api/tags omits the model", async () => {
      const fetchMock = vi.fn(async () =>
        jsonResponse({ models: [{ name: "qwen2.5:7b" }] }, 200),
      );
      vi.stubGlobal("fetch", fetchMock);

      const port = createOllamaService(DEFAULTS);
      const out = await port.ping(
        "http://localhost:11434",
        new AbortController().signal,
      );
      expect(out).toEqual({ reachable: true, modelPresent: false });
    });

    it("returns { reachable: false, modelPresent: false } on a network error", async () => {
      const fetchMock = vi.fn(async () => {
        await Promise.resolve();
        throw new TypeError("Failed to fetch");
      });
      vi.stubGlobal("fetch", fetchMock);

      const port = createOllamaService(DEFAULTS);
      const out = await port.ping(
        "http://localhost:11434",
        new AbortController().signal,
      );
      expect(out).toEqual({ reachable: false, modelPresent: false });
    });

    it("returns { reachable: false, modelPresent: false } when the URL is non-http(s) (no throw)", async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);

      const port = createOllamaService(DEFAULTS);
      const ftp = await port.ping("ftp://x", new AbortController().signal);
      const file = await port.ping(
        "file:///etc/passwd",
        new AbortController().signal,
      );
      expect(ftp).toEqual({ reachable: false, modelPresent: false });
      expect(file).toEqual({ reachable: false, modelPresent: false });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("times out at 2s when the server never responds (no retry)", async () => {
      const fetchMock = vi.fn(
        (_input: unknown, init?: RequestInit) =>
          new Promise<Response>((_, reject) => {
            const signal = init?.signal as AbortSignal | undefined;
            signal?.addEventListener("abort", () => {
              reject(
                new DOMException("The operation was aborted.", "AbortError"),
              );
            });
          }),
      );
      vi.stubGlobal("fetch", fetchMock);

      const port = createOllamaService(DEFAULTS);
      const promise = port.ping(
        "http://localhost:11434",
        new AbortController().signal,
      );

      // Advance to just before the ping timeout
      await vi.advanceTimersByTimeAsync(PING_TIMEOUT_MS - 1);
      // Resolve the microtasks queued by the still-pending promise.
      await Promise.resolve();

      // Advance across the timeout
      await vi.advanceTimersByTimeAsync(1);

      const out = await promise;
      expect(out).toEqual({ reachable: false, modelPresent: false });
      // ping() does NOT retry on timeout
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });
});
