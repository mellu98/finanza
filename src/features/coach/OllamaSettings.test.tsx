/**
 * Tests for `OllamaSettings`.
 *
 * The form manages the user's `CoachSettings`:
 *   - URL (default `http://localhost:11434`, must be http(s))
 *   - model (default `llama3.2`, must be non-empty)
 *   - AI enabled toggle (default `true`)
 *   - emergency buffer (default 0, must be non-negative)
 *   - base currency (default `EUR`, must be in `currenciesList`)
 *
 * The "Test connection" button calls `port.ping(url, signal)` and
 * renders a green/yellow/red badge. The page is a pure form — the
 * Ollama HTTP client is built locally on demand.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Big from "big.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OllamaSettings } from "./OllamaSettings";
import { useCoach } from "./useCoach";
import { useCoachSettings } from "./useCoachSettings";

vi.mock("./useCoachSettings", () => ({
  useCoachSettings: vi.fn(),
}));
vi.mock("./useCoach", () => ({
  useCoach: vi.fn(),
}));

const big = (v: number | string) => new Big(v);

const noopCtx = () => ({
  past: [] as ReadonlyArray<unknown>,
  future: [] as ReadonlyArray<unknown>,
  undo: vi.fn(),
  redo: vi.fn(),
  canUndo: false,
  canRedo: false,
});

describe("OllamaSettings", () => {
  beforeEach(() => {
    vi.mocked(useCoachSettings).mockReset();
    vi.mocked(useCoach).mockReset();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the page title and all 5 form fields", () => {
    vi.mocked(useCoachSettings).mockReturnValue({
      ...noopCtx(),
      settings: {
        ollamaBaseUrl: "http://localhost:11434",
        modelName: "llama3.2",
        aiEnabled: true,
        emergencyBuffer: big(0),
        baseCurrency: "EUR",
      },
      setSettings: vi.fn(),
    });
    vi.mocked(useCoach).mockReturnValue({
      ...noopCtx(),
      state: { turns: [] },
      turns: [],
      lastNarrationSource: undefined,
      addTurn: vi.fn(),
      setState: vi.fn(),
    });
    render(<OllamaSettings />);
    expect(screen.getByTestId("ollama-page-title")).toHaveTextContent(
      /Ollama settings/i,
    );
    expect(screen.getByTestId("ollama-input-url")).toBeInTheDocument();
    expect(screen.getByTestId("ollama-input-model")).toBeInTheDocument();
    expect(screen.getByTestId("ollama-input-aiEnabled")).toBeInTheDocument();
    expect(
      screen.getByTestId("ollama-input-emergencyBuffer"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("ollama-input-baseCurrency")).toBeInTheDocument();
  });

  it("Save button calls setSettings(settings, true)", () => {
    const setSettings = vi.fn();
    vi.mocked(useCoachSettings).mockReturnValue({
      ...noopCtx(),
      settings: {
        ollamaBaseUrl: "http://localhost:11434",
        modelName: "llama3.2",
        aiEnabled: true,
        emergencyBuffer: big(0),
        baseCurrency: "EUR",
      },
      setSettings,
    });
    vi.mocked(useCoach).mockReturnValue({
      ...noopCtx(),
      state: { turns: [] },
      turns: [],
      lastNarrationSource: undefined,
      addTurn: vi.fn(),
      setState: vi.fn(),
    });
    render(<OllamaSettings />);
    fireEvent.click(screen.getByTestId("ollama-save-button"));
    expect(setSettings).toHaveBeenCalledTimes(1);
    const saved = setSettings.mock.calls[0]?.[0];
    expect(saved.ollamaBaseUrl).toBe("http://localhost:11434");
    expect(saved.modelName).toBe("llama3.2");
    expect(setSettings.mock.calls[0]?.[1]).toBe(true);
  });

  it("rejects an empty model name with a validation alert", () => {
    const setSettings = vi.fn();
    vi.mocked(useCoachSettings).mockReturnValue({
      ...noopCtx(),
      settings: {
        ollamaBaseUrl: "http://localhost:11434",
        modelName: "",
        aiEnabled: true,
        emergencyBuffer: big(0),
        baseCurrency: "EUR",
      },
      setSettings,
    });
    vi.mocked(useCoach).mockReturnValue({
      ...noopCtx(),
      state: { turns: [] },
      turns: [],
      lastNarrationSource: undefined,
      addTurn: vi.fn(),
      setState: vi.fn(),
    });
    render(<OllamaSettings />);
    fireEvent.click(screen.getByTestId("ollama-save-button"));
    expect(setSettings).not.toHaveBeenCalled();
    expect(screen.getByTestId("ollama-validation-alert")).toHaveTextContent(
      /model/i,
    );
  });

  it("rejects a non-http(s) URL with a validation alert", () => {
    const setSettings = vi.fn();
    vi.mocked(useCoachSettings).mockReturnValue({
      ...noopCtx(),
      settings: {
        ollamaBaseUrl: "ftp://localhost",
        modelName: "llama3.2",
        aiEnabled: true,
        emergencyBuffer: big(0),
        baseCurrency: "EUR",
      },
      setSettings,
    });
    vi.mocked(useCoach).mockReturnValue({
      ...noopCtx(),
      state: { turns: [] },
      turns: [],
      lastNarrationSource: undefined,
      addTurn: vi.fn(),
      setState: vi.fn(),
    });
    render(<OllamaSettings />);
    fireEvent.click(screen.getByTestId("ollama-save-button"));
    expect(setSettings).not.toHaveBeenCalled();
    expect(screen.getByTestId("ollama-validation-alert")).toHaveTextContent(
      /http/i,
    );
  });

  it("Test connection button shows a RED badge when the URL is unreachable", async () => {
    // Stub fetch to refuse (no Ollama server in the test env).
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (() =>
      Promise.reject(new Error("ECONNREFUSED"))) as typeof fetch;
    vi.mocked(useCoachSettings).mockReturnValue({
      ...noopCtx(),
      settings: {
        ollamaBaseUrl: "http://localhost:11434",
        modelName: "llama3.2",
        aiEnabled: true,
        emergencyBuffer: big(0),
        baseCurrency: "EUR",
      },
      setSettings: vi.fn(),
    });
    vi.mocked(useCoach).mockReturnValue({
      ...noopCtx(),
      state: { turns: [] },
      turns: [],
      lastNarrationSource: undefined,
      addTurn: vi.fn(),
      setState: vi.fn(),
    });
    render(<OllamaSettings />);
    fireEvent.click(screen.getByTestId("ollama-test-button"));
    // After the ping fails, the badge is RED.
    await waitFor(() => {
      expect(screen.getByTestId("ollama-connection-badge")).toBeInTheDocument();
    });
    const badge = screen.getByTestId("ollama-connection-badge");
    expect(badge.getAttribute("data-state")).toBe("red");
    globalThis.fetch = originalFetch;
  });

  it("Test connection button shows a GREEN badge when the URL responds", async () => {
    // Stub fetch to return a 200 with the configured model present.
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (() =>
      Promise.resolve(
        new Response(JSON.stringify({ models: [{ name: "llama3.2" }] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      )) as typeof fetch;
    vi.mocked(useCoachSettings).mockReturnValue({
      ...noopCtx(),
      settings: {
        ollamaBaseUrl: "http://localhost:11434",
        modelName: "llama3.2",
        aiEnabled: true,
        emergencyBuffer: big(0),
        baseCurrency: "EUR",
      },
      setSettings: vi.fn(),
    });
    vi.mocked(useCoach).mockReturnValue({
      ...noopCtx(),
      state: { turns: [] },
      turns: [],
      lastNarrationSource: undefined,
      addTurn: vi.fn(),
      setState: vi.fn(),
    });
    render(<OllamaSettings />);
    fireEvent.click(screen.getByTestId("ollama-test-button"));
    await waitFor(() => {
      expect(
        screen
          .getByTestId("ollama-connection-badge")
          .getAttribute("data-state"),
      ).toBe("green");
    });
    globalThis.fetch = originalFetch;
  });
});
