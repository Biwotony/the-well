-- THE WELL initial schema
-- Security model: public reads only published content; members own their progress
-- and submissions; editors review; only a human editor can cross the publish gate.

create extension if not exists pgcrypto with schema extensions;

create type public.app_role as enum ('member', 'moderator', 'editor', 'admin');
create type public.content_status as enum ('draft', 'in_review', 'approved', 'published', 'archived');
create type public.submission_status as enum ('submitted', 'screening', 'needs_consent', 'accepted', 'declined', 'withdrawn');
create type public.agent_type as enum ('story_intelligence', 'content_factory', 'growth_retention', 'chief_operator');
create type public.agent_run_status as enum ('queued', 'running', 'succeeded', 'failed', 'cancelled');
create type public.content_origin as enum ('human', 'agent');

create schema if not exists app_private;
revoke all on schema app_private from public;
grant usage on schema app_private to authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (char_length(display_name) between 1 and 80),
  level integer not null default 1 check (level between 1 and 100),
  points integer not null default 0 check (points >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'member',
  granted_by uuid references auth.users(id),
  granted_at timestamptz not null default now()
);

create table public.story_series (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 3 and 140),
  summary text not null check (char_length(summary) between 20 and 1000),
  featured_quote text,
  cover_url text,
  sensitive_topics text[] not null default '{}',
  status public.content_status not null default 'draft',
  origin public.content_origin not null default 'human',
  created_by uuid references auth.users(id),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.story_episodes (
  id uuid primary key default gen_random_uuid(),
  series_id uuid not null references public.story_series(id) on delete cascade,
  episode_number integer not null check (episode_number > 0),
  title text not null check (char_length(title) between 3 and 180),
  excerpt text not null,
  body text not null,
  reading_minutes integer not null default 6 check (reading_minutes between 1 and 90),
  status public.content_status not null default 'draft',
  origin public.content_origin not null default 'human',
  created_by uuid references auth.users(id),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(series_id, episode_number)
);

create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  prompt text not null,
  scripture_reference text,
  estimated_minutes integer not null default 6 check (estimated_minutes between 1 and 60),
  level_required integer not null default 1 check (level_required between 1 and 100),
  points_reward integer not null default 20 check (points_reward between 0 and 1000),
  status public.content_status not null default 'draft',
  origin public.content_origin not null default 'human',
  created_by uuid references auth.users(id),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.journeys (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  summary text not null,
  duration_days integer not null check (duration_days between 1 and 365),
  status public.content_status not null default 'draft',
  origin public.content_origin not null default 'human',
  created_by uuid references auth.users(id),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.journey_steps (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid not null references public.journeys(id) on delete cascade,
  step_number integer not null check (step_number > 0),
  title text not null,
  description text not null,
  challenge_id uuid references public.challenges(id),
  unique(journey_id, step_number)
);

create table public.journey_enrollments (
  user_id uuid not null references auth.users(id) on delete cascade,
  journey_id uuid not null references public.journeys(id) on delete cascade,
  current_step integer not null default 1 check (current_step > 0),
  completed_steps integer not null default 0 check (completed_steps >= 0),
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(user_id, journey_id)
);

create table public.challenge_completions (
  user_id uuid not null references auth.users(id) on delete cascade,
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  reflection text,
  points_awarded integer not null default 0 check (points_awarded >= 0),
  completed_at timestamptz not null default now(),
  primary key(user_id, challenge_id)
);

create table public.story_submissions (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  working_title text not null check (char_length(working_title) between 3 and 180),
  body text not null check (char_length(body) between 100 and 30000),
  pen_name text not null check (char_length(pen_name) between 1 and 80),
  private_review_consent boolean not null check (private_review_consent),
  publication_consent_at timestamptz,
  status public.submission_status not null default 'submitted',
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.moderation_events (
  id bigint generated always as identity primary key,
  submission_id uuid not null references public.story_submissions(id) on delete cascade,
  moderator_id uuid not null references auth.users(id),
  from_status public.submission_status,
  to_status public.submission_status not null,
  private_note text,
  created_at timestamptz not null default now()
);

create table public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  agent public.agent_type not null,
  status public.agent_run_status not null default 'queued',
  scheduled boolean not null default false,
  requested_by uuid references auth.users(id),
  input jsonb not null default '{}'::jsonb,
  output jsonb,
  model text,
  estimated_cost_usd numeric(10, 6) not null default 0 check (estimated_cost_usd >= 0),
  actual_cost_usd numeric(10, 6) check (actual_cost_usd >= 0),
  error_message text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.agent_budgets (
  agent public.agent_type primary key,
  daily_limit_usd numeric(10, 4) not null default 0.25 check (daily_limit_usd >= 0),
  enabled boolean not null default false,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

create table public.editorial_audit (
  id bigint generated always as identity primary key,
  entity_table text not null,
  entity_id uuid not null,
  action text not null,
  actor_id uuid not null references auth.users(id),
  old_status public.content_status,
  new_status public.content_status,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index story_series_public_idx on public.story_series(status, published_at desc);
create index story_episodes_series_idx on public.story_episodes(series_id, episode_number);
create index challenges_public_idx on public.challenges(status, level_required);
create index submissions_review_idx on public.story_submissions(status, submitted_at);
create index agent_runs_queue_idx on public.agent_runs(status, created_at) where status = 'queued';

create or replace function app_private.has_role(allowed_roles public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = (select auth.uid())
      and role = any(allowed_roles)
  );
$$;

revoke all on function app_private.has_role(public.app_role[]) from public;
grant execute on function app_private.has_role(public.app_role[]) to authenticated;

create or replace function app_private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function app_private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'display_name', ''));
  insert into public.user_roles (user_id, role)
  values (new.id, 'member');
  return new;
end;
$$;

revoke all on function app_private.handle_new_user() from public;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function app_private.handle_new_user();

create or replace function app_private.enforce_publish_gate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'published' and old.status is distinct from 'published' then
    if old.status <> 'in_review' then
      raise exception 'content must be in_review before publication';
    end if;
    if (select auth.uid()) is null
       or not app_private.has_role(array['editor', 'admin']::public.app_role[]) then
      raise exception 'human editor approval required';
    end if;
    if new.approved_by is distinct from (select auth.uid()) or new.approved_at is null then
      raise exception 'approved_by must match the current editor';
    end if;
    new.published_at = coalesce(new.published_at, now());
  end if;
  return new;
end;
$$;

revoke all on function app_private.enforce_publish_gate() from public;

create or replace function app_private.audit_publication()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    insert into public.editorial_audit (
      entity_table, entity_id, action, actor_id, old_status, new_status, metadata
    ) values (
      tg_table_name,
      new.id,
      case when new.status = 'published' then 'human_publish_approval' else 'status_change' end,
      (select auth.uid()),
      old.status,
      new.status,
      jsonb_build_object('origin', new.origin)
    );
  end if;
  return new;
end;
$$;

revoke all on function app_private.audit_publication() from public;

create trigger story_series_publish_gate before update on public.story_series
for each row execute function app_private.enforce_publish_gate();
create trigger story_episode_publish_gate before update on public.story_episodes
for each row execute function app_private.enforce_publish_gate();
create trigger challenge_publish_gate before update on public.challenges
for each row execute function app_private.enforce_publish_gate();
create trigger journey_publish_gate before update on public.journeys
for each row execute function app_private.enforce_publish_gate();

create trigger story_series_audit after update on public.story_series
for each row execute function app_private.audit_publication();
create trigger story_episode_audit after update on public.story_episodes
for each row execute function app_private.audit_publication();
create trigger challenge_audit after update on public.challenges
for each row execute function app_private.audit_publication();
create trigger journey_audit after update on public.journeys
for each row execute function app_private.audit_publication();

create trigger profiles_touch before update on public.profiles
for each row execute function app_private.touch_updated_at();
create trigger series_touch before update on public.story_series
for each row execute function app_private.touch_updated_at();
create trigger episodes_touch before update on public.story_episodes
for each row execute function app_private.touch_updated_at();
create trigger challenges_touch before update on public.challenges
for each row execute function app_private.touch_updated_at();
create trigger journeys_touch before update on public.journeys
for each row execute function app_private.touch_updated_at();
create trigger enrollments_touch before update on public.journey_enrollments
for each row execute function app_private.touch_updated_at();
create trigger submissions_touch before update on public.story_submissions
for each row execute function app_private.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.story_series enable row level security;
alter table public.story_episodes enable row level security;
alter table public.challenges enable row level security;
alter table public.journeys enable row level security;
alter table public.journey_steps enable row level security;
alter table public.journey_enrollments enable row level security;
alter table public.challenge_completions enable row level security;
alter table public.story_submissions enable row level security;
alter table public.moderation_events enable row level security;
alter table public.agent_runs enable row level security;
alter table public.agent_budgets enable row level security;
alter table public.editorial_audit enable row level security;

create policy "profiles_select_own" on public.profiles for select to authenticated
using ((select auth.uid()) = id or app_private.has_role(array['moderator','editor','admin']::public.app_role[]));
create policy "profiles_update_own" on public.profiles for update to authenticated
using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "roles_select_own_or_admin" on public.user_roles for select to authenticated
using ((select auth.uid()) = user_id or app_private.has_role(array['admin']::public.app_role[]));

create policy "series_public_read" on public.story_series for select to anon, authenticated
using (status = 'published' and published_at <= now());
create policy "series_editor_all" on public.story_series for all to authenticated
using (app_private.has_role(array['editor','admin']::public.app_role[]))
with check (app_private.has_role(array['editor','admin']::public.app_role[]));

create policy "episodes_public_read" on public.story_episodes for select to anon, authenticated
using (
  status = 'published' and published_at <= now()
  and exists (
    select 1 from public.story_series s
    where s.id = series_id and s.status = 'published' and s.published_at <= now()
  )
);
create policy "episodes_editor_all" on public.story_episodes for all to authenticated
using (app_private.has_role(array['editor','admin']::public.app_role[]))
with check (app_private.has_role(array['editor','admin']::public.app_role[]));

create policy "challenges_public_read" on public.challenges for select to anon, authenticated
using (status = 'published' and published_at <= now());
create policy "challenges_editor_all" on public.challenges for all to authenticated
using (app_private.has_role(array['editor','admin']::public.app_role[]))
with check (app_private.has_role(array['editor','admin']::public.app_role[]));

create policy "journeys_public_read" on public.journeys for select to anon, authenticated
using (status = 'published' and published_at <= now());
create policy "journeys_editor_all" on public.journeys for all to authenticated
using (app_private.has_role(array['editor','admin']::public.app_role[]))
with check (app_private.has_role(array['editor','admin']::public.app_role[]));

create policy "steps_public_read" on public.journey_steps for select to anon, authenticated
using (exists (
  select 1 from public.journeys j
  where j.id = journey_id and j.status = 'published' and j.published_at <= now()
));
create policy "steps_editor_all" on public.journey_steps for all to authenticated
using (app_private.has_role(array['editor','admin']::public.app_role[]))
with check (app_private.has_role(array['editor','admin']::public.app_role[]));

create policy "enrollments_own" on public.journey_enrollments for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "completions_own" on public.challenge_completions for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "submissions_insert_own" on public.story_submissions for insert to authenticated
with check ((select auth.uid()) = author_id and private_review_consent);
create policy "submissions_read_own" on public.story_submissions for select to authenticated
using ((select auth.uid()) = author_id or app_private.has_role(array['moderator','editor','admin']::public.app_role[]));
create policy "submissions_editor_update" on public.story_submissions for update to authenticated
using (app_private.has_role(array['moderator','editor','admin']::public.app_role[]))
with check (app_private.has_role(array['moderator','editor','admin']::public.app_role[]));

create policy "moderation_editor_all" on public.moderation_events for all to authenticated
using (app_private.has_role(array['moderator','editor','admin']::public.app_role[]))
with check (app_private.has_role(array['moderator','editor','admin']::public.app_role[]) and moderator_id = (select auth.uid()));

create policy "agent_runs_editor_read" on public.agent_runs for select to authenticated
using (app_private.has_role(array['editor','admin']::public.app_role[]));
create policy "agent_runs_editor_insert" on public.agent_runs for insert to authenticated
with check (
  app_private.has_role(array['editor','admin']::public.app_role[])
  and requested_by = (select auth.uid())
  and status = 'queued'
);
create policy "agent_budgets_admin" on public.agent_budgets for all to authenticated
using (app_private.has_role(array['admin']::public.app_role[]))
with check (app_private.has_role(array['admin']::public.app_role[]));
create policy "audit_editor_read" on public.editorial_audit for select to authenticated
using (app_private.has_role(array['editor','admin']::public.app_role[]));

revoke all on all tables in schema public from anon, authenticated;
grant select on public.story_series, public.story_episodes, public.challenges, public.journeys, public.journey_steps to anon, authenticated;
grant select on public.profiles, public.user_roles to authenticated;
grant update(display_name) on public.profiles to authenticated;
grant select, insert, update on public.journey_enrollments, public.challenge_completions to authenticated;
grant select, insert, update on public.story_submissions to authenticated;
grant select, insert, update on public.story_series, public.story_episodes, public.challenges, public.journeys, public.journey_steps to authenticated;
grant select, insert on public.moderation_events, public.agent_runs to authenticated;
grant select, insert, update on public.agent_budgets to authenticated;
grant select on public.editorial_audit to authenticated;
grant usage, select on all sequences in schema public to authenticated;

insert into public.agent_budgets (agent, daily_limit_usd, enabled) values
  ('story_intelligence', 0.20, false),
  ('content_factory', 0.35, false),
  ('growth_retention', 0.15, false),
  ('chief_operator', 0.20, false);
