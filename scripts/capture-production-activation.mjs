import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const baseUrl = process.env.PREVIEW_URL ?? "http://127.0.0.1:4177";
const output = new URL("../docs/production-activation-screenshots/", import.meta.url);
await mkdir(output, { recursive: true });

const browser = await chromium.launch();
const captures = [
  ["01-home-390.png", "/", 390, 844],
  ["02-home-768.png", "/", 768, 1024],
  ["03-home-1024.png", "/", 1024, 900],
  ["04-home-1440.png", "/", 1440, 1000],
  ["05-studio-390.png", "/studio", 390, 844],
  ["06-studio-1440.png", "/studio", 1440, 1000],
];

for (const [name, path, width, height] of captures) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" });
  await page.screenshot({ path: fileURLToPath(new URL(name, output)), fullPage: true });
  await page.close();
}

const mobileStudio = await browser.newPage({ viewport: { width: 390, height: 844 } });
await mobileStudio.goto(`${baseUrl}/studio`, { waitUntil: "networkidle" });
await mobileStudio.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await mobileStudio.screenshot({
  path: fileURLToPath(new URL("07-studio-390-bottom.png", output)),
});
await mobileStudio.close();

await browser.close();
console.log(`Captured ${captures.length + 1} production-activation screenshots.`);
