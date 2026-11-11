# Production Knowledge-Base Verification

Last verified: 2026-11-11 against Supabase project `najwlozwzcvlbwkbrmxt`.

## Verified inventory

| Classification | Documents | Chunks | Embedded | Remaining eligible |
| --- | ---: | ---: | ---: | ---: |
| `production_rag` | 4 | 4,276 | 4,276 | 0 |
| `historical_rag` | 17 | 3,456 | 0 | 0 |
| `narrative_only` | 3 | 1,078 | 0 | 0 |
| **Imported total** | **24** | **8,810** | **4,276** | **0** |

The 4,534 unembedded chunks are intentionally excluded from production retrieval; they are not a failed backlog. All 4,276 stored embeddings are finite 384-dimensional vectors compatible with Supabase `gte-small`. No regeneration or paid bulk embedding is required. Actual PR 5 embedding spend is `$0.00`.

The source catalog contains 34 records: 4 `production_rag`, 17 `historical_rag`, 3 `narrative_only`, 9 `restricted_research`, and 1 `blocked_pending_ai_ingestion_license`. The ten restricted or blocked records are not imported into the production knowledge tables.

## Rights and retrieval boundary

- Only public-domain, production-eligible sources can be claimed for embeddings.
- Story Intelligence and Content Factory can retrieve only `production_rag` through the server-only `match_kb_chunks` function.
- Historical and narrative material remains available for controlled human research but cannot be retrieved by production agents.
- Restricted and blocked copyrighted material is not copied into chunks, embeddings, prompts, or generated content.
- Browser roles have no table access or execute permission on knowledge RPCs; only `service_role` can claim, complete, fail, or match chunks.

## Resumable embedding worker

The worker claims at most five rows per call using `FOR UPDATE SKIP LOCKED`, assigns a claim token, and processes only eligible production sources. Completion and failure updates require that token, so a stale worker cannot overwrite a newer claim. Each row records its attempt count, model, dimensions, completion time, and last safe error code; three failed attempts stop automatic reclaims.

Vectors are rejected unless they contain exactly 384 finite values. Logs contain batch counts and error codes, not source passages. Invocation requires `INTERNAL_INGESTION_SECRET`; browser credentials cannot call the worker.

## Verification result

- Eligible coverage: 4,276 of 4,276 chunks, 100%.
- Remaining eligible work: 0 chunks.
- Intentionally excluded: 4,534 chunks.
- Failed eligible chunks: 0 observed.
- Browser source access: denied by RLS, grants, and service-only RPC permissions.
- Retrieval policy: bounded to `production_rag`; citations retain source ID, title, author, section, and similarity without exposing full private passages to Studio users.

The next knowledge-base operation should be a small retrieval relevance review during the approved 20-case evaluation, not a bulk embedding job.
