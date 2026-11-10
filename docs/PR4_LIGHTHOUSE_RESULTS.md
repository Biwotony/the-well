# PR 4 Lighthouse Results

Date: 2026-11-10

## Production-build method

Lighthouse 13.0.1 ran against `pnpm build` output served by `pnpm exec vite preview --host 127.0.0.1 --port 4174`. It did not use the Vite development server.

The CI-equivalent command shape was:

```text
lighthouse <url> <profile flags> --screenEmulation.deviceScaleFactor=1 --throttling-method=simulate --only-categories=performance,accessibility,best-practices,seo --output=json --output=html --chrome-flags="--headless=new --no-sandbox --disable-gpu" --quiet
```

Profiles:

- Mobile: `--form-factor=mobile --screenEmulation.mobile=true --screenEmulation.width=390 --screenEmulation.height=844`.
- Desktop: `--preset=desktop --screenEmulation.width=1440 --screenEmulation.height=1000`.
- Throttling: Lighthouse simulated throttling.
- Device scale factor: 1.
- Browser: installed Google Chrome in headless mode.

The repository CI uses the same Lighthouse version, dimensions, scale factor, throttling method and category set. The local Playwright Chromium binary could not launch directly on this Windows host because its side-by-side runtime was unavailable, so installed Chrome was used without changing the audit configuration.

## Scores

| Production page | Profile | Performance | Accessibility | Best practices | SEO |
| --- | --- | ---: | ---: | ---: | ---: |
| Demo home | Desktop | 100 | 100 | 100 | 66 |
| Demo home | Mobile | 89 | 100 | 100 | 66 |
| Demo reader | Desktop | 100 | 100 | 100 | 66 |
| Demo reader | Mobile | 90 | 100 | 100 | 66 |
| Production-empty home | Desktop | 100 | 100 | 100 | 63 |
| Production-empty home | Mobile | 87 | 100 | 100 | 63 |

## Core metrics

| Page/profile | FCP | LCP | TBT | CLS |
| --- | ---: | ---: | ---: | ---: |
| Demo home, desktop | 0.53 s | 0.77 s | 0 ms | 0.031 |
| Demo home, mobile | 2.45 s | 3.24 s | 14 ms | 0.000 |
| Demo reader, desktop | 0.53 s | 0.75 s | 0 ms | 0.010 |
| Demo reader, mobile | 2.35 s | 3.16 s | 66 ms | 0.020 |
| Production-empty home, desktop | 0.54 s | 0.73 s | 0 ms | 0.030 |
| Production-empty home, mobile | 2.45 s | 3.15 s | 206 ms | 0.040 |

## Interpretation

Accessibility and best-practice audits scored 100 in all six laboratory runs. Desktop performance scored 100, while mobile performance scored 87–90. The main remaining performance opportunities are JavaScript splitting and more granular responsive images; neither is a release blocker for the owner-private preview.

SEO is intentionally reduced by `noindex, nofollow, noarchive` and a deny-all `robots.txt`. Lighthouse correctly reported that the pages cannot be indexed. Removing those controls to improve the score would violate the protected-preview requirement.

These laboratory results do not prove real-user field performance. The owner-only Sites login barrier prevented a conventional hosted Lighthouse run without embedding a short-lived privileged bypass token in the audit process. That token was not written to the repository or Lighthouse artifacts. Hosted access, layout and route behavior were verified separately, while performance evidence remains tied to the exact production build served by Vite preview.

