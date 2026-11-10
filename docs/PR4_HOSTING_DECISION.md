# PR 4 Hosting Decision

Date: 2026-11-10

## Decision

Use ChatGPT Sites for the owner-private PR 4 engineering preview. The project is `appgprj_6aeb82378c688191a1b05f79f4cc2cea`, and its provider-generated origin is expected to be `https://the-well-secure-preview.tonycheruiyot30.chatgpt.site`.

This decision authorizes only Gate A technical review. It does not authorize external reader invitations, a public launch, a custom domain, or a paid service.

## Why this provider

The existing repository already produces the Cloudflare Worker and hosting manifest expected by Sites. Sites creates new projects as private, supports owner access and named viewers, and currently adds no incremental hosting charge for the connected account. It avoids changing the product architecture or purchasing infrastructure before the pilot is ready.

The deployed application remains a React/Vite single-page application backed by Supabase. The Worker serves existing static assets and falls back to `index.html` only for HTML navigation requests; it does not rewrite missing APIs, non-HTML assets, or write requests.

## Current alternatives

| Provider | Current finding | PR 4 decision |
| --- | --- | --- |
| ChatGPT Sites | Private by default, repository-compatible Worker deployment, no incremental charge on the current account | Selected for the internal technical preview |
| Cloudflare Workers + Access | Free Workers allowance and a free Access tier suitable for small teams, but no approved account connection is available in this workspace | Retain as the leading migration option if external access or Sites constraints require it |
| Vercel | Hobby is limited to personal, non-commercial use; Pro is currently a paid plan | Rejected for this PR without paid-plan approval |

## Cost and terms evidence

- Activated service: one owner-private ChatGPT Site.
- Current incremental cost: USD 0.
- Paid subscriptions started: none.
- Custom domain purchased: none.
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

The Site must stay owner-private during PR 4. A generated hostname is not access control, so deployment verification must prove that an unauthenticated request reaches the provider access barrier. The application also emits `noindex, nofollow, noarchive` and a deny-all `robots.txt`; these reduce accidental indexing but do not replace provider protection.

Named external viewers are not approved yet. Before Gate C, test the chosen access method with a non-team account and confirm it does not require administrator credentials or create an unapproved cost.

## Decision boundary

Keep Sites for Gate A while it provides verified owner-only access and correct application routing. Re-evaluate Cloudflare Workers plus Access if the reader pilot needs a different external-visitor model, commercial terms change, build/runtime limits are reached, or access cannot be tested without team membership.

