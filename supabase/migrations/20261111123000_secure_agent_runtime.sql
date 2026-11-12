-- Secure, fail-closed runtime for human-supervised AI editorial assistance.
-- This migration does not enable budgets, schedules, or model spending.

alter table public.agent_budgets
  add column if not exists max_input_tokens integer not null default 12000 check (max_input_tokens between 256 and 50000),
  add column if not exists max_output_tokens integer not null default 4000 check (max_output_tokens between 128 and 16000),
  add column if not exists max_model_calls integer not null default 1 check (max_model_calls between 1 and 3);

alter table public.agent_runs
  add column if not exists idempotency_key text,
  add column if not exists request_fingerprint text,
  add column if not exists reserved_cost_usd numeric(10, 6) not null default 0 check (reserved_cost_usd >= 0),
  add column if not exists input_tokens integer check (input_tokens >= 0),
  add column if not exists output_tokens integer check (output_tokens >= 0),
  add column if not exists model_calls integer not null default 0 check (model_calls >= 0),
  add column if not exists provider_generation_id text,
  add column if not exists knowledge_citations jsonb not null default '[]'::jsonb,
  add column if not exists validation_errors jsonb not null default '[]'::jsonb;

create unique index if not exists agent_runs_idempotency_idx
  on public.agent_runs (agent, idempotency_key)
  where idempotency_key is not null;

create unique index if not exists agent_runs_one_active_per_agent_idx
  on public.agent_runs (agent)
  where status in ('queued', 'running');

alter table public.story_series
  add column if not exists agent_run_id uuid references public.agent_runs(id) on delete set null;

alter table public.story_episodes
  add column if not exists agent_run_id uuid references public.agent_runs(id) on delete set null;

create index if not exists story_series_agent_run_idx on public.story_series (agent_run_id)
  where agent_run_id is not null;
create index if not exists story_episodes_agent_run_idx on public.story_episodes (agent_run_id)
  where agent_run_id is not null;

drop policy if exists "agent_runs_editor_insert" on public.agent_runs;
revoke insert on public.agent_runs from authenticated;

create table if not exists app_private.agent_global_budget (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false,
  daily_limit_usd numeric(10, 4) not null default 0 check (daily_limit_usd >= 0),
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

insert into app_private.agent_global_budget (singleton, enabled, daily_limit_usd)
values (true, false, 0)
on conflict (singleton) do nothing;

create index if not exists agent_global_budget_updated_by_idx
  on app_private.agent_global_budget (updated_by)
  where updated_by is not null;

revoke all on app_private.agent_global_budget from public, anon, authenticated;
grant select, update on app_private.agent_global_budget to service_role;

create or replace function public.reserve_agent_run(
  p_agent public.agent_type,
  p_requested_by uuid,
  p_input jsonb,
  p_model text,
  p_idempotency_key text,
  p_request_fingerprint text,
  p_reserved_cost_usd numeric,
  p_scheduled boolean default false
)
returns table (run_id uuid, run_status public.agent_run_status, duplicate boolean)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  existing public.agent_runs%rowtype;
  per_agent public.agent_budgets%rowtype;
  global_budget app_private.agent_global_budget%rowtype;
  agent_spend numeric := 0;
  global_spend numeric := 0;
  created_id uuid;
begin
  if p_scheduled then
    raise exception 'scheduled_agent_runs_disabled';
  end if;
  if p_requested_by is null then
    raise exception 'requested_by_required';
  end if;
  if coalesce(length(trim(p_idempotency_key)), 0) < 8 or length(p_idempotency_key) > 128 then
    raise exception 'invalid_idempotency_key';
  end if;
  if coalesce(length(trim(p_request_fingerprint)), 0) <> 64 then
    raise exception 'invalid_request_fingerprint';
  end if;
  if coalesce(length(trim(p_model)), 0) = 0 or length(p_model) > 160 then
    raise exception 'invalid_model';
  end if;
  if p_reserved_cost_usd is null or p_reserved_cost_usd <= 0 then
    raise exception 'pricing_not_configured';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('agent-global-budget', 0));
  perform pg_advisory_xact_lock(hashtextextended('agent-budget:' || p_agent::text, 0));

  select * into existing
  from public.agent_runs
  where agent = p_agent and idempotency_key = p_idempotency_key
  limit 1;

  if found then
    if existing.request_fingerprint is distinct from p_request_fingerprint then
      raise exception 'idempotency_key_reused_with_different_request';
    end if;
    return query select existing.id, existing.status, true;
    return;
  end if;

  if exists (
    select 1 from public.agent_runs
    where agent = p_agent and status in ('queued', 'running')
  ) then
    raise exception 'agent_run_already_active';
  end if;

  select * into per_agent
  from public.agent_budgets
  where agent = p_agent
  for update;
  if not found or not per_agent.enabled then
    raise exception 'agent_disabled';
  end if;

  select * into global_budget
  from app_private.agent_global_budget
  where singleton
  for update;
  if not found or not global_budget.enabled then
    raise exception 'global_agent_budget_disabled';
  end if;

  select coalesce(sum(
    case when status in ('queued', 'running') then reserved_cost_usd
         when status = 'succeeded' then coalesce(actual_cost_usd, reserved_cost_usd)
         else 0 end
  ), 0)
  into agent_spend
  from public.agent_runs
  where agent = p_agent and created_at >= date_trunc('day', now());

  select coalesce(sum(
    case when status in ('queued', 'running') then reserved_cost_usd
         when status = 'succeeded' then coalesce(actual_cost_usd, reserved_cost_usd)
         else 0 end
  ), 0)
  into global_spend
  from public.agent_runs
  where created_at >= date_trunc('day', now());

  if agent_spend + p_reserved_cost_usd > per_agent.daily_limit_usd then
    raise exception 'agent_daily_budget_exhausted';
  end if;
  if global_spend + p_reserved_cost_usd > global_budget.daily_limit_usd then
    raise exception 'global_daily_budget_exhausted';
  end if;

  insert into public.agent_runs (
    agent, status, scheduled, requested_by, input, model, idempotency_key,
    request_fingerprint, reserved_cost_usd, model_calls, started_at
  ) values (
    p_agent, 'running', false, p_requested_by, coalesce(p_input, '{}'::jsonb), p_model,
    p_idempotency_key, p_request_fingerprint, p_reserved_cost_usd, 0, now()
  ) returning id into created_id;

  return query select created_id, 'running'::public.agent_run_status, false;
end;
$$;

create or replace function public.complete_agent_run(
  p_run_id uuid,
  p_output jsonb,
  p_actual_cost_usd numeric,
  p_input_tokens integer,
  p_output_tokens integer,
  p_provider_generation_id text,
  p_knowledge_citations jsonb
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  current_run public.agent_runs%rowtype;
  limits public.agent_budgets%rowtype;
begin
  select * into current_run from public.agent_runs where id = p_run_id for update;
  if not found then raise exception 'agent_run_not_found'; end if;
  if current_run.status = 'succeeded' then return; end if;
  if current_run.status <> 'running' then raise exception 'agent_run_not_active'; end if;

  select * into limits from public.agent_budgets where agent = current_run.agent;
  if p_input_tokens is null or p_output_tokens is null then raise exception 'usage_missing'; end if;
  if p_input_tokens > limits.max_input_tokens or p_output_tokens > limits.max_output_tokens then
    raise exception 'usage_exceeded_run_limit';
  end if;
  if p_actual_cost_usd is null or p_actual_cost_usd < 0 then raise exception 'actual_cost_missing'; end if;
  if p_actual_cost_usd > current_run.reserved_cost_usd + 0.000001 then
    raise exception 'actual_cost_exceeded_reservation';
  end if;

  update public.agent_runs set
    status = 'succeeded',
    output = p_output,
    actual_cost_usd = p_actual_cost_usd,
    input_tokens = p_input_tokens,
    output_tokens = p_output_tokens,
    model_calls = 1,
    provider_generation_id = nullif(left(p_provider_generation_id, 200), ''),
    knowledge_citations = coalesce(p_knowledge_citations, '[]'::jsonb),
    finished_at = now()
  where id = p_run_id;
end;
$$;

create or replace function public.fail_agent_run(
  p_run_id uuid,
  p_error_code text,
  p_validation_errors jsonb default '[]'::jsonb
)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  update public.agent_runs set
    status = 'failed',
    error_message = left(coalesce(p_error_code, 'agent_run_failed'), 300),
    validation_errors = coalesce(p_validation_errors, '[]'::jsonb),
    actual_cost_usd = 0,
    finished_at = now()
  where id = p_run_id and status in ('queued', 'running');
$$;

create or replace function public.store_content_factory_draft(
  p_run_id uuid,
  p_slug text,
  p_title text,
  p_summary text,
  p_featured_quote text,
  p_sensitive_topics text[],
  p_episode_title text,
  p_episode_excerpt text,
  p_episode_body text,
  p_reading_minutes integer
)
returns table (series_id uuid, episode_id uuid)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  current_run public.agent_runs%rowtype;
  created_series uuid;
  created_episode uuid;
begin
  select * into current_run from public.agent_runs where id = p_run_id for update;
  if not found or current_run.agent <> 'content_factory' or current_run.status <> 'running' then
    raise exception 'content_factory_run_not_active';
  end if;
  if current_run.requested_by is null then raise exception 'human_requester_required'; end if;

  insert into public.story_series (
    slug, title, summary, featured_quote, sensitive_topics, status, origin,
    created_by, agent_run_id
  ) values (
    p_slug, left(p_title, 140), left(p_summary, 1000), nullif(p_featured_quote, ''),
    coalesce(p_sensitive_topics, '{}'), 'draft', 'agent', current_run.requested_by, p_run_id
  ) returning id into created_series;

  insert into public.story_episodes (
    series_id, episode_number, title, excerpt, body, reading_minutes, status,
    origin, created_by, agent_run_id
  ) values (
    created_series, 1, left(p_episode_title, 180), p_episode_excerpt, p_episode_body,
    greatest(1, least(coalesce(p_reading_minutes, 6), 90)), 'draft', 'agent',
    current_run.requested_by, p_run_id
  ) returning id into created_episode;

  return query select created_series, created_episode;
end;
$$;

revoke all on function public.reserve_agent_run(public.agent_type, uuid, jsonb, text, text, text, numeric, boolean) from public, anon, authenticated;
revoke all on function public.complete_agent_run(uuid, jsonb, numeric, integer, integer, text, jsonb) from public, anon, authenticated;
revoke all on function public.fail_agent_run(uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.store_content_factory_draft(uuid, text, text, text, text, text[], text, text, text, integer) from public, anon, authenticated;
grant execute on function public.reserve_agent_run(public.agent_type, uuid, jsonb, text, text, text, numeric, boolean) to service_role;
grant execute on function public.complete_agent_run(uuid, jsonb, numeric, integer, integer, text, jsonb) to service_role;
grant execute on function public.fail_agent_run(uuid, text, jsonb) to service_role;
grant execute on function public.store_content_factory_draft(uuid, text, text, text, text, text[], text, text, text, integer) to service_role;

alter table public.kb_chunks
  add column if not exists embedding_claim_token uuid,
  add column if not exists embedding_attempt_count integer not null default 0 check (embedding_attempt_count >= 0),
  add column if not exists embedding_last_error text,
  add column if not exists embedding_model text,
  add column if not exists embedding_dimensions integer check (embedding_dimensions > 0),
  add column if not exists embedding_completed_at timestamptz;

update public.kb_chunks set
  embedding_model = coalesce(embedding_model, 'gte-small'),
  embedding_dimensions = coalesce(embedding_dimensions, 384)
where embedding is not null;

drop function if exists public.claim_kb_embedding_chunks(integer);

create function public.claim_kb_embedding_chunks(batch_size integer default 2)
returns table (id bigint, content text, claim_token uuid, attempt_count integer)
language sql
volatile
security definer
set search_path = ''
as $$
  with pending as (
    select c.id
    from public.kb_chunks c
    join public.kb_documents d on d.id = c.document_id
    where c.embedding is null
      and d.is_active
      and d.ingestion_policy = 'production_rag'
      and d.license_status = 'public_domain_us'
      and c.embedding_attempt_count < 3
      and (
        c.embedding_claimed_at is null
        or c.embedding_claimed_at < now() - interval '10 minutes'
      )
    order by c.id
    for update skip locked
    limit greatest(1, least(coalesce(batch_size, 2), 5))
  ), claimed as (
    update public.kb_chunks c set
      embedding_claimed_at = now(),
      embedding_claim_token = gen_random_uuid(),
      embedding_attempt_count = c.embedding_attempt_count + 1,
      embedding_last_error = null
    from pending
    where c.id = pending.id
    returning c.id, c.content, c.embedding_claim_token, c.embedding_attempt_count
  )
  select claimed.id, claimed.content, claimed.embedding_claim_token, claimed.embedding_attempt_count
  from claimed order by claimed.id;
$$;

create or replace function public.complete_kb_embedding_chunk(
  p_id bigint,
  p_claim_token uuid,
  p_embedding extensions.vector(384),
  p_model text
)
returns boolean
language sql
volatile
security definer
set search_path = ''
as $$
  with updated as (
    update public.kb_chunks set
      embedding = p_embedding,
      embedding_claimed_at = null,
      embedding_claim_token = null,
      embedding_last_error = null,
      embedding_model = left(p_model, 120),
      embedding_dimensions = extensions.vector_dims(p_embedding),
      embedding_completed_at = now()
    where id = p_id and embedding_claim_token = p_claim_token and embedding is null
    returning 1
  ) select exists(select 1 from updated);
$$;

create or replace function public.fail_kb_embedding_chunk(
  p_id bigint,
  p_claim_token uuid,
  p_error_code text
)
returns boolean
language sql
volatile
security definer
set search_path = ''
as $$
  with updated as (
    update public.kb_chunks set
      embedding_claimed_at = null,
      embedding_claim_token = null,
      embedding_last_error = left(coalesce(p_error_code, 'embedding_failed'), 300)
    where id = p_id and embedding_claim_token = p_claim_token and embedding is null
    returning 1
  ) select exists(select 1 from updated);
$$;

revoke all on function public.claim_kb_embedding_chunks(integer) from public, anon, authenticated;
revoke all on function public.complete_kb_embedding_chunk(bigint, uuid, extensions.vector, text) from public, anon, authenticated;
revoke all on function public.fail_kb_embedding_chunk(bigint, uuid, text) from public, anon, authenticated;
grant execute on function public.claim_kb_embedding_chunks(integer) to service_role;
grant execute on function public.complete_kb_embedding_chunk(bigint, uuid, extensions.vector, text) to service_role;
grant execute on function public.fail_kb_embedding_chunk(bigint, uuid, text) to service_role;

comment on function public.reserve_agent_run(public.agent_type, uuid, jsonb, text, text, text, numeric, boolean) is
  'Atomically reserves per-agent and global budget before one human-requested run.';
comment on function public.store_content_factory_draft(uuid, text, text, text, text, text[], text, text, text, integer) is
  'Stores a generated series and episode as private agent drafts in one transaction.';
comment on function public.claim_kb_embedding_chunks(integer) is
  'Claims a bounded, licensed production-RAG embedding batch with retry and stale-worker protection.';
