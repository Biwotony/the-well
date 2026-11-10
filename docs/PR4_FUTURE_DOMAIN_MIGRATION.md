# PR 4 Domain Migration

The owner approved the already-purchased domain `ourhonestdays.com` on 2026-11-10 and authorized its connection to the owner-private technical preview. THE WELL remains the working product brand until a separate naming decision is approved.

## Current state

- The domain was not purchased by this PR and no payment was made.
- The apex domain is attached to the existing ChatGPT Site.
- Required A and TXT records are present on Spaceship nameservers.
- DNS resolution succeeds, while provider certificate validation was still pending at handoff.
- The generated Sites hostname remains the verified fallback and rollback URL.

## Before public use

1. Approve the final brand and confirm trademark, safeguarding and privacy ownership.
2. Select the permanent hosting provider and recheck plan terms, pricing and external-reader access.
3. Confirm the registrar owner, renewal method and recovery contacts.
4. Inventory every temporary-hostname dependency and capture the last known-good deployment.

## Domain cutover

1. Add the domain to hosting, configure DNS and wait for valid HTTPS before redirecting traffic.
2. Add exact Supabase Auth callback URLs and update the Site URL only after checking other applications in the shared project.
3. Update canonical URLs, sitemap, robots policy, Open Graph metadata, email branding, internal navigation and approved analytics configuration.
4. Test Magic Links, session restoration, logout, deep links, asset caching and access controls on the exact custom hostname.
5. Redirect the temporary origin only after the custom hostname passes security, accessibility and browser checks.

## Rollback

Keep the temporary hostname and previous DNS values available during the observation window. If authentication, certificates or routing fail, restore the prior DNS/hosting mapping, remove the broken callback from active use and verify the owner-private fallback before communicating a new cutover time.

## Later cleanup

After a stable public-launch decision, update external links and documentation, retain redirects for an approved period, review search-console ownership and remove obsolete callback origins. Do not delete the temporary project until rollback and audit requirements are satisfied.

