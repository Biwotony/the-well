-- These are behavioral checks executed against real PostgreSQL, not regex checks.
insert into auth.users(id) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
update public.user_roles set role='editor'
where user_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

-- Seed data must remain draft under the corrected publication gate.
do $$ begin
  if (select status from public.story_series where slug='learning-to-stay') <> 'draft' then
    raise exception 'seed leaked a published series';
  end if;
  if (select status from public.journeys where slug='a-more-present-love') <> 'draft' then
    raise exception 'seed leaked a published journey';
  end if;
end $$;

select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', false);
set role authenticated;
do $$ begin
  begin
    insert into public.story_submissions
      (author_id, working_title, body, pen_name, private_review_consent, status)
    values
      ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Unauthorized submission',
       repeat('Sensitive story text. ', 12), 'Writer', true, 'accepted');
    raise exception 'SUBMISSION_INSERT_BYPASS';
  exception when insufficient_privilege then
    null;
  end;
end $$;
reset role;

select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', false);
set role authenticated;
do $$ begin
  begin
    insert into public.story_series(id, slug, title, summary, status)
    values ('44444444-4444-4444-8444-444444444444',
            'bypass-story', 'Bypass story',
            'A summary that is long enough for the check constraint.', 'published');
    raise exception 'PUBLISHED_INSERT_BYPASS';
  exception when others then
    if sqlerrm not like '%new content must begin as an unapproved draft%' then raise; end if;
  end;
end $$;

insert into public.story_series(id, slug, title, summary, status)
values ('44444444-4444-4444-8444-444444444444',
        'reviewed-story', 'Reviewed story',
        'A summary that is long enough for the check constraint.', 'draft');
update public.story_series set status='in_review'
where id='44444444-4444-4444-8444-444444444444';
update public.story_series set status='published'
where id='44444444-4444-4444-8444-444444444444';

do $$ begin
  if not exists (select 1 from public.editorial_audit
    where entity_id='44444444-4444-4444-8444-444444444444'
      and action='human_publish_approval') then
    raise exception 'successful publish lacked audit log';
  end if;
end $$;

update public.story_series set status='archived'
where id='44444444-4444-4444-8444-444444444444';
update public.story_series set status='draft'
where id='44444444-4444-4444-8444-444444444444';

do $$ begin
  if exists (select 1 from public.story_series
    where id='44444444-4444-4444-8444-444444444444'
      and (approved_by is not null or approved_at is not null or published_at is not null)) then
    raise exception 'archive to draft did not reset approval';
  end if;
end $$;
update public.story_series set title='Revised reviewed story'
where id='44444444-4444-4444-8444-444444444444';
update public.story_series set status='in_review'
where id='44444444-4444-4444-8444-444444444444';
update public.story_series set status='published'
where id='44444444-4444-4444-8444-444444444444';

insert into public.journeys(id,slug,title,summary,duration_days,status)
values('55555555-5555-4555-8555-555555555555',
       'gated-journey','Gated journey','A safe journey for tests.',14,'draft');
insert into public.journey_steps(journey_id,step_number,title,description)
values('55555555-5555-4555-8555-555555555555',1,'Starting point','Begin with care.');
update public.journeys set status='in_review'
where id='55555555-5555-4555-8555-555555555555';
update public.journeys set status='published'
where id='55555555-5555-4555-8555-555555555555';

do $$ begin
  begin
    insert into public.journey_steps(journey_id,step_number,title,description)
    values('55555555-5555-4555-8555-555555555555',2,'Unauthorized edit','Must not succeed.');
    raise exception 'JOURNEY_STEP_BYPASS';
  exception when others then
    if sqlerrm not like '%journey steps cannot change%' then raise; end if;
  end;
end $$;
reset role;

-- A member must not see editorial drafts.
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', false);
set role authenticated;
do $$ begin
  if exists (select 1 from public.story_series where slug='learning-to-stay') then
    raise exception 'member can read an unpublished draft';
  end if;
  if not exists (select 1 from public.story_series where slug='reviewed-story') then
    raise exception 'member cannot read a properly published story';
  end if;
end $$;
reset role;
select 'BEHAVIORAL SECURITY TESTS PASSED' as result;
