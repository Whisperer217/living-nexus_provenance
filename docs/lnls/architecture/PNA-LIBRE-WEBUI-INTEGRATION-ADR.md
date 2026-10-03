# PNA × Libre WebUI Integration ADR

**Status:** Proposed — architecture only; no Libre WebUI deployment, PNA replacement, user-data export, or external connector has been activated.

**Date:** 2026-10-03  
**Decision owner:** Living Nexus platform stewardship  
**External candidate:** [Libre WebUI](https://github.com/libre-webui/libre-webui), Apache License 2.0

## Decision

Adopt Libre WebUI as an **optional, self-hosted local creator workspace** that can be reached from PNA and, later, receive creator-authorized Living Nexus context through a narrowly scoped integration gateway.

Do **not** replace the PNA interface wholesale. Do **not** embed Libre WebUI in an iframe. Do **not** grant Libre WebUI direct Living Nexus database access. Do **not** let model output register a Work, change a WID, alter provenance, publish, or make a Support/commerce decision automatically.

> PNA remains the Living Nexus-native stewarded surface for creator identity, Work context, private PNA threads, Quiver, diaries, Registry actions, and creator confirmation. Libre WebUI may become the local workshop where a creator explores models, private knowledge, artifacts, and isolated tasks under their own infrastructure.

## Why this fits

Libre WebUI provides capabilities PNA should not need to rebuild from scratch:

- locally hosted Ollama and provider-flexible model access;
- creator-owned document knowledge with source citations;
- durable chats, notes, artifacts, and isolated Work environments;
- native tool approvals, access grants, audit records, and scoped API tokens;
- Apache-2.0 reuse and forkability.

It aligns with the Living Nexus pillars when bounded correctly:

| Living Nexus layer | Benefit | Boundary that must remain intact |
|---|---|---|
| Identity | Creator keeps their model workspace and private materials under their control. | Libre account identity must not silently become a Living Nexus Creator Domain identity. |
| Manifestation | Draft artifacts and research can mature before registration. | An artifact is not a registered Work merely because it exists in Libre WebUI. |
| Relationship | PNA can hand a creator into their private workshop deliberately. | Witnessing Circle correspondence remains Living Nexus-controlled human correspondence. |
| Registry | A reviewed context package can cite the actual WID and Work source. | Libre never writes WIDs, provenance, testimony, or Registry history directly. |
| Stewardship | Local-first storage and explicit model-route disclosures improve creator agency. | Remote-provider disclosure remains mandatory whenever a request leaves local hardware. |
| Legacy | Creator-approved artifacts can be brought back through a reviewable import path. | No automatic bulk copy of Living Nexus records or private material. |

## Current-state boundary

The present PNA implementation already owns important Living Nexus-specific behavior:

- `client/src/pages/PNAShellPage.tsx` renders the PNA modes, music-bound context, avatar presentation, Quiver, diary actions, and the current private-thread experience.
- `server/routers/pnaThreads.ts` enforces owner-scoped PNA threads and messages.
- `server/routers/keeper.ts` provides the current PNA model interaction, diary archival, and private visual-proposal flows.
- PNA threads, Quiver, and a sealed diary are creator-owned platform records. They are not interchangeable with Libre chats, Notes, Knowledge collections, or Work tasks.

Libre WebUI therefore complements PNA; it is not a data-model substitute.

## Recommended topology

```text
Creator-owned hardware / private server
│
├── Libre WebUI
│   ├── Local account or future OIDC session
│   ├── Ollama / selected model providers
│   ├── Creator-approved private documents and local artifacts
│   └── Work sandbox (disabled initially)
│
├── PNA Local Connector (future, opt-in)
│   ├── Read-only, creator-scoped Living Nexus context
│   ├── Explicit source/WID citations
│   └── Side-effect requests routed back to Living Nexus review
│
└── Living Nexus
    ├── Creator Domain · Work · WID · provenance · testimony
    ├── PNA private threads · Quiver · diary records
    └── Consent-based Witnessing Circle correspondence
```

### The three integration lanes

| Lane | Purpose | First implementation | Authority |
|---|---|---|---|
| **Launch** | Reach a local Libre workspace from PNA. | Explicit “Open Local Workspace” action to a creator-controlled host or `localhost`. | No data exchange. |
| **Read context** | Let a model answer from creator-authorized Living Nexus material. | PNA integration gateway exposes read-only, cited creator-scoped endpoints. | Living Nexus remains source of truth. |
| **Return drafts** | Bring a Libre artifact back to PNA for review. | Draft/import proposal with an explicit creator confirmation in PNA. | PNA confirms; Registry remains unchanged until normal registration. |

## Authentication and data policy

### First release: separate local workspace account

Use Libre WebUI's private local account model on the creator's own computer or private server. This is the least invasive start. It gives the creator a local workspace without pretending that a Libre account is automatically a Living Nexus identity.

A direct one-click single sign-on is **not available automatically**. Libre WebUI supports generic OIDC, while the present Living Nexus app uses its existing Manus OAuth application flow. A future unified sign-on requires a deliberately designed OIDC or authorization-code bridge, token audience rules, revocation, and account-linking policy.

### Later: scoped PNA local connector

Do not issue database credentials to Libre WebUI. Instead, create a dedicated Living Nexus gateway with short-lived, creator-scoped authorization and narrow tools such as:

| Tool | Access | Result |
|---|---|---|
| `list_my_works` | Read | Creator-owned Work identity, title, medium, WID, and publication state. |
| `get_work_context` | Read | Creator-authorized Work context with a canonical WID/source link. |
| `search_my_archive` | Read | Creator-owned archive search with cited records. |
| `get_my_pna_context` | Read | A limited, explicit context package; never the entire private-thread history by default. |
| `propose_pna_import` | Side effect | Creates a reviewable draft in PNA; never registers or publishes a Work. |

The gateway should be registered in Libre as an OpenAPI or Streamable HTTP MCP tool server. Read operations can remain read-only. Any write-like operation must require both:

1. Libre WebUI's native side-effect approval; and
2. a separate, explicit Living Nexus/PNA confirmation.

No token belongs in a URL, prompt, browser local storage, or exported context package. No tool may access another creator's private records. Public Registry lookup must remain a separately governed public capability.

## Security and hosting decision

### Recommended pilot environment

Start on the creator's own hardware, as requested:

- pin a tested Libre WebUI release rather than deploying `latest` in a permanent environment;
- use local Ollama first where suitable;
- keep Knowledge collections opt-in and creator-owned;
- keep Work and agent CLI features disabled initially;
- if Docker is used only for Libre WebUI, do not mount the Docker socket merely for convenience;
- keep provider keys local and disclose every remote model route;
- back up Libre's data directory and encryption key together.

Libre's Work feature is powerful but is not a casual public-platform feature. It can run model-requested commands in task containers; the default Docker-socket arrangement gives the web application host-equivalent control. If Work is later enabled, it must run on a dedicated machine or hardened sandbox policy, remain restricted to trusted creators, use egress restrictions and quotas, and never have direct access to Living Nexus production infrastructure.

### Not recommended

- Deploying Libre WebUI inside the current Living Nexus WebDev process.
- Treating a Docker-container boundary as sufficient isolation for untrusted users.
- Running a public multi-user Work environment against the Living Nexus application host.
- Iframing an independently authenticated Libre interface into PNA.
- Ingesting the complete Living Nexus database, unfiltered archive, or correspondence history into a knowledge base.
- Allowing a model, tool, or artifact import to issue a WID, alter attribution, change Participation Chain records, or publish without creator action.

## UX recommendation

PNA should present Libre as a deliberate external workspace—not as hidden replacement chrome:

```text
PNA
├── Guide · Compose · Witness · Registry · Archive · Vision · Research
├── Current native PNA thread / Quiver / diary tools
└── Local Workspace
    ├── Open creator-controlled Libre WebUI
    ├── Show connection state: Not connected / Local / Authorized
    ├── Send a selected Work context package only after confirmation
    └── Import an artifact as a PNA proposal, never a registered Work
```

The PNA entry should retain Cathedral language and visual grammar while describing the truth plainly: **Local Workspace** is a private creator tool; it is not the Registry and it does not seal provenance by itself.

## Phased delivery

### Phase 0 — Evaluate locally (no Living Nexus code change)

1. Run Libre WebUI on the creator's own hardware.
2. Use local Ollama with one small general model and an embedding model for documents.
3. Create one private Knowledge collection from intentionally selected, non-sensitive creator documents.
4. Create one PNA-informed assistant profile using a static system instruction—no API connection, no database access, no automatic upload.
5. Keep Work, agent CLI models, public signup, and external tools off.

**Success:** The creator can use a local, private workspace without affecting Living Nexus records.

### Phase 1 — PNA launch surface (small Living Nexus change)

1. Add a PNA Local Workspace entry action and connection disclosure.
2. Open an explicitly configured local/private Libre URL in a new tab.
3. Do not iframe, sync sessions, or send creator data automatically.

**Success:** PNA directs a creator to their private workspace without duplicating PNA logic.

### Phase 2 — Read-only PNA connector

1. Design the gateway authorization flow and exact tool contract.
2. Create source-cited, creator-scoped endpoints.
3. Register only the read-only tools in Libre.
4. Test revocation, account mismatch, remote-provider disclosure, and citation correctness.

**Success:** A creator can ask their private workspace about authorized Living Nexus records and receive WID-linked evidence.

### Phase 3 — Reviewable artifact return

1. Accept a bounded artifact manifest from Libre into a private PNA proposal surface.
2. Preserve source/model/route metadata as declared evidence, not as self-proving provenance.
3. Require a creator review and normal Living Nexus registration workflow before a Work exists.

**Success:** Artifacts can re-enter the platform without bypassing declaration, review, WID, or publication safeguards.

### Phase 4 — Optional account bridging and hardened Work

Only after the above is stable:

- add a purpose-built OIDC/authorization-code identity bridge if unified login is still worth its operational complexity;
- evaluate hardened Work sandboxes on dedicated infrastructure;
- preserve per-user access grants, outbound-network policy, quotas, audit evidence, and creator consent.

## Alternatives considered

| Alternative | Decision | Reason |
|---|---|---|
| Replace PNA entirely with Libre WebUI | Rejected | Would discard PNA's creator identity, WID-aware context, Quiver, diaries, and Living Nexus doctrine. |
| Iframe Libre WebUI inside `/pna` | Rejected | Cross-origin auth, CSP, session, accessibility, visual ownership, and security boundaries become fragile. |
| Fork Libre WebUI immediately into the Living Nexus repo | Deferred | Apache-2.0 permits it, but immediate deep fork creates upstream-maintenance debt before the integration contract is proven. |
| Give Libre direct DB access | Rejected | Violates least privilege, creates a provenance bypass, and makes local workspace compromise a platform-data compromise. |
| Treat Libre Channels as Witnessing Circle chat | Rejected | Witnessing Circle correspondence is separately consent-based and platform-governed; PNA/Libre are not substitutes for it. |

## Risk register

| Risk | Mitigation |
|---|---|
| Model or document data leaves local hardware through a cloud provider | Per-route disclosure, local-first default, opt-in provider configuration, no silent fallback. |
| A local workspace is mistaken for canonical provenance | Visible separation: local draft/artifact versus registered Work/WID. |
| Work sandbox reaches host or private infrastructure | Disabled in pilot; dedicated/hardened host and egress policy before activation. |
| Two account systems confuse creators | Start with explicit separation; only add SSO after an accountable auth design. |
| Upstream change breaks custom integration | Version pinning, adapter gateway, contract tests, and upstream upgrade review. |
| PNA and Libre duplicate features | PNA owns platform-specific stewardship; Libre owns local model/workspace mechanics. |

## Validation required before implementation

- Threat model for local, remote, and multi-user deployment paths.
- Exact creator-consent copy for exporting PNA context and importing artifacts.
- Read-only connector authorization, account-linking, expiry, revocation, and audit tests.
- Proof that tools cannot access non-owner records or write canonical records.
- Remote-provider disclosure and local-only behavior tests.
- PNA mobile, keyboard, focus, and reduced-motion review for any launch/connection UI.
- Disaster recovery and local data export exercise before any creator data is imported.

## Sources reviewed

- [Libre WebUI repository and README](https://github.com/libre-webui/libre-webui)
- [Libre WebUI Quick Start](https://docs.librewebui.org/quick-start)
- [Libre WebUI Work: Isolated Workspaces](https://docs.librewebui.org/workspaces)
- [Libre WebUI Chat Tools](https://docs.librewebui.org/chat-tools)
- [Libre WebUI Authentication and Security](https://docs.librewebui.org/authentication)
- [Libre WebUI Public API](https://docs.librewebui.org/public-api)
