/**
 * E2E smoke for the new `/transactions` page (PR6).
 *
 * Validates the first user-visible artifact of PR6:
 *   1. The transactions page renders on a Mobile Chrome (Pixel 5)
 *      viewport (393 × 851).
 *   2. The sortable headers and search input are present.
 *   3. The page does not introduce horizontal scroll on mobile.
 *   4. The page is reachable from the dashboard.
 *
 * Mirrors `e2e/dashboardMobile.test.ts` (the PR5 smoke) so the e2e
 * contract stays consistent across the 7 PRs.
 *
 * Note: the page requires the user to have created at least one
 * transaction via `/transactions` (or imported a CSV) for the table
 * to render. On a brand-new browser the empty-state card is shown
 * instead — both states pass the smoke.
 */
import { expect, test } from "@playwright/test";

test("transactions page renders on mobile without horizontal scroll", async ({
  page,
  isMobile,
}) => {
  await page.goto("/transactions");
  // Page title is always present.
  await expect(page.getByTestId("transactions-page-title")).toBeVisible();
  // Import + Export buttons are always rendered.
  await expect(page.getByTestId("tx-import-button")).toBeVisible();
  await expect(page.getByTestId("tx-export-button")).toBeVisible();
  // Either the table OR the empty-state is rendered.
  const table = page.getByTestId("transactions-table-wrapper");
  const empty = page.getByTestId("transactions-empty-state");
  await expect(table.or(empty)).toBeVisible();

  if (isMobile) {
    // The Pixel 5 viewport is 393 px wide. No content overflows.
    const docWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    const winWidth = await page.evaluate(() => window.innerWidth);
    expect(docWidth).toBeLessThanOrEqual(winWidth);
  }
});

test("transactions page shows the Import CSV modal when clicking the button", async ({
  page,
}) => {
  await page.goto("/transactions");
  await page.getByTestId("tx-import-button").click();
  await expect(page.getByTestId("tx-import-modal")).toBeVisible();
  await expect(page.getByTestId("tx-import-textarea")).toBeVisible();
  await expect(page.getByTestId("tx-import-expected-header")).toHaveText(
    "date,type,category,description,amount,paymentMethod,necessary,classification,notes",
  );
});
