import { chromium, devices } from "../node_modules/.pnpm/playwright-core@1.60.0/node_modules/playwright-core/index.mjs";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const outDir = process.env.SHOT_DIR || join(tmpdir(), "shots");
import { mkdirSync } from "node:fs";
mkdirSync(outDir, { recursive: true });

const pages = [
  "/dashboard",
  "/plan",
  "/budget",
  "/goals",
  "/debts",
  "/transactions",
  "/coach",
  "/simulator",
];

const msPlaywright = `${process.env.LOCALAPPDATA}/ms-playwright`;
const chromiumDirs = readdirSync(msPlaywright).filter((d) =>
  d.startsWith("chromium-"),
);
const exe = join(
  msPlaywright,
  chromiumDirs[0],
  "chrome-win64",
  "chrome.exe",
);
console.log("Using chromium:", exe);

const browser = await chromium.launch({ executablePath: exe });
const ctx = await browser.newContext({
  ...devices["Pixel 5"],
  viewport: { width: 414, height: 896 },
});
const page = await ctx.newPage();
const base = "http://127.0.0.1:4173";

const results = [];
for (const path of pages) {
  const url = base + path;
  const consoleErrors = [];
  const pageErrors = [];
  page.removeAllListeners("console");
  page.removeAllListeners("pageerror");
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });
  page.on("pageerror", (e) => pageErrors.push(e.message));
  try {
    const resp = await page.goto(url, {
      waitUntil: "networkidle",
      timeout: 15000,
    });
    const status = resp ? resp.status() : 0;
    await page.waitForTimeout(400);
    const slug = path.replace("/", "") || "home";
    const file = join(outDir, `shot-${slug}.png`);
    await page.screenshot({ path: file, fullPage: false });
    const title = await page.title();
    const bodyText = (await page.locator("body").innerText()).slice(0, 120);
    results.push({ path, status, file, title, bodyText, consoleErrors, pageErrors });
  } catch (err) {
    results.push({ path, error: err.message, consoleErrors, pageErrors });
  }
}

await browser.close();
console.log(JSON.stringify(results, null, 2));
