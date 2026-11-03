# Security, Privacy, and Publication Controls

## Non-negotiable controls

- Every table in the exposed `public` schema has RLS enabled.
- Browser code uses only the Supabase publishable key.
- Authorization roles live in `public.user_roles`, not user-editable metadata.
- `app_private` is not exposed through the Data API.
- Security-definer helpers set an empty search path, are revoked from `public`, and receive only the minimum execute grants needed by RLS.
- AI output is always private draft data.
- Publication requires a human editor identity, a valid state transition, matching `approved_by`, a timestamp, and an audit insert.

## Threat model

### Broken object authorization

Owner-scoped policies compare `(select auth.uid())` with the row owner. `TO authenticated` is never used as authorization by itself. Editor access additionally calls the protected role helper.

### Privilege escalation

Members cannot update `user_roles`. The browser receives no service-role key. Profile update grants are restricted to the `display_name` column so members cannot self-award points or levels.

### AI overreach

The agent runner validates the agent identifier, editor session or schedule secret, enabled budget, and daily spend. The Content Factory inserts `status: draft` and `origin: agent`. The database publish trigger rejects service/scheduled attempts because they have no human `auth.uid()`.

### Sensitive story content

Submissions are authenticated, private by default, and separate review consent from publication consent. The MVP stores text in Postgres; production retention and deletion windows should be set with counsel before launch. Editors should redact names, locations, employers, churches, children, and health details unless necessary and explicitly consented.

### Email abuse

Supabase rate limits Magic Link requests. Production should also enable Turnstile or hCaptcha if abuse appears. Do not reveal whether an email is registered.

## Launch checklist

1. Run Supabase security and performance advisors after applying migrations.
2. Verify `anon` cannot select draft, review, submission, moderation, agent, role, or audit rows.
3. Verify a member cannot set editor role, points, level, `approved_by`, or `published` status.
4. Verify scheduled/service requests can create drafts but fail the publish gate.
5. Configure short session expiry appropriate to sensitivity and document account/session deletion procedures.

## Incident response minimum

Rotate the affected secret, disable the relevant agent budget, pause the schedule, revoke sessions where necessary, preserve audit records, assess exposed data, and document the corrective action. Do not delete audit rows during incident cleanup.
