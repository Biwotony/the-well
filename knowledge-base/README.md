# THE WELL Knowledge Base - Production Package

This package converts the verified local book collection into a curated, reproducible corpus for THE WELL.

## What it produces

- Canonically named copies of public-domain EPUB sources
- `manifest.json` and `manifest.csv` with hashes, licensing, categories, theological tier, safety flags, and retrieval weights
- `chunks.jsonl` containing deterministic, citation-ready chunks
- A QA report covering missing files and duplicate hashes
- A Supabase/pgvector schema with server-only access and policy-filtered retrieval

The modern copyrighted title *A Celebration of Sex* is registered as an authorized reference copy but is deliberately not copied, extracted, chunked, embedded, or redistributed. Change that policy only after written authorization explicitly covers AI ingestion and commercial application use.

## Build and verify

Run from the repository root:

```powershell
.\knowledge-base\scripts\build-corpus.ps1
.\knowledge-base\scripts\verify-corpus.ps1
```

Outputs are written to `dist/`.

## Retrieval policy

- `production_rag`: eligible for normal user-facing retrieval.
- `historical_rag`: eligible only when the response clearly labels the source as historical and does not treat medical, legal, psychological, or safety claims as current advice.
- `narrative_only`: stories and empathy prompts, never prescriptive guidance.
- `restricted_research`: excluded from ordinary user retrieval; available only to curated research workflows.
- `blocked_pending_ai_ingestion_license`: metadata only; no extraction or embedding.

Safety-critical questions involving abuse, coercion, self-harm, medical symptoms, child safeguarding, or current law must bypass historical-book retrieval and use an approved contemporary escalation path.

## Production deployment

1. Create a private Supabase Storage bucket named `kb-sources` with an EPUB allowlist and an appropriate file-size limit.
2. Run `supabase migration new knowledge_base`, copy the reviewed contents of `knowledge-base/schema.sql` into the generated migration, and apply it through the repository's normal migration workflow.
3. Upload only `dist/sources/public-domain/` to `kb-sources`.
4. Import `dist/manifest.json`, then `dist/corpus/chunks.jsonl`.
5. Deploy `supabase/functions/kb-embed` and generate free 384-dimensional `gte-small` embeddings.
6. Run database security and performance advisors.
7. Verify that `anon` and `authenticated` cannot read `kb_documents` or `kb_chunks` directly.

Never place the service-role key in browser code or a public repository.

The included `knowledge-base/scripts/import-corpus.mjs` performs private source upload, document upsert, chunk import, and optional embedding generation. It intentionally ignores sources whose policy blocks production ingestion.

