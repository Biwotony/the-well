# PR 4 Database Release Decision

Date: 2026-11-10

## Decision

Do not apply `20261104190000_harden_publication_gate.sql` to production yet. Production project `najwlozwzcvlbwkbrmxt` remains unchanged because the migration has not passed real write tests in an isolated Supabase environment and the owner has not approved production application.

This is a release blocker for Gate B and Gate C, not a blocker for an owner-private Gate A deployment.

## Verified production state

- Project health: active and healthy in `eu-west-1`, PostgreSQL 17.6.
- Latest applied migration: `20261103203502_restrict_kb_embedding_queue`.
- Pending migration: `20261104190000_harden_publication_gate.sql`.
- Auth users: 0.
- Editorial roles: 0.
- Story series, episodes, journeys, challenges and editorial audit rows: 0.
- Agent budgets: four rows, all disabled.
- Knowledge base: 24 documents and 8,810 chunks; no rebuild or mutation was performed.
- Security advisor: informational notices for intentionally service-only knowledge-base tables.
- Production publication gate: the earlier update-only trigger is still deployed.

## Pending migration review

Static inspection and repository security contracts verify that the pending migration:

- requires inserted editorial records to begin as unapproved drafts;
- rejects invalid lifecycle transitions and direct published inserts;
- prevents callers from supplying approval identity or timestamps;
- derives approval identity from the authenticated editor or administrator;
- requires review before publication and before changing published content;
- protects both story-series and episode lifecycles;
- keeps the audit trigger and revokes direct access to the private gate function.

Static verification does not prove database behavior. The required actor matrix remains blocked until an isolated writable environment exists.

## Isolated test requirement

The local machine has neither Docker nor a Supabase CLI installation, and the production organization has no development branch. Creating a hosted Supabase branch may incur cost, so no branch was created without approval.

Before production application:

1. Create an approved disposable Supabase project or branch.
2. Apply migrations in repository order.
3. Run anonymous, member, moderator, editor, administrator, expired-session and service/agent write tests.
4. Verify draft privacy, server-derived approval metadata, audit rows, parent/episode consistency and anonymous published reads.
5. Present the evidence, exact production project, migration SQL and rollback plan for explicit approval.

## Production procedure after approval

1. Confirm the target is `najwlozwzcvlbwkbrmxt` and record the current migration list and trigger definitions.
2. Take the provider-supported backup or recovery-point action available on the approved tier.
3. Apply only `20261104190000_harden_publication_gate.sql`.
4. Re-read the installed functions, triggers, grants and policies.
5. Run non-destructive authorization checks, then publish one owner-approved original test record through the real editor workflow.

Rollback must be designed after isolated testing because the migration replaces trigger behavior and revokes function grants. A failed production release should stop editorial writes first, preserve evidence and audit rows, and restore from the verified pre-release state or an explicitly reviewed compensating migration. Never improvise a destructive rollback.

## Shared-project legacy tables

Twelve unrelated legacy tables currently have RLS disabled. Direct grant inspection found only `service_role` grants and no `anon` or `authenticated` grants, so no immediate anonymous table access was identified. This containment is not a permanent security disposition.

The recommended disposition is:

- preserve the tables and their existing application behavior during PR 4;
- keep anonymous and authenticated grants revoked;
- identify the owner and dependencies of the legacy application;
- decide separately whether to enable RLS, move the application to another schema/project, or retire the tables;
- re-run grant and API-exposure checks before Gate B.

No legacy table, grant, policy, embedding, row or function was changed.

## Approval state

- Isolated migration test: blocked by missing approved environment.
- Production migration approval: not requested yet because isolated evidence is incomplete.
- Production migration applied: no.
- Legacy-table disposition approved: no.
- Gate B database criteria: blocked.

