# PR 2 Public Experience Audit

Date: November 4, 2026  
Repository: `Biwotony/the-well`  
Base: `main` at `4279091bcb527bd71bfa5151c970943bbcf60c63`  
Feature branch: `codex/public-story-experience`

## Audit scope

This audit covers anonymous discovery, published story reading, episodic navigation, interactive reflection, public challenges, and public journeys. It reviews the merged PR 1 responsive foundation, the checked-in Supabase schema, and the connected production project `najwlozwzcvlbwkbrmxt` using read-only inspection.

Baseline screenshots captured during this audit are stored in `docs/pr2-screenshots/00-baseline-discovery.png` and `docs/pr2-screenshots/01-baseline-reader.png`.

Repository guidance found and followed: `AGENTS.md`. No `CONTRIBUTING.md`, `CONTRIBUTING` variant, or other contributor instruction file was present.

## Current implementation status

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

Passed locally:

- `pnpm check:runtime`: 28 protected files passed integrity verification.
- `pnpm typecheck`: passed.
- `pnpm test:security`: 13 tests passed, including published-only query, hard-limit, credential, fixture-isolation, and session-only contracts.
- `pnpm build`: production build and Sites packaging passed; Vite reported one non-blocking bundle-size warning.
- `pnpm test:sites`: 4 tests passed.

Not yet run after implementation:

- Playwright browser flows, responsive overflow checks, screenshot recapture, and Lighthouse. Browser authority for the local production preview was declined, so this report does not claim visual or end-to-end completion. The PR must remain unopened until that access is restored and every captured screenshot has been inspected.

## Out of scope

PR 2 will not change production RLS, isolate the shared database, add authentication flows, persist member progress, store private reflections, redesign profiles, write anonymous completions, rebuild moderation, activate AI agents, ingest knowledge-base content, configure hosting, or start PR 3.
