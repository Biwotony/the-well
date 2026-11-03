import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL("../supabase/migrations/20261103091345_initial_the_well_schema.sql", import.meta.url);
const agentUrl = new URL("../supabase/functions/agent-runner/index.ts", import.meta.url);

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

test("the AI runner can only create draft-origin content", async () => {
  const source = await readFile(agentUrl, "utf8");
  assert.match(source, /status:\s*"draft"/);
  assert.match(source, /origin:\s*"agent"/);
  assert.doesNotMatch(source, /status:\s*"published"/);
  assert.match(source, /daily_budget_exhausted/);
});
