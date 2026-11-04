# PR 3 Lighthouse Results

Lighthouse 13.0.1 audited the production build served by `pnpm preview --host 127.0.0.1 --port 4177`. All audits used Lighthouse simulated throttling and Chrome for Testing 149.0.7827.55.

| Production page | Profile | Performance | Accessibility | Best practices | SEO |
| --- | --- | ---: | ---: | ---: | ---: |
| Home | Desktop, 1440 x 1000, DPR 1 | 100 | 100 | 100 | 100 |
| Home | Mobile, 390 x 844, DPR 1 | 92 | 100 | 100 | 100 |
| Editor studio | Desktop, 1440 x 1000, DPR 1 | 100 | 100 | 100 | 100 |
| Editor studio | Mobile, 390 x 844, DPR 1 | 94 | 100 | 100 | 100 |
| Closed submission | Desktop, 1440 x 1000, DPR 1 | 100 | 100 | 100 | 100 |
| Closed submission | Mobile, 390 x 844, DPR 1 | 92 | 100 | 100 | 100 |

## Exact audit shape

Each route was run once with the following command shape, substituting the route, profile, and output name:

```powershell
node "$env:TEMP\the-well-lighthouse-13\node_modules\lighthouse\cli\index.js" <production-preview-url> --chrome-path="C:\Users\User\AppData\Local\ms-playwright\chromium_headless_shell-1228\chrome-headless-shell-win64\chrome-headless-shell.exe" --no-enable-error-reporting --screenEmulation.deviceScaleFactor=1 --throttling-method=simulate --only-categories=performance,accessibility,best-practices,seo --output=json --output=html --output-path=<report-path> --chrome-flags="--headless --disable-gpu --no-sandbox" --quiet
```

Mobile runs added `--screenEmulation.mobile=true --screenEmulation.width=390 --screenEmulation.height=844`. Desktop runs added `--preset=desktop --screenEmulation.width=1440 --screenEmulation.height=1000`.

The generated score table is committed at `docs/pr3-lighthouse/summary.md`. Raw HTML and JSON reports were inspected locally and are reproducible with the command above; they are intentionally excluded from the PR to keep the security review focused.

## Findings

- The established baseline is preserved: mobile performance is 92–94 and every desktop performance score is 100.
- Accessibility, best-practices, and SEO scores are 100 on all six reports.
- Remaining performance opportunities are the existing shared JavaScript bundle, missing production source maps, render-blocking CSS, and public-story image sizing/compression. They are not regressions introduced by the security/editorial work.
- The production build reports a 528.01 kB uncompressed main JavaScript chunk. Route-level code splitting is a follow-up performance improvement, not a PR 3 security blocker.

## Tooling note

The first `pnpm dlx lighthouse@13.0.1` attempts failed because the temporary pnpm package environment omitted Lighthouse's `debug` dependency. A temporary Lighthouse installation resolved that dependency. The first installed run then failed because the system Chrome executable had a Windows side-by-side configuration error. Pointing Lighthouse at the already-installed Playwright headless shell resolved the runner failure. No repository dependency or production configuration was changed for Lighthouse.
