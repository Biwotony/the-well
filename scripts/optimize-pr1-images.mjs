import { chromium } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import { extname, resolve } from "node:path";

const images = [
  {
    source: "public/assets/the-well/hero-learning-to-stay.png",
    output: "public/assets/the-well/hero-learning-to-stay.webp",
    maxWidth: 1440,
    quality: 0.82,
  },
  {
    source: "public/assets/the-well/hero-learning-to-stay.png",
    output: "public/assets/the-well/hero-learning-to-stay-768.webp",
    maxWidth: 768,
    quality: 0.8,
  },
  {
    source: "public/assets/the-well/story-grace-in-the-quiet.png",
    output: "public/assets/the-well/story-grace-in-the-quiet.webp",
    maxWidth: 960,
    quality: 0.82,
  },
  {
    source: "public/assets/the-well/story-grace-in-the-quiet.png",
    output: "public/assets/the-well/story-grace-in-the-quiet-640.webp",
    maxWidth: 640,
    quality: 0.8,
  },
];

const browser = await chromium.launch();
const page = await browser.newPage();

try {
  for (const image of images) {
    const source = await readFile(resolve(image.source));
    const mimeType = extname(image.source) === ".png" ? "image/png" : "image/jpeg";
    const dataUrl = `data:${mimeType};base64,${source.toString("base64")}`;
    const encoded = await page.evaluate(async ({ dataUrl: url, maxWidth, quality }) => {
      const sourceImage = new Image();
      sourceImage.src = url;
      await sourceImage.decode();

      const scale = Math.min(1, maxWidth / sourceImage.naturalWidth);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(sourceImage.naturalWidth * scale);
      canvas.height = Math.round(sourceImage.naturalHeight * scale);
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) throw new Error("Canvas 2D context is unavailable.");
      context.drawImage(sourceImage, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise((resolveBlob, reject) => {
        canvas.toBlob(
          (value) => value ? resolveBlob(value) : reject(new Error("WebP encoding failed.")),
          "image/webp",
          quality,
        );
      });
      const reader = new FileReader();
      const result = await new Promise((resolveReader, reject) => {
        reader.onload = () => resolveReader(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });
      return String(result);
    }, { dataUrl, maxWidth: image.maxWidth, quality: image.quality });

    await writeFile(resolve(image.output), Buffer.from(encoded.split(",")[1], "base64"));
  }
} finally {
  await browser.close();
}
