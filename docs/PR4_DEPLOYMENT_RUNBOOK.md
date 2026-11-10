# PR 4 Deployment and Recovery Runbook

## Scope

This runbook operates the owner-private engineering preview. It does not authorize reader invitations or a public launch.

## Inventory

| Item | Value |
| --- | --- |
| Hosting provider | ChatGPT Sites |
| Hosting project | `appgprj_6aeb82378c688191a1b05f79f4cc2cea` |
| Expected origin | `https://the-well-secure-preview.tonycheruiyot30.chatgpt.site` |
| Access posture | Owner-private |
| Supabase project | `najwlozwzcvlbwkbrmxt` |
| GitHub branch | `codex/secure-pilot-deployment` |
| Build command | `pnpm build` |
| Verification command | `pnpm test:sites` |

The exact live URL and deployment identifier must be added after the first successful deployment. An expected origin is not evidence of publication.

## Browser-safe build variables

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Only a live `sb_publishable_...` key belongs in the browser build. Never expose a service-role key, database password, agent provider key, schedule secret or ingestion secret.

## Release procedure

1. Start from the latest reviewed `main`, preserve a clean feature branch and run `pnpm install --frozen-lockfile`.
2. Run `pnpm check:runtime`, `pnpm typecheck`, `pnpm test:security`, `pnpm test:runtime`, `pnpm build` and `pnpm test:sites`.
3. Confirm `dist/client/index.html`, `dist/server/index.js`, `dist/.openai/hosting.json` and source `.openai/hosting.json` exist.
4. Push the exact reviewed commit to GitHub and to the Site source repository, then save and deploy that same commit as an owner-private version.
5. Verify deployment status, owner access, unauthenticated denial, routes, reloads, browser console, asset responses and the absence of demo data.

Keep the Site owner-private. Do not add external viewers until Gate C approval.

## Authentication configuration

After a deployment exists and before testing a real editor, add only the exact HTTPS callback required by the verified Site origin to Supabase Auth's redirect allowlist. Inspect existing shared-project URL configuration before making a change. Do not replace another application's Site URL or broaden the allowlist with wildcards.

An approved editor email is still required. Bootstrap that user through the normal Magic Link flow with public signup disabled, then grant `editor` or `admin` in `public.user_roles` through an owner-authorized administrative procedure.

## Health and failure detection

- GitHub CI is the primary pre-deployment signal.
- Sites deployment status and worker logs are the first hosting checks.
- Browser smoke tests cover the homepage, story routes, journeys, challenges, editor sign-in, protected studio and closed submission state.
- Supabase logs and advisors cover Auth, database and Edge Function failures.
- No paid monitoring service is enabled.

## Access shutdown

If the preview is exposed or compromised:

1. Restore owner-only Site access or disable the Site through the provider control.
2. Remove unapproved external viewers.
3. Revoke compromised Supabase sessions and remove the affected `user_roles` row.
4. Rotate the publishable key only when provider guidance or a confirmed compromise requires it; never treat the browser key as a server secret.
5. Keep all AI budgets, schedules and provider secrets disabled.

## Application rollback

Deploy the last known-good saved Site version and verify its status, route behavior and access barrier. This procedure must be exercised after the first two versions exist; before then it is documented but not testable.

## Database recovery

Stop editorial writes, preserve error and audit evidence, and use the provider-supported recovery point or a separately reviewed compensating migration. Never drop tables, bypass the publication gate or delete audit history as a rollback shortcut.

## Ownership

The product owner approves production schema changes, editor identities, pilot visitors, privacy/safeguarding policy and paid services. Engineering prepares evidence and operates the technical preview within those approvals.

