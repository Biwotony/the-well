# Our Honest Days — Production Activation Report

Date: 2026-11-10  
Branch: `codex/production-activation`  
Base commit: `80586811aded2bdd2fbd82f88d1c1aa3c4ca113b`  
Production domain: `https://ourhonestdays.com`  
Supabase project: `najwlozwzcvlbwkbrmxt`

## Repository instructions

- Found and followed `AGENTS.md`.
- No `CONTRIBUTING.md` or equivalent repository contribution guide was present.
- The protected mobile runtime remains available as an opt-in development preview. The legitimate Sites packaging change was recorded in `mobile-runtime.lock.json`; the integrity check still protects 28 files.

## Production audit and changes

- Updated public branding, metadata, favicon, manifest, sitemap, canonical URL, route-aware titles, and user-facing authentication copy to **OUR HONEST DAYS**.
- Replaced public demo/prototype messaging with accurate production empty states. Story submissions remain deliberately closed because consent, safeguarding, retention, deletion, abuse, and response procedures are not yet approved.
- Expanded the authenticated Studio into a real database-backed editorial workspace for story series, episodes, journeys, journey steps, practices, and challenges.
- Added create/edit/preview/history controls and preserved the guarded lifecycle: `draft -> in_review -> approved -> published`. Browser code writes only requested status changes; server triggers own approval actor and timestamps.
- Added explicit confirmation before publication, unpublishing, archiving, or returning approved work to draft.
- Fixed Sites routing and response-header coverage with defense in depth: `run_worker_first: true`, a static `_headers` policy for compatible hosts, and a private `app-shell.html` fallback. The final Sites artifact intentionally omits `index.html` so the platform cannot serve the root ahead of the Worker; the Worker fetches the canonical `/app-shell` asset internally and applies the same security headers to root and deep routes. Local production builds retain `dist/client/index.html` for preview and verification. Missing API/write requests are not rewritten.
- Kept all four AI agents disabled with zero enabled budgets and no automated publishing path.

## Supabase activation

Production inspection found two approved migrations absent from the remote migration history:

1. `20261104190000_harden_publication_gate.sql`
2. `20261106130000_close_story_submissions.sql`

Supabase Branching required a paid plan, so no upgrade was purchased. A separate free project, `mnryzjmqhcyyqaojiueq`, was created as the isolated writable migration environment. All six repository migrations were applied there in order before production deployment.

The isolated authorization fixtures proved:

- anonymous readers see only published records;
- members cannot create or transition editorial records;
- forged published inserts are rejected;
- admin `draft -> in_review -> approved -> published` succeeds;
- approval actor metadata is stamped by the database;
- publication audit events are retained;
- episode, challenge, journey, and journey-step publication gates work;
- journey-step mutation is blocked after review;
- story-submission insertion remains closed;
- enabled AI-agent budgets remain zero.

Both pending, non-destructive migrations were then applied to production. Production verification confirmed the publication insert/update guards, closed submissions, zero enabled agents, and the expected remote migration records.

The twelve legacy public-schema tables remain isolated from `anon` and `authenticated` through direct grants, but their RLS-disabled disposition belongs to the legacy application and was not changed without its dependency map. This is a documented shared-project residual risk, not a bypass in Our Honest Days.

## Administrator

- Approved email: `tonycheruiyot30@gmail.com`
- Supabase Auth user: present and email-confirmed.
- Database authorization: `admin`, granted through the auditable `public.user_roles` system.
- Production Auth Site URL: `https://ourhonestdays.com`.
- The original invitation was issued before the Site URL correction and should not be reused. A fresh Magic Link from the deployed Studio is required for the final hosted session, refresh, logout, and invalid/expired-link acceptance checks.
- Public signup remains disabled; Studio authorization is based on the verified Supabase session plus database role.

## Visual review

Screenshots were captured from the production build at 390, 768, 1024, and 1440 CSS pixels, plus protected Studio views at 390 and 1440 pixels. Every image was opened and reviewed for hero cropping, text overflow, gaps, clipping, navigation wrapping, and contrast.

No product defect was found. Playwright's stitched full-page capture places a fixed mobile tab bar at the first viewport boundary, so an additional real bottom-of-page viewport was captured; it confirmed that the footer remains readable and the fixed navigation does not cover it.

Evidence: `docs/production-activation-screenshots/`

## Lighthouse

Lighthouse 12.8.2 ran against `pnpm run build` output served by Vite Preview at `127.0.0.1:4180`; it did not run against the development server.

| Profile | Performance | Accessibility | Best practices | SEO |
| --- | ---: | ---: | ---: | ---: |
| Mobile, simulated throttling | 88 | 100 | 100 | 66 |
| Desktop preset, simulated throttling | 100 | 100 | 100 | 66 |

The SEO score is intentionally reduced by the temporary blanket `noindex` release gate. Indexing should be enabled only after owner-approved public content exists. Mobile performance is primarily affected by local editorial web-font loading; the page remains at 2.8 s LCP and 30 ms total blocking time under simulated mobile throttling.

Exact commands:

```text
pnpm run build
pnpm exec vite preview --host 127.0.0.1 --port 4180
pnpm --config.node-linker=hoisted dlx lighthouse@12.8.2 http://127.0.0.1:4180/ --quiet --chrome-flags="--headless --no-sandbox" --output=json --output-path=docs/lighthouse-production-mobile.json --form-factor=mobile --screenEmulation.mobile=true --throttling-method=simulate --only-categories=performance,accessibility,best-practices,seo
pnpm --config.node-linker=hoisted dlx lighthouse@12.8.2 http://127.0.0.1:4180/ --quiet --chrome-flags="--headless --no-sandbox" --output=json --output-path=docs/lighthouse-production-desktop.json --preset=desktop --throttling-method=simulate --only-categories=performance,accessibility,best-practices,seo
```

## Verification commands and results

| Command | Result |
| --- | --- |
| `pnpm run typecheck` | Passed |
| `pnpm run test:security` | 17 passed |
| `pnpm run test:runtime` | 35 passed |
| `pnpm run check:runtime` | Passed; 28 protected files |
| `pnpm run build` | Passed; Worker, routing configuration, and hosting manifest emitted |
| `pnpm run test:sites` | 9 passed |
| `git diff --check` | Passed |

The build reports a non-blocking warning for one JavaScript chunk larger than 500 kB. No test or security control was deleted, bypassed, or weakened.

## Recovery

### Application rollback

1. Redeploy the prior known-good Sites version associated with main commit `80586811aded2bdd2fbd82f88d1c1aa3c4ca113b`.
2. Confirm `/`, `/studio`, and one deep route respond.
3. Confirm the custom domain still points to the active Site.

### Database recovery

The applied migrations are non-destructive. If application compatibility requires rollback, first deploy the previous application, then add a reviewed forward migration that restores the prior transition policy or submission policy. Do not delete audit rows, approval metadata, or production content. A destructive SQL rollback requires separate owner approval.

## Remaining release gates

- Deploy this exact pushed commit to the existing public Site and verify live headers, deep-link refresh, missing-route recovery, and Supabase reads.
- Complete a fresh hosted Magic Link sign-in, refresh/session restoration, Studio authorization, and logout with the approved administrator.
- Create and publish the first real production story only after the owner supplies or approves original editorial content. No fabricated reader story was inserted.
- Keep search indexing disabled until that public-content approval occurs.

