# PR 4 Launch Readiness

Date: 2026-11-10

## Current decision

THE WELL has an owner-private technical preview. It is not ready for an invited reader pilot or a public launch.

## Gate A — Engineering deployment ready

Status: **blocked**

Verified:

- latest `main` and merged PR 3 commit `77d2f27af12b5181839749253cb8bc8f3e0bcfc7`;
- clean PR 4 worktree and branch;
- repository runtime integrity, TypeScript, 17 security contracts and 35 browser tests;
- correct Sites Worker build architecture and owner-private hosting project;
- browser-safe environment variable boundary;
- noindex metadata and deny-all robots directive;
- deployment and rollback procedure documented.
- successful owner-private HTTPS deployment at the verified provider origin;
- unauthenticated HTTP 401 denial with `no-store` caching;
- internal route navigation, protected studio state and closed submission state;
- hosted screenshots at 390, 768, 1024 and 1440 pixels.

Blocker: the Sites access layer redirects direct deep-route browser navigation and reloads to `/`. Internal SPA navigation works, but the PR 4 deep-link requirement is not fully satisfied. Hosted Lighthouse was also not run through the owner-only login barrier; the exact production build was audited locally instead.

The owner-approved domain `ourhonestdays.com` has the required DNS records, but certificate validation was still pending at handoff. It is not yet the verified review URL.

Gate A permits internal technical review only.

## Gate B — Secure editorial operations ready

Status: **blocked**

Blockers:

- no approved isolated Supabase environment for real publication-write tests;
- pending publication-hardening migration is not deployed to production;
- the approved admin identity `tonycheruiyot30@gmail.com` is recorded, but its Auth user and database role are not yet provisioned;
- real Magic Link delivery, callback, session restoration and logout are untested;
- human approval and audit records have not been proven through real database writes;
- legacy shared-project table disposition is contained but not formally approved;
- privacy and safeguarding requirements lack an approved owner and policy.

## Gate C — Invited reader pilot ready

Status: **blocked**

Gate B has not passed. Production contains no original published THE WELL stories, external visitor access has not been tested, the reader feedback process and safeguarding owner are not approved, and the owner has not authorized invitations.

No AI budget, schedule or routine generation is enabled. Story submissions remain closed and the application honestly states that it does not collect story text.

## Public-content readiness

The application routes and local demonstration fixture verify the reading interaction without inserting production content. The production database contains no story series, episodes, journeys or challenges, so the live application must show the intentional empty/unavailable state. Five to ten original stories must be written, reviewed and human-published before Gate C.

## Repository instructions followed

The worktree contains and follows:

- `AGENTS.md`, including protected runtime boundaries, responsive visual direction, non-staccato landing copy and the required runtime/Sites checks;
- `.github/workflows/ci.yml`, which defines install, integrity, type, security, browser, build, Sites and Lighthouse checks.

No `CONTRIBUTING.md` or additional repository agent guide was found.

## Next approval sequence

1. Approve a disposable Supabase branch or project for the actor-matrix test.
2. Provision the approved administrator identity `tonycheruiyot30@gmail.com` after the isolated test passes.
3. Review the evidence and explicitly approve the production migration.
4. Approve privacy, safeguarding, feedback and the first 5–10 original stories.
5. Test named external access and explicitly authorize Gate C invitations.

