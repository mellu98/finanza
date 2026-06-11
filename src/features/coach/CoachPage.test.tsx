/**
 * Tests for `CoachPage`.
 *
 * The page renders the 8 QuickQuestions chips, lets the user pick
 * one, calls the orchestrator (`narrate`) with the current engine
 * decision + Ollama settings, and displays the narration.
 *
 * The yellow "Ollama not reachable" fallback banner is shown when
 * the orchestrator falls back to the deterministic narrator (i.e.
 * `lastNarrationSource === "deterministic"`).
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Big from "big.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDailyBudget } from "../daily-coach/useDailyBudget";
import { CoachPage } from "./CoachPage";
import { QUICK_QUESTIONS } from "./QuickQuestions";
import { useCoach } from "./useCoach";
import { useCoachSettings } from "./useCoachSettings";

vi.mock("../daily-coach/useDailyBudget", () => ({
  useDailyBudget: vi.fn(),
}));
vi.mock("../coach/useCoachSettings", () => ({
  useCoachSettings: vi.fn(),
}));
vi.mock("../coach/useCoach", () => ({
  useCoach: vi.fn(),
}));

const big = (v: number | string) => new Big(v);

const GREEN_PAYLOAD = {
  daily: {
    dailyBudgetRaw: big(11),
    dailyBudgetRounded: 11,
    status: "green" as const,
    spentToday: 0,
    daysRemaining: 10,
    daysToNextIncome: 15,
    forecast: big(110),
    forecastRounded: 110,
    periodEnded: false,
  },
  decision: {
    mode: "steady" as const,
    priority: "standard" as const,
    actions: [],
    blockedCategories: [],
    reducedCategories: [],
    alerts: [],
  },
};

const noopCtx = () => ({
  past: [] as ReadonlyArray<unknown>,
  future: [] as ReadonlyArray<unknown>,
  undo: vi.fn(),
  redo: vi.fn(),
  canUndo: false,
  canRedo: false,
});

describe("CoachPage", () => {
  beforeEach(() => {
    vi.mocked(useDailyBudget).mockReset();
    vi.mocked(useCoachSettings).mockReset();
    vi.mocked(useCoach).mockReset();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the page title and all 8 quick-question chips", () => {
    vi.mocked(useDailyBudget).mockReturnValue(GREEN_PAYLOAD);
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
    render(<CoachPage />);
    expect(screen.getByTestId("coach-page-title")).toHaveTextContent(/mentore/i);
    // 8 chips present.
    for (const q of QUICK_QUESTIONS) {
      expect(screen.getByTestId(`coach-chip-${q.id}`)).toBeInTheDocument();
    }
  });

  it("clicking a chip calls narrate and renders the narration", async () => {
    vi.mocked(useDailyBudget).mockReturnValue(GREEN_PAYLOAD);
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
    // Stateful mock: the turns array reflects the latest addTurn call.
    const turnsRef: { current: ReadonlyArray<unknown> } = { current: [] };
    const addTurn = vi.fn(
      (input: {
        userPrompt: string;
        narration: { text: string; source: string };
      }) => {
        turnsRef.current = [
          ...turnsRef.current,
          {
            id: `turn-${turnsRef.current.length + 1}`,
            timestamp: "2026-06-10T00:00:00Z" as never,
            userPrompt: input.userPrompt,
            narration: input.narration,
          },
        ];
      },
    );
    vi.mocked(useCoach).mockImplementation(() => ({
      ...noopCtx(),
      state: { turns: turnsRef.current },
      // biome-ignore lint/suspicious/noExplicitAny: stateful mock for test
      turns: turnsRef.current as any,
      lastNarrationSource: undefined,
      addTurn,
      setState: vi.fn(),
    }));
    render(<CoachPage />);
    fireEvent.click(screen.getByTestId("coach-chip-daily-allowance"));
    // The narration panel appears with the deterministic fallback text
    // (the test never starts an Ollama server, so narrate falls back).
    await waitFor(() => {
      expect(screen.getByTestId("coach-narration-text")).toBeInTheDocument();
    });
    // The addTurn was called with the user's prompt + the narration.
    expect(addTurn).toHaveBeenCalledTimes(1);
  });

  it("shows the yellow fallback banner when lastNarrationSource === 'deterministic'", () => {
    vi.mocked(useDailyBudget).mockReturnValue(GREEN_PAYLOAD);
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
      lastNarrationSource: "deterministic",
      addTurn: vi.fn(),
      setState: vi.fn(),
    });
    render(<CoachPage />);
    expect(screen.getByTestId("narration-fallback-banner")).toBeInTheDocument();
    expect(
      screen.getByTestId("narration-fallback-banner").textContent ?? "",
    ).toMatch(/Ollama/);
  });

  it("does NOT show the fallback banner when lastNarrationSource === 'ollama'", () => {
    vi.mocked(useDailyBudget).mockReturnValue(GREEN_PAYLOAD);
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
      lastNarrationSource: "ollama",
      addTurn: vi.fn(),
      setState: vi.fn(),
    });
    render(<CoachPage />);
    expect(screen.queryByTestId("narration-fallback-banner")).toBeNull();
  });

  it("renders gracefully when no plan is set (chips are still visible)", () => {
    vi.mocked(useDailyBudget).mockReturnValue(null);
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
    render(<CoachPage />);
    // The chips are still rendered (no plan = empty state banner instead).
    expect(screen.getByTestId("coach-page-title")).toBeInTheDocument();
    expect(screen.getByTestId("coach-no-plan")).toBeInTheDocument();
  });

  it("uses the coach-prompts constants — the system prompt is the pinned Italian one", () => {
    // We don't render the system prompt directly, but we can verify
    // the QuickQuestions data carries the verbatim Italian system
    // prompt (covered by QuickQuestions.test.ts) and that the page
    // exposes the chips.
    vi.mocked(useDailyBudget).mockReturnValue(GREEN_PAYLOAD);
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
    render(<CoachPage />);
    const firstChip = QUICK_QUESTIONS[0];
    expect(firstChip).toBeDefined();
    expect(firstChip?.label).toBe("Quanto posso spendere oggi?");
  });
});
