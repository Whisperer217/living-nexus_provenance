# Splash Skip Intro Decision

## Current State

The cinematic entry is session-gated, but its existing **Enter the Archive** action appears only after the process phase begins. Returning visitors therefore have to wait through the early visual sequence before they can reach the application.

## Decision

Add a top-right **Skip Intro** control that is visible from the first splash frame. It calls the same completion boundary as the existing entry action, marks the splash as seen for the current browser session, and immediately yields control to the application. The original **Enter the Archive** action remains unchanged for visitors who wish to experience the cinematic sequence.

## Alignment

| Layer | Effect |
|---|---|
| Manifestation | Preserves the cinematic introduction as an optional, intentional experience. |
| Stewardship | Respects returning visitors’ time and reduces friction on constrained mobile screens. |
| Legacy | Retains the existing session gate, avoiding an additional persistent preference or account model. |

No registry, WID, creator data, database schema, or backend route changes are required. The bypass is keyboard reachable, has a descriptive accessible name, and uses the existing splash safe-area contract.

## Verification

Preview inspection confirms that **Skip Intro** is visible at the top-right of the cinematic splash before the timed sequence completes. The control is exposed with the accessible label “Skip cinematic introduction and enter the archive.”
