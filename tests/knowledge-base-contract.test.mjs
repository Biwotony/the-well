import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const projectFile = (path) => new URL(`../${path}`, import.meta.url);

test("knowledge tables and retrieval stay server-only", async () => {
  const sql = await readFile(projectFile("knowledge-base/schema.sql"), "utf8");
  for (const table of ["kb_documents", "kb_chunks"]) {
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security;`, "i"));
    assert.match(sql, new RegExp(`revoke all on public\\.${table} from anon, authenticated;`, "i"));
  }
  assert.match(sql, /revoke all on function public\.match_kb_chunks[\s\S]+from public, anon, authenticated;/i);
  assert.match(sql, /grant execute on function public\.match_kb_chunks[\s\S]+to service_role;/i);
  assert.match(sql, /least\(coalesce\(match_count, 8\), 25\)/i);
  assert.match(sql, /operator\(extensions\.<=>\)/i);
  assert.match(sql, /embedding extensions\.vector_cosine_ops/i);
  assert.match(sql, /for update skip locked/i);
  assert.match(sql, /d\.ingestion_policy = 'production_rag'/i);
  assert.match(sql, /revoke all on function public\.claim_kb_embedding_chunks\(integer\) from public, anon, authenticated;/i);
  assert.match(sql, /grant execute on function public\.claim_kb_embedding_chunks\(integer\) to service_role;/i);
});

test("ingestion excludes restricted and licensed sources", async () => {
  const source = await readFile(projectFile("knowledge-base/scripts/import-corpus.mjs"), "utf8");
  assert.match(source, /doc\.production_eligible && doc\.license_status === 'public_domain_us'/);
  assert.match(source, /\/functions\/v1\/kb-embed/);
  assert.doesNotMatch(source, /\/functions\/v1\/embed['"]/);

  const catalog = JSON.parse(await readFile(projectFile("knowledge-base/config/catalog.json"), "utf8"));
  const licensed = catalog.find((book) => book.external_id === "licensed-rosenau-celebration-sex");
  assert.equal(licensed.ingestion_policy, "blocked_pending_ai_ingestion_license");
  assert.ok(licensed.risk_tags.includes("do_not_embed"));
});

test("chunks are configured for the embedding model ceiling", async () => {
  const builder = await readFile(projectFile("knowledge-base/scripts/build-corpus.ps1"), "utf8");
  const verifier = await readFile(projectFile("knowledge-base/scripts/verify-corpus.ps1"), "utf8");
  assert.match(builder, /\[int\]\$MaxChunkChars = 1800/);
  assert.match(verifier, /token_estimate -gt 512/);
});

test("local embedding backfill is production-only and edge-compatible", async () => {
  const source = await readFile(projectFile("knowledge-base/scripts/embed-local.mjs"), "utf8");
  assert.match(source, /doc\.production_eligible/);
  assert.match(source, /doc\.license_status === 'public_domain_us'/);
  assert.match(source, /doc\.ingestion_policy === 'production_rag'/);
  assert.match(source, /Supabase\/gte-small/);
  assert.match(source, /dtype: 'q8'/);
  assert.match(source, /output\.dims\[1\] !== 384/);
});

test("embedding worker requires a dedicated ingestion secret", async () => {
  const source = await readFile(projectFile("supabase/functions/kb-embed/index.ts"), "utf8");
  assert.match(source, /INTERNAL_INGESTION_SECRET/);
  assert.match(source, /crypto\.subtle\.digest\('SHA-256'/);
  assert.match(source, /Number\.isFinite\(requestedLimit\)/);
  assert.match(source, /rpc\('claim_kb_embedding_chunks'/);
  assert.match(source, /Math\.min\(Math\.trunc\(requestedLimit\), 5\)/);
});

test("agent retrieval is production-only and cannot bypass draft publication", async () => {
  const source = await readFile(projectFile("supabase/functions/agent-runner/index.ts"), "utf8");
  assert.match(source, /allowed_policies:\s*\['production_rag'\]/);
  assert.match(source, /approved_knowledge/);
  assert.match(source, /knowledge_citations/);
  assert.match(source, /status:\s*"draft"/);
  assert.match(source, /origin:\s*"agent"/);
  assert.doesNotMatch(source, /allowed_policies:\s*\[[^\]]*historical_rag/);
  assert.doesNotMatch(source, /status:\s*"published"/);
});
