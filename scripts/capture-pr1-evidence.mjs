import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const baseUrl = process.env.PR1_BASE_URL ?? "http://127.0.0.1:4175";
const outputDirectory = resolve("docs/pr1-screenshots");
const browser = await chromium.launch();

await mkdir(outputDirectory, { recursive: true });

const captures = [
  { name: "mobile-home", width: 390, height: 844, screen: "home" },
  { name: "tablet-home", width: 768, height: 1024, screen: "home" },
  { name: "desktop-home", width: 1440, height: 1000, screen: "home" },
  { name: "large-desktop-home", width: 1920, height: 1080, screen: "home" },
  { name: "mobile-story", width: 390, height: 844, screen: "story" },
  { name: "desktop-story", width: 1440, height: 1000, screen: "story" },
];

const results = [];

try {
  for (const capture of captures) {
    const context = await browser.newContext({
      colorScheme: "light",
      deviceScaleFactor: 1,
      viewport: { width: capture.width, height: capture.height },
    });
    const page = await context.newPage();
    const consoleErrors = [];

    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => consoleErrors.push(error.message));

    await page.goto(baseUrl, { waitUntil: "networkidle" });
    if (capture.screen === "story") {
      await page.locator("button:visible", { hasText: "Read their story" }).click();
      await page.getByTestId("story-reader").waitFor();
    }

    const layout = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      title: document.title,
    }));

    await page.screenshot({
      path: resolve(outputDirectory, `${capture.name}.png`),
      fullPage: false,
    });

    results.push({
      ...capture,
      consoleErrors,
      horizontalOverflow: layout.scrollWidth > layout.clientWidth,
      layout,
    });
    await context.close();
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify(results, null, 2));

if (results.some((result) => result.horizontalOverflow || result.consoleErrors.length > 0)) {
  process.exitCode = 1;
}
