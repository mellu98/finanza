/**
 * Test plan for `CoachSettingsContext`.
 *
 * The context holds the user's `CoachSettings` in state and exposes
 * `setSettings` (with the `saveInHistory` flag from
 * `BudgetContext.setBudget(value, saveInHistory)` so the undo/redo
 * stack behaves the same way as the legacy Guitos budget context).
 *
 * The test asserts the externally observable behaviour via button
 * clicks (no setState during render — the test harness
 * `console-fail-test` rejects that pattern).
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CoachSettingsMother } from "./CoachSettings.mother";
import { CoachSettingsProvider } from "./CoachSettingsContext";
import { useCoachSettings } from "./useCoachSettings";

function TestComponent() {
  const { settings, setSettings, undo, canUndo, canRedo } = useCoachSettings();
  return (
    <>
      <p data-testid="modelName">{settings ? settings.modelName : "none"}</p>
      <p data-testid="aiEnabled">
        {settings ? String(settings.aiEnabled) : "none"}
      </p>
      <p data-testid="canUndo">{String(canUndo)}</p>
      <p data-testid="canRedo">{String(canRedo)}</p>
      <button
        data-testid="setLlama"
        onClick={() => setSettings(CoachSettingsMother.testSettings(), false)}
        type="button"
      >
        set llama
      </button>
      <button
        data-testid="setRules"
        onClick={() => setSettings(CoachSettingsMother.rulesEngineOnly(), true)}
        type="button"
      >
        set rules
      </button>
      <button data-testid="undo" onClick={() => undo()} type="button">
        undo
      </button>
    </>
  );
}

describe("CoachSettingsProvider", () => {
  it("renders with default settings out of the box", () => {
    // A partire dal fix del 2026-06-12, il Provider parte con
    // `CoachSettingsMother.defaults()` (non undefined) per evitare
    // che `useDailyBudget` ritorni null quando l'utente non ha mai
    // configurato Ollama. Questo rompe il flusso "salva piano →
    // dashboard dice non hai ancora un piano" perché settings
    // sarebbe undefined → useDailyBudget → null.
    render(
      <CoachSettingsProvider>
        <TestComponent />
      </CoachSettingsProvider>,
    );
    expect(screen.getByTestId("modelName").textContent).toBe("llama3.2");
    expect(screen.getByTestId("canUndo").textContent).toBe("false");
    expect(screen.getByTestId("canRedo").textContent).toBe("false");
  });

  it("setSettings(s, false) stores the settings in context", () => {
    render(
      <CoachSettingsProvider>
        <TestComponent />
      </CoachSettingsProvider>,
    );
    fireEvent.click(screen.getByTestId("setLlama"));
    expect(screen.getByTestId("modelName").textContent).toBe("llama3.2");
    expect(screen.getByTestId("aiEnabled").textContent).toBe("true");
  });

  it("setSettings(s, true) adds an undo step and undo restores the previous settings", () => {
    render(
      <CoachSettingsProvider>
        <TestComponent />
      </CoachSettingsProvider>,
    );
    fireEvent.click(screen.getByTestId("setLlama"));
    fireEvent.click(screen.getByTestId("setRules"));
    expect(screen.getByTestId("aiEnabled").textContent).toBe("false");
    expect(screen.getByTestId("canUndo").textContent).toBe("true");
    fireEvent.click(screen.getByTestId("undo"));
    expect(screen.getByTestId("aiEnabled").textContent).toBe("true");
  });
});
