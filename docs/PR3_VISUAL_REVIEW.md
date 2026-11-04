# PR 3 Visual Review

## Scope

Product Design and Tasteful UI Composer review of the editor-access, Magic Link, and closed-submission states against the existing cream, charcoal, clay, mineral, moss, serif, and documentary editorial direction. The implementation stays on the existing React, Radix Dialog, Manrope, and DM Serif Display foundation; no component package or visual token system was added.

## Accepted evidence

| Step | Screenshot | Health | Review |
| --- | --- | --- | --- |
| 1 | `pr3-screenshots/01-studio-signed-out-390.jpg` | Healthy | The protected state has a clear reading order, one primary action, no nav wrap, and no horizontal overflow. |
| 2 | `pr3-screenshots/02-studio-signed-out-768.jpg` | Healthy | Tablet hierarchy remains calm and the access explanation stays readable without an oversized dashboard treatment. |
| 3 | `pr3-screenshots/03-studio-signed-out-1024.jpg` | Healthy | Navigation, card width, and footer distribute cleanly at the desktop breakpoint. |
| 4 | `pr3-screenshots/04-studio-signed-out-1440.jpg` | Healthy | The editorial layout keeps intentional whitespace while the access control remains the dominant task. |
| 5 | `pr3-screenshots/05-submission-closed-390.jpg` | Healthy, scroll required | The initial mobile viewport clearly states that collection is closed; the explanatory card continues below the fixed navigation and remains scrollable. |
| 6 | `pr3-screenshots/06-submission-closed-1440.jpg` | Healthy | The two-column refusal state is direct, readable, and does not imitate an active submission form. |
| 7 | `pr3-screenshots/07-magic-link-dialog-1440.jpg` | Healthy | The modal has clear focus, readable privacy copy, a disabled empty-submit state, and sufficient contrast. |

## Self-review checks

- Hero/image crops: no changed screen contains a hero image; existing public crops were not changed.
- Text overflow: no clipping or horizontal overflow at 390, 768, 1024, or 1440 pixels.
- Awkward gaps: mobile footer color now extends through the reserved fixed-navigation space.
- Fixed navigation: content has reserved bottom space; below-fold submission details remain scrollable above the bar.
- Nav wrapping: desktop and mobile navigation labels remain on one line.
- Contrast: clay primary actions, charcoal copy, moss lock icons, and disabled action styling remain readable against the cream/paper surfaces.
- Copy rhythm: all new public-facing copy uses complete sentences and avoids staccato marketing formulas.

## Fixes made after the first capture

1. Hid the skip link unless it has actual keyboard focus; the first full-page dialog capture exposed it because the transform-only hiding method was unreliable in capture.
2. Extended the dark mobile footer through the bottom navigation reservation to remove an awkward cream strip at the end of the page.
3. Re-captured the affected mobile studio, mobile submission, and Magic Link dialog screenshots after rebuilding production assets.

## Evidence limits

Screenshots support hierarchy, reflow, crop, spacing, wrapping, and visible-contrast review. They do not prove full WCAG compliance, screen-reader output, real email delivery, authorized editor queue states, or database publication behavior. Those require the automated tests and the isolated actor-matrix test documented separately.
