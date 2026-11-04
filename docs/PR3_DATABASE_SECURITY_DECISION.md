# PR 3 Database Security Decision

## Decision summary

Do not alter the twelve legacy tables during PR 3. Keep their client grants revoked, identify their owner and consumers, then choose either migration to a non-exposed schema or separation into another Supabase project before they contain data. This preserves the unrelated workload while preventing an unreviewed production change.

## Production evidence

Audited project: `najwlozwzcvlbwkbrmxt`, `eu-west-1`, PostgreSQL 17, status `ACTIVE_HEALTHY`, on 2026-11-04.

- All fourteen THE WELL product tables have RLS enabled.
- `kb_documents` and `kb_chunks` have RLS enabled with no client policy, and only `service_role` has table access.
- No views exist in `public` or `app_private`.
- Security-definer helpers use an empty `search_path`; only `app_private.has_role` is executable by `authenticated`.
- Production has zero Auth users, zero role assignments, zero public content rows, zero submission rows, and zero agent runs.
- All four agent budgets are disabled. Their configured daily ceilings total USD 0.90 but cannot be spent while disabled.
- The knowledge base contains 24 documents and 8,810 chunks. Client roles have no table or RPC access.
- Supabase security advisors report two informational findings for the intentionally policy-free KB tables. Performance findings are recorded but are not launch-security mutations.

## Legacy workload finding

The following public-schema tables have RLS disabled and were empty at audit time:

`sources`, `source_items`, `source_snapshots`, `listings`, `users`, `saved_searches`, `alerts_sent`, `submissions`, `events`, `listing_source_items`, `magic_link_tokens`, and `user_sessions`.

`anon` and `authenticated` have no privileges on these tables. `service_role` retains full privileges. This prevents ordinary Data API clients from reading or writing them today, but public-schema placement creates future risk if grants are broadened, defaults change, a service credential is misused, or a new endpoint assumes every public object is a THE WELL object.

## Isolation options

| Option | Security | Cost and disruption | Decision |
| --- | --- | --- | --- |
| Enable RLS and add deny-by-default policies in place | Good immediate defense | Low technical cost, but policy intent is unknown | Viable after legacy owner review |
| Move the tables to a private or `legacy_private` schema | Strong Data API isolation | Requires updating every legacy query and job | Recommended short-term target |
| Move the workload to a separate Supabase project | Strongest operational isolation | Higher operating overhead and may exceed the free-first constraint | Preferred if the legacy product remains active |
| Export and remove the tables | Removes the risk | Irreversible without a validated restore and ownership decision | Not authorized in PR 3 |

## Publication-gate decision

Production already protects updates from `in_review` to `published` with a human editor role check and an audit trigger. PR 3 adds a reviewed migration that also protects inserts, makes approval metadata database-owned, rejects invalid transitions, and blocks edits to a published row until it is archived and reviewed again. The migration is not applied to production in this PR because production schema changes require explicit approval.

## Required follow-up

1. Name the owner of the legacy workload and inventory every consumer.
2. Approve an isolation option and a rollback plan.
3. Test the publication hardening migration in an isolated database.
4. Re-run Supabase security and performance advisors after any approved migration.

