# Living Nexus Visual Architecture

## Purpose

The Visual Lab is a development-only, local editing surface for evaluating presentation changes without changing creator data, Registry authority, provenance, playback, routing, application state, or production behavior. It begins from existing Living Nexus CSS values and Cathedral design language; it is not a second theme system or a redesign engine.

## Zones

| Zone | Rule |
|---|---|
| Locked Application Core | Server, Registry/WID/provenance, shared domain models, data/auth/payment/storage, player/runtime/PWA, routes, contexts, and Jellyfin are not visual-editable. |
| Controlled Presentation | Existing pages, components, design-system surfaces, and global CSS may affect behavior; modify only with explicit review and focused validation. |
| Visual-Safe | `client/src/visual-safe/**` contains the typed preview-token contract, strict preset codec, isolated gate, and scoped CSS aliases. |
| Development Tooling | `client/src/visual-dev/**` renders the Lab only after the exact development gate passes. |

## Token bridge

Editable aliases are scoped to `[data-ln-visual-lab-preview]`. Their default values fall back to current `--ln-*` values, so **Current Production** starts from the existing active theme. The Lab never writes `:root`, `<html>`, `data-theme`, `ln-theme`, or account settings.

Allowed: non-semantic colors, borders, radius, spacing, typography scale, specimen dimensions, shadows, blur, and transitions.

Protected: verified/draft/error status semantics, WIDs, provenance/publication facts, creator identity, permission states, player/safe-area authority, z-index registry, and any data-bearing UI behavior.

## Static icon-system study

The Lab may host an inert **Nexus Icon Kit** comparison sheet: labelled Instrument, Seal, Constellation, and illustrative asset-frame specimens. It is a visual grammar study only. It contains no actual WID, creator, work, verification result, record link, account state, player, medium selection, NFT/on-chain value, rights assertion, or Registry behavior.

The gold asset-frame specimen is a human-facing presentation marker, not proof of copyright, ownership, AI-training prevention, NFT issuance, or an immutable on-chain record. Any future factual claim requires an existing authoritative data field, exact wording, and an existing working destination. See `docs/lnls/architecture/ADR-NEXUS-ICON-KIT-SEMANTICS.md`.

## Starting the Lab

The Lab is intentionally unavailable in production. Start the normal development process with the explicit development flag:

```bash
VITE_LN_VISUAL_LAB=1 pnpm dev
```

Then open:

```text
/dev/visual-lab
```

It activates only when all conditions are true: development build, `VITE_LN_VISUAL_LAB=1`, and exact pathname `/dev/visual-lab`. Query strings do not change that pathname decision. Every other path uses the ordinary bootstrap. The Lab is rendered before normal provider mounting, so it has no tRPC calls, auth state, queue/player, upload engine, Registry record, or production work record.

## Manual workflow

1. Open the Lab and keep **Current Production** as the baseline.
2. Select a responsive preview frame: mobile, tablet, or desktop.
3. Adjust a Visual Controls value; the scoped specimen updates immediately without reload.
4. Use browser DevTools to inspect the `--ln-vl-*` properties on the preview root if a precise value is needed.
5. Save an experiment under a new local preset name. Browser storage uses `ln-dev-visual-lab:presets:v1` only.
6. Export an approved study as JSON. Imports reject unknown keys, CSS functions, URLs, arbitrary properties, out-of-range numbers, and malformed JSON.
7. When a value deserves production review, move it deliberately into the appropriate existing token/component source in a separate approved change. Do not treat Lab export as production configuration.
8. Run the boundary verifier, TypeScript, focused Visual Lab tests, relevant contracts, build, and the full suite in its isolated test environment.
9. Record the accepted visual change in `docs/lnls/design/VISUAL_CHANGELOG.md` with the commit and validation evidence.

## Validation

```bash
pnpm verify:visual-boundary -- --scope=visual --base=origin/main --working
pnpm test:visual-lab
pnpm check
pnpm build
```

The initial infrastructure branch uses the explicit `visual-infrastructure` scope because it contains a documented bootstrap and script-registration exception. Future ordinary visual branches must use `--scope=visual` and may not touch locked core paths.

## Rollback

Reset the local preview with **Reset to Current Production**, delete a local preset, or revert the corresponding Git commit. The Lab has no database writes, migrations, cache changes, WID issuance, account changes, or public deployment behavior to roll back.
