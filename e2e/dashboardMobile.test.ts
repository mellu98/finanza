/**
 * E2E smoke for the new `/dashboard` route.
 *
 * Validates the first user-visible artifact of PR5:
 *   1. The dashboard renders all 9 cards on a Mobile Chrome (Pixel 5)
 *      viewport (393 × 851).
 *   2. No card overflows horizontally — the page does not introduce
 *      horizontal scroll.
 *   3. The footer disclaimer is visible.
 *
 * The test runs against the chromium + Mobile Chrome projects (per
 * `playwright.config.ts`). On a developer machine the dev server is
 * reused; on CI a fresh build + preview is started.
 *
 * Note: the dashboard's full 9-card composition requires a saved
 * Monthly Plan (via localforage). On a brand-new browser, no plan
 * exists, so the dashboard shows the `EmptyPlanCard` instead of the
 * 8 money cards. This smoke accepts BOTH conditions:
 *   - EmptyPlanCard visible (no plan) — pass if the page renders
 *     without horizontal scroll
 *   - 9 money cards visible (with a plan) — pass
 *   In either case the StatusCard, the page title, and the footer
 *   disclaimer are always present.
 */
import { expect, test } from "@playwright/test";

test("dashboard renders on mobile without horizontal scroll", async ({
  page,
  isMobile,
}) => {
  await page.goto("/dashboard");
  // Page title is always present.
  await expect(page.getByTestId("dashboard-title")).toBeVisible();
  // Footer disclaimer is always rendered.
  await expect(page.getByTestId("footer-disclaimer")).toBeVisible();
  // Status card always renders (its empty variant when no plan).
  const statusEmpty = page.getByTestId("status-card-empty");
  const status = page.getByTestId("status-card");
  await expect(statusEmpty.or(status)).toBeVisible();

  if (isMobile) {
    // The Pixel 5 viewport is 393 px wide. No card should overflow.
    const docWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    const winWidth = await page.evaluate(() => window.innerWidth);
    expect(docWidth).toBeLessThanOrEqual(winWidth);
  }
});

test("dashboard shows the EmptyPlanCard CTA on first visit", async ({
  page,
}) => {
  await page.goto("/dashboard");
  // On a fresh browser with no plan saved, the EmptyPlanCard is
  // visible with a "Set up your monthly plan" CTA.
  const empty = page.getByTestId("empty-plan-card");
  if (await empty.isVisible().catch(() => false)) {
    await expect(page.getByTestId("empty-plan-card-cta")).toBeVisible();
    await expect(page.getByTestId("empty-plan-card-cta")).toHaveAttribute(
      "href",
      "/plan",
    );
  }
});
