# THE WELL Architecture

## System boundary

The browser is an untrusted client. It receives only the Supabase project URL and publishable key. Supabase Auth establishes sessions; Postgres RLS performs authorization; Edge Functions own privileged integrations. No service-role or AI provider secret reaches the browser.

## Runtime flow

1. Anonymous visitors read only rows whose status is `published` and whose `published_at` is due.
2. Members authenticate through Supabase email Magic Link and can own journey progress, challenge completions, and story submissions.
3. Moderators can review submissions. Editors can create and review public content. Admins can change agent budgets and roles.
4. A transition to `published` must begin from `in_review`, must be performed by an authenticated editor/admin, and must set `approved_by` to that same user.
5. A database trigger writes the publication transition to `editorial_audit`.
6. Agents use a server-only Edge Function. They can create drafts/recommendations and agent-run records; their code never emits a published status.

## Product modules

### Discovery and episodic stories

`story_series` contains the public identity, safety metadata, image, and publication state. `story_episodes` contains ordered long-form episodes. Public policies require both the episode and parent series to be published.

The browser accesses these records through `src/lib/public-content.ts`. Every query uses an explicit field list, an explicit `published` filter, a due `published_at` filter, deterministic ordering, and a hard result limit. RLS remains the authorization boundary; the duplicated client filters make intent visible and avoid requesting draft rows. Stable paths use series slugs and episode numbers without adding a second routing dependency.

Production never falls back to fixtures. Local demonstration data is selected only when the hostname is `localhost` or `127.0.0.1` and `?content=demo` is present, and the rendered interface labels it as non-production content.

### Daily practices, levels, and journeys

`challenges` contains editor-approved practices and rewards. `journeys` and `journey_steps` provide ordered programs. `journey_enrollments` and `challenge_completions` are owner-scoped by RLS. `profiles.level` and `profiles.points` are presentational projections; production should update them through a reviewed database function after completion rules stabilize.

The anonymous PR 2 experience reads only published challenge and journey definitions. Reflection choices and completion state remain in React memory for the current browser session; no anonymous writes are attempted. Points and levels stay quiet, informational, and non-competitive.

### Moderated submissions

`story_submissions` requires authentication and private-review consent. It intentionally separates private editorial review from publication consent. `moderation_events` records each status change and private note. Publication requires a new editor-owned story record and explicit contributor consent.

### Editorial studio

The studio reads draft and review records through editor-only RLS. The approval UI is a convenience; enforcement lives in `app_private.enforce_publish_gate`, not in React.

### Agent operations

`agent_runs` stores inputs, outputs, model, status, and cost. `agent_budgets` is disabled by default. The Edge Function accepts either an editor session or a scheduled secret, checks the daily budget, calls the configured gateway model, stores the result, and creates only `draft` content.

## Data lifecycle

- Public content: `draft → in_review → published → archived`.
- AI content: `agent run → private output → draft → human review → human publication`.
- Submission: `submitted → screening → needs_consent/accepted/declined/withdrawn`.
- Audit records are append-only to application roles.

## Scale posture

The MVP favors one Supabase project and one React app. This minimizes cost and operational surface. Add queues, a separate search service, or an analytics warehouse only when measured load requires them. Postgres indexes cover public listing, episode ordering, moderation queue, and agent queue paths.
