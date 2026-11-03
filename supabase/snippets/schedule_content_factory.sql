-- OPTIONAL, HUMAN-APPROVED SETUP. Do not run until the agent budget is enabled
-- and the two Vault secrets below have been created in the Supabase dashboard:
--   agent_function_url: https://<project-ref>.supabase.co/functions/v1/agent-runner
--   agent_schedule_secret: a long random value also set as AGENT_SCHEDULE_SECRET
-- This schedules one private draft per week. It never publishes content.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'the-well-weekly-content-draft',
  '0 9 * * 1',
  $$
  select net.http_post(
    url := (
      select decrypted_secret
      from vault.decrypted_secrets
      where name = 'agent_function_url'
      limit 1
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-agent-schedule-secret', (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'agent_schedule_secret'
        limit 1
      )
    ),
    body := jsonb_build_object(
      'agent', 'content_factory',
      'scheduled', true,
      'input', jsonb_build_object(
        'brief', 'One relationship-growth story draft grounded in listening, repair, or spiritual formation',
        'audience', 'Christian adults',
        'safety', 'No diagnosis, coercion, shame, or unverified personal data'
      )
    ),
    timeout_milliseconds := 15000
  );
  $$
);
