/**
 * Test plan for `CoachContext`.
 *
 * The context holds the user's `CoachState` (a list of up to 20
 * `CoachTurn`s) and exposes the operation the UI needs:
 *   - `addTurn(turn, saveInHistory)` — appends a turn to the list
 *   - `lastNarrationSource` — derived from the most recent turn, used
 *     to drive the yellow "Ollama not reachable" banner
 *   - `setState(state, saveInHistory)` — replaces the list (e.g. on
 *     initial load from localforage)
 *   - standard use-undo bindings: `past`, `future`, `undo`, `redo`,
 *     `canUndo`, `canRedo`
 *
 * The `saveInHistory` flag mirrors `BudgetContext.setBudget(value,
 * saveInHistory)`; v1 always pushes to history (no branch yet — see
 * the comment in the impl).
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CoachContextProvider } from "./CoachContext";
import type { CoachTurn } from "./coachState";
import { useCoach } from "./useCoach";

function TestComponent() {
  const { turns, addTurn, setState, lastNarrationSource, canUndo, undo } =
    useCoach();
  return (
    <>
      <p data-testid="count">{turns.length}</p>
      <p data-testid="lastSource">{lastNarrationSource ?? "none"}</p>
      <p data-testid="canUndo">{String(canUndo)}</p>
      <button
        data-testid="addOllama"
        onClick={() =>
          addTurn(
            {
              userPrompt: "q",
              narration: { text: "ok", source: "ollama", actionCount: 1 },
            },
            true,
          )
        }
        type="button"
      >
        add ollama
      </button>
      <button
        data-testid="addDet"
        onClick={() =>
          addTurn(
            {
              userPrompt: "q",
              narration: {
                text: "fallback",
                source: "deterministic",
                actionCount: 1,
              },
            },
            true,
          )
        }
        type="button"
      >
        add deterministic
      </button>
      <button
        data-testid="seed"
        onClick={() => {
          const seed: CoachTurn[] = [
            {
              id: "s1",
              timestamp: "2026-06-10T12:00:00Z" as never,
              userPrompt: "seed",
              narration: { text: "seed", source: "ollama", actionCount: 1 },
            },
          ];
          setState({ turns: seed }, false);
        }}
        type="button"
      >
        seed
      </button>
      <button data-testid="undo" onClick={() => undo()} type="button">
        undo
      </button>
    </>
  );
}

describe("CoachContextProvider", () => {
  it("starts with an empty turn list and no lastNarrationSource", () => {
    render(
      <CoachContextProvider>
        <TestComponent />
      </CoachContextProvider>,
    );
    expect(screen.getByTestId("count").textContent).toBe("0");
    expect(screen.getByTestId("lastSource").textContent).toBe("none");
  });

  it("lastNarrationSource flips from ollama to deterministic", () => {
    render(
      <CoachContextProvider>
        <TestComponent />
      </CoachContextProvider>,
    );
    fireEvent.click(screen.getByTestId("addOllama"));
    expect(screen.getByTestId("lastSource").textContent).toBe("ollama");
    expect(screen.getByTestId("count").textContent).toBe("1");

    fireEvent.click(screen.getByTestId("addDet"));
    expect(screen.getByTestId("lastSource").textContent).toBe("deterministic");
    expect(screen.getByTestId("count").textContent).toBe("2");
  });

  it("addTurn(s, true) appends and pushes to history; undo drops the last turn", () => {
    render(
      <CoachContextProvider>
        <TestComponent />
      </CoachContextProvider>,
    );
    fireEvent.click(screen.getByTestId("addOllama"));
    expect(screen.getByTestId("count").textContent).toBe("1");
    expect(screen.getByTestId("canUndo").textContent).toBe("true");

    fireEvent.click(screen.getByTestId("undo"));
    expect(screen.getByTestId("count").textContent).toBe("0");
    expect(screen.getByTestId("lastSource").textContent).toBe("none");
  });

  it("setState(s, false) seeds the context with the given turns", () => {
    render(
      <CoachContextProvider>
        <TestComponent />
      </CoachContextProvider>,
    );
    fireEvent.click(screen.getByTestId("seed"));
    expect(screen.getByTestId("count").textContent).toBe("1");
    expect(screen.getByTestId("lastSource").textContent).toBe("ollama");
  });
});
