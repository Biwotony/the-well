# PR 2 Public Experience Audit

Date: November 4, 2026  
Repository: `Biwotony/the-well`  
Base: `main` at `4279091bcb527bd71bfa5151c970943bbcf60c63`  
Feature branch: `codex/public-story-experience`

## Audit scope

This audit covers anonymous discovery, published story reading, episodic navigation, interactive reflection, public challenges, and public journeys. It reviews the merged PR 1 responsive foundation, the checked-in Supabase schema, and the connected production project `najwlozwzcvlbwkbrmxt` using read-only inspection.

Baseline screenshots captured during this audit are stored in `docs/pr2-screenshots/00-baseline-discovery.png` and `docs/pr2-screenshots/01-baseline-reader.png`.

Repository guidance found and followed: `AGENTS.md`. No `CONTRIBUTING.md`, `CONTRIBUTING` variant, or other contributor instruction file was present.

## Baseline implementation status

| Experience | Current state | Evidence |
| --- | --- | --- |
| Responsive visitor shell | Implemented | PR 1 website mode, responsive navigation, mobile menu, footer, and bottom navigation |
| Story discovery | Static fixture | `storyCards` and the featured story are hardcoded in `src/Prototype.tsx` |
| Story reader | Static fixture | One hardcoded episode is rendered without a public query or stable content identifier |
| Series navigation | Missing | No series overview, episode list, previous/next controls, or deep-link parsing |
| Interactive question | Missing | No published question/choice structure exists in the current schema |
| Scripture reflection | Partially represented | Challenges include `scripture_reference`, but the story reader does not use it |
| Public challenges | Local demonstration | Practice completion changes React state only and does not read the `challenges` table |
| Public journeys | Local demonstration | Journey title, steps, progress, and completion are hardcoded |
| Loading, empty, and query-error states | Missing | Public content is rendered immediately from local constants |
| Supabase public reads | Not implemented | The browser client is used only for Magic Link and editorial approval |

## Verified production data

The connected production project is active and healthy in `eu-west-1` on PostgreSQL 17.

Read-only production inspection found:

- `story_series`: 0 rows.
- `story_episodes`: 0 rows.
- `challenges`: 0 rows.
- `journeys`: 0 rows.
- `journey_steps`: 0 rows.
- Anonymous-role queries return 0 visible rows for all five public-content tables.

PR 2 must therefore show an honest production empty state. Controlled fixtures may be used only for automated tests and clearly labeled local evidence; no fabricated story will be inserted into production.

## Verified schema relationships

- `story_series.id` is the parent key for `story_episodes.series_id` with cascade deletion.
- `story_episodes` is ordered by the unique pair `(series_id, episode_number)`.
- `journeys.id` is the parent key for `journey_steps.journey_id` with cascade deletion.
- `journey_steps.challenge_id` optionally links a step to `challenges.id`.
- Story, challenge, and journey publication state uses `content_status`: `draft`, `in_review`, `approved`, `published`, or `archived`.
- Public content carries `approved_by`, `approved_at`, and `published_at`; publication is protected by database triggers requiring a human editor or administrator.

The schema does not contain story-level categories, answer choices, choice explanations, Scripture reflections, or related-content links. PR 2 will not invent database fields. The reader may present an optional session-only reflection surface around approved story text, while structured published questions and story-specific Scripture require a later reviewed schema proposal.

## Public visibility and security

The five public-content tables have RLS enabled, explicit anonymous `SELECT` grants, and published-only policies:

- Series, challenges, and journeys require `status = 'published'` and `published_at <= now()`.
- Episodes additionally require their parent series to be published.
- Journey steps additionally require their parent journey to be published.

The production anonymous-role verification returned only policy-authorized rows. The frontend must use the browser-safe publishable key and must not use a service-role or secret key.

The shared project also contains 12 legacy tables from an older application with RLS disabled. They are outside THE WELL and remain a critical project-level security concern. PR 2 will not query, modify, grant, migrate, or enable RLS on those tables because changing them could break the older application and requires a separately authorized isolation plan.

The knowledge-base tables remain server-only. They are not a source for public browser queries.

## Existing components to reuse

- `ResponsiveWebsite`, `SiteHeader`, `WebsiteHome`, `WebsiteStories`, `WebsiteStoryReader`, and `WebsiteJourney` provide the PR 1 presentation foundation.
- Existing typography, cream/charcoal/clay tokens, documentary imagery, buttons, cards, focus styles, dialogs, and responsive breakpoints remain authoritative.
- The existing lazy Supabase browser client remains the only client entry point.
- Current mobile runtime, simulator, keyboard, gesture components, and integrity manifest remain protected and out of scope.

Tasteful UI Composer audit mode found no need for another component library or design-token system. The smallest coherent implementation is to extend the existing Radix/native-CSS system with reusable state panels, filters, episode navigation, and session-only interactive controls.

## UX and accessibility findings

1. **Discovery — visually healthy, functionally static.** The baseline page has a strong story-first hierarchy, but every card is fabricated local content and there is no search, filter, loading state, or honest empty state.
2. **Reader — visually healthy, structurally incomplete.** Reading width, typography, imagery, and return navigation are clear, but the route is local state, only one episode exists, and no episode continuity or interactive reflection is available.
3. **Journeys and challenges — incomplete public experience.** Current progress and completion are session-local, which matches PR 2's persistence boundary, but the content itself is not loaded from published records.
4. **Accessibility — good foundation with missing dynamic-state semantics.** PR 1 supplies landmarks, visible focus, responsive reflow, and labeled navigation. New loading, error, selection, completion, and empty states need status announcements and keyboard-operable controls.

Screenshot inspection cannot establish complete WCAG 2.2 AA conformance. Keyboard, focus order, screen-reader announcements, contrast, and error recovery require browser and automated testing after implementation.

## Implemented in PR 2

1. Added typed public-content models and a single repository with explicit selects, published/due filters, deterministic ordering, hard limits, and normalized errors.
2. Added loading, empty, unavailable, not-found, search-empty, and local demonstration states. Fixture mode requires a local hostname plus `?content=demo` and carries a persistent warning banner.
3. Connected discovery, title/summary search, stable story episode URLs, previous/next episode navigation, published challenges, journey lists, journey details, and ordered steps to the repository.
4. Added an optional story check-in and challenge completion while keeping every anonymous interaction in React memory. No completion, reflection, or account-specific write was introduced.
5. Preserved the editorial studio, Magic Link flow, submission language, approval gate, quiet level/points treatment, device simulator, and protected mobile runtime.

Topic filtering was not added because the production schema has no editorial category field. `sensitive_topics` is safety metadata and is intentionally not repurposed as a public taxonomy.

## Verification status

Final local verification on November 4, 2026:

| Check | Result |
| --- | --- |
| Runtime integrity | Passed, all 28 protected files; no runtime file or lock hash changed |
| TypeScript | Passed, `node node_modules/typescript/bin/tsc --noEmit` |
| Security and content contracts | Passed, 13/13 |
| Playwright | Passed, 33/33 locally with `--workers=1` and in GitHub CI with the normal configuration |
| Production build | Passed, TypeScript + Vite build + Sites preparation |
| Sites packaging tests | Passed, 4/4; all four required hosting files exist |
| Production screenshot verification | Passed, 18/18 captures; no console errors or horizontal overflow |
| Production Lighthouse | Passed, six production-build audits; mobile performance 93–94 and desktop 100; accessibility/best practices/SEO 100 |

The production build was served at `http://127.0.0.1:4176/`. Final captures came from `node scripts/capture-pr2-evidence.mjs` against that build, with DPR 1 and reduced motion. Required homepage dimensions are 390 x 844, 768 x 1024, 1440 x 1000, and 1920 x 1080; the reader was captured at mobile and desktop sizes. Automated demo-flow reflow checks additionally cover 375, 430, 768, 1024, 1280, 1440, and 1920 pixels for discovery, the library, the reader, a journey, and a challenge.

The Browser preview was inspected directly for discovery, search, story navigation, reflection, journey entry, Scripture practice, and completion. The in-app browser produced malformed responsive screenshot output, and the connected Chrome fallback failed to navigate. Those captures were rejected. The accepted, exact-size evidence was produced by the repository's Playwright capture script and every saved final PNG was opened and visually reviewed. The capture source is therefore explicit: the final PNGs are automated Chromium evidence, not Browser screenshots.

### Corrections following visual and interaction review

1. The mobile reader now presents the episode title and introduction before the photograph, so the current episode is clear on entry.
2. The mobile library uses a smaller editorial heading and tighter spacing so search and results appear sooner.
3. Journey copy explains private, temporary completion in ordinary language, without MVP or database terminology.
4. Reflection resets when moving to another episode, rather than silently retaining the previous episode's choice.
5. Completion is keyed by challenge ID. Completing one practice no longer completes a different practice, and linked journey steps reflect the matching challenge.
6. A compact, keyboard-operable series overview lists published episodes and marks the current part.
7. Search results announce their count. The reflection test now targets the reader's status instead of also matching the persistent demo notice.

The default two-worker run encountered an intermittent protected keyboard/footer gesture failure while screenshot capture was also running (32 passed, 1 failed). The complete suite then passed 33/33 with one worker and no concurrent capture. No protected runtime file, gesture test, assertion, timeout, or retry setting was changed to obtain that result.

Local `.git` writes and shell network access are restricted. The reviewed changes and evidence were committed through the GitHub connector; local source files match that work, while local Git refs and the index remain unchanged.

### Production Lighthouse

Local installation was blocked by registry network restrictions and an incomplete offline cache. The existing GitHub CI workflow now runs Lighthouse 13.0.1 against the actual production build and uploads six HTML/JSON reports.

[The final application CI run](https://github.com/Biwotony/the-well/actions/runs/41810846200) passed every check: runtime integrity, TypeScript, 13 security/content contracts, 33 Playwright tests, production build, 4 Sites tests, and all six Lighthouse executions.

| Page/profile | Performance | Accessibility | Best practices | SEO | LCP | CLS |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| demo-home-desktop | 100 | 100 | 100 | 100 | 0.72 s | 0.031 |
| demo-home-mobile | 93 | 100 | 100 | 100 | 2.86 s | 0.001 |
| demo-reader-desktop | 100 | 100 | 100 | 100 | 0.69 s | 0.007 |
| demo-reader-mobile | 94 | 100 | 100 | 100 | 2.77 s | 0.017 |
| public-home-desktop | 100 | 100 | 100 | 100 | 0.69 s | 0.026 |
| public-home-mobile | 93 | 100 | 100 | 100 | 2.78 s | 0.043 |

The initial Lighthouse run exposed reader layout shift, reflection contrast, accessible-name mismatches, and oversized mobile cover downloads. Those findings were corrected and re-audited. No protected runtime file or integrity hash changed. Existing responsive image assets were reused.

See [the complete Lighthouse results](PR2_LIGHTHOUSE_RESULTS.md), [durable measurements](pr2-lighthouse/summary.json), and [downloadable HTML/JSON reports](https://github.com/Biwotony/the-well/actions/runs/41810846200/artifacts/13311584627). The roughly 526 kB bundle warning remains a measured optimization opportunity.

### Evidence limits

The ordinary local production-mode preview is unconfigured for Supabase and displays the honest empty state; this run does not re-certify the live database's contents or policies. The existing read-only production findings above remain historical audit evidence. Query-error and loading variants were not independently captured in the final screenshot set. Lighthouse found no scored accessibility violations in the six tested states. Manual assistive-technology and full-journey accessibility checks remain outside that evidence; these scores do not establish complete conformance. Structured editorial question choices, story-specific Scripture, category taxonomy, and durable account progress remain outside this implementation.

See [the complete screenshot review](PR2_VISUAL_REVIEW.md) and [capture measurements](pr2-screenshots/verification.json).

## Out of scope

PR 2 will not change production RLS, isolate the shared database, add authentication flows, persist member progress, store private reflections, redesign profiles, write anonymous completions, rebuild moderation, activate AI agents, ingest knowledge-base content, configure hosting, or start PR 3.
