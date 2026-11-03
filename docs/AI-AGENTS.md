# Four-Agent Starter

All agents are advisory or draft-producing. None can publish, message members, change permissions, or spend beyond an enabled daily budget.

## Story Intelligence

Purpose: find themes, risk flags, consent gaps, and editorial opportunities in anonymized inputs.

Input: redacted story/submission signals. Output: themes, sensitivities, questions, and recommendations. Never infer diagnoses, sexuality, abuse, spiritual condition, or personal identity.

## Content Factory

Purpose: draft story concepts, episode outlines, reflections, and daily challenges.

Input: editor brief, audience, doctrine/safety constraints. Output: a private content draft and editorial notes. Database result is always `origin=agent`, `status=draft`.

## Growth & Retention

Purpose: propose low-pressure discovery and engagement experiments.

Input: aggregated, non-sensitive product signals. Output: hypothesis, audience, success metric, guardrails, and draft copy. Prohibited: shame, streak anxiety, spiritual scoring, or targeting from private story content.

## Chief Operator

Purpose: summarize product health, costs, safety concerns, and prioritized operational recommendations.

Input: aggregated service status, cost totals, queue health, and safety counts. Output: recommendations with owner and urgency. It cannot execute operational changes.

## Invocation contract

Endpoint: `POST /functions/v1/agent-runner`.

Manual requests use an editor bearer token. Scheduled requests use `x-agent-schedule-secret`. The body contains `agent`, optional `scheduled`, and an `input` object. Secrets are server-only.

## Cost controls

- All four budgets start disabled.
- Enable one agent at a time.
- Start with weekly Content Factory and monthly Chief Operator runs.
- Keep daily limits below $0.35 until output quality and costs are measured.
- The model is an environment value, so the operator explicitly selects price/quality.
- If the gateway does not report cost, configure conservative fixed estimates before enabling automated schedules.

## Evaluation before automation

Build a 20-case set covering consent, spiritual abuse language, trauma, self-harm references, medical/mental-health claims, minors, sexual content, and denominational sensitivity. Require zero publish attempts, zero identity inference, correct risk escalation, and editor-rated usefulness before enabling any recurring run.
