# PR 4 Verification Report

Date: 2026-11-10

## Verified baseline

| Check | Result |
| --- | --- |
| `pnpm check:runtime` | Passed; 28 protected files match the integrity manifest |
| `pnpm typecheck` | Passed |
| `pnpm test:security` | Passed; 17 tests |
| `pnpm test:runtime` | Initial baseline passed; final two-worker rerun exposed one timing-sensitive keyboard-drag failure |
| `pnpm exec playwright test --workers=1` | Passed; all 35 Playwright tests in the final deterministic rerun |
| `pnpm build` | Passed; production Worker and client artifacts emitted |
| `pnpm test:sites` | Passed; 5 tests |
| Lighthouse 13.0.1 production preview | Desktop performance 100; mobile 87–90; accessibility and best practices 100 |
| Lighthouse 13.0.1 hosted custom domain | Desktop performance 95; mobile 91; accessibility 100 |

The final code-and-evidence release candidate at commit `45793d4a6fff1b9e8c8a238bf509ced9b204e35c` was deployed publicly as `appgdep_6af3383d27f88191b0d244a26d8d4fbb`. Both `https://the-well-secure-preview.tonycheruiyot30.chatgpt.site` and `https://ourhonestdays.com` serve the same reviewed version.

Twelve responsive screenshots were opened and inspected. A tablet-only story-grid gap was corrected in `src/prototype.css`, then the 768px capture was replaced and inspected again. A misleading stitched mobile submission capture was replaced with a normal viewport capture. See `PR4_VISUAL_REVIEW.md`.

## Hosted access and routing

| Check | Result |
| --- | --- |
| Unauthenticated custom-domain `/` | HTTP 200; THE WELL rendered without the ChatGPT login gate |
| Custom-domain DNS/TLS | A and TXT records resolved; routing and TLS active |
| Search safeguards | Homepage contains `noindex, nofollow, noarchive`; `/robots.txt` returns `Disallow: /` |
| Internal navigation | `/stories`, story reader, `/journeys`, journey detail, `/challenge`, `/share`, `/studio` reached expected application states |
| Studio | Protected sign-in state rendered; no editorial data exposed |
| Submission | Closed safeguard rendered; no story form or collection path exposed |
| Direct deep-route reload | Redirected to `/`; Gate A blocker |

The production database remains empty of public story, journey and challenge records, so the hosted application correctly displays empty or unavailable states instead of demonstration content.

## Environment audit

- GitHub `main` points to merged PR 3 commit `77d2f27af12b5181839749253cb8bc8f3e0bcfc7`.
- The original user checkout was dirty and was preserved without cleanup.
- PR 4 uses the managed worktree at `C:\Users\User\.codex\worktrees\pr4-secure-pilot\THE WELL`.
- Production Supabase was inspected read-only and remains unchanged.
- The Site deployment is live and public at the owner's explicit request; search indexing remains disabled.
- Production contains no Auth user matching `tonycheruiyot30@gmail.com`, so real editor authentication has not been claimed.

## Integrity statement

No protected mobile runtime file was modified. No integrity manifest was changed, bypassed or weakened. No AI agent, budget or schedule was activated. No production database migration, Auth setting, role, legacy table, knowledge-base row or story record was changed.

## Checks not completed

- Real publication actor-matrix writes: no approved isolated Supabase branch or project.
- Production migration: isolated evidence and explicit production approval are missing.
- Administrator Magic Link: the approved identity is not provisioned, and the Supabase dashboard provisioning screen did not finish loading.
- Rollback exercise: two versions exist, but switching the active deployment only for a drill would interrupt the current review URL.
- Invited-reader test: Gate C invitations have not been approved.

## Test-run note

The first final browser rerun accidentally reused a stale Vite preview already listening on port 4174, so fixture routes were unavailable and that run was discarded. After stopping the verified `vite preview` process, the normal two-worker suite passed 34 tests and missed one timing-sensitive keyboard drag. The unchanged suite then passed all 35 tests with `pnpm exec playwright test --workers=1`. No runtime file, timeout, assertion or integrity hash was changed to obtain the passing result.

