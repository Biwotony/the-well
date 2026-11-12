#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const index = path.join(dist, "client", "index.html");
const appShell = path.join(dist, "client", "app-shell.asset");
const worker = path.join(root, "worker", "index.js");
const workerConfig = path.join(root, "worker", "wrangler.json");
const hosting = path.join(root, ".openai", "hosting.json");
const deploymentMode = process.argv.includes("--deployment");

for (const file of [index, worker, workerConfig, hosting]) {
  if (!existsSync(file)) throw new Error("Missing Sites build input: " + file);
}

mkdirSync(path.join(dist, "server"), { recursive: true });
mkdirSync(path.join(dist, ".openai"), { recursive: true });
copyFileSync(index, appShell);
copyFileSync(worker, path.join(dist, "server", "index.js"));
copyFileSync(workerConfig, path.join(dist, "server", "wrangler.json"));
copyFileSync(hosting, path.join(dist, ".openai", "hosting.json"));
if (deploymentMode) rmSync(index);

console.log(`Prepared Sites ${deploymentMode ? "deployment" : "build"}: Worker, private app shell, routing configuration, and hosting manifest`);
