# PR 4 Verification Report

Date: 2026-11-10

## Verified baseline

| Check | Result |
| --- | --- |
| `pnpm check:runtime` | Passed; 28 protected files match the integrity manifest |
| `pnpm typecheck` | Passed |
| `pnpm test:security` | Passed; 17 tests |
| `pnpm test:runtime` | Passed; 35 Playwright tests |
| Lighthouse 13.0.1 production preview | Desktop performance 100; mobile 87–90; accessibility and best practices 100 |

Production build, Sites packaging, screenshots and local production Lighthouse evidence are recorded. Deployed route and access evidence are added after the exact release candidate is published.

The local production build passed, and six responsive screenshots were opened and inspected. A tablet-only story-grid gap was corrected in `src/prototype.css`, then the 768px capture was replaced and inspected again. See `PR4_VISUAL_REVIEW.md`.

## Environment audit

- GitHub `main` points to merged PR 3 commit `77d2f27af12b5181839749253cb8bc8f3e0bcfc7`.
- The original user checkout was dirty and was preserved without cleanup.
- PR 4 uses the managed worktree at `C:\Users\User\.codex\worktrees\pr4-secure-pilot\THE WELL`.
- Production Supabase was inspected read-only and remains unchanged.
- The Site project exists but a generated origin is not reported as live until deployment verification succeeds.

## Integrity statement

No protected mobile runtime file was modified. No integrity manifest was changed, bypassed or weakened. No AI agent, budget or schedule was activated. No production database migration, Auth setting, role, legacy table, knowledge-base row or story record was changed.

