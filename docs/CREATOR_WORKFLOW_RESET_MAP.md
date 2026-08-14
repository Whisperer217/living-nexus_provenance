# Creator Workflow Product Reset Map

**Status:** Architecture and remediation map only. It does not authorize a new route, database mutation, Avatar Shop listing, AI model call, payment flow, or asset conversion.

## The direct answer

The platform has accumulated real capabilities, but they are not currently presented as **one visible creator product**. That is why work can be checkpointed, merged, tested, and deployed yet still feel absent from the experience you use.

The problem is not that the music registry, upload metadata parsing, player, Guide records, marketplace records, or PNA do not exist. The problem is that they are distributed across separate routes, different authentication states, draft branches that were intentionally held, and internal documentation checkpoints. The product needs one obvious entry point and one coherent creator journey.

> **Target experience:** Choose your Nexus avatar once. Upload or select a song. Review the factual metadata and registration record. Ask the assistant about the creator-approved context. Publish only when you explicitly choose to. Equip or change approved skins from one obvious avatar surface.

## What is live, what is not, and why it can look inconsistent

| Layer | Verified state | Why it may not be visible as a public product change |
|---|---|---|
| Managed checkpoint | Checkpoint `069f1613` is the current managed source revision and automatically publishes. | The change is PNA-only, session-local, and protected behind the normal PNA sign-in gate. A signed-out visitor cannot see the Context Canvas. |
| Documentation and ADRs | ADR-022, ADR-023, Cartography, Dacr research, and audit maps are committed internal artifacts. | Documentation changes do not create public routes. `/docs/cartography/` remains intentionally absent pending an access and claim-review decision. |
| Draft PRs | Several visual, avatar, shop, and download PRs were reviewed but deliberately not merged because their authority, payment, route, reduced-motion, token, or test contracts were incomplete. | A GitHub draft is not a public feature. It should never be described as live until it is merged, validated, checkpointed, and seen on its intended signed-in route. |
| PNA Context Canvas | Phase 1 is live in `/pna`: strict read-only context, session-local state, and deliberate Open, Verify, and Play actions only. | The available browser session is signed out, so the authenticated Canvas interaction is not visible in its current preview. |
| Avatar and Guide data | Live database contains `guides`, `marketplace_items`, `marketplace_purchases`, and `platform_guides`; Guide records carry authored identity fields such as testimony, lore, art, WID, rights, and derivative permissions. | There is no intentional bridge that projects eligible authored Guides into a simple, attributable Avatar selection and free-claim journey. |

## What we have versus what a creator can actually feel

| Capability already present | Evidence in the active project | Missing product projection |
|---|---|---|
| Music upload and registration | `UploadPage.tsx`, `ProvenanceUploadEngine.tsx`, `BatchUploadPage.tsx`, `PendingWorkContext`, audio metadata parsers, waveform and WID flows | One creator-facing “Upload → inspect → register” review screen that makes the extracted facts and next decision unmistakable. |
| Metadata extraction | `useAudioMetadata.ts`, `parseAudioMetadata.ts`, `uploadPipeline.ts`, and upload screens parse embedded music metadata and process audio facts. | A clear factual panel that says what came from the file, what came from the creator, what was derived, and what the AI is permitted to inspect. |
| Provenance and verification | Work, WID, Verify, creator, archive, waveform, participation, and tone surfaces exist. | One context ribbon connecting the current song, metadata, WID, creator, and approved AI context without sending a creator through several unrelated controls. |
| PNA and Context Canvas | `PNAShellPage.tsx`, PNA workspace components, and Phase 1 `NexusContextPanel.tsx` exist. | A familiar creator assistant workspace with a single chat owner, visible context, stable work selection, and explicit limits on what the assistant can do. |
| Avatar Shop and skins | `AvatarMarketplacePage.tsx`, `MarketplacePage.tsx`, `marketplace_items`, purchases, and equip mutations exist. | One obvious “My Nexus Avatar” surface: selected character, current skin, ownership state, free claim, change/equip action, provenance and backstory. |
| Guide identity and lore | `guides` retains canonical name, testimony, lore, artwork, WID, rights, and derivative-permission fields. | A governed conversion layer from authored Guide identity to a shop representation. ADR-022 specifies this; it is not yet built. |

## The canonical creator experience

The platform should be organized around a creator’s current object—not around every subsystem that has accumulated over time.

### 1. Creator Nexus: the intentional landing surface

After sign-in, a creator should land in a familiar workspace with five plain-language modes:

| Mode | Primary question answered | First visible control |
|---|---|---|
| **My Music** | “What am I working on or registering?” | **Upload or select a track** |
| **Register** | “What facts will become part of this record?” | **Review extracted facts** |
| **Nexus Avatar** | “Who is my companion and what is equipped?” | **Choose character** |
| **Assistant** | “What can the model see, and what can it do?” | **Open context** |
| **Archive** | “What is already preserved and verifiable?” | **View my registry** |

This is not a new social feed, a generic dashboard, or a second PNA. It is one creator-facing composition that links existing registry and player capabilities through a smaller number of explicit decisions.

### 2. The music path must be a single factual sequence

```text
Choose/Upload audio
  → Extract file facts
  → Review creator declarations
  → Attach art and participation
  → Preview WID inputs, tone, and waveform
  → Ask assistant about approved context
  → Save Draft or explicitly Publish
  → Verify and return to Archive
```

Every stage must label its source:

| Source label | Meaning |
|---|---|
| **From audio file** | Embedded ID3/format/duration/artwork facts parsed from the submitted file. |
| **From creator** | Title correction, origin, participation, declaration, art selection, and other creator statements. |
| **Derived by platform** | Hash, WID, waveform, tone, and other calculated artifacts. |
| **Assistant-readable context** | A bounded projection of the preceding approved facts; it is not registry truth and cannot write to the record. |

### 3. The assistant needs a real sandbox boundary

The model does **not** need unrestricted access to a creator’s account to be useful. The sandbox should be a server-side, creator-authorized read model with no database mutation credential.

| Boundary | Phase-appropriate design |
|---|---|
| Input | Versioned context reference: work, creator, provenance, Explore, or now-playing. |
| Read model | Sanitized metadata, creator-approved declarations, art references, WID facts, waveform/tone summaries, and explicit source labels. |
| Model output | Explanation, organization, questions, metadata suggestions, and links—never a disguised write. |
| Write path | Separate, human-confirmed mutation form. Every change shows a diff, source, and intended registry effect. |
| Provenance rule | The model may describe a WID record; it may never replace, rewrite, backdate, seal, or publish it. |
| Privacy rule | Audio bytes, private notes, rights metadata, and unpublished files are absent unless the creator specifically grants the required scope. |

Phase 1 Context Canvas already proves the narrow front-end version of this boundary. A real model sandbox requires a dedicated read-only server procedure, scope policy, audit log, redaction policy, and explicit confirmation path; it should not be improvised inside chat UI.

## Avatar product model: one character first, skins second

The intended Avatar Shop should not begin with a dense catalog. It should begin with a creator’s current relationship to one companion.

```text
My Nexus Avatar
  → Choose an eligible authored character
  → Read its authored backstory and Guide Affinities
  → Claim it free with an attributable grant
  → Equip it
  → Browse compatible skins
  → Change or restore a skin
```

The required distinction is structural:

| Concept | Canonical source | What must not happen |
|---|---|---|
| **Guide** | The authored identity: testimony, lore, artwork, rights, WID, and authority. | A Marketplace edit must not overwrite the Guide record. |
| **Avatar representation** | A versioned visual/shop expression of the Guide. | A skin must not silently become the canonical Guide identity. |
| **Free claim** | An attributable, idempotent entitlement or grant. | A zero-price item must not become an untracked generic purchase or implicit equip. |
| **Skin** | A compatible cosmetic layer. | A skin must not alter Guide affinities, rights, authority, or registry claims. |
| **Guide Affinities** | Authored narrative strengths that shape presentation and suggested context. | They must not grant autonomous agent execution authority. |

ADR-022 already defines the necessary conversion safeguards. It is intentionally not implemented yet because the first eligible Guide, derivative permissions, compatibility behavior, and Phase 1 2D boundary still require Keeper confirmation.

## Why the current experience feels like 500 icons

The platform presently exposes many valid components—drawer, rails, editors, player modes, PNA modes, Marketplace panels, creator shells, registry pages—without first choosing a small set of primary creator decisions. The user experience is therefore organized by accumulated capability rather than by a creator’s task.

The reset must establish these rules:

1. **One current object.** A creator sees the current song, current avatar, or current registration—not all possible controls at once.
2. **One assistant owner.** PNA owns conversation. Context panels supply facts; they do not create competing chat UI.
3. **One Avatar entry.** “My Nexus Avatar” resolves character, current skin, claim state, and change action in one place.
4. **One upload review.** Registration cannot scatter file facts, declarations, WID inputs, and publish state across unrelated views.
5. **One release truth.** Every release must say: commit, checkpoint, public route, signed-in route, migrations, and a screenshot or user-owned smoke status.

## What must be built—and what must not be built yet

| Workstream | Build only after approval | Do not build yet |
|---|---|---|
| Deployment clarity | A release-status panel and a narrow release ledger that state public route, signed-in route, and data/migration status. | Another dashboard with generic activity feeds. |
| Creator Nexus | A creator-facing composition of existing My Music, Register, Avatar, Assistant, and Archive paths. | A replacement for the registry, player, or PNA. |
| Upload review | A single metadata/provenance review panel reusing the existing upload pipeline. | New WID algorithms or silent file transformations. |
| AI sandbox | Read-only server context model, scope consent, source labels, output audit, and explicit proposed-change review. | Model database credentials, automatic metadata writes, automatic publishing, or hidden AI analysis of private uploads. |
| Avatar conversion | Guide-to-avatar profile, free claim grant, character selection, skin compatibility, backstory, and Guide Affinities. | 3D avatars, agent authority derived from skins, silent conversion of every Guide, or untracked free grants. |
| Shop UX | “Choose character → equip → change skin” flow with clear ownership and restoration state. | A marketplace-first catalog that hides the user’s current character. |

## Deliberate implementation sequence

| Order | Deliverable | Success condition | Why it comes now |
|---|---|---|---|
| **P0** | Release truth and live-state marker | Every published change states its public route, signed-in requirement, and data dependency. | Restores confidence that a push is visible or intentionally gated. |
| **P1** | Creator Nexus shell | Creator reaches My Music, Register, Nexus Avatar, Assistant, and Archive from one page. | Reduces the current navigation maze without replacing functioning systems. |
| **P2** | Upload review composition | One work moves from audio file to extracted facts, declarations, WID preview, and Draft/Publish choice. | Makes the registry legible before AI adds interpretation. |
| **P3** | Avatar selection and free claim | First authorized Guide is selectable, claimable, equipped, and skin-compatible with attributable grant history. | Converts existing authored identity into a visible user relationship. |
| **P4** | Read-only AI sandbox | Creator-approved context is inspectable by a model, source-labelled, audited, and incapable of silent mutation. | Lets the assistant become useful without corrupting registry truth. |
| **P5** | Explicit proposed-change workflow | Model suggestions become reviewable diffs that a creator accepts or rejects. | Only then should AI participate in metadata improvement. |

## Decisions required before code resumes

1. Approve **P0–P2** as the next product lane, or change the order.
2. Confirm whether the creator landing surface is named **Creator Nexus**, **My Nexus**, or another approved term.
3. Confirm which first authored Guide may become the initial free avatar candidate under ADR-022.
4. Confirm whether the first sandbox may read only music facts and creator declarations, excluding private notes, raw audio, and rights fields by default.
5. Confirm that no draft PR or checkpoint is called “live” unless it has a public/signed-in route statement and a smoke result.

## Non-negotiable release rule

No future handoff may say merely **“shipped”**. It must state this five-field proof:

| Field | Required statement |
|---|---|
| Code | Commit and checkpoint identifier. |
| Visibility | Exact public or signed-in route where the change appears. |
| Data | Migration, existing data dependency, or “none.” |
| Validation | Automated tests/build plus browser or user-owned authenticated smoke status. |
| Exclusions | What deliberately did not change. |

This is how the platform stops feeling like invisible engineering and starts feeling like an intentional product.
