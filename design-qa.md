# Design QA — THE WELL

Status: **Passed** on 2026-11-03.

## Comparison

- Design source: `docs/design-source-selected.png`
- Live capture: `docs/design-qa-live.png`
- App viewport: iPhone preset, 393 × 852 CSS pixels
- Visual direction: Option 3's quote-first editorial hierarchy blended with Option 2's warmer relationship photography and journey guidance

The implementation preserves the source's cream paper palette, charcoal serif headlines, clay accents, candid couple imagery, oversized quotation, story-first hierarchy, and guided practice card. It intentionally translates the static concept into a compact mobile product with persistent navigation and additional discovery content.

## Interaction verification

- Public home → featured episode → back to home
- Home/Stories/Journey/Studio navigation
- Daily practice completion and +20 point state
- Private story submission consent gate
- Magic Link preview and configured Supabase handoff
- Editorial review sheet and approval-before-publish copy
- Four-agent operating desk and draft-only Content Factory state

## Quality checks

- Browser console: 0 warnings, 0 errors
- Playwright: 12/12 passing
- Security contracts: 3/3 passing
- Sites packaging: 4/4 passing
- TypeScript, production build, and protected mobile-runtime integrity: passing

## Fixes made during browser QA

- Added explicit hiding for the closed simulated keyboard to prevent a compositing ghost after screen navigation.
- Kept navigation taps from retaining focus and explicitly dismissed the mobile keyboard before changing root screens.

