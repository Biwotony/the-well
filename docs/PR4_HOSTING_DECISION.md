# PR 4 Hosting Decision

Date: 2026-11-10

## Decision

Use ChatGPT Sites for the PR 4 engineering preview. The project is `appgprj_6aeb82378c688191a1b05f79f4cc2cea`, its verified provider-generated origin is `https://the-well-secure-preview.tonycheruiyot30.chatgpt.site`, and its active custom domain is `https://ourhonestdays.com`.

This decision authorizes only Gate A technical review. It does not authorize external reader invitations, a public launch or a paid service.

On 2026-11-10, the owner separately approved the already-purchased domain `ourhonestdays.com`, then explicitly requested removal of the ChatGPT login gate. The Site access mode was changed from owner-only to public and the same reviewed version was redeployed. This approval does not activate a paid service, authorize a reader-pilot invitation campaign, or rename the product in code.

## Why this provider

The existing repository already produces the Cloudflare Worker and hosting manifest expected by Sites. Sites creates new projects as private, supports owner access and named viewers, and currently adds no incremental hosting charge for the connected account. It avoids changing the product architecture or purchasing infrastructure before the pilot is ready.

The deployed application remains a React/Vite single-page application backed by Supabase. The Worker serves existing static assets and falls back to `index.html` only for HTML navigation requests; it does not rewrite missing APIs, non-HTML assets, or write requests.

## Current alternatives

| Provider | Current finding | PR 4 decision |
| --- | --- | --- |
| ChatGPT Sites | Private by default, repository-compatible Worker deployment, public access available, no incremental charge on the current account | Selected for the technical preview |
| Cloudflare Workers + Access | Free Workers allowance and a free Access tier suitable for small teams, but no approved account connection is available in this workspace | Retain as the leading migration option if external access or Sites constraints require it |
| Vercel | Hobby is limited to personal, non-commercial use; Pro is currently a paid plan | Rejected for this PR without paid-plan approval |

## Cost and terms evidence

- Activated service: one public, unindexed ChatGPT Site.
- Current incremental cost: USD 0.
- Paid subscriptions started: none.
- Custom domain purchased by engineering: none.
- Domain purchase performed by this PR: none; the owner confirmed `ourhonestdays.com` was already purchased.
- Current references:
  - [Creating and using ChatGPT Sites](https://help.openai.com/en/articles/20001339-creating-and-using-chatgpt-sites)
  - [Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)
  - [Cloudflare Workers limits](https://developers.cloudflare.com/workers/platform/limits/)
  - [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/)
  - [Cloudflare Access](https://www.cloudflare.com/sase/products/access/)
  - [Vercel Hobby plan](https://vercel.com/docs/plans/hobby)
  - [Vercel terms](https://vercel.com/legal/terms)

Provider terms and prices can change. Recheck them before Gate C or any paid activation.

## Access and indexing

The Site is configured with public access at the owner's explicit request. An unauthenticated browser reached `https://ourhonestdays.com/` directly and rendered THE WELL without the ChatGPT login gate. The application still emits `noindex, nofollow, noarchive` and a deny-all `robots.txt`, so public reachability does not imply search-engine launch readiness.

Internal navigation verified `/stories`, a story route, `/journeys`, a journey route, `/challenge`, `/share` and `/studio`. Direct HTML navigation to a deep route still redirects to `/`; internal single-page navigation works. Gate A remains blocked until this behavior is accepted for the technical preview or corrected by the provider/runtime configuration.

No reader invitations are approved yet. Before Gate C, approve the reader list, safeguarding owner, feedback process and original launch content even though the hostname is technically reachable without an account.

The apex domain uses the two Sites-provided A targets plus the two provider validation TXT records. DNS resolution, provider routing and TLS all report active. `https://ourhonestdays.com/` returned HTTP 200 and was opened in the in-app browser without authentication.

## Decision boundary

Keep Sites for the public-but-unindexed technical preview while the owner accepts its current reachability. Re-evaluate Cloudflare Workers plus Access if deep-link reloads cannot be corrected, the reader pilot needs gated external access, commercial terms change, or build/runtime limits are reached.

