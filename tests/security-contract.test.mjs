import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL("../supabase/migrations/20261103091345_initial_the_well_schema.sql", import.meta.url);
const hardeningMigrationUrl = new URL("../supabase/migrations/20261104190000_harden_publication_gate.sql", import.meta.url);
const agentUrl = new URL("../supabase/functions/agent-runner/index.ts", import.meta.url);
const authUrl = new URL("../src/lib/supabase.ts", import.meta.url);
const editorialUrl = new URL("../src/lib/editorial.ts", import.meta.url);
const prototypeUrl = new URL("../src/Prototype.tsx", import.meta.url);

test("every exposed product table enables row-level security", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  const required = [
    "profiles",
    "user_roles",
    "story_series",
    "story_episodes",
    "challenges",
    "journeys",
    "journey_steps",
    "journey_enrollments",
    "challenge_completions",
    "story_submissions",
    "moderation_events",
    "agent_runs",
    "agent_budgets",
    "editorial_audit",
  ];

  for (const table of required) {
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security;`, "i"));
  }
});

test("publication is guarded by a human editor trigger and audit log", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  assert.match(sql, /human editor approval required/i);
  assert.match(sql, /old\.status <> 'in_review'/i);
  assert.match(sql, /human_publish_approval/i);
  assert.match(sql, /create trigger story_series_publish_gate/i);
});

test("launch hardening covers inserts, transition integrity, and server-owned approval metadata", async () => {
  const sql = await readFile(hardeningMigrationUrl, "utf8");
  assert.match(sql, /new content must begin as an unapproved draft/i);
  assert.match(sql, /invalid editorial status transition/i);
  assert.match(sql, /approval metadata is managed by the publication gate/i);
  assert.match(sql, /new\.approved_by := actor/i);
  assert.match(sql, /before insert or update on public\.story_series/i);
  assert.match(sql, /published content must be archived and reviewed before editing/i);
  assert.match(sql, /revoke all on function app_private\.enforce_publish_gate\(\) from public, anon, authenticated/i);
});

test("editor authentication refuses public signup and verifies the database-backed role", async () => {
  const source = await readFile(authUrl, "utf8");
  assert.match(source, /shouldCreateUser:\s*false/);
  assert.match(source, /auth\.getUser\(\)/);
  assert.match(source, /from\("user_roles"\)/);
  assert.match(source, /role === "editor" \|\| role === "admin"/);
  assert.match(source, /auth\.onAuthStateChange/);
  assert.match(source, /auth\.signOut\(\)/);
  assert.doesNotMatch(source, /user_metadata.*role|raw_user_meta_data.*role/i);
});

test("the browser uses guarded lifecycle transitions and never forges approval fields", async () => {
  const source = await readFile(editorialUrl, "utf8");
  assert.match(source, /\.update\(\{ status: to \}\)/);
  assert.match(source, /\.eq\("status", from\)/);
  assert.match(source, /itemId, "in_review", "approved"/);
  assert.match(source, /itemId, "approved", "published"/);
  assert.doesNotMatch(source, /approved_by|approved_at|published_at/);
});

test("the lean pilot does not accept or claim to store story submissions", async () => {
  const source = await readFile(prototypeUrl, "utf8");
  assert.match(source, /private submission channel is not open yet/i);
  assert.match(source, /Our Honest Days does not collect or store story text/i);
  assert.doesNotMatch(source, /Send for private review|Received safely/i);
});

test("the AI runner can only create draft-origin content", async () => {
  const source = await readFile(agentUrl, "utf8");
  assert.match(source, /status:\s*"draft"/);
  assert.match(source, /origin:\s*"agent"/);
  assert.doesNotMatch(source, /status:\s*"published"/);
  assert.match(source, /daily_budget_exhausted/);
});
