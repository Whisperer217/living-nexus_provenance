# Cinematic Sovereign Lineage

## Stewardship Note

This design lineage was added from the Codex-assisted Living Nexus redesign pass on 2026-08-27.

The pass does not redefine Living Nexus. It records the visual direction requested for the open site and web app:

1. Cinematic
2. Sovereign
3. Mysterious
4. Premium
5. Precise

## Intent

Living Nexus should not feel like a generic SaaS dashboard, a conventional music app, or a marketing landing page. It should feel like a sovereign creative archive whose interface makes provenance, authorship, witnessing, and lineage visible at the moment a visitor experiences the work.

The entrance experience is the emotional source of truth. The web app should share that world: dark cinematic depth, smoked glass, antique gold witness lines, precise interface geometry, and warm ivory type.

## Protected Entrance Engine

The current home entrance engine is protected:

- looping cinematic video background
- looping audio
- real-time waveform feedback from the playing audio
- gold flare and environmental lighting
- synchronized audiovisual atmosphere
- mobile-safe foreground over the moving scene

Future changes should refine the foreground layer without replacing the underlying engine.

## Page Architecture

### Home / Entrance

The home page is a threshold, not an explanation page. It should present the Living Nexus identity, the audiovisual waveform, and one clear archive entry action. Explanatory process content should be compact or moved into a dedicated process surface.

### Process

The process page should explain the journey as a ritualized technical sequence:

- Register
- Witness
- Archive
- Publish

Each step should make provenance more tangible without becoming a sales funnel.

### Archive

The archive should make browsing feel like entering a living record. Cards and rows should prioritize work title, creator, medium, Witness ID state, and lineage signals.

### Work / Creator

This is the core product surface. The work, creator, Witness ID, provenance timeline, source material, derivatives, and witnesses should be visible together. Provenance must not be hidden as secondary metadata.

### Web App Shell

Authenticated app pages should carry the same emotional identity as the public entrance while remaining efficient for repeated use. Use a restrained navigation rail, smoked-glass panels, provenance-aware right rails, compact persistent player surfaces, and precise typography.

## Visual Artifacts

The initial visual references for this lineage live here:

- `docs/lnls/design/artifacts/living-nexus-home-art-direction-v1.png`
- `docs/lnls/design/artifacts/living-nexus-web-app-art-direction-v1.png`

These are art-direction references, not literal implementation screenshots.

## Implementation Boundary

Commit changes in scoped groups:

- visual-system tokens and shared surfaces
- home entrance foreground refinement
- process page architecture
- archive/work page alignment
- supporting assets

Do not bundle unrelated refactors, data changes, migrations, or feature behavior changes into visual-system commits.

