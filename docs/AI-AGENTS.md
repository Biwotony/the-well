# Four-Agent Runtime and Activation Guide

Last verified: 2026-11-18. Production project: `najwlozwzcvlbwkbrmxt`.

The four agents are human-supervised tools. They cannot publish, message readers, change roles, start another agent, approve spending, deploy software, or schedule themselves. The approved production budgets operate behind a combined `$0.60` daily ceiling, while every run remains manual and automatic publication remains disabled.

## Agent contracts

| Agent | Permitted input | Structured output | Knowledge retrieval | Production effect |
| --- | --- | --- | --- | --- |
| Story Intelligence | Approved editorial questions and published-library context | Themes, gaps, duplicate risks, Scripture/source suggestions, limitations | `production_rag` only | Stores a private run report |
| Content Factory | An editor brief, audience, constraints, and safety requirements | Original story draft, episode, reflections, Scripture rationale, citations, safety and editorial notes | `production_rag` only | Creates one private `origin=agent`, `status=draft` series and episode |
| Growth & Retention | Verified aggregate facts supplied by an editor | Hypotheses, experiments, metrics, guardrails, draft copy, limitations | None | Stores recommendations only |
| Chief Operator | Verified operational facts supplied by an editor | Health summary, cost and security findings, prioritized actions, owners, limitations | None | Stores recommendations only |

Inputs are allowlisted per agent. Attempts to supply model, messages, system prompts, permissions, publishing instructions, or schedules are rejected. Source excerpts are explicitly marked as untrusted reference material. Outputs must satisfy strict JSON schemas before storage.

## Request path

`POST /functions/v1/agent-runner` requires a valid Supabase bearer token belonging to an `editor` or `admin`. The request must include an `Idempotency-Key`, an agent name, and the agent's validated input object. Scheduled requests are rejected.

The runtime then:

1. Verifies identity and database-backed role before reading provider configuration.
2. Confirms both the agent and global budget switches are enabled.
3. Atomically reserves the maximum run cost under advisory locks, enforcing one active run per agent.
4. Retrieves approved knowledge where permitted and makes one bounded Gateway call with a 60-second timeout.
5. Validates JSON, reconciles actual tokens and cost, and stores the private result. Content Factory draft storage is transactional.

Duplicate idempotency keys with the same request fingerprint return the existing run. Reusing a key for different input is rejected. There are no automatic model retries; `max_model_calls` defaults to one.

## Spending controls

Configured per-agent daily limits are active behind a combined `$0.60` application-level ceiling:

| Agent | Daily limit | Input ceiling | Output ceiling | Calls/run |
| --- | ---: | ---: | ---: | ---: |
| Story Intelligence | $0.20 | 12,000 | 4,000 | 1 |
| Content Factory | $0.05 | 6,000 | 3,000 | 1 |
| Growth & Retention | $0.15 | 12,000 | 4,000 | 1 |
| Chief Operator | $0.20 | 12,000 | 4,000 | 1 |

The private global budget is enabled with a `$0.60` daily limit. Missing prices, missing usage, usage above a ceiling, or cost above the reservation all fail closed. Scheduled execution and automatic publication remain disabled; disabling either the agent budget or global budget is the manual stop mechanism.

## Production model

Pricing and model metadata were checked against the live Vercel AI Gateway catalog on 2026-11-18:

- Production model: `openai/gpt-4.1-nano`, served through the Azure route. Live Gateway metadata reports strict structured output, zero-data retention, provider no-training, $0.10 per million input tokens, and $0.40 per million output tokens. It is covered by the active Vercel Gateway credit and succeeded in the bounded production trial. Recheck the live catalog before changing this time-sensitive selection.
- Paid-tier fallback candidate: `openai/gpt-5.4`, $2.50 per million input tokens and $15 per million output tokens. Gateway metadata reports a 1.05M context, 128K output, structured output, zero-data-retention on all routes, and no-training on all routes.

The production Gateway credential remains stored only as a Supabase Edge Function secret. Model and price environment values are configured in Supabase; no credential is committed to the repository.

## Evaluation and activation

`evals/agent-cases.json` contains 24 cases covering editorial quality, faithfulness, safety, knowledge integrity, and operational security. `pnpm test:agents` validates contracts and the evaluation corpus without fabricating live-model scores. A human-scored evaluation remains separate from the verified production smoke test.

Activation history:

1. The dormant runtime was merged and deployed with every budget disabled.
2. The owner approved a Gateway model, verified prices, and isolated Content Factory trials.
3. All four manual agents were approved behind the combined `$0.60` daily ceiling.
4. The free-credit-eligible `openai/gpt-4.1-nano` route replaced the rejected Claude route on 2026-11-18; the verified Content Factory run cost `$0.000520` and stored only private drafts.
5. Recurring schedules and automatic publication remain out of scope.
