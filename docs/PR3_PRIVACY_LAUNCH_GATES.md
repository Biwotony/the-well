# PR 3 Privacy Launch Gates

## Pilot decision

Public discovery, published stories, journeys, and session-only practices may continue. Sensitive story submission must remain closed until every gate below has a named owner, approved procedure, and tested response path. The UI now states that it does not collect or store story text.

## Must pass before opening submissions

| Gate | Required decision and evidence | Current status |
| --- | --- | --- |
| Data minimization | Define the smallest required fields and prohibit unnecessary identifiers, health details, child data, and third-party details | Blocked |
| Consent | Separate private review consent from publication consent and define withdrawal handling | Schema supports separation; operating procedure blocked |
| Retention and deletion | Set draft, declined, withdrawn, published, backup, and audit retention periods plus deletion SLAs | Blocked |
| Safeguarding | Define escalation for abuse, self-harm, violence, minors, and immediate danger without presenting THE WELL as clinical care | Blocked |
| Editorial staffing | Name trained reviewers, coverage hours, response targets, and access revocation procedure | Blocked |
| Access and audit | Complete editor bootstrap, actor-matrix testing, audit review, and incident drill | Blocked |
| Legal and policy | Approve privacy notice, terms, contributor release, copyright handling, and regional obligations | Blocked |
| User operations | Provide export, correction, withdrawal, account deletion, and contact routes | Blocked |

## Current low-data behavior

- Story reflections and challenge completion remain in the browser session and reset on reload.
- The public site does not substitute demo fixtures unless a localhost-only `?content=demo` flag is present.
- The disabled submission page contains no story textarea and sends no personal story data.
- Magic Link sign-in uses email only for account access and essential service messages.
- AI infrastructure remains disabled; no model, schedule, provider, ingestion, or embedding change is part of PR 3.

## Launch owner checklist

1. Assign privacy, safeguarding, editorial, and technical owners.
2. Approve the retention schedule and deletion runbook.
3. Rehearse a withdrawal, a deletion request, and a safeguarding escalation.
4. Open submissions only after the release owner signs every gate.

