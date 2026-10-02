# Manifest Registration Layout & Ontology Diagnosis

**Date:** 2026-10-02  
**Status:** Repair implemented in the local checkpoint — no registration behavior, schema, or production data changed
**Surface:** `/manifest` → authenticated Loop music registration flow

---

## Executive finding

The reported misalignment is real, but it is not primarily a one-off CSS margin defect.

The authenticated registration flow is composed of **two distinct ingestion experiences** and, inside the second experience, two asset controls with different visual and semantic patterns:

1. **Gateway:** `TypeGateway` asks the creator to drop a track and extracts metadata.
2. **Registration:** `MusicEnvironment` asks for the canonical audio again as one large drop surface, then presents artwork as a compact source card with a separate action button and visual-generation controls.

That creates a hierarchy break. The creator encounters a broad, centered artifact-ingest scene, then a denser split-pane form where the audio and visual controls do not share a common component, type scale, spacing system, or clear relationship language.

> The issue is **not** that the application lacks artwork provenance. The source tracks five visual sources and persists their state. The issue is that this ontology is communicated inconsistently in the registration surface.

---

## Verification boundary

The public production URL was inspected on 2026-10-02. The browser session is unauthenticated, so production correctly rendered the sign-in gate rather than the registration form. No claim is made that the authenticated production layout was visually operated in this session.

The diagnosis of the authenticated surface is source-backed from the active workspace, specifically:

- `client/src/pages/manifestation-studio/ManifestationStudio.tsx`
- `client/src/pages/manifestation-studio/TypeGateway.tsx`
- `client/src/pages/manifestation-studio/environments/MusicEnvironment.tsx`
- `client/src/pages/manifestation-studio/StudioShell.tsx`
- `client/src/lib/loopProduct.ts`
- `server/tests/musicRegisterPresentation.contract.test.ts`
- `server/tests/preparedWorkRegistration.test.ts`

---

## Current flow as implemented

```text
Unauthenticated
  → Sign-in gate

Authenticated
  → TypeGateway
      → Drop canonical audio
      → Extract embedded metadata / AI signals
      → Retain File in memory
  → MusicEnvironment / Upload step
      → Canonical audio block (already populated when gateway supplied a file)
      → Artwork source block
          → Embedded artwork, creator upload, generated visual, or remixed visual
          → Optional visual prompt + Generate / Remix
  → Details + participation
  → WID sealing
  → Draft or publish
```

The route is explicitly configured as a **music-only Loop product**. `loopProduct.ts` states that other mediums are out of scope and `ManifestationStudio.tsx` routes every entered registration to `MusicEnvironment`.

---

## Evidence-backed findings

| Finding | Evidence | Why it reads as misaligned | Severity |
|---|---|---|---|
| **Duplicate-feeling ingest** | `TypeGateway.tsx:109–161` is a full drop zone. `MusicEnvironment.tsx:551–598` is another full audio drop zone. | The pending file is passed correctly and ingested once, but the second view still displays a large audio chooser. It appears like a second upload task rather than a confirmed continuation. | High |
| **Audio and artwork are different component species** | Audio is a clickable `<label>` with an inline, low-opacity file input (`MusicEnvironment.tsx:551–598`). Artwork is a hidden input, compact grid card, and separate button (`:600–651`). | Same conceptual layer—assets belonging to one Work—uses different geometry, control placement, and interaction affordance. There is no shared asset-block primitive. | High |
| **No explicit canonical/attached relationship hierarchy** | Header says `Audio + visual` (`:543–548`); audio says `Drop audio` (`:593–595`); artwork section says `Bound visual` (`:600–603`). | “Bound visual” can imply WID-bound or immutable, but the registration contract classifies `coverFile` as an **independent component** (`preparedWorkRegistration.test.ts:216–225`). The relationship is not explained accurately at point of action. | High |
| **Typography uses local, competing scales** | The scene combines `text-[9px]`, `[10px]`, `[11px]`, `text-xs`, `text-sm`, `text-xl`, plus bespoke tracking in `MusicEnvironment.tsx:540–657`. | The eye cannot reliably distinguish workflow step, artifact label, state/status, supporting evidence, and action. The cathedral fluid type tokens are not the governing system in this surface. | High |
| **Vertical rhythm changes by asset rather than role** | Upload scene uses `space-y-6`; audio block has `p-8`; visual card has `p-3`/`sm:p-4`, `mb-3`; prompt has `mb-2`; action row has no matching section frame. | Audio has large empty interior space, while artwork immediately becomes a compact information card, prompt textarea, and action row. They do not read as two measured sections of the same ceremony. | High |
| **Artwork action shifts its placement by breakpoint** | Visual grid changes from two columns to three at `sm` and the button moves from `col-span-2 w-full` to an auto-sized third cell (`:620–649`). | The responsive behavior is functional, but the action loses a stable visual anchor. On narrow layouts it reads as a new block; on wider layouts it reads as an inline utility. | Medium |
| **Split-panel padding compounds the density imbalance** | `StudioShell.tsx:121–153` applies `p-6 md:p-8 lg:p-10` to both panels; `MusicEnvironment.tsx:1076–1133` adds `p-4` inside the preview. | The left registration form and right preview do not share an intentional top alignment or content measure. The preview receives nested padding while the left form is governed by unshared local spacing. | Medium |
| **Existing tests protect behavior, not composition** | `musicRegisterPresentation.contract.test.ts` verifies wrapping, artwork-source states, replacement control, and shell scrolling. | No test asserts one ingest handoff, asset-block parity, typography role hierarchy, or mobile/desktop action placement. The current visual regression boundary is incomplete. | Medium |

---

## Ontology that already exists — and must be surfaced accurately

The existing implementation already distinguishes the following visual sources in `MusicEnvironment.tsx:50–56`:

| Existing source | Meaning already implemented |
|---|---|
| **No visual identity attached** | No visual is currently attached; public publication is blocked until a visual exists. |
| **Embedded artwork** | Visual extracted from the canonical audio metadata. |
| **Creator upload** | Visual chosen directly from the creator’s device. |
| **Generated visual** | Visual generated from the creator’s prompt. |
| **Remixed visual** | A visual derived from a prior visual and prompt. |

The prepared-registration contract preserves `visualSource`, `visualPrompt`, and `visualLineageJson`. It also classifies `coverFile` as an **independent component**, rather than a WID-bound field.

Therefore, the UI should make this distinction legible:

```text
Canonical Audio Artifact
  → establishes the audio file hash and is used to seal the WID

Visual Identity
  → attached to the Work
  → sourced as embedded, creator-uploaded, generated, or remixed
  → required for public publication in the current product rule
  → not silently described as an immutable part of the WID payload
```

This strengthens Registry integrity: the creator sees what is canonical, what is attached, and what is merely editorial or visual lineage.

---

## Recommended repair: a bounded registration-surface refinement

### 1. Replace the ambiguous paired blocks with one asset section

Use a dedicated **Work Assets** section inside the first registration step:

```text
01 · Canonical Artifact
   Canonical audio file
   [drop / replace]
   [filename, duration, embedded metadata status]

02 · Visual Identity
   Required before public publication; optional for draft
   [source preview + current source]
   [Upload from device] [Generate] [Remix]
   [prompt only when generating or remixing]
```

Use **Canonical Artifact** rather than “Audio + visual” as the section heading. Use **Visual Identity** rather than “Bound visual,” because it describes the visual’s function without falsely implying that it is WID-immutable.

### 2. Make the gateway handoff visibly continuous

After `TypeGateway` extracts a file, the first MusicEnvironment state should read:

> **Canonical audio received**  
> *Metadata is ready for your review. Replace only if this is not the file you intend to witness.*

This preserves the current in-memory File handoff while removing the appearance that the creator must upload the track twice.

### 3. Establish a small asset-block primitive

Create a single reusable registration component for both canonical audio and visual identity:

- fixed section overline
- one heading role
- one supporting-evidence role
- stable status chip
- consistent border, padding, and error/ready states
- mobile action area placed below the description
- desktop action area optionally aligned right without changing its semantic order

**Likely implementation scope:**

| File | Change |
|---|---|
| `MusicEnvironment.tsx` | Compose the upload step with semantic asset blocks and corrected copy. |
| New registration asset-block component | Centralize structure, responsive action placement, and type roles. |
| `index.css` or existing tokens | Define only the needed semantic spacing/type utilities; do not add a competing design system. |
| `musicRegisterPresentation.contract.test.ts` | Add composition/role/continuity assertions. |

No database migration, WID serialization change, upload-route change, or production data operation is needed for this repair.

### 4. Normalize typography to roles, not ad hoc pixel sizes

Recommended role map:

| Role | Use in registration |
|---|---|
| **Step overline** | `01 · Canonical Artifact`; Cinzel, existing `--text-xs` range, spaced capitals. |
| **Section title** | `Canonical audio`; editorial heading or intentional Cinzel subhead at the platform’s `--text-h4` scale. |
| **Evidence/support** | Filename, metadata result, publication rule; `--text-sm` / `--text-xs`, readable contrast. |
| **State badge** | Embedded / Creator upload / Generated / Remixed; compact but not below readable baseline. |
| **Action label** | Upload visual / Replace visual / Generate visual / Remix visual; body UI size, not microtext. |

Remove the visual state badge’s `text-[9px]`; it is below the documented platform `--text-xs` range and is carrying meaningful provenance information.

### 5. Preserve the current business rules

The repair should **not** change these implemented rules:

- Audio remains required before the creator can advance from upload.
- A visual remains required only to publish publicly; draft remains available without one.
- Embedded artwork may be extracted from audio metadata.
- Uploaded/generated/remixed source provenance is retained.
- The WID is generated from the canonical audio plus existing WID payload rules, not from the artwork.

---

## Non-recommendations

- Do **not** add another independent artwork uploader elsewhere in the form.
- Do **not** make the visual source badge decorative; it is a provenance signal.
- Do **not** describe artwork as cryptographically sealed into the WID when the current contract says it is an independent component.
- Do **not** replace the existing extraction/pending-file bridge with a second network upload.
- Do **not** reintroduce the removed multi-medium Gateway as a visual fix. That is a product-scope decision, not a spacing repair.

---

## Suggested acceptance criteria

A repair is complete when:

1. A creator who starts at `/manifest` encounters **one continuous ingest handoff**, not two apparent uploads.
2. Canonical audio and visual identity share one component grammar and vertical rhythm.
3. The wording accurately distinguishes canonical audio, visual source, and publication requirement.
4. All meaningful provenance/status text is at or above the platform’s smallest readable type role.
5. Mobile places each action below its description with touch-safe sizing; desktop preserves the same content order.
6. Existing registration payload, WID serialization, visual lineage, draft behavior, and public-publication requirement continue to pass their current tests.

---

## Confidence and next step

**Confidence: high** for the structural diagnosis, based on the active source and regression contracts.  

**Remaining visual verification:** authenticated desktop and mobile smoke after the repair, because the available production browser session is not signed in.

The next safe step is a narrowly scoped implementation of the asset-block grammar and continuity copy, followed by authenticated visual validation. No deployment action is implied by this diagnosis.
