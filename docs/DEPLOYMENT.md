# Deployment Runbook

No external project is created or billed by this repository. Complete each stage deliberately.

## 1. GitHub

Create a private repository named `the-well`, add it as `origin`, and push `main`. Enable secret scanning and branch protection when available. The included CI workflow checks runtime integrity, TypeScript, security contracts, browser flows, and production build.

## 2. Supabase Free

Create the project in the nearest acceptable region. Link the CLI, apply migrations, and inspect advisors. Configure the production site URL and exact preview redirect URLs for Magic Links. Use the `sb_publishable_...` browser key; keep the service-role key only in Supabase-managed Edge Function secrets.

Deploy the agent runner only after reviewing its model/provider configuration. Budgets remain disabled after migration.

## 3. Scheduled drafts

Create Vault secrets named `agent_function_url` and `agent_schedule_secret`. Set the same schedule secret on the Edge Function. Enable only the Content Factory budget, then review and run `supabase/snippets/schedule_content_factory.sql`. This creates a weekly private draft and no publication action.

Pausing is immediate:

```sql
select cron.alter_job(
  job_id := (select jobid from cron.job where jobname = 'the-well-weekly-content-draft'),
  active := false
);
```

## 4. Web hosting

The repository supports:

- Vercel Hobby: build command `pnpm build`, output `dist/client`.
- OpenAI Sites: run `pnpm build` and `pnpm test:sites`; the protected template produces the required worker and hosting metadata.

Set only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in browser build environments.

## 5. Release gate

Before production:

1. Pass `pnpm typecheck`, `pnpm test`, `pnpm build`, and `pnpm test:sites`.
2. Run Supabase advisors and verify RLS with anon/member/editor accounts.
3. Test Magic Link redirect on the exact production origin.
4. Test submission withdrawal and human publication approval.
5. Keep all agent schedules disabled until evaluation and budget approval are signed off.
