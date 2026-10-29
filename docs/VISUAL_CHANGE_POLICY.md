# Living Nexus Visual Change Policy

## Binding rule

A visual-only task may change how an approved visual-safe or reviewed presentation surface looks. It may **not** change what the application does, what it stores, who it authorizes, how it plays media, or what provenance it asserts.

## Prohibited in visual-only work

- Application behavior, routes, state transitions, queries, mutations, API contracts, backend logic, application storage, authentication, authorization, payments, entitlements, creator identity, C2PA/cryptography, trust policy, Registry issuance, WIDs, provenance records, publication state, or data models. The sole development-only storage exception is the versioned `ln-dev-visual-lab:presets:v1` browser key; it holds local visual presets only and is not application state.
- Player engines, queues, media delivery, service-worker/PWA behavior, safe-area/player authority, database schema/migrations, or `integrations/jellyfin/**`.
- Committing secrets, `.env` files, placeholder production credentials, remote database URLs, test credentials, or private keys.
- Changing semantic status colors or labels such that verified, draft, error, destructive, private, or permission states become ambiguous.

## Required discipline

1. Use existing Living Nexus tokens and components before creating a replacement.
2. Begin all experiments in the development-only Visual Lab where possible.
3. Keep a visual branch distinct from feature and integration branches.
4. Run `pnpm verify:visual-boundary` with explicit scope. It fails closed for locked, unknown, deleted, or protected-to-safe renamed paths.
5. Treat Controlled Presentation changes as reviewed exceptions, never as a safe-path loophole.
6. Validate desktop/mobile layouts, keyboard focus, contrast, reduced motion, and player/drawer overlap when the affected production surface warrants it.
7. Add one dated entry to the visual changelog for an accepted visual change, including files, validation, prior theme version, and rollback reference.

## Infrastructure exception

The initial Visual Lab setup is a one-time `visual-infrastructure` change. Its only approved core/tooling exceptions are `client/src/main.tsx` (to bypass normal providers under the exact dev gate) and `package.json` (to expose the verifier and focused test commands). These exceptions do not authorize any change to normal bootstrap behavior, runtime providers, routes, data, player, Registry, or Jellyfin.

## Violation response

If a visual request requires a locked path, pause. Reclassify it as an application/integration change, produce or amend an ADR, define test and rollback scope, and obtain explicit approval before modifying it.
