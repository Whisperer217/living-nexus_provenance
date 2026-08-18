# Admin Control Plane — Architecture and Smallest Staged Plan

**Status:** Planning only — approval required before implementation  
**Scope:** `/admin` as a protected platform stewardship surface  
**Authority:** Doc Seraph Mercer, Keeper  
**Prepared by:** Manus AI  
**Date:** 2026-08-18

> **Decision summary.** Living Nexus should gain a narrow, protected **Admin Control Plane** at `/admin`. It must be a stewardship surface for observable health, safe configuration, diagnostics, route status, and audit—not a privileged back door into creator Works, the Registry, payment operations, source code, or the database.

This document is a design and implementation plan only. It does **not** change code, schema, data, deployment, public routes, WIDs, provenance, publication, Registry behavior, user accounts, or configuration.

## 1. Mission and Boundary

The Control Plane provides administrators a reliable way to observe platform health and govern a deliberately small class of safe, database-backed settings. It does not reinterpret creator authority. A Work, WID, testimony, provenance event, publication status, Registry record, payment, or source file remains outside this plane.

The governing rule is simple:

> **The Control Plane may steward platform presentation and operational visibility. It may not rewrite creator truth, cryptographic identity, registry custody, or application code.**

| Administrative concern | Control Plane posture | Reason |
|---|---|---|
| Health, diagnostics, approved route status | Read-only, redacted, admin-gated | Supports stewardship without altering product truth. |
| Safe design defaults and feature flags | Typed, allowlisted, Preview → Apply | Enables controlled platform configuration without arbitrary persistence. |
| Audit and rollback | Mandatory for each successful configuration change | Preserves accountability and recoverability. |
| Creator Works, WIDs, provenance, publication, Registry | Explicitly excluded | These remain creator- and protocol-governed records. |
| Payments, Stripe, role assignment, moderation, job execution | Existing specialized administration, not Control Plane scope | Each has a separate risk model and must not be silently absorbed. |

## 2. Verified Current State

Living Nexus already contains substantial administrative infrastructure. The problem is not absence of capability; it is that safe, observable platform stewardship is mixed with broad operational and mutation powers.

| Existing asset | Verified current role | Reuse decision |
|---|---|---|
| `adminProcedure` | Server-side role gate that requires an authenticated user with `role === "admin"`. | Reuse as the sole server authority for every Control Plane procedure. [1] |
| `server/routers/admin.ts` | Large admin namespace with user, billing, work moderation, visual-pipeline, system-config, audit-log, role, and other procedures. | **Do not expand this broad router for Control Plane features.** Isolate a narrow `adminControlPlane` namespace instead. [2] |
| `platformSettings` and system-config helpers | Existing database-backed key/value persistence, including platform-setting access and system-config access. | Reuse only behind a typed, allowlisted registry; never expose raw key/value editing in the new plane. [3] [4] |
| `adminLogs` and `logAdminAction` | Existing admin-action record and reader used by several privileged procedures. | Reuse for the action-log view; harden mutation-stage audit so successful configuration changes cannot be unaudited. [2] [3] |
| `/admin` and `/admin/*` client routes | `/admin` currently renders `AdminUsersPage`; other specialized pages include moderation, comments, audit, notifications, payment integrity, and mission control. | Replace only the root landing with the Control Plane overview; retain all specialized routes unchanged. [5] |
| `AdminUsersPage` | Existing tabbed command surface containing raw system configuration, action-log, user, billing, moderation, and other operational tools. | Treat as legacy/specialized administration, not as the Control Plane shell. Do not delete or alter it in the first slice. [6] |
| `DashboardLayout` | Existing authenticated dashboard scaffold with sidebar, responsive behavior, sign-in prompt, and sign-out affordance. Its menu is placeholder-oriented today. | Reuse its shell/auth patterns or parameterize it for an admin-specific navigation model; do not duplicate dashboard infrastructure. [7] |
| `systemRouter.health` | Existing health surface. | Extract or extend shared health probes so a minimal public health projection remains safe while a richer redacted projection is admin-only. [8] |
| `MissionControlPage` and worker endpoints | Existing specialized worker and queue observability. | Surface summary health links/cards only; do not fold queue mutation or worker execution into the new plane. [5] |
| `ThemeContext` | Current client theme authority and document-theme writer. | Preserve it as the sole writer of `data-theme`; Control Plane configuration may supply a validated default, never a second theme writer. [9] |
| `sessionFlags.ts` | Session-expiry helper, not a feature-flag system. | Do not reuse as the feature-flag foundation. [10] |

### Finding: the current admin namespace is too broad to become the Control Plane unchanged

The current `adminRouter` already includes higher-risk powers such as work moderation, billing reset, user-role assignment, direct raw system-configuration writes, asset-generation operations, and other domain-specific procedures. It is correctly protected by `adminProcedure`, but authorization alone does not make every capability appropriate for a safe configuration surface. [2]

The proposed Control Plane therefore **adds a narrow namespace and a new root dashboard**. It does not delete or rename the existing specialized administration in this slice. Existing capabilities remain outside the new shell until each one receives its own authority review.

## 3. Authority Architecture

### 3.1 Trust model

Client route gating is a usability measure only. The security authority remains server-side. Every Control Plane query and mutation must use `adminProcedure`; a client must never infer or grant administrative authority by hiding or showing navigation.

| Layer | Required behavior |
|---|---|
| Authentication | The request carries a valid Living Nexus session and resolves a current user. |
| Authorization | The server applies `adminProcedure`; non-admin users receive `FORBIDDEN` regardless of client state. |
| Input validation | Every setting key and value is validated by a server-owned allowlist and typed schema. Raw keys, arbitrary JSON, URLs, CSS, SQL, and command strings are rejected. |
| Preview | The server returns a no-write, exact proposed diff, validation result, warnings, and affected surface description. |
| Apply | The server verifies the short-lived preview receipt, revalidates the typed input, checks the current-value digest for conflict, writes the setting, and records the action. |
| Audit | A successful Apply or rollback has actor, timestamp, setting key, validated old/new values or redacted hashes, reason, validation-spec version, preview receipt ID, and configuration revision. |
| Rollback | A prior audited value is restored only through the same Preview → Apply path. Rollback creates a new audit event; it never erases history. |

### 3.2 Proposed namespace separation

The current app router already groups specialized router namespaces in `server/routers/index.ts`. The smallest safe change is a new, narrowly owned `adminControlPlane` namespace mounted beside—not inside—the legacy `admin` namespace. [11]

```text
client /admin
        │
        ▼
AdminControlPlanePage
        │
        ├── adminControlPlane.getOverview              (read-only)
        ├── adminControlPlane.getHealth                (read-only, redacted)
        ├── adminControlPlane.getRouteStatus           (read-only, allowlisted routes)
        ├── adminControlPlane.getAuditLog              (read-only, paginated)
        ├── adminControlPlane.previewConfiguration     (read-only)
        ├── adminControlPlane.applyConfiguration       (typed, audited)
        └── adminControlPlane.previewRollback          (read-only)
             └── adminControlPlane.applyRollback       (typed, audited)

Existing namespaces remain separate:
admin · moderation · worker · paymentIntegrity · audit · songs · provenance · wids · payments
```

This division prevents a future Control Plane screen from gaining access to an unrelated high-risk procedure merely because both concepts happen to be called “admin.”

## 4. Forbidden Powers

The following powers are excluded from the route, server namespace, UI, configuration registry, and future Control Plane navigation. They are not deferred buttons; they are negative requirements.

| Forbidden power | Enforcement design |
|---|---|
| Arbitrary code execution | No command, script, webhook, job invocation, prompt execution, or user-supplied executable payload endpoint. |
| Arbitrary database editing | No SQL console, table browser/editor, raw JSON mutation, generic record patcher, or arbitrary key/value screen. |
| Schema editing | No migration runner, DDL editor, schema browser with write actions, or Drizzle control UI. |
| WID modification | No WID creation, replacement, mutation, resealing, signature change, or manual identifier editor. |
| Provenance modification | No provenance-event creation, deletion, mutation, rebinding, or timeline editor. Provenance may only be linked as a read-only reference where appropriate. |
| Source-code editor | No repository browser/editor, file upload-to-code path, environment variable editor, build trigger, or deployment control. |
| Publication or Registry override | No publish/unpublish, visibility override, discoverability override, or Registry predicate control. |
| Payment/Stripe operation | No checkout, refund, reset, pricing, webhook, destination, or origin control in this Control Plane. |
| Authorization control | No self-promotion, role management, access-token issuance, or policy bypass. |
| Arbitrary outbound diagnostics | No user-supplied target URL. Route/status checks are fixed, internal, and allowlisted. |

Existing legacy/specialized pages that already contain some high-risk administrative functions are **not** incorporated into the new Control Plane. Their separate retention, replacement, migration, or archival classification requires a later explicit decision.

## 5. Safe Configuration Model

### 5.1 A registry, not a generic key/value editor

`platformSettings` is appropriate persistence for safe configuration only if server code defines the complete allowed configuration registry. The client receives a display model, never permission to invent keys. Existing raw `admin.setSystemConfig(key, value)` is evidence of a legacy generalized configuration seam; it must not be used by the new Control Plane UI. [2] [3]

Each registry entry must define the following contract:

| Contract field | Requirement |
|---|---|
| Stable key | A code-owned namespaced key, such as `design.defaultTheme` or `feature.<approved-name>`. |
| Value schema | Enum, boolean, bounded number, or bounded string. No arbitrary objects or executable content. |
| Default | Safe fallback used when no persisted value exists. |
| Consumer | Exact existing client or server reader that uses the value. A setting without a known consumer cannot be applied. |
| Scope | Global-only in the first slice. No per-user targeting, role targeting, or cohort logic. |
| Preview renderer | Human-readable before/after diff and declared affected route/surface. |
| Rollback class | Reversible immediately, reversible after refresh, or prohibited from mutation. |
| Audit classification | Normal, sensitive-redacted, or prohibited. |
| Expiry/review | Mandatory review date for any feature flag; defaults do not persist indefinitely without ownership. |

### 5.2 Initial safe setting categories

The first design control must be deliberately small. No raw CSS, text injection, image URL, custom font, script, or layout definition is safe for the initial Control Plane.

| Category | Initial allowed form | Explicit exclusions |
|---|---|---|
| Design default | Selection among the already-supported, code-defined Living Nexus themes. | New theme definitions, CSS variables, custom colors, fonts, HTML, scripts, image URLs, or user-preference override. |
| Motion preference | A bounded, code-defined default for non-essential ambient motion only, after confirming an existing consumer. | Disabling accessibility requirements or forcing motion against user reduced-motion preferences. |
| Feature flags | Boolean values for explicitly approved, non-security, non-registry, non-payment presentation features. | Auth, authorization, WID, provenance, publication, Registry, payment, storage, or data-retention flags. |

The implementation must verify the exact accepted theme identifiers before it registers the first design setting. The Control Plane does not author themes. It selects only from existing, versioned values.

### 5.3 Theme authority remains singular

`ThemeContext` remains the only browser-level writer of `data-theme`. The proposed database-backed default follows this precedence order:

```text
Creator’s valid saved theme preference
    → validated platform default from safe configuration
        → current static fallback
```

This gives administrators a safe default without overriding a creator’s chosen appearance and without introducing a competing DOM writer. [9]

## 6. Preview → Apply → Rollback Protocol

The initial configuration workflow is intentionally two-stage. A visually attractive “Save” button without server revalidation is not sufficient for a protected control plane.

| Step | Server action | User-visible result | Write? |
|---|---|---|---|
| Select | Read current typed setting and registry metadata. | Current value, owner, scope, and rollback availability. | No |
| Preview | Validate key/value, compute before/after display, affected surface, warning list, and current-value digest. Issue a short-lived receipt bound to admin, key, candidate value, and base digest. | Exact proposed change; Apply stays disabled on validation failure. | No |
| Apply | Verify admin role, receipt, expiry, value, schema version, and current-value digest. Revalidate independently. Persist only the allowlisted setting and append mandatory action audit. | Success state with configuration revision, audit record, and rollback action. | Yes |
| Rollback preview | Load a prior audited reversible value and produce a fresh preview against current state. | Exact restoration diff, not an opaque undo. | No |
| Rollback apply | Use the same server checks and a new action audit. | New revision and explicit restoration record. | Yes |

If the setting has changed after preview, the digest mismatch cancels Apply and requires a new Preview. This avoids stale-tab overwrites.

### Audit durability requirement

The current `logAdminAction` helper is useful for continuity, but the existing helper is best-effort and cannot by itself satisfy the requirement that every successful configuration change be auditable. [3]

For mutation stages, the server must either write the configuration and its audit record atomically, or fail the Apply operation. The initial implementation should use existing `platformSettings` and `adminLogs` only if their current schema and transaction behavior can guarantee that contract. If they cannot, the configuration mutation must stop and return for a separate, narrowly scoped migration approval; it must not silently proceed with best-effort logging.

Audit values must be redacted or hashed when a future safe setting could contain sensitive content. Secrets are not an allowed setting type and are never displayed or written through the Control Plane.

## 7. Health, Route Status, Diagnostics, and Audit

### 7.1 System health overview

The overview should reuse the health-probe work already behind `systemRouter.health`, separating a minimal public health response from a richer admin-only redacted projection. [8]

The first view reports only bounded, operationally useful status:

| Signal | Initial display rule |
|---|---|
| API/process health | Healthy, degraded, or unavailable with timestamp; no raw environment dump. |
| Database reachability | Healthy/degraded only; no connection string, hostname, credentials, or query text. |
| Build/platform version | Existing release identifier if available; no deployment control. |
| Visual and existing worker health | Summary counts/status through existing read-only worker telemetry; no enqueue, requeue, restart, or schedule action. |
| Last known audit activity | Timestamp and action class from existing admin logs. |

### 7.2 Route/page status

Route status is observability, not a crawler, browser driver, or arbitrary network tool. The server owns a fixed registry of canonical routes, expected response class, and safe check method. The first registry should include only the fixed public spine and an internal Control Plane route check, such as `/`, `/explore`, `/manifest`, `/manage`, and `/admin`.

No user-supplied URLs, query strings, hosts, redirects, credentials, or outbound targets are permitted. A route status card may report the last verified HTTP class and timestamp. It does not invoke a publish, purge a cache, warm a route, alter route declarations, or make public-route behavior authoritative.

### 7.3 Diagnostics

Diagnostics may show bounded status, recent error classifications, and links to existing specialized read-only operational pages. They must redact secrets, session tokens, headers, raw stack traces, creator private data, payment data, and unbounded log payloads. Diagnostics have no “run,” “retry,” “restart,” “requeue,” “execute,” or “repair” action in this slice.

### 7.4 Audit log

The Control Plane action log is distinct from the existing quarterly engineering audit page. It should present the existing `adminLogs` action history as an operational accountability ledger with pagination and filtering by action class, actor, target namespace, and time range. [2] [6]

The new overview may link to existing specialized audit records, but it must not merge the two concepts or alter existing audit-content records.

## 8. Control Plane Shell and Information Architecture

The root `/admin` becomes the protected Control Plane overview. Existing `/admin/users`, `/admin/moderation`, `/admin/audit`, `/admin/mission-control`, and other specialized routes remain intact during the initial work. [5]

The shell must reuse the authenticated/dashboard behavior of `DashboardLayout` while replacing its placeholder navigation with a dedicated, token-based Control Plane navigation. A small parameterization or a narrow `AdminControlPlaneLayout` composed from the existing sidebar primitives is preferable to cloning a second dashboard framework. [7]

| Shell section | Initial role | Mutation capability |
|---|---|---|
| Overview | Health summary, route status, recent audited activity, safe links. | None |
| Configuration | Typed, allowlisted design-default settings only after Stage 2 approval. | Preview → Apply only |
| Design | Theme-default preview and eventual bounded motion default. | Preview → Apply only |
| Feature flags | Explicit approved boolean flags only after Stage 4. | Preview → Apply only |
| Diagnostics | Read-only redacted diagnostics and status links. | None |
| Action log | Paginated configuration and Control Plane audit entries. | None |
| Legacy/Specialized administration | Existing route links only, clearly separated and not represented as Control Plane powers. | Unchanged by this plan |

The Control Plane shell uses established Living Nexus theme tokens and typography. It is administrative, not generic: restrained surfaces, clear authority labels, no hardcoded colors, no competing `data-theme` writer, and no public Loop-navigation change. [12]

## 9. Smallest Staged Implementation Plan

Each stage is independently reviewable, testable, and checkpointable. No stage authorizes the next stage.

| Stage | Deliverable | Files likely affected | Explicitly excluded | Approval gate |
|---|---|---|---|---|
| **1 — Read-only protected shell** | Make `/admin` a role-aware Control Plane overview with health summary, bounded route status, diagnostics links, and action-log reader. Add a narrow read-only server namespace. Preserve existing specialized `/admin/*` routes. | `client/src/App.tsx`, new `client/src/pages/admin/AdminControlPlanePage.tsx`, reused/parameterized dashboard shell, new `server/routers/adminControlPlane.ts`, `server/routers/index.ts`, health-probe utility or `systemRouter`, focused tests. | No configuration writes, schema/data changes, WID/provenance/work/publication/payment/worker actions. | Keeper reviews rendered shell and read-only endpoint contracts. |
| **2 — Safe configuration transaction** | Add code-owned typed registry, Preview → Apply receipt, conflict detection, critical audit contract, and rollback preview/apply for exactly one approved safe setting category. Use existing database settings/audit storage only if atomic audit can be guaranteed. | Stage 1 files; narrow config service; existing database helpers; focused transaction/authorization tests. | No raw key/value editor, arbitrary JSON, schema migration unless separately approved, feature flags, WID/provenance/publication/payment changes. | Keeper approves exact first key set and persistence/audit proof. |
| **3 — Design default controls** | Register only already-supported theme-default selection and, if a verified existing consumer exists, non-essential motion default. Preserve `ThemeContext` as sole DOM writer and user-preference precedence. | `ThemeContext` integration only as needed, safe config registry, Control Plane design panel, tests. | No CSS/theme editor, color/font injection, image URL injection, user override, or public layout rewrite. | Keeper approves exact enum values and preview presentation. |
| **4 — Feature flags** | Add explicitly approved global boolean flags with owner, expiry/review date, server validation, preview, audit, rollback, and clear consumer declaration. | Safe config registry and flag consumers proven non-security/non-registry; tests. | Flags for auth, role, payment, WID, provenance, Registry, publication, storage, retention, or data access. No client-only security gate. | Keeper approves every flag name, consumer, and expiry. |

### Stage 1 acceptance criteria

Stage 1 is the smallest implementation slice and should not contain any setting mutation. It is complete only when all of the following are true:

| Requirement | Proof |
|---|---|
| `/admin` resolves to the new overview without altering public Loop routes. | Route test and guest/admin UI smoke evidence. |
| Guest and non-admin users cannot obtain protected Control Plane data. | Server `adminProcedure` authorization tests; client denial is supplementary only. |
| Existing `/admin/*` specialized pages remain routed exactly as before. | Route regression assertions. |
| Health/diagnostics data are bounded and redacted. | Response-shape tests asserting absence of secret/env/header/stack fields. |
| Route status has no arbitrary target input. | Schema test proves no URL/host parameter exists. |
| Action log is read-only and paginated. | Procedure and UI tests. |
| No Work, WID, provenance, publication, Registry, payment, schema, or configuration mutation occurs. | Focused no-write verification plus regression suite. |

## 10. Six-Layer Alignment

| Living Nexus layer | Control Plane contribution | Protection against harm |
|---|---|---|
| Identity | Keeps creator identity, role authority, and WID identity outside routine configuration. | No WID or creator-record editor. |
| Manifestation | Allows bounded platform presentation defaults through existing theme authority. | No raw CSS or arbitrary visual payloads. |
| Relationship | Gives stewards observability without turning creator support/public surfaces into administrative targets. | No payment or creator-support actions. |
| Registry | Treats WID/provenance as read-only and independent from Control Plane state. | No registry/provenance mutation endpoints. |
| Stewardship | Adds validated, auditable, reversible management of safe platform settings. | Mandatory audit, optimistic concurrency, and Preview → Apply. |
| Legacy | Preserves specialized legacy admin routes while classifying them rather than silently deleting or absorbing them. | Retain first; migrate/archive only with later approval. |

## 11. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| The new shell accidentally becomes a link farm for dangerous existing powers. | Keep Control Plane navigation strictly allowlisted; categorize specialized administration separately. |
| An admin setting becomes an arbitrary persistence/editor backdoor. | Server-owned typed registry; reject unregistered keys and all raw payload types. |
| A successful configuration change lacks an audit record. | Atomic setting-plus-audit write or fail closed; do not rely on best-effort logging. |
| A stale preview overwrites a newer setting. | Base-value digest and mandatory re-preview on conflict. |
| A theme setting fights user preferences or creates another theme writer. | Preserve `ThemeContext` as sole DOM writer and define preference precedence. |
| Diagnostics disclose secrets or private creator data. | Redacted DTOs, bounded fields, no environment/header/stack data, and authorization tests. |
| Route monitoring becomes SSRF or unbounded network scanning. | Fixed server-owned route manifest with no target input. |
| Existing broad admin procedures are mistaken for approved Control Plane powers. | Separate router namespace, shell navigation, documentation, and tests. |

## 12. Testing and Rollback Strategy

The implementation should follow the established Living Nexus validation gates: focused unit tests, `pnpm check`, full test suite, refinement validation, route smoke checks, and visual review at desktop and mobile widths. [13]

| Area | Required tests after its authorized stage |
|---|---|
| Authorization | Guest, authenticated non-admin, and admin procedure access. |
| Configuration | Unknown key rejection, invalid value rejection, preview no-write, receipt expiry, optimistic conflict, successful Apply audit, and audited rollback. |
| Boundaries | Contract tests proving the new namespace contains no WID, provenance, Work/publication, payment, schema, code-execution, or arbitrary-target procedure. |
| Theme | Valid default fallback, creator preference precedence, only `ThemeContext` writes `data-theme`, and no invalid theme string is applied. |
| Route status | Fixed-route only, bounded response, and no arbitrary URL input. |
| Audit | Pagination, redaction, actor/action/previous/new revision proof, and no successful config mutation when audit persistence fails. |
| Regression | Public `/`, `/explore`, `/manifest`, `/manage`, `/song/:id`, `/creator/:id`, and existing specialized `/admin/*` route checks. |

Rollback remains simple by design. Stage 1 is a route and read-only API addition: roll back its checkpoint to restore the existing `/admin` landing. Stages 2–4 use a forward, audited restoration of the preceding setting value rather than deletion of history. A failed code release rolls back to the prior checkpoint; a valid configuration issue rolls back through Preview → Apply so custody remains intact.

## 13. Decision Requested

Approval is requested for **Stage 1 only**:

1. Create the protected, read-only `/admin` Control Plane overview.
2. Reuse existing server `adminProcedure`, dashboard-shell patterns, health infrastructure, and action-log data.
3. Keep existing specialized `/admin/*` routes unchanged and clearly outside this new Control Plane.
4. Add no configuration mutation in Stage 1.
5. Make no change to public Work, WID, provenance, publication, Registry, payment, schema, storage, or source-code behavior.

Stages 2–4 remain unapproved pending separate review of the exact configuration registry, audit-transaction proof, design enum list, and feature-flag consumers.

## References

[1]: ../server/_core/trpc.ts "Living Nexus server procedure authorization primitives"
[2]: ../server/routers/admin.ts "Existing broad admin router and protected procedures"
[3]: ../server/utils/db.ts "Admin action, system-configuration, and platform-setting helpers"
[4]: ../drizzle/schema.ts "Platform settings and administrative log persistence schema"
[5]: ../client/src/App.tsx "Current `/admin` and specialized administration routes"
[6]: ../client/src/pages/AdminUsersPage.tsx "Existing tabbed admin command surface"
[7]: ../client/src/components/DashboardLayout.tsx "Existing dashboard shell and authenticated layout pattern"
[8]: ../server/_core/systemRouter.ts "Current system health infrastructure"
[9]: ../client/src/contexts/ThemeContext.tsx "Current single theme authority"
[10]: ../client/src/lib/sessionFlags.ts "Session-state helper, not feature-flag infrastructure"
[11]: ../server/routers/index.ts "Application router namespace composition"
[12]: ../../skills/sovereign-cathedral/SKILL.md "Living Nexus design and sovereignty doctrine"
[13]: ../../skills/living-nexus-architecture-steward/SKILL.md "Living Nexus architecture-steward validation protocol"
