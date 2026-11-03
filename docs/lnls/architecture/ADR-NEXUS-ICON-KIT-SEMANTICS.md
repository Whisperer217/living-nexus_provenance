# ADR — Nexus Icon Kit Semantics and Static Visual Lab Study

- **Status:** Accepted
- **Date:** 2026-10-29
- **Decision scope:** Development-only static icon-system study; no production migration is authorized by this ADR alone.

## Context

Living Nexus currently combines Lucide utility icons, a WID diamond badge, Witness Sigil, Cosmic Medium glyphs, inline SVGs, shields, checks, fingerprints, and typographic symbols. That variety produces visual drift and, more importantly, risks conflating an action, a record, a status, a creator identity, and a protected presentation.

The existing development-only Visual Lab mounts before normal application providers and has no application data, Registry record, player, authentication, query, upload, or network dependency. It is therefore suitable for evaluating icon grammar without making a provenance assertion.

## Decision

### 1. Four distinct visual families

1. **Instrument** — Lucide-based universal operational actions such as search, play, pause, close, download, navigation, and share. An Instrument communicates an action, never a provenance fact.
2. **Seal** — named Living Nexus semantic marks: future `WIDSeal`, `WitnessSigil`, `RecordThread`, and `HAAIMark`. A Seal has a narrow, text-supported meaning.
3. **Constellation** — presentation-only medium identity glyphs for audio, lyrics, manuscript, comic, game, and visual work. A Constellation is neither an action nor a status.
4. **ProtectedAssetFrame** — a gold-keylined, explicitly designated, human-facing visual-asset frame. It is a content treatment, not an icon, control, selected state, generic card, or token.

### 2. WID truth contract

A future `WIDSeal` is a record-context visual leaf. It is not a shield, social verification check, green success state, fingerprint, creator handle, security guarantee, copyright registration, ownership proof, award, NFT, or chain token.

The WID Seal may appear only beside a real existing WID/record context supplied by an authoritative parent surface. It must be accompanied by visible explanatory text; its parent owns existing link/button and verification-route behavior. The current handle-led `WIDBadge` is not silently repurposed as that component.

### 3. Gold-marker truth contract

The ProtectedAssetFrame makes a designated human-facing visual asset clearly perceptible through a restrained gold keyline, corner/notch detail, and quiet caption region. It supports an IP-signalling presentation strategy but does not itself:

- prevent scraping or AI training;
- prove copyright, ownership, or legal protection;
- create an NFT;
- establish a minted or immutable on-chain record;
- validate a Registry record.

Any NFT, on-chain, rights, copyright, ownership, or validation statement requires existing authoritative product data, exact wording, and a working record destination. Without those facts, the frame uses neutral illustrative wording or no provenance claim.

### 4. Medium color authority

The current duplicate audio colors must be resolved before production migration. The approved direction is **violet for audio medium classification** and **gold for platform/provenance emphasis**. A future implementation will establish `COLOR_MEDIUM` as the sole authority; the static Lab study deliberately uses shape-first, token-derived rendering and does not make a new color-system claim.

### 5. Static-first Visual Lab study

The first approved implementation is an inert Mock 1 comparison sheet in `client/src/visual-dev/**`.

It may render labelled local SVG and CSS-art studies at 16/20/24/48 px, static visual state comparisons, and an illustrative asset frame. It may not render or simulate real WIDs, creators, work records, verification results, account/auth state, player state, medium selection, upload, wallets, NFT/on-chain data, Registry access, or record links.

## Consequences

### Positive

- Establishes visual hierarchy without letting aesthetics manufacture trust claims.
- Clarifies provenance, witness, status, and medium semantics before site-wide migration.
- Uses the existing Lab isolation boundary and allows mobile, contrast, focus, and reduced-motion review.

### Constraints

- The Lab study is not a design-system publishing mechanism or production component migration.
- Any production primitive or surface migration requires separate approval, semantic audit, tests, and visual-boundary review.
- Generic shield/check/fingerprint uses must be reviewed individually; no global replacement is allowed.

## Implementation boundary

Allowed for the study: `client/src/visual-dev/VisualSpecimens.tsx`, `client/src/visual-dev/visualSpecimens.css`, approved ADR/documentation, and focused visual-boundary tests if required.

Not allowed: `server/**`, shared schemas, Registry/WID issuance or lookup, auth, payments, storage, routes, contexts, player/PWA, queries/mutations, external network assets, actual record data, or any production WID verification behavior.

## Validation and rollback

The study must pass typecheck, focused Visual Lab tests, visual-boundary verification, production exclusion build scan, isolated full integration tests, and a manual no-network/no-audio dev smoke test across desktop, tablet, and mobile Lab frames.

Rollback is a reversion of the static Lab/documentation change only. No data, record, route, or storage rollback is required.
