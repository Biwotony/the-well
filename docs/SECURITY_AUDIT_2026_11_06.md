# THE WELL — Security audit and release gate
**Review date:** 2026-11-06
**Repository:** Biwotony/the-well
**Reviewed branch:** security/harden-launch-controls (PR #5)

## Verdict
**The application is not yet security-cleared for an unrestricted launch.**
This PR is a partial hardening change. Merging code alone does **not** apply
pending SQL migrations to the hosted database, enable hosted MFA, or change
Supabase Auth signup/redirect settings.

## Evidence and limitations
- Reviewed source: SQL migrations, RLS policy definitions, seed, auth/editorial
  client, Edge Function runner and ingestion worker, hosting headers, worker,
  GitHub Actions security tests, and application dependency configuration.
- CI runs `pnpm install --frozen-lockfile`, typecheck, 17 security contract
  checks, fresh PostgreSQL 17 behavioral tests, Playwright tests, build,
  Sites worker tests, Lighthouse, and `pnpm audit --prod --audit-level high`.
- The PostgreSQL checks use a deliberately minimal test Auth stub. They exercise
  real PostgreSQL policies, grants and triggers, but do not prove hosted Auth,
  GoTrue, PostgREST, or Edge runtime behavior.
- Read-only hosted database review: RLS and grants, migration history,
  function EXECUTE privileges, agent budgets, and Auth user count.
- **Not tested:** hosted signup switches, hosted TOTP provider settings, redirect
  allow-list, actual live frontend response headers, live Edge Function calls,
  GitHub branch protections, secret scanning configuration, and rate-limit
  behavior under load. No production writes were performed.

## Findings by risk
| ID | Severity | Finding / status | Required next action |
|---|---|---|---|
| S-01 | High | Hosted `story_submissions` still grants `authenticated` INSERT and a member can forge an initial `accepted` status; PR adds a fail-closed migration. | Apply **after staging replay**, confirm insert blocked through PostgREST; keep channel closed until safeguarding requirements are met. |
| S-02 | Medium | Hosted publication trigger can be bypassed by direct `published` inserts; PR hardens inserts and transitions. | Apply publication migration in staging and production with an operator-reviewed change plan. |
| S-03 | Medium | Pending hardening migration broke archive → draft → review → republish; published journey steps lacked mutation gates. Fixed in PR and verified with real PostgreSQL. | Test with authenticated Supabase users before production. |
| S-04 | Medium | Browser security headers absent from both hosting paths. PR adds anti-framing, referrer, MIME, minimal CSP, and permissions headers to Vercel and Sites worker. | Validate delivered headers and script compatibility on both staging hosts. Extend CSP beyond minimal directives after observing traffic. |
| S-05 | Medium | MFA is off in committed local config; hosted enforcement is unknown. PR enables TOTP locally, **but does not enforce AAL2 on privileged actions**. | Enroll trusted editors/admins, build TOTP challenge UI, enforce `aal2` in sensitive RLS policies and Edge endpoints, then verify hosted Auth settings. |
| S-06 | Medium | AI runner checks budget before insert, so concurrency can overspend; missing `usage.cost` becomes zero; input size has no hard bound. | Add atomic budget reservations, conservative provider cost ceiling, and input/output limits before enabling any agent. Hosted budgets currently all disabled. |
| S-07 | Informational | Prior audit stated repository public; GitHub integration reports **private** as of this review. | Reconfirm repository visibility after any ownership/permission change. |
| S-08 | Low | Vite `8.1.3` development-server advisories remain. Production audit reports no known vulnerable dependencies; PR enables the audit command in CI. | Upgrade Vite and regenerate `pnpm-lock.yaml` in a dedicated change, run full audit including dev dependencies (especially Windows dev workstations). |
| S-09 | Low | Agent scheduling secret uses `===` rather than constant-time comparison. The endpoint is public with app-layer authentication. | Use a constant-time comparison, verify both JWT and scheduling-secret paths. |
| S-10 | Low | Members can create challenge completions with self-assigned points and unpublished challenges. | Make reward calculation server-owned and require published challenges before points acquire any value. |
| S-11 | Low | Editorial audit logs status transitions, but not content edits; an editor can publish their own content. | Add immutable content revision/audit events; decide on a two-person approval rule. |
| S-12 | Medium (latent) | Twelve legacy `public` tables have RLS disabled, but client roles currently have no table privileges. No direct client exposure was confirmed. | Move legacy tables to a private schema or enable RLS and narrowly scoped grants. Add regression checks for grant drift. |
| S-13 | Medium | `shouldCreateUser: false` is client-side only. Hosted `Allow new users to sign up` remains unverified; repo local config now disables signup. | Verify hosted Auth settings and exact redirect allow-list in Supabase Dashboard before opening editor login. |

## What passed
- Hosted source review confirmed RLS on THE WELL product tables and private knowledge-base tables.
- The audited `app_private` security-definer functions are not callable by anonymous users; the designated role helper is callable by authenticated users.
- Hosted agent budgets were all disabled at review time.
- Hosted Auth user count was 0 at review time, so a real editorial login and MFA session could not be exercised.
- PR behavior tests covered rejected submissions, rejected published inserts, editor publication/audit, archive-to-draft approval reset, republishing, published journey-step immutability, and member visibility.
- Existing static contract checks passed and production dependency audit returned no known vulnerabilities.

## Required release sequence
1. Merge reviewed application code only after the whole PR CI succeeds and security reviewers approve it.
2. Validate the SQL migrations with a staging Supabase project using actual Auth tokens (both anon/member/editor).
3. Plan and apply `20261104190000_harden_publication_gate.sql` followed by `20261106130000_close_story_submissions.sql` to hosted production only with explicit operator approval.
4. Verify submissions are denied, content cannot bypass review, and hosted policy advisors show no regressions.
5. Disable public signups in the hosted Auth dashboard and configure approved redirect URLs.
6. Implement and enforce MFA for privileged users, and harden the AI budget before enabling scheduled agents.
7. Validate live headers, permissions, and end-to-end behavior on the deployed site.
8. Set GitHub branch protection, required CI, secret scanning and dependency alerts where available.

**Release classification:** security hardening work, **not** certification of production readiness.
