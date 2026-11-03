# THE WELL

THE WELL is a mobile-first Christian storytelling and growth platform. The MVP combines public episodic stories, daily practices and levels, guided journeys, privately moderated story submissions, an editorial review studio, Supabase Magic Link authentication, and four budget-controlled AI integration points.

## What works in this MVP

- Public, mobile-first discovery with episodic reading.
- A daily listening practice, journey progress, points, and levels.
- Private story submission with separate review and publication consent language.
- An editorial queue with an explicit human approval step.
- Supabase email Magic Link integration using a browser-safe publishable key.
- Four server-side agent contracts: Story Intelligence, Content Factory, Growth & Retention, and Chief Operator.
- Database-level RLS, role separation, publish-state trigger, and append-only editorial audit records.
- Weekly scheduled draft generation as an optional, disabled-by-default SQL snippet.

The app runs in preview mode without credentials. Supabase-backed actions activate after `.env.local` is configured.

## Free-first stack

| Layer | Default | Cost posture |
| --- | --- | --- |
| Web app | React 19 + Vite 8 + TypeScript | Open source |
| Hosting | Vercel Hobby or OpenAI Sites | Start free; no deployment created by this repository |
| Database/Auth | Supabase Free | Magic Link, Postgres, RLS, Edge Functions, Cron |
| Images | Project-owned generated assets | No runtime image API cost |
| AI | Vercel AI Gateway-compatible endpoint | Disabled until an explicit model, key, and per-agent budget are configured |
| Source control | GitHub private repository | Free private repository supported |

As of June 3, 2026, new Supabase Free projects using the default email provider cannot customize Auth email templates. Magic Links still work with the default template; custom branding requires custom SMTP and must be approved as a separate cost/operations decision. See the [Supabase changelog](https://supabase.com/changelog/46599-changes-to-email-template-customisation-on-free-tier).

## Local start

Requirements: Node.js 24+ and pnpm 11.25.0.

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

Open the URL printed by Vite. Without Supabase values, Magic Link and publish actions clearly remain in preview mode.

## Supabase setup

1. Create a free Supabase project only after confirming the project region and organization.
2. Copy `.env.example` to `.env.local` and add the project URL plus `sb_publishable_...` key.
3. Set Auth → URL Configuration to the production origin and add local/preview redirect origins.
4. Link the CLI and apply the migration:

   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   supabase db push
   supabase functions deploy agent-runner
   ```

5. Add server-only Edge Function secrets from `supabase/functions/agent-runner/.env.example`.
6. Promote the first editor by updating `public.user_roles` from the Supabase SQL editor while authenticated as the project owner.

Never place a Supabase secret or service-role key in a `VITE_` variable.

## Verification

```bash
pnpm typecheck
pnpm test:security
pnpm check:runtime
pnpm test:runtime
pnpm build
pnpm test:sites
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Security and approval model](docs/SECURITY.md)
- [Four-agent contracts](docs/AI-AGENTS.md)
- [Deployment runbook](docs/DEPLOYMENT.md)
- [Selected visual source](docs/design-source-selected.png)

## Repository map

```text
src/                         mobile product UI and Supabase browser client
public/assets/the-well/      production-owned editorial images
supabase/migrations/         schema, RLS, roles, audit, approval gate
supabase/functions/          server-only agent runner
supabase/snippets/           opt-in scheduled draft generation
tests/                       runtime and security-contract tests
docs/                        CTO, security, AI, deployment documentation
```
