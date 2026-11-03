insert into public.story_series (
  id, slug, title, summary, featured_quote, cover_url, status, origin, approved_at, published_at
) values (
  '11111111-1111-4111-8111-111111111111',
  'learning-to-stay',
  'Learning to Stay',
  'Maya and Jordan learn to hear the fear beneath familiar conflict and choose curiosity over winning.',
  'We stopped trying to win and started trying to understand.',
  '/assets/the-well/hero-learning-to-stay.png',
  'published',
  'human',
  now(),
  now()
) on conflict (id) do nothing;

insert into public.story_episodes (
  id, series_id, episode_number, title, excerpt, body, reading_minutes, status, origin, approved_at, published_at
) values (
  '11111111-1111-4111-8111-111111111121',
  '11111111-1111-4111-8111-111111111111',
  1,
  'The argument beneath the argument',
  'A small question carried too much weight until they learned to listen underneath it.',
  'It started, as these things often do, with a small question carrying too much weight.',
  8,
  'published',
  'human',
  now(),
  now()
) on conflict (id) do nothing;

insert into public.challenges (
  id, slug, title, prompt, scripture_reference, estimated_minutes, level_required, points_reward, status, origin, approved_at, published_at
) values (
  '22222222-2222-4222-8222-222222222222',
  'listen-underneath',
  'Listen for what is underneath',
  'Ask one curious question before offering advice.',
  'James 1:19',
  6,
  1,
  20,
  'published',
  'human',
  now(),
  now()
) on conflict (id) do nothing;

insert into public.journeys (
  id, slug, title, summary, duration_days, status, origin, approved_at, published_at
) values (
  '33333333-3333-4333-8333-333333333333',
  'a-more-present-love',
  'A More Present Love',
  'Four gentle weeks of listening, naming needs, repair, and shared spiritual rhythm.',
  28,
  'published',
  'human',
  now(),
  now()
) on conflict (id) do nothing;

insert into public.journey_steps (journey_id, step_number, title, description, challenge_id) values
  ('33333333-3333-4333-8333-333333333333', 1, 'Notice', 'Slow down enough to see what is here.', null),
  ('33333333-3333-4333-8333-333333333333', 2, 'Listen', 'Make room before preparing an answer.', '22222222-2222-4222-8222-222222222222'),
  ('33333333-3333-4333-8333-333333333333', 3, 'Name', 'Speak needs without accusation.', null),
  ('33333333-3333-4333-8333-333333333333', 4, 'Repair', 'Return with honesty and gentleness.', null)
on conflict (journey_id, step_number) do nothing;
