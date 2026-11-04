import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const repositoryUrl = new URL("../src/lib/public-content.ts", import.meta.url);
const fixtureUrl = new URL("../src/lib/public-content-fixtures.ts", import.meta.url);
const prototypeUrl = new URL("../src/Prototype.tsx", import.meta.url);

test("public queries request only approved publication states", async () => {
  const source = await readFile(repositoryUrl, "utf8");
  assert.match(source, /\.eq\("status", "published"\)/);
  assert.match(source, /\.lte\("published_at", visibleAt\)/);
  assert.match(source, /\.lte\("published_at", now\(\)\)/);
  assert.doesNotMatch(source, /service_role|SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY/i);
});

test("public reads are bounded and use explicit field lists", async () => {
  const source = await readFile(repositoryUrl, "utf8");
  assert.match(source, /\.limit\(24\)/);
  assert.match(source, /\.limit\(50\)/);
  assert.doesNotMatch(source, /\.select\(["'`]\*["'`]\)/);
});

test("fixtures require a labeled localhost-only demo request", async () => {
  const [fixtures, prototype] = await Promise.all([
    readFile(fixtureUrl, "utf8"),
    readFile(prototypeUrl, "utf8"),
  ]);
  assert.match(fixtures, /demoPublicContentRepository/);
  assert.match(prototype, /hostname === "localhost"/);
  assert.match(prototype, /hostname === "127\.0\.0\.1"/);
  assert.match(prototype, /Local demonstration content/);
  assert.match(prototype, /Nothing on this page is published production data/);
});

test("story reflection is explicitly session-only", async () => {
  const source = await readFile(prototypeUrl, "utf8");
  assert.match(source, /stays only in this browser session/);
  assert.match(source, /never sent to the database/);
});
