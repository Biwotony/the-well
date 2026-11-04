import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const base = process.env.PR2_BASE_URL ?? "http://127.0.0.1:4176";
const output = resolve("docs/pr2-screenshots");
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const results = [];
const captures = [
  ["02-mobile-home", 390, 844, "/?content=demo"],
  ["03-tablet-home", 768, 1024, "/?content=demo"],
  ["04-desktop-home", 1440, 1000, "/?content=demo"],
  ["05-large-desktop-home", 1920, 1080, "/?content=demo"],
  ["06-mobile-reader", 390, 844, "/stories/learning-to-stay/episodes/1?content=demo"],
  ["07-desktop-reader", 1440, 1000, "/stories/learning-to-stay/episodes/1?content=demo"],
  ["08-mobile-library", 390, 844, "/stories?content=demo"],
  ["09-desktop-library", 1440, 1000, "/stories?content=demo"],
  ["10-search-empty", 390, 844, "/stories?content=demo", "search"],
  ["11-reflection", 390, 844, "/stories/learning-to-stay/episodes/1?content=demo", "reflection"],
  ["12-episode-two", 1440, 1000, "/stories/learning-to-stay/episodes/2?content=demo"],
  ["13-journey-list", 390, 844, "/journeys?content=demo"],
  ["14-journey-detail", 1440, 1000, "/journeys/a-more-generous-listening?content=demo"],
  ["15-practice", 390, 844, "/challenges/listen-before-answering?content=demo"],
  ["16-completed-practice", 390, 844, "/challenges/listen-before-answering?content=demo", "complete"],
  ["17-production-empty", 1440, 1000, "/"],
  ["18-episode-unavailable", 390, 844, "/stories/learning-to-stay/episodes/99?content=demo"],
  ["19-series-overview", 390, 844, "/stories/learning-to-stay/episodes/1?content=demo", "series"],
];
try {
  for (const [name, width, height, path, action] of captures) {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, reducedMotion: "reduce" });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    await page.goto(base + path, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    if (action === "search") await page.getByRole("searchbox").fill("no-matching-story");
    if (action === "reflection") await page.getByRole("button", { name: "I want to sit with this" }).click();
    if (action === "complete") await page.getByRole("button", { name: /Complete practice/ }).click();
    if (action === "series") {
      await page.locator(".web-series-index summary").click();
      await page.locator(".web-series-index").scrollIntoViewIfNeeded();
    }
    const layout = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
    await page.screenshot({ path: resolve(output, `${name}.png`) });
    results.push({ name, path, action: action ?? null, ...layout, errors, horizontalOverflow: layout.scrollWidth > layout.clientWidth });
    await context.close();
  }
} finally { await browser.close(); }
await writeFile(resolve(output, "verification.json"), JSON.stringify(results, null, 2) + "\n");
console.log(JSON.stringify(results, null, 2));
if (results.some((item) => item.horizontalOverflow || item.errors.length)) process.exitCode = 1;
