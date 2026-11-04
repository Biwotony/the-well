# Security, Privacy, and Publication Controls

Last verified against Supabase project `najwlozwzcvlbwkbrmxt` on 2026-11-04.

## System boundary

THE WELL product tables are `profiles`, `user_roles`, `story_series`, `story_episodes`, `challenges`, `journeys`, `journey_steps`, `journey_enrollments`, `challenge_completions`, `story_submissions`, `moderation_events`, `agent_runs`, `agent_budgets`, and `editorial_audit`. They have RLS enabled in production.

`kb_documents` and `kb_chunks` also have RLS enabled, intentionally have no client policies, and grant data access only to `service_role`. Their RPCs are restricted to `service_role` and use an empty function search path.

The `app_private` schema contains protected role and trigger helpers. It is not intended for Data API exposure. There are no public or private views in the audited production database.

Twelve pre-existing public-schema tables belong to a separate legacy workload: `sources`, `source_items`, `source_snapshots`, `listings`, `users`, `saved_searches`, `alerts_sent`, `submissions`, `events`, `listing_source_items`, `magic_link_tokens`, and `user_sessions`. They currently have RLS disabled. Production grants no privileges on them to `anon` or `authenticated`, and every table was empty during the audit, but their public-schema location remains an unresolved isolation risk. See `PR3_DATABASE_SECURITY_DECISION.md`.

## Non-negotiable controls

- Browser code uses only the Supabase publishable key.
- Authorization roles live in `public.user_roles`, never in user-editable metadata.
- Editor access requires a valid Supabase user plus an `editor` or `admin` database role.
- Passwordless sign-in uses `shouldCreateUser: false`; account creation and privileged role assignment are separate approved operations.
- Public queries request only published rows and rely on RLS as the authoritative boundary.
- AI output stays private draft data, and all four production agent budgets remain disabled.
- Publication requires an authenticated human editor, a permitted state transition, database-owned approval metadata, and an audit record.
- Sensitive story submission remains disabled until retention, deletion, consent, safeguarding, and staffing gates are approved.

## Publication threat model

The production update trigger currently requires an `in_review` source row, an authenticated editor or admin, matching approval identity, and a non-null approval timestamp. PR 3 adds `20261104190000_harden_publication_gate.sql`, which also blocks direct published inserts, invalid transitions, forged approval metadata, and unreviewed edits to already-published rows. That migration is committed for review but is not applied to production without explicit change approval.

Members and moderators cannot publish because the content policies require the editor/admin role helper. Scheduled and service requests have no human `auth.uid()` and cannot satisfy the human publication transition. The Content Factory implementation inserts only `draft` rows with `origin: agent`.

## Authentication and authorization

The browser restores the local session, validates it with `auth.getUser()`, then reads the caller's own row from `user_roles`. Missing sessions, expired links, invalid links, member/moderator roles, role-query failures, loading, and sign-out have explicit UI states. The production project had zero Auth users and zero role rows at audit time, so end-to-end email delivery and an editor session remain unverified.

## Launch checklist

1. Approve and apply the publication hardening migration in an isolated environment before production.
2. Bootstrap one named admin/editor only after the owner approves the exact email.
3. Configure the final production Site URL and allowlisted redirect URL during PR 4.
4. Execute the publication actor matrix and audit-log smoke test in a non-production environment.
5. Resolve or formally accept the legacy public-schema isolation risk.

## Incident response minimum

Rotate an affected secret, disable the relevant agent budget, pause schedules, revoke sessions when needed, preserve audit evidence, assess the exposed data, and record the corrective action. Never delete editorial audit rows during incident cleanup.
