/**
 * Test plan for `useAbortController` — the shared React hook that
 * creates an AbortController and aborts on unmount.
 *
 * The hook is reused by the coach UI to cancel in-flight Ollama
 * requests when the user navigates away. It MUST:
 *   - return a fresh `AbortSignal` on first render;
 *   - keep the same signal instance across re-renders (stable
 *     reference — callers cache the signal in refs);
 *   - abort the signal when the host component unmounts.
 */
import { act, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useAbortController } from "./useAbortController";

interface Capture {
  signal: AbortSignal | undefined;
  rerender: () => void;
}

function TestComponent({ capture }: { capture: Capture }) {
  capture.signal = useAbortController();
  return null;
}

describe("useAbortController", () => {
  it("returns a fresh, non-aborted AbortSignal on first render", () => {
    const capture: Capture = { signal: undefined, rerender: vi.fn() };
    render(<TestComponent capture={capture} />);
    expect(capture.signal).toBeInstanceOf(AbortSignal);
    expect(capture.signal?.aborted).toBe(false);
  });

  it("keeps the same AbortSignal instance across re-renders", () => {
    const capture: Capture = { signal: undefined, rerender: vi.fn() };
    const { rerender } = render(<TestComponent capture={capture} />);
    const first = capture.signal;
    capture.rerender = () => {
      rerender(<TestComponent capture={capture} />);
    };
    act(() => {
      capture.rerender();
    });
    expect(capture.signal).toBe(first);
    expect(first?.aborted).toBe(false);
  });

  it("aborts the signal when the host component unmounts", () => {
    const capture: Capture = { signal: undefined, rerender: vi.fn() };
    const { unmount } = render(<TestComponent capture={capture} />);
    const sig = capture.signal;
    expect(sig?.aborted).toBe(false);
    unmount();
    expect(sig?.aborted).toBe(true);
  });
});
