/**
 * Tests for `NarrationBanner`.
 *
 * The banner is shown when the coach orchestrator fell back to the
 * deterministic narrator (i.e. `source === "deterministic"`). It is
 * hidden when:
 *   - `source === "ollama"` (Ollama responded successfully)
 *   - `source === undefined` (no narration yet — fresh visit)
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NarrationBanner } from "./NarrationBanner";

describe("NarrationBanner", () => {
  it("renders the yellow banner with the Italian fallback text when source is 'deterministic'", () => {
    render(<NarrationBanner source="deterministic" />);
    const banner = screen.getByTestId("narration-fallback-banner");
    expect(banner).toBeInTheDocument();
    expect(banner.textContent ?? "").toMatch(/Ollama/);
    expect(banner.textContent ?? "").toMatch(/regole integrate/);
  });

  it("does NOT render when source is 'ollama'", () => {
    render(<NarrationBanner source="ollama" />);
    expect(screen.queryByTestId("narration-fallback-banner")).toBeNull();
  });

  it("does NOT render when source is undefined (fresh visit, no narration yet)", () => {
    render(<NarrationBanner source={undefined} />);
    expect(screen.queryByTestId("narration-fallback-banner")).toBeNull();
  });

  it("uses role='status' so screen readers announce the fallback (a11y)", () => {
    render(<NarrationBanner source="deterministic" />);
    const banner = screen.getByTestId("narration-fallback-banner");
    expect(banner).toHaveAttribute("role", "status");
  });
});
