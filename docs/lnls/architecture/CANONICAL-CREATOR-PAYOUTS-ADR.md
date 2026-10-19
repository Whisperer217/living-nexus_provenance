# Canonical Creator Payouts and Stripe Connect Callback ADR

**Status:** Accepted — implementation authorized 2026-10-19  
**Scope:** Creator-facing Stripe Connect payout readiness only.  
**Layers strengthened:** Relationship, Stewardship, Legacy.

## Decision

Living Nexus has one creator payout control center at `/settings/payouts`. It presents live Stripe Connect readiness using `tips.connectStatus` and begins or resumes hosted onboarding only through `tips.connectOnboarding`.

The page is private to the signed-in creator. It is discoverable through owner-only Creator Domain and Profile shortcuts, plus the authenticated Manage drawer. The guide-upload flow links to this same center instead of simulating a Stripe connection locally. Public visitors never see account requirements, connection state, or private payout controls.

`/settings/payment-methods` remains the home for alternate provider configuration. It must not ask a creator to paste a Stripe Connect account ID: Stripe Connect identity is created and managed through the canonical payout center.

## Callback ownership

Stripe Account Link `refresh_url` and `return_url` are server-owned. The server accepts only the recognized current Living Nexus origin with the exact `/settings/payouts` path, strips all query/hash/userinfo/port variance, and sends a canonical callback URL to Stripe. Client input cannot choose an arbitrary destination.

The server builds the Stripe business-profile URL from a trusted site origin plus the creator's canonical public route, not from a callback URL.

## Creator states

| Live status | Meaning | Payout-center action |
|---|---|---|
| `not_connected` | No Connect account has been created. | Connect Stripe |
| `pending` | Hosted setup began but required details are incomplete. | Continue setup |
| `restricted` | Stripe requires additional details before charges can be enabled. | Finish verification |
| `enabled` | Stripe reports `charges_enabled`. | Confirm that gifts can be received |
| `error` | Live status could not be reconciled. | Retry status check / return later |

Only Stripe's live `charges_enabled` result authorizes transfer-enabled creator support. A stored status is not sufficient authority.

## Alternatives rejected

1. **A global sticky payout banner as the primary pathway:** rejected because it can interrupt unrelated work, can duplicate creator-domain and Profile controls, and risks depending on stale client data.
2. **Manual `acct_…` ID entry as creator onboarding:** rejected because it creates a divergent configuration record from the actual Stripe Connect account used by payments.
3. **Caller-controlled callback URL:** rejected because it allows an untrusted return/refresh destination and can contaminate business-profile metadata.
4. **A new payment provider router or schema:** rejected; existing `tips` procedures and user account fields are sufficient.

## Safety and rollback

No migrations or payment-rule changes are introduced. Removing the client route/shortcuts restores prior navigation behavior. The server callback hardening is intentionally retained as a security improvement; historical direct callers must use the canonical route.

## Validation

Focused tests must cover canonical route registration, owner-only navigation, payout state presentation, exact callback acceptance/rejection, equal Stripe refresh/return destinations, canonical business-profile URL construction, and unchanged `charges_enabled` support gating. Browser validation must check mobile and desktop payout paths without submitting Stripe onboarding.
