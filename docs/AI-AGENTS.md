# Four-Agent Runtime and Activation Guide

Last verified: 2026-11-11. Production project: `najwlozwzcvlbwkbrmxt`.

The four agents are human-supervised tools. They cannot publish, message readers, change roles, start another agent, approve spending, deploy software, or schedule themselves. Every production budget and the global circuit breaker remain disabled until the owner approves a model, its verified price, a daily cap, and a specific manual run.

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

Configured per-agent daily limits remain disabled:

| Agent | Daily limit | Input ceiling | Output ceiling | Calls/run |
| --- | ---: | ---: | ---: | ---: |
| Story Intelligence | $0.20 | 12,000 | 4,000 | 1 |
| Content Factory | $0.35 | 12,000 | 4,000 | 1 |
| Growth & Retention | $0.15 | 12,000 | 4,000 | 1 |
| Chief Operator | $0.20 | 12,000 | 4,000 | 1 |

The private global budget is also disabled with a `$0.00` daily limit. Missing prices, missing usage, usage above a ceiling, or cost above the reservation all fail closed. Disabling either the agent budget or global budget is the manual stop mechanism.

## Model options, not activated

Pricing and model metadata were checked against the Vercel AI Gateway model catalog on 2026-11-11:

- Primary candidate: `anthropic/claude-sonnet-5.5`, $2 per million input tokens and $10 per million output tokens. Gateway metadata reports 1M context, 128K output, structured output, provider no-training, and zero-data-retention support.
- Fallback candidate: `openai/gpt-5.6-terra`, $2 per million input tokens and $12 per million output tokens. Gateway metadata reports a 1.05M context and 128K output. Because zero-data retention is provider-dependent, activation must restrict routing to a compliant provider.

Neither model, provider route, key, price environment values, nor budget switch is activated by PR 5.

## Evaluation and activation

`evals/agent-cases.json` contains 20 cases covering editorial quality, faithfulness, safety, knowledge integrity, and operational security. `pnpm test:agents` validates contracts and the evaluation corpus without fabricating live-model scores. A human-scored model run is blocked until the owner approves the provider, model, cost, and one controlled test.

Activation order:

1. Merge and deploy the dormant runtime with every budget disabled.
2. Approve one model route, verified prices, and a maximum charge for one isolated Content Factory run.
3. Score all 20 cases, fix failures, and record the evidence.
4. Enable only Content Factory for the approved manual run, then disable it immediately after reconciliation.
5. Consider each remaining agent independently. Recurring schedules remain out of scope.
