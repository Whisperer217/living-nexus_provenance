# Authorized Agent Doctrine — Living Nexus

**Status:** Solid — implementation authority for the agentic layer  
**Scope:** Creator Domain agency under provenance law  
**Companion to:** `docs/LOOP_PRODUCT_SPEC.md` · `ARCHITECTURAL_LAWS.md` · `DOCTRINE.md`  
**Rule:** Agents are replaceable. Provenance is not. The intelligence may change. The creator’s lineage remains.

---

## 0. Governing principle

> The creator owns the domain of meaning; the agent operates by granted authority; the Nexus preserves the lineage.

The agent is **not** the owner of knowledge, memory, or tools.  
The agent is an **authorized participant** inside a **Creator Domain**.

Traditional stack Living Nexus rejects as primary:

```
User → Agent → (Skills, Tools, Connectors, Memory, Knowledge)
```

Living Nexus stack:

```
CREATOR DOMAIN
        │
   ┌────┴────┐
   │         │
IDENTITY  KNOWLEDGE
   │         │
   └────┬────┘
        │
  AGENTIC LAYER
        │
 ┌──────┼──────┐
 │      │      │
CAPABILITIES  BRIDGES  CONTINUITY
 │      │      │
 └──────┼──────┘
        │
   PROVENANCE → ARTIFACTS → WITNESS → LEDGER → LINEAGE
```

---

## 1. Ontology (frozen terms)

| Term | Meaning |
|---|---|
| **Creator Domain** | Persistent environment the creator inhabits — identity, artifacts, knowledge, agents, authorities, witnesses, commissions, lineage, ledger. Not “account,” “tenant,” “workspace,” or “project.” |
| **Authorized Agent** | Named actor that acts only under granted authority inside a domain (or platform charter for admins). |
| **Capability** | Domain-authorized action class (Compose, Analyze, Register, Seal…). Not something the AI “possesses.” |
| **Instrument** | Concrete mechanism that fulfills a capability (local model call, file transform, registry API). |
| **Bridge** | Provenance-crossing connector to an external system or off-platform reasoning engine. |
| **Commission** | Creator (or admin) direction that starts an authorized run of agency. |
| **Exchange** | Conversational turn sequence (chat). Working state, not Domain Continuity. |
| **Domain Continuity** | Creator’s attributable knowledge across agents, models, and time. Never called “AI memory.” |
| **Knowledge Record** | Provenance-bearing unit of knowledge (originated / witnessed / derived / external / unverified). |
| **Agent Ledger** | Append-only record of consequential agent actions. |
| **Reasoning Engine** | Model that produces derivations. Local-first; off-platform via Bridge. |
| **Admin Identifier** | Named platform steward with full charter capabilities; never anonymous. |

### Terminology ledger (traditional → Living Nexus)

| Traditional AI | Living Nexus |
|---|---|
| Agent | Authorized Agent |
| AI Assistant | Creative Agent |
| Skill | Capability |
| Tool | Instrument |
| Connector / Plugin | Bridge / Extension |
| Memory | Domain Continuity |
| Knowledge Base | Domain Knowledge |
| Context | Working State |
| Prompt | Direction |
| System Prompt | Operating Charter |
| Tool / Function Call | Action / Invocation |
| Workflow / Task | Process Lineage / Commission |
| Automation | Standing Commission |
| Permission / API Key | Authority / Credential |
| Agent Log / Chat History | Agent Ledger / Exchange Record |
| RAG / Vector DB | Provenance Retrieval / Knowledge Index |
| Model / Output | Reasoning Engine / Agent Result |
| AI Generation | Machine Derivation |
| Multi-agent system | Agent Network |

---

## 2. Creator Domain (the key unit)

```
DOMAIN: <creator.handle>
│
├── Identity
├── Artifacts (+ WIDs)
├── Knowledge Records
├── Authorized Agents
├── Capabilities (on/off + scope)
├── Bridges (on/off + scope + billing)
├── Authorities
├── Witnesses
├── Commissions
├── Lineage
└── Ledger (Living + Agent)
```

The account is something the platform issues.  
The **domain** is what the creator inhabits and carries — toward archive and estate.

---

## 3. Authorized Agent

**Definition:** An authorized actor operating within a provenance domain.

```
Creator
  │ grants authority
  ▼
Authorized Agent  <identifier>
  │ performs action under Capability / Bridge
  ▼
Artifact / Record / External System
  │
  ▼
Witness Event → Living Ledger / Agent Ledger
```

### Agent identity
Every agent instance must carry a stable identifier, e.g.:
- `agent:pna-creative-01` (creator domain agent)
- `admin:<openid-or-handle>` (platform admin acting under charter)

No consequential action without an identifier in the Agent Ledger.

### Operating Charter
Each agent has a charter: allowed capabilities, default reasoning engine, confirm-before-seal rules, and disclosure that outputs are **derivations** until creator confirms.

---

## 4. Capabilities (switchable “skills”)

Capabilities replace Manus-style “Skills.” They are **on/off**, scoped, and authority-bound.

### Core capability set (music-first beachhead)

| Capability | Default (Creator) | Notes |
|---|---|---|
| Guide | ON | Orient, explain process |
| Witness | ON | Read provenance, verify WID |
| Compose | ON | Draft / transform within domain |
| Registry | ON | Draft register; publish requires confirm |
| Archive | ON | Diary / notes / continuity |
| Vision | ON | Image/visual assist (domain-scoped) |
| Research | OFF until enabled | External retrieval via Bridge |
| Publish | OFF | Explicit grant |
| Seal | Confirm always | Never silent |
| Distribute | OFF | Requires Bridge |
| Admin Platform | Admin only | Full charter |

### Capability authority object (normative shape)

```
CAPABILITY: Compose
  authorized: true | false
  scope: creator_domain | platform
  can_create: true
  can_publish: false
  can_register_draft: true
  can_seal: false          # seal is separate + confirm
  requires_witness: true
  reasoning: local | bridge:<id> | either
  billed: false | true
```

### UI analogue (Manus-like)
- **Use Capabilities ▸** menu in PNA (select/toggle for this commission)
- **Manage Domain Capabilities** — creator settings
- **Developer Capability Base** — Settings → Developer: register, document, enable/disable capability packs for the domain or org
- Search + verified badges for platform-published capability packs

Capabilities are **not** owned by the model. The domain authorizes them; the engine merely executes instruments.

---

## 5. Reasoning engines — local first, Manus as purchasable backup

```
Reasoning Engine
  ├── Local Bridge (DEFAULT — included)
  └── Off-platform Bridges (OPTIONAL — purchased / credentials)
        ├── Manus Reasoning (backup / boost)
        └── Future: other providers
```

### Law
1. **Local-first.** Commissions invoke local reasoning by default when available.  
2. **Off-platform is opt-in.** Creator (or admin for platform agents) must enable a Reasoning Bridge.  
3. **Every invocation is ledgered** — engine id, bridge id, model, commission, result class.  
4. **Seal/register never silent.** Off-platform output is **Machine Derivation** until creator confirms.  
5. **Manus is not the foundation.** Manus may fall off as a **purchasable backup** for creators who need hosted horsepower.

### Monetary model (baked into Bridges)

| Path | Billing | Role |
|---|---|---|
| **Local AI** | Included with domain stewardship (compute on creator/platform local infra) | Default Continuity path |
| **Off-platform AI (e.g. Manus)** | Purchased Reasoning Bridge — credits/subscription | Backup / boost |
| **Capability packs (developer)** | Free platform packs or paid verified packs | Extends instruments under authority |
| **Admin** | No inference purchase required for charter ops; still ledgered | Platform stewardship |

Billing attaches to the **Bridge** and optionally to **Capability packs**, never to ownership of Domain Continuity.

```
BRIDGE: Manus Reasoning
  role: backup | boost
  default: OFF
  can_draft: YES
  can_seal: NO
  billed: YES (credits / plan)
  ledgered: YES
  authorized_by: Creator | Admin
```

Settings UX (target):
- **Settings → Reasoning** — Local engine URL/status; toggle Off-platform Bridges; purchase/credits for Manus  
- **Settings → Capabilities** — on/off matrix + scopes  
- **Settings → Developer** — Capability Base (publish/install packs, like a skills library)

---

## 6. Bridges (connectors with provenance)

External systems are boundary crossings:

```
CREATOR DOMAIN → ARTIFACT → WID → BRIDGE → EXTERNAL SYSTEM → PROVENANCE CHECK
```

Examples: Spotify Bridge, Drive Bridge, GitHub Bridge, Manus Reasoning Bridge.

Each Bridge declares read/write/delete, witness events, and billing.

---

## 7. Knowledge is not AI memory

Knowledge Records live in the domain:

| Kind | Meaning |
|---|---|
| Originated | Creator explicitly recorded |
| Witnessed | System observed an event |
| Derived | Agent inferred from records |
| External | Entered via Bridge |
| Unverified | Encountered claim, no established provenance |

Agents retrieve **Domain Continuity** via Provenance Retrieval — attributable, inspectable, revocable.

---

## 8. Commission → Agent Ledger → Artifact

```
COMMISSION
   │
   ▼
AUTHORIZED AGENT
   ├── consulted Artifact A/B
   ├── consulted Knowledge Record C
   ├── used Capability D
   ├── accessed Bridge E (optional)
   └── received Direction F
   │
   ▼
DERIVATION (Agent Result)
   │
   ▼
NEW ARTIFACT (Draft | Published by confirm)
   │
   ▼
WID → LIVING LEDGER
```

### Agent Ledger entry (normative)

```
AL-<id>
  agent: <identifier>
  commission: <id>
  capability: <name>
  sources: [artifact…, knowledge…]
  bridge: <id|none>
  engine: local | manus | …
  action: <verb>
  result: <artifact|record|none>
  witness: <WID|pending|none>
  timestamp: <iso>
  authority: creator_domain | platform_admin
```

Accountability model: not “the AI did it,” but  
**this authorized agent, under this commission, with these sources and capabilities, produced this result.**

---

## 9. Admins — full platform capability with identifier

```
IDENTIFIER (Admin)
  type: platform_admin | steward_admin
  capability_set: FULL (platform charter)
  scope: Living Nexus (or named domains)
  impersonate: NO default; YES only if explicit + ledgered
```

Rules:
- **Identifier required** — every admin act attributed  
- **Full charter** ≠ rewrite origin — cannot forge WIDs or erase lineage  
- **Creator Domain remains sovereign** — admin stewards the Nexus, does not own creator meaning  
- **Admin Ledger** parallels Agent Ledger  
- UI must show: `Acting as Admin <identifier>`

---

## 10. Surface mapping (PNA + Settings)

| Surface | Job under this doctrine |
|---|---|
| **PNA cockpit** | Domain agent exchanges; capability toggles; local/bridge engine indicator; confirm-before-seal |
| **Settings → Reasoning** | Local engine + purchasable off-platform Bridges (Manus backup) |
| **Settings → Capabilities** | On/off + scope matrix |
| **Settings → Developer** | Capability Base / packs library (Manus “Skills” analogue) |
| **Left nav drawer** | Stewardship + ethics / docs / Discord (platform gravity) |
| **Stage layout (target UX)** | Natural chat; **right column** = track imagery + provenance tree + creator / support / share |

Theme: one ThemeProvider owner; no competing Lights/theme fights on agent chrome.

---

## 11. Implementation order (non-calendar)

1. Freeze this doctrine + terminology (this file).  
2. Domain primitives: Commission, Knowledge Record, Agent Ledger (beside `songs`, not more music columns).  
3. Capability authority matrix + on/off persistence.  
4. ReasoningProvider: local default; Manus Bridge optional + billing hooks.  
5. PNA UX: capabilities menu, engine indicator, right-column provenance.  
6. Developer Capability Base in Settings.  
7. Decouple Manus from auth/storage as separate track; Manus remains purchasable reasoning backup.

---

## 12. Hard prohibitions

- Do not call Domain Continuity “AI memory.”  
- Do not let agents silent-publish or silent-seal.  
- Do not make Manus (or any vendor) required for domain stewardship.  
- Do not build multi-agent spectacle before Agent Ledger + Capabilities exist.  
- Do not expand multimedia onto the agency spine — music-first beachhead; medium-agnostic protocol.

---

## 13. One-line test

If removing the current reasoning vendor would destroy the creator’s knowledge, authorities, or WIDs, the architecture has failed this doctrine.

If removing the vendor only turns off a **Bridge**, and the Creator Domain + Continuity + Ledger remain — the architecture is correct.

---

*Living Nexus — Authorized Agent Doctrine · Command Domains LLC / BDDT Publishing*
