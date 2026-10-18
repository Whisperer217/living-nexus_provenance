# External Memorial Storefront Link-Out ADR

**Status:** Implemented — 2026-10-18
**Decision:** The Randall Smith memorial hoodie is presented as a single, clearly labeled external product link-out from Living Nexus. It opens the Living Nexus Store on Printful in a new tab.

## Why

The memorial product needs to be discoverable from the global Living Nexus Launcher and from the public Home orientation surface. The relationship must remain truthful: Living Nexus preserves Randall Smith's legacy and provides a respectful path to the product, while Printful's storefront handles product selection, payment, production, and delivery.

## Implementation

- `client/src/lib/externalStorefront.ts` holds the one canonical external URL and memorial copy.
- `LivingNexusLauncher` contains a distinct **Randall Memorial** external tile. The existing **Store** tile remains the Avatar Registry route.
- `ExternalMemorialProductCard` gives the Home page a readable memorial product entry and opens the external product in a new tab with `noopener noreferrer`.

## Explicit exclusions

This change does **not** add Printful credentials, provider APIs, synchronization, webhooks, a native catalog, cart, checkout, payment handling, orders, shipping, fulfillment, entitlements, creator/brand associations, or Work/WID associations. The product is not represented as a Living Nexus-native purchase.

## Creator, Registry, and Legacy posture

The callout honors Randall Smith's legacy without altering any Creator identity, Work, Witness ID, provenance, or custody record. It is a public remembrance and external support path, not an attribution or ownership claim.

## Rollback

Remove the launcher item and the Home card. No database data, migration, remote configuration, or provider state needs to be reversed.

## Validation

Focused source contracts ensure the destination remains external, the Avatar Registry Store route remains intact, and the Home card does not add checkout, provider API, or iframe behavior. Type-check, production build, responsive browser smoke, and diff integrity are required before review.
