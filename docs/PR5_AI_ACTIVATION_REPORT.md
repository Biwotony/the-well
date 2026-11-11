# PR 5 AI Activation Report

Status date: 2026-11-11

Branch: `codex/pr5-ai-agents`

Base: `16a5fcef44e1f12c93f5db86dcc3907d18a6225d`

## Implemented

- Four distinct, allowlisted agent contracts with strict input and structured-output validation.
- Authenticated editor/admin manual invocation; scheduled invocation is rejected.
- Atomic per-agent and global cost reservation with idempotency and concurrent-run protection.
- Token, model-call, timeout, usage, actual-cost, and fail-closed price controls.
- Private Content Factory series-and-episode draft storage tied to its agent run.
- Resumable, claim-token-based knowledge embedding with bounded batches and retry tracking.
- Studio manual Content Factory control, disabled-state guidance, run status, cost, token, citation, validation, and generated-content indicators.
- Twenty-case evaluation corpus and executable contract validation.

No agent budget, global budget, model, schedule, paid call, automatic publishing path, or autonomous agent-to-agent call was enabled.

## Verification evidence

- `pnpm run typecheck`: passed.
- `pnpm run test:agents`: 5 contract tests passed; 20 evaluation cases validated without live-model scores.
- `pnpm run test:security`: 17 tests passed.
- `pnpm run check:runtime`: 28 protected files passed integrity verification.
- `pnpm run build`: passed; production client and Worker package created.
- `pnpm run test:sites`: 9 tests passed.
- `pnpm exec playwright test tests/the-well.spec.ts --grep "editorial studio requires"`: 1 relevant access-control browser test passed.
- `git diff --check`: passed.

The migration was applied to isolated free project `mnryzjmqhcyyqaojiueq`. Transactional tests proved first-run reservation, duplicate idempotency, concurrent-run rejection, private series-and-episode draft creation, completion reconciliation, and rollback cleanup. All four test budgets and the global switch were confirmed disabled afterward. The isolated `agent-runner` and `kb-embed` functions compiled and deployed as version 1. An unauthenticated agent request returned 401. The embedding worker could not complete its wrong-secret smoke test because the isolated project intentionally has no ingestion secret; it returned the expected server-configuration failure without processing data.

Supabase advisory review found only the intentional no-client-policy notices for private knowledge tables, a project-level leaked-password setting, and pre-existing index/policy performance suggestions. PR 5 adds the index required by its new global-budget foreign key.

## Production facts verified before implementation

- Production Supabase: `najwlozwzcvlbwkbrmxt`.
- Both `kb-embed` and `agent-runner` were already active despite the historical report stating zero deployments.
- All four agent budgets were disabled and there were zero agent runs.
- Knowledge inventory was 24 documents and 8,810 chunks; all 4,276 eligible production chunks were already embedded.
- The remaining 4,534 chunks belong to deliberately excluded historical or narrative tiers.
- Knowledge RPC access was denied to `anon` and `authenticated` and granted only to `service_role`.

## Activation gates

### Gate A — infrastructure

- [x] Knowledge data and rights metadata verified.
- [x] Eligible coverage complete at 4,276/4,276.
- [x] Secure function source, dormant configuration, and browser-secret boundary implemented.
- [ ] PR 5 migration and function versions deployed and smoke-tested in production.

### Gate B — agent safety

- [x] Role, input, output, budget, idempotency, concurrency, source, and publication controls implemented.
- [x] Twenty evaluation cases defined and structurally validated.
- [x] Human-only publication trigger preserved.
- [ ] Live model outputs scored; blocked pending model and spending approval.

### Gate C — Content Factory trial

- [ ] Provider route and model approved.
- [ ] Exact test budget approved.
- [ ] One isolated manual run completed and privately stored.
- [ ] Editorial, Scripture, source-rights, and safety review recorded.

### Gate D — broader activation

Deferred. Each agent needs its own evaluation and operating approval. Recurring execution is not authorized.

## Owner decision required

After the code and dormant production infrastructure are approved, authorize one provider route, one model, verified per-token prices, and a maximum charge for the single Content Factory test. Until then, keep every budget disabled.
