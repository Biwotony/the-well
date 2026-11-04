# Design QA — THE WELL PR 1

Status: **Passed** on November 3, 2026.

## Evidence

- Design source: `docs/design-source-selected.png`
- Implementation: `docs/pr1-screenshots/mobile-home.png`
- Side-by-side comparison: `docs/pr1-screenshots/design-comparison.png`
- Comparison viewport: 390 × 844 CSS pixels at DPR 1
- Additional reviewed views: tablet home at 768 × 1024, desktop home at 1440 × 1000, large desktop home at 1920 × 1080, mobile story at 390 × 844, and desktop story at 1440 × 1000

## Visual result

The responsive implementation preserves the source's quote-first hierarchy, cream paper palette, charcoal serif display type, clay accents, candid relationship photography, story-first call to action, and restrained guided-growth language. Desktop uses a spacious two-column editorial composition, tablet deliberately stacks the narrative and image, and mobile keeps the selected quote → image → story → action rhythm inside the existing persistent navigation.

The persistent mobile navigation, accessible live controls, and responsive web header are intentional product adaptations rather than static-mock decoration. Progress and levels remain quiet supporting information and do not become competitive or dashboard-like.

## QA iterations

1. **P2 found:** the first mobile composition pushed the story title and action below the initial viewport.
2. **Fix:** reduced quote and image density, tightened caption spacing, and moved the mobile story action into the featured card.
3. **P2 found:** responsive image `width` and `height` hints created a tall computed image height in three components.
4. **Fix:** restored CSS `height: auto` for featured, story-card, and reader images, then re-captured and reviewed every required screenshot.

## Final visual review

- Hero crops keep both subjects visible and emotionally legible.
- No text overflow, navigation wrapping, clipped images, unexplained gaps, or horizontal overflow remains.
- The story reader keeps a comfortable measure on desktop and a clear single-column hierarchy on mobile.
- Lighthouse automated accessibility scored 100 on mobile and desktop; manual review still remains necessary for full WCAG conformance.
- Browser evidence recorded no console errors in the six screenshot flows.

Final severity result: **0 P0, 0 P1, 0 P2 — passed**.
