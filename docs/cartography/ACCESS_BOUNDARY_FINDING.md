# Access Boundary Finding — Cartography Publication and Password Request

> **Classification:** Foundational architecture finding. No authentication or publication implementation is authorized by this document.

## Executive Finding

`/docs/cartography/` returns **404** because the Cartography package is stored as repository documentation and no application route renders it. This is not a broken existing public page. The current router reserves the docs subdomain for a redirect to `/platform-guides`, and it declares no `/docs/*` route.[1]

Living Nexus already has **Manus OAuth-backed sessions**, protected tRPC procedures, and an `adminProcedure` that checks `ctx.user.role === "admin"`.[2] It does **not** have a custom user password-login or password-reset architecture. The only server-side bcrypt use located in the wide search hashes public-provenance API keys; it is not account-password authentication.[3]

Therefore, introducing “a password” now would create a second authentication authority beside Manus OAuth. That is a foundational choice affecting Identity, Registry, Stewardship, and Legacy—not a small docs-page addition.

## Direct Evidence Map

| Surface | Current technical fact | Status | Implication for Cartography |
|---|---|---|---|
| Cartography route | No `/docs/cartography/` route is declared in the application router. | **NOT IMPLEMENTED** | Files are repository-only until a display route is designed. |
| Docs subdomain | `isDocsSubdomain` redirects to `/platform-guides`. | **EXISTS** | A public docs host behavior already exists; it is not a role-gated document repository. |
| Platform Guides | `/platform-guides` maps to `PlatformGuidesPage`. | **EXISTS** | Potential parent surface, but it has not been assessed for the legal/claim status needed by Cartography. |
| Account authentication | OAuth callback creates a session cookie; SDK verifies the cookie and resolves user identity. | **EXISTS** | Existing identity authority is Manus OAuth, not a local password. |
| Procedure protection | `protectedProcedure` requires user context; `adminProcedure` rejects non-admin users. | **EXISTS** | A server-enforced admin/auditor documentation policy could reuse the current principal/session model. |
| User role data | `users.role` is used by admin controls and relevant queries. | **EXISTS** | Existing role vocabulary may support an approved visibility model, but an auditor/docs role has not been defined. |
| Password auth | No account-password or passcode verification surface was located in client/server auth paths. | **REFERENCED BUT NOT IMPLEMENTED** | Adding it requires explicit credential schema, hashing, reset/recovery, throttling, session policy, audits, and terms/privacy work. |
| bcrypt seam | `createApiKey`/`validateApiKey` generate and hash `ln_` API keys. | **EXISTS** | API-key hashing is not reusable proof that password auth exists or should be added. |
| Private work/export | Draft/private work and export flows use current authenticated ownership boundaries. | **EXISTS** | Indicates the system can distinguish public vs owner access, but no Cartography audience policy exists. |

## Architecture Options — Not Recommendations Until Authorized

| Option | What it means | Alignment | Cost / risk |
|---|---|---|---|
| A. Keep Cartography repository-only | Maintain audit package as internal project evidence. | Safest while counsel/claim review is unresolved. | No in-app review route. |
| B. Manus OAuth + admin-only Cartography reader | Add a server-enforced route and procedure requiring current admin role. | Reuses the one existing identity authority. | Requires document manifest, read model, access audit, and explicit audience policy. |
| C. Manus OAuth + explicit `auditor` / `steward` role | Establish a minimum-reviewer role distinct from administrator. | Best supports scoped review and least privilege. | Requires role policy, migration, administrative grant/revoke, audit log, and UI/API enforcement. |
| D. Shared password gate | A single secret admits reviewers to a document page. | Quick but weak, non-attributable, and outside present OAuth model. | Shared-secret leakage, no individual revocation/audit, reset/rotation burden, and a parallel access authority. |
| E. Full local password accounts | Add account credentials alongside OAuth. | Only appropriate if product identity strategy changes by explicit decision. | High security, recovery, privacy, and operational burden; not justified by the 404 alone. |

## Required Decision Before Any Code

The Keeper must select **one** audience model and state the intent:

1. **Internal only:** maintain repository-only access.
2. **Named reviewer access:** use existing OAuth, define `auditor`/`steward` role, and require server-side enforcement.
3. **Public doctrine library:** separate public-ready doctrine from internal Cartography evidence, claim registry, and counsel-gated analysis.
4. **External client / purchaser access:** first define contractual entitlement, identity verification, revocation, privacy, evidence retention, and support obligations.

No option should be selected merely to replace the 404. The publication boundary must say who may read which category—Doctrine, Technical Fact, Creator Declaration, Evidence, Legal Position, or internal finding—and why.

## Legal Review Boundary

This finding makes no conclusion about whether an access model satisfies privacy, security, contract, consumer-protection, or regulatory obligations. Those questions require a scoped technical design plus qualified counsel review before public claim or launch.

## Internal References

[1]: `client/src/App.tsx:254-263`, `client/src/App.tsx:300`, `client/src/App.tsx:395-396`
[2]: `server/_core/oauth.ts:89-98`, `server/_core/sdk.ts:226-300`, `server/_core/trpc.ts:49-58`
[3]: `server/utils/db.ts:5975-6049`

