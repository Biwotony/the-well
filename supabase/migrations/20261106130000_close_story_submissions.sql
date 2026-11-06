-- Launch gate: deny client submission writes until explicitly reopened.
-- This is intentionally fail-closed; review launch policy before reopening.
drop policy if exists submissions_insert_own on public.story_submissions;
revoke insert on public.story_submissions from authenticated;
-- Service-role ingestion remains possible with explicit privileged credentials.
