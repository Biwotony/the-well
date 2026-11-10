# PR 4 Visual Self-Review

Date: 2026-11-10

## Scope

The production build was captured at 390, 768, 1024 and 1440 pixels, with additional reader captures at 390 and 1440 pixels. The owner-private hosted deployment was then captured at 390, 768, 1024 and 1440 pixels, with protected Studio and closed-submission states. Every saved image in `docs/pr4-screenshots/` was opened and inspected.

## Checks

- Hero subjects remain visible and naturally cropped at every captured width.
- Headlines, story summaries, navigation and buttons do not clip or overflow.
- Desktop navigation remains on one line, while the tablet and mobile menu treatment stays compact.
- Cream, charcoal, clay and moss surfaces keep readable contrast and the points/level treatment remains quiet.
- Reader paragraphs retain a comfortable measure, and the private reflection panel does not compete with the story.
- No horizontal overflow, broken image, oversized gap or misleading production-content state was found after correction.

## Correction made

The first 768px capture showed only one of two available story cards, leaving an awkward empty column. The tablet selector had hidden the final card because it assumed a three-card dataset. The CSS now hides only a third trailing card at that breakpoint, so two-card catalogs use both columns. The tablet screenshot was recaptured and re-inspected after the fix.

The first hosted mobile submission capture used a stitched full-page screenshot, which made the fixed bottom navigation appear to clip the card. It was replaced with a normal 390-by-844 viewport capture and re-inspected. The live page has no horizontal overflow, and its content remains scrollable above the fixed navigation.

## Evidence boundary

The first six captures use clearly labelled localhost-only demonstration data so the full layout can be reviewed without creating fake production rows. Hosted captures show the real production-empty response and safeguards. Screenshot inspection supports visual QA but does not establish full WCAG conformance; automated accessibility and keyboard checks remain part of the browser suite.

