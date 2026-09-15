# ADR — Profile Stripe Shortcut

**Status:** Implemented after Doc approval on 2026-09-14.  
**Scope:** Owner-only discoverability improvement for existing Stripe Connect onboarding.

## Decision

Promote the existing protected `tips.connectStatus` and `tips.connectOnboarding` flow into the signed-in creator’s Profile header, beside the existing **My Domain** action. The action is status-aware: **Get paid · Connect Stripe** when no account is connected, **Finish payout setup** when Stripe requires creator action, and a non-actionable **Payouts ready** state when the existing account is enabled.

The detailed Profile Overview Stripe card remains in place as the explanatory surface. Public creator pages remain unchanged.

## Boundaries

This change reuses the existing same-window return-to-profile behavior. It adds no Stripe API call on render; account creation/onboarding remains an explicit creator click. It adds no schema, backend procedure, payout logic, payment rule, account-state mutation, new route, public control, or new payment page.

## Affected surfaces

| Surface | Change | No change |
|---|---|---|
| Signed-in `/profile` | Header exposes a clear payout-readiness action. | Existing identity controls and lower Stripe explanation remain. |
| Public creator profile | None. | Visitors cannot connect or alter a creator’s Stripe account. |
| Stripe/backend | None. | Existing protected status/onboarding procedures remain the sole authority. |

## Risk and rollback

The only risk is a misleading status label. The component directly reflects the existing protected status response and performs no state write until the creator explicitly clicks the current onboarding mutation. Rollback is a one-file UI revert; no account or payment data migration is involved.

## Validation

Focused contract coverage must verify all three labels, the owner-only Profile placement, reuse of the existing profile return URL, and absence of a new public route or backend call. TypeScript, focused tests, production build, refinement, and diff hygiene remain required before checkpoint.
