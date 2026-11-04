# PR 3 Authorization Matrix

## Effective access

| Actor | Public published content | Own profile and progress | Story submissions | Moderation | Editorial drafts | Publish | Roles and budgets |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Anonymous | Read | None | None | None | None | Denied | None |
| Member | Read | Own rows | Create and read own row when enabled | None | None | Denied | Read own role |
| Moderator | Read | Own profile; broader profile read | Review submissions and add moderation events | Allowed | None | Denied | Read own role |
| Editor | Read | Own profile; broader profile read | Review and update | Allowed | Read, create, and update | Allowed only through the human gate | Read audit and agent runs |
| Admin | Read | Same editorial visibility | Review and update | Allowed | Read, create, and update | Allowed only through the human gate | Manage agent budgets; role bootstrap remains an operator action |
| Service role | Bypasses RLS for server work | Server-only | Server-only | Server-only | Draft automation only by application contract | Rejected by hardened gate because there is no human `auth.uid()` | Server-only |
| Scheduled agent | No browser identity | None | None | None | May request draft generation only when enabled and authenticated by schedule secret | Rejected | No role impersonation |

## Browser enforcement

The studio restores the Supabase session, validates the user with `auth.getUser()`, then reads the caller's own `user_roles` row. Only `editor` and `admin` render the private queue. The browser never reads a role from user metadata and never receives a service-role key.

Magic Link requests set `shouldCreateUser: false` and use a generic response to avoid account discovery. Reload, loading, missing session, invalid link, expired link, unauthorized role, role-query failure, and sign-out are explicit states.

## Production bootstrap status

Production had zero Auth users and zero rows in `public.user_roles` on 2026-11-04. No privileged identity exists, and PR 3 does not invent an email or assign a role.

Bootstrap requires all of the following:

1. The owner approves the exact administrator email and the operator performing the change.
2. The user is created or invited through an approved Auth workflow.
3. A trusted database operator verifies the Auth user UUID, updates that user's `user_roles` row to `admin` or `editor`, and records the approver.
4. A second person verifies the role, signs in through Magic Link, and confirms that a member account remains denied.
5. The action and evidence are added to the release record without publishing the user's email in repository documentation.

This is an external privilege change and is intentionally not executed in PR 3.

