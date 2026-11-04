# PR 2 production Lighthouse results

Date: November 4, 2026  
Application commit: `e29f2067c4556bf7f688cfac97be2bcd197bfa0e`  
[Successful CI run](https://github.com/Biwotony/the-well/actions/runs/41810846200) · [Six JSON and HTML reports](https://github.com/Biwotony/the-well/actions/runs/41810846200/artifacts/13311584627)

The audited server ran `pnpm build` followed by Vite production preview on port 4176. Lighthouse 13.0.1 used the installed Playwright Chromium with simulated throttling, mobile 390 x 844 and desktop 1440 x 1000, both at DPR 1. The workflow and `scripts/summarize-lighthouse.mjs` make these six audits reproducible.

| Production-build page and profile | Performance | Accessibility | Best practices | SEO | LCP | CLS |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| demo-home-desktop | 100 | 100 | 100 | 100 | 0.72 s | 0.031 |
| demo-home-mobile | 93 | 100 | 100 | 100 | 2.86 s | 0.001 |
| demo-reader-desktop | 100 | 100 | 100 | 100 | 0.69 s | 0.007 |
| demo-reader-mobile | 94 | 100 | 100 | 100 | 2.77 s | 0.017 |
| public-home-desktop | 100 | 100 | 100 | 100 | 0.69 s | 0.026 |
| public-home-mobile | 93 | 100 | 100 | 100 | 2.78 s | 0.043 |

All six runs exceed the 90 performance goal. Accessibility, best practices, and SEO score 100 throughout; the visible-label/accessibility-name mismatch is also absent. Scores are lab measurements and do not establish complete accessibility conformance.

## Changes driven by the first run

The first run found mobile demo-home performance 83, reader performance 60 mobile / 76 desktop, and reader accessibility 96. The reader's CLS was 0.869 mobile / 0.774 desktop.

- Existing responsive cover assets are now selected with `srcSet`, so mobile no longer downloads the full 1430px hero unnecessarily. The reader image has high fetch priority.
- Explicit local demo mode initializes its already-local catalog and detail records synchronously, removing the loading-panel replacement that moved the entire reader. Ordinary production data still uses the real public repository.
- Reflection copy uses a darker color against the moss background.
- The back button's accessible name matches its visible label, and the brand button uses its native visible name.

The mobile reader now scores 94 with CLS 0.017; desktop scores 100 with CLS 0.007.

## Evidence boundaries

The ordinary homepage was tested in unconfigured production mode and shows the honest empty state. Demo URLs use explicitly labeled local fixtures with production components; no production rows were inserted. These scores do not measure future live populated Supabase pages or certify database policy behavior.

The HTML/JSON artifact expires on 2026-11-11. This Markdown report and `summary.json` preserve the measurements in the repository. The existing roughly 526 kB application bundle warning remains; unused-code and image-delivery recommendations remain performance opportunities despite the passing scores.
