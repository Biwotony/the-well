#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lockPath = path.join(root, "mobile-runtime.lock.json");
const lockedFiles = JSON.parse(readFileSync(lockPath, "utf8"));
const failures = [];

function hashFile(filePath) {
  const bytes = readFileSync(filePath);
  const hashInput = /\.(?:png|jpe?g|gif|webp)$/i.test(filePath)
    ? bytes
    : Buffer.from(bytes.toString("utf8").replace(/\r\n/g, "\n"));
  return createHash("sha256").update(hashInput).digest("hex");
}

for (const [relativePath, expectedHash] of Object.entries(lockedFiles)) {
  const filePath = path.join(root, relativePath);

  if (!existsSync(filePath)) {
    failures.push(`${relativePath} is missing`);
    continue;
  }

  const actualHash = hashFile(filePath);
  if (actualHash !== expectedHash) {
    failures.push(`${relativePath} was modified`);
  }
}

if (failures.length > 0) {
  console.error("Mobile runtime integrity check failed:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  console.error("\nRestore the protected runtime. Put app UI in src/Prototype.tsx and src/prototype.css.");
  process.exit(1);
}

console.log(`Mobile runtime integrity check passed (${Object.keys(lockedFiles).length} protected files).`);
