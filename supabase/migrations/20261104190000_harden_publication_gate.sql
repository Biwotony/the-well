-- PR 3 launch hardening. This migration is intentionally committed for review
-- and must not be applied to production without explicit change approval.

create or replace function app_private.enforce_publish_gate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  actor_is_editor boolean := false;
begin
  if tg_op = 'INSERT' then
    if new.status <> 'draft'
       or new.approved_by is not null
       or new.approved_at is not null
       or new.published_at is not null then
      raise exception 'new content must begin as an unapproved draft';
    end if;
    return new;
  end if;

  if old.status = 'archived' and new.status = 'draft' then
    new.approved_by := null;
    new.approved_at := null;
    new.published_at := null;
  end if;

  if (old.status <> 'archived' or new.status <> 'draft') and (
     new.approved_by is distinct from old.approved_by
     or new.approved_at is distinct from old.approved_at
     or new.published_at is distinct from old.published_at) then
    raise exception 'approval metadata is managed by the publication gate';
  end if;

  if old.status = 'published' and new.status = 'published'
     and (to_jsonb(new) - array['updated_at']) is distinct from (to_jsonb(old) - array['updated_at']) then
    raise exception 'published content must be archived and reviewed before editing';
  end if;

  if new.status is distinct from old.status then
    if not (
      (old.status = 'draft' and new.status = 'in_review')
      or (old.status = 'in_review' and new.status in ('draft', 'approved', 'published'))
      or (old.status = 'approved' and new.status in ('draft', 'in_review', 'published'))
      or (old.status = 'published' and new.status = 'archived')
      or (old.status = 'archived' and new.status = 'draft')
    ) then
      raise exception 'invalid editorial status transition from % to %', old.status, new.status;
    end if;

    if new.status = 'published' then
      actor_is_editor := actor is not null
        and app_private.has_role(array['editor', 'admin']::public.app_role[]);
      if not actor_is_editor then
        raise exception 'human editor approval required';
      end if;
      if old.approved_by is not null or old.approved_at is not null or old.published_at is not null then
        raise exception 'content contains forged or stale approval metadata';
      end if;

      new.approved_by := actor;
      new.approved_at := now();
      new.published_at := now();
    end if;
  end if;

  return new;
end;
$$;

revoke all on function app_private.enforce_publish_gate() from public, anon, authenticated;

drop trigger if exists story_series_publish_gate on public.story_series;
drop trigger if exists story_episode_publish_gate on public.story_episodes;
drop trigger if exists challenge_publish_gate on public.challenges;
drop trigger if exists journey_publish_gate on public.journeys;

create trigger story_series_publish_gate before insert or update on public.story_series
for each row execute function app_private.enforce_publish_gate();
create trigger story_episode_publish_gate before insert or update on public.story_episodes
for each row execute function app_private.enforce_publish_gate();
create trigger challenge_publish_gate before insert or update on public.challenges
for each row execute function app_private.enforce_publish_gate();
create trigger journey_publish_gate before insert or update on public.journeys
for each row execute function app_private.enforce_publish_gate();

-- Prevent changes to the steps of live or approved journeys.
create or replace function app_private.enforce_journey_steps_gate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_journey uuid;
begin
  if tg_op = 'UPDATE' and new.journey_id is distinct from old.journey_id then
    raise exception 'moving steps between journeys is not allowed';
  end if;
  target_journey := case when tg_op = 'DELETE' then old.journey_id else new.journey_id end;
  perform 1 from public.journeys where id = target_journey and status in ('published', 'approved', 'in_review') for update;
  if found then
    raise exception 'journey steps cannot change while journey is in review, approved, or published';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;
revoke all on function app_private.enforce_journey_steps_gate() from public, anon, authenticated;
drop trigger if exists journey_steps_gate on public.journey_steps;
create trigger journey_steps_gate before insert or update or delete on public.journey_steps
for each row execute function app_private.enforce_journey_steps_gate();
