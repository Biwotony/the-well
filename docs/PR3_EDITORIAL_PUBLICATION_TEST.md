# PR 3 Editorial Publication Test

## Current verification status

Production was audited read-only. The database contains no Auth users, no editor/admin role, no content rows, and no Supabase development branch. The local computer has neither Docker nor the Supabase CLI. A write-path smoke test therefore was not run because creating production actors or test stories would violate the isolated-test requirement.

Static and read-only evidence confirms:

- public policies expose only published series, episodes, challenges, journeys, and steps;
- episode visibility also requires its parent series to be published;
- member and moderator roles are absent from content write policies;
- editor/admin checks use `app_private.has_role`, which is based on `auth.uid()` and `user_roles`;
- the production update trigger requires prior review and a human editor identity;
- status changes write `editorial_audit` rows;
- all agent budgets are disabled and the Content Factory inserts only `draft` with `origin: agent`;
- PR 3's unapplied migration covers direct inserts, invalid transitions, forged metadata, and edits to published rows.

## Required isolated smoke test

Run this after an approved Supabase branch or local stack is available:

1. Create isolated anon, member, moderator, editor, and admin actors plus one service/scheduled actor.
2. Insert a draft story and episode, then verify anon/member/moderator cannot read the drafts or publish them.
3. Verify direct published inserts, draft-to-published jumps, forged approval fields, and service/scheduled publication attempts are rejected.
4. Move the story through review, publish as editor, and verify the database stamps the actor and timestamps while creating one audit record.
5. Verify the published story and only its published episodes are public, then archive it and confirm it disappears.

## Pass criteria

The test passes only when every denied action fails at the database or API boundary, the authorized publication succeeds once, the audit actor matches the editor session, and no draft or unpublished episode is returned to an anonymous client.

## Unverified items

- Real Magic Link delivery and redirect on the final hostname.
- Session refresh with an actual approved editor.
- Editor/admin publication against an isolated database with the PR 3 migration applied.
- Production application of the migration and the post-migration advisor results.

