# PR 9 Final Verification and First Content Factory Trial Plan

Verification date: 2026-11-11

Production: `najwlozwzcvlbwkbrmxt`

Pull request: https://github.com/Biwotony/the-well/pull/9

## Executive result

The dormant runtime is deployed, fail-closed, and ready for review. No model was invoked, no draft was fabricated, no schedule exists, all four agent budgets remain disabled, the global budget remains disabled at `$0.00`, and production AI spend remains `$0.00`.

A retrieval-quality defect was found during representative semantic searches: a single six-result query was dominated by Scripture and omitted editorial source diversity. The runner now retrieves up to four approved editorial passages and two approved Scripture passages in separate bounded searches. For the trial topic, verification returned four passages from *The Wedding Ring* and two Scripture passages, all from `production_rag`. The historical-gender-role and archaic-language risk tags remain attached for human review.

## GitHub and CI

- PR 9 remains a draft and is not merged.
- The first CI attempt passed dependency audit, protected-runtime integrity, TypeScript, security contracts, and PostgreSQL policy behavior. It then failed while GitHub's runner could not resolve Ubuntu package mirrors during Playwright's optional OS-package installation.
- CI now downloads Chromium without rerunning `apt`; this preserves browser tests while removing the failing runner-network dependency.
- Local focused verification passed after the retrieval correction: TypeScript, 5 agent contract tests, 17 security tests, 24 evaluation-case validation, 28 protected runtime files, production build, and 9 Sites/Worker tests.

## Production function verification

| Function | Version | Status | Authentication |
| --- | ---: | --- | --- |
| `agent-runner` | 10 | Active | Platform JWT verification is off because the function validates the bearer token with `auth.getUser()` and then requires an `editor` or `admin` database role |
| `kb-embed` | 10 | Active | Requires a constant-time comparison against the server-only ingestion secret |

The deployed runner source matches the reviewed repository source. Safe production checks observed:

- Missing bearer token: 401 `authentication_required`.
- Invalid bearer token: 401 `invalid_session`.
- Invalid ingestion secret: 401 `unauthorized`.
- Unexpected HTTP method: 405 `method_not_allowed`.
- Disabled per-agent budget: reservation rejected.
- Temporarily enabled per-agent budget inside a rolled-back transaction while global budget stayed disabled: reservation rejected by the global circuit breaker.
- Scheduled reservation: rejected.
- No negative-test rows persisted.
- `anon` and `authenticated` cannot execute reservation or retrieval RPCs, and authenticated clients cannot insert agent runs.

Only one Auth user exists and it is the approved administrator, so a real member-token 403 request was not manufactured in production. The role branch is covered by deterministic source/contract tests; creating a production member solely for this test was rejected as unnecessary risk.

## Knowledge-base result

| Tier | Documents | Chunks | Embedded | Production-agent eligible |
| --- | ---: | ---: | ---: | --- |
| `production_rag` | 4 | 4,276 | 4,276 | Yes |
| `historical_rag` | 17 | 3,456 | 0 | No |
| `narrative_only` | 3 | 1,078 | 0 | No |
| Total | 24 | 8,810 | 4,276 | 4,276 |

All embeddings are 384-dimensional and compatible with `gte-small`. Remaining eligible chunks and failed eligible chunks are both zero. The repository catalog separately retains nine restricted-research records and one blocked licensed reference; none is imported into the production retrieval tables.

Seven representative semantic queries returned only `production_rag` material: marriage/communication, intimacy/consent, separation/divorce, grief/widowhood, spiritual growth, family conflict, and abuse/safeguarding. Similarity was strong, but the source set is public-domain and historically framed. It is useful for Scripture and editorial inspiration, not contemporary medical, legal, psychological, or safeguarding authority. The first trial must preserve explicit safety caveats and human source review.

## Four-agent status

- Story Intelligence: validated input/output contract, production-only retrieval, advisory output only, disabled.
- Content Factory: validated original private draft schema, diversified production-only retrieval, transactional draft series and episode storage, disabled.
- Growth & Retention: verified aggregate inputs only, recommendations only, no outreach, disabled.
- Chief Operator: verified system snapshot required, recommendations only, no administrative actions, disabled.

No contract permits publishing, role changes, schedules, destructive actions, agent-to-agent calls, or reader messaging. The evaluation suite now has 24 cases. Deterministic checks pass; live-model editorial scoring is intentionally not claimed.

## Model recommendation and trial cost

Model metadata and pricing were verified from `https://ai-gateway.vercel.sh/v1/models` on 2026-11-11.

### Primary

`anthropic/claude-sonnet-5.5`

- Input: $2 per million tokens.
- Output: $10 per million tokens.
- Gateway metadata: structured output, 1M context, 128K output, zero-data-retention on all routes, and no-training on all routes.
- Recommended because the trial prioritizes mature long-form voice, nuance, safety reasoning, and reliable structured output.

### Fallback

`openai/gpt-5.4`

- Input: $2.50 per million tokens.
- Output: $15 per million tokens.
- Gateway metadata: structured output, 1.05M context, 128K output, zero-data-retention on all routes, and no-training on all routes.
- Recommended as a later independently approved comparison, not as an automatic fallback on the first trial.

### First-trial envelope

- Model calls: exactly 1.
- Automatic retries: 0.
- Input ceiling: 6,000 tokens.
- Output ceiling: 3,000 tokens.
- Expected usage: about 3,000 input and 2,000 output tokens.
- Expected Sonnet cost: about `$0.026`.
- Maximum reserved Sonnet cost: `$0.042`.
- Recommended Content Factory and global ceiling: `$0.05`.
- Retrieval embedding cost: `$0.00` using Supabase `gte-small`.

The trial carries only the approved editor brief and public-domain production knowledge. It must not include private submissions or personal reader data.

## Exact approval required

Before any live request, the owner must approve:

> One production Content Factory trial using `anthropic/claude-sonnet-5.5`, with at most 6,000 input tokens, 3,000 output tokens, one model call, no retry, and a maximum total charge of $0.05. Enable only Content Factory and the global budget for this request, then disable both immediately after recording usage and cost.

After approval, the operator must confirm the Gateway credential and exact price settings, authenticate the approved administrator, invoke the supplied trial topic once, verify private draft visibility and citations, record tokens and cost, restore both budget switches to disabled, and confirm the draft remains unpublished.
