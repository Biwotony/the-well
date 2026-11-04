# PR 1 Responsive Frontend Audit

Date: November 3, 2026  
Repository: `Biwotony/the-well`  
Base: `main` at `f841a7c8d5f18f65ed411eca4e805a8ef371e9ba`  
Feature branch: `codex/responsive-web-foundation`

## Repository state and instructions

- Verified local `main` and `origin/main` at the same commit before branching.
- Inspected branches `main` and `codex/knowledge-base-ingestion`; no responsive branch or open pull request existed.
- Inspected `.github/workflows/ci.yml`: pull requests run install, runtime integrity, TypeScript, security contracts, Playwright, production build, and Sites packaging.
- Found and followed `AGENTS.md` and `README.md`. No `CONTRIBUTING.md` or equivalent contributor guide exists.
- Package manager is pnpm 11.25.0 on Node 24. The app uses React 19, TypeScript 7, Vite 8, Radix primitives, and native CSS.
- Vite builds to `dist/client`; `vercel.json` preserves SPA fallback routing to `index.html`; the Sites build also prepares `dist/server/index.js` and `dist/.openai/hosting.json`.

## Baseline architecture and root cause

`src/App.tsx` mounted every visitor inside `MobileRuntime`. That runtime intentionally composes `PhoneFrame`, device chrome, calibrated iPhone/Pixel dimensions, safe areas, keyboard simulation, and device controls. The normal website therefore rendered the development/device-testing harness instead of a visitor-facing responsive shell.

This was not a backend or routing defect, and it did not require an application rewrite. The safe change was to split presentation modes at the entry point:

- `/` renders the responsive visitor website.
- `/?preview=device` retains the calibrated device simulator for development and regression testing.

The existing mobile flow, simulator components, gesture primitives, safe areas, keyboards, iPhone/Pixel switcher, Supabase handlers, approval gate, and local prototype states remain available.

## Existing visual and component system

- Cream, paper, charcoal, clay, moss, mineral, and marigold tokens live in `src/prototype.css`.
- Manrope supports interface copy; DM Serif Display carries editorial headlines.
- Documentary relationship photography, quote-first storytelling, and quiet progress indicators define the selected direction.
- Existing Radix Dialog and icon primitives were reused. The Tasteful UI Composer review rejected a second component/styling stack because the current Radix/native-CSS foundation already supplied accessible primitives and coherent tokens.
- Landing-page copy now has a repository rule against staccato fragment formulas; current visitor copy was audited and one fragment-heavy story-library headline was rewritten.

## Baseline verification

Before implementation:

- `pnpm run check:runtime` — passed, 28 protected files.
- `pnpm run typecheck` — passed.
- `pnpm run test:security` — passed, 9/9.
- `pnpm run test:runtime` — passed, 12/12.
- `pnpm run build` — passed.
- `pnpm run test:sites` — passed, 4/4.

## Implemented responsive foundation

- Added a visitor website shell with skip link, responsive header, verified-route navigation, mobile menu, footer, and mobile bottom navigation.
- Re-composed the homepage into a desktop editorial hero, four thematic rooms, Today's Encounter, restrained journey progress, story grid, and private-submission invitation.
- Added responsive story library, story reader, journey, practice, submission, and editorial studio presentations while reusing the existing product state and action handlers.
- Kept levels and points visually secondary; no competitive or leaderboard presentation was added.
- Preserved explicit approval-before-publish and Magic Link preview/configured behavior.
- Added responsive WebP sources, preload hints, intrinsic image dimensions, `robots.txt`, and a favicon.
- Added a reproducible Playwright screenshot/evidence script and responsive regression coverage at 375, 430, 768, 1024, 1280, 1440, and 1920 pixels.

## Protected runtime integrity

`src/App.tsx` is a protected runtime file and changed legitimately because it was the exact source of the visitor/device-mode composition. The device runtime itself was not removed or weakened. After verifying both default website mode and `?preview=device`, `pnpm run update:runtime-lock` updated the `src/App.tsx` hash in `mobile-runtime.lock.json`; `pnpm run check:runtime` then passed all 28 protected files.

## Accessibility and performance

Lighthouse 13.0.1 ran against `pnpm run build` served by `pnpm exec vite preview --host 127.0.0.1 --port 4175 --strictPort`, not the development server.

Mobile command:

```powershell
node .tmp-lighthouse-runner/node_modules/lighthouse/cli/index.js http://127.0.0.1:4175 --output=json --output-path=.tmp-lighthouse-runner/lighthouse-mobile.json --only-categories=performance,accessibility,best-practices,seo --form-factor=mobile --throttling-method=simulate --screenEmulation.mobile=true --screenEmulation.width=390 --screenEmulation.height=844 --screenEmulation.deviceScaleFactor=1 --chrome-flags="--headless --no-sandbox --disable-gpu" --quiet
```

- Profile: mobile, 390 × 844, DPR 1.
- Simulated throttling: 150 ms RTT, 1,638.4 Kbps, 4× CPU slowdown.
- Result: Performance 93, Accessibility 100, Best Practices 100, SEO 100; FCP 2.1 s, LCP 2.9 s, TBT 10 ms, CLS 0.001.

Desktop command:

```powershell
node .tmp-lighthouse-runner/node_modules/lighthouse/cli/index.js http://127.0.0.1:4175 --output=json --output-path=.tmp-lighthouse-runner/lighthouse-desktop.json --only-categories=performance,accessibility,best-practices,seo --preset=desktop --throttling-method=simulate --screenEmulation.mobile=false --screenEmulation.width=1440 --screenEmulation.height=1000 --screenEmulation.deviceScaleFactor=1 --chrome-flags="--headless --no-sandbox --disable-gpu" --quiet
```

- Profile: desktop, 1440 × 1000, DPR 1.
- Simulated throttling: 40 ms RTT, 10,240 Kbps, 1× CPU slowdown.
- Result: Performance 100, Accessibility 100, Best Practices 100, SEO 100; FCP 0.5 s, LCP 0.7 s, TBT 0 ms, CLS 0.009.

Automated accessibility reported zero critical or serious homepage violations. This is evidence for the tested state, not a claim of complete WCAG 2.2 AA conformance. Keyboard focus states, dialog focus management, labeled controls, semantic landmarks, reduced motion, menu state, touch targets, and contrast were also reviewed in code and browser flows.

## Visual evidence and self-review

The six required final screenshots and a source comparison are stored in `docs/pr1-screenshots/`. Each final screenshot was opened and reviewed after capture for hero crop, text overflow, awkward spacing, clipped imagery, navigation wrapping, contrast, and horizontal overflow.

The review corrected two issues before handoff: the mobile hero initially hid the title/action below the fold, and image dimension hints briefly created over-tall responsive images. Both were fixed and every affected screenshot was re-captured.

For the final November 4 handoff, the production build was served with `pnpm exec vite preview --host 127.0.0.1 --port 4175 --strictPort` and the evidence was refreshed with `node scripts/capture-pr1-evidence.mjs`. All six viewport captures reported zero console errors and no horizontal overflow. Every refreshed screenshot plus the source comparison was opened and inspected again; no additional visual corrections were required.

## Risks and scope decisions

- Visitor stories, journeys, practice completion, points, submissions, and queue state remain prototype/local data as documented. PR 2 and PR 3 own persistence and live-data work.
- Supabase schema, production rows, RLS, auth settings, Edge Functions, agent budgets/schedules, embeddings, knowledge-base content, and ingestion were not changed or invoked.
- The shared Supabase project's older unrelated tables without RLS remain a known PR 3 security review item; PR 1 does not connect to or alter them.
- The production build still emits a Vite warning for a JavaScript chunk slightly above 500 kB. Measured mobile performance nevertheless meets the 90+ engineering goal, and splitting the protected simulator/application bundle is deferred because it would expand PR 1's architectural scope.
- No Vercel project, domain, production deployment, paid service, AI schedule, or commercial hosting decision was created.
