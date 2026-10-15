# ADR — Legacy Stewardship and Memorial Records

**Status:** Accepted — owner-approved implementation, 2026-10-15  
**Scope:** Randall Smith / `@Nero's Shadow` (`users.id = 1320247`)  
**Initial Steward:** Doc Seraph Mercer (`users.id = 1`)  
**Authority:** Explicit project-owner authorization in task record, 2026-10-15

## Decision

Living Nexus will represent posthumous or continuity-preservation access as a **scoped Legacy Stewardship grant**, not as a global role promotion, password/session recovery, creator-identity transfer, or ownership rewrite.

A grant is attached to one Creator record and one named steward. Its scope is deliberately narrow:

| Permitted | Prohibited |
|---|---|
| Inspect registry and media-reference records | Change original creator identity, Work ownership, WIDs, hashes, dates, testimony, or provenance |
| Export current records | Recover or impersonate the creator account |
| Manage approved public presentation through purpose-built future surfaces | Change payout, banking, licensing, or rights configuration |
| Append a clearly labeled memorial statement | Delete, replace, or silently rewrite a prior memorial statement |
| Record stewardship activity in an audit log | Access private correspondence, PNA threads, or private source material |

The grant does **not** transfer copyright, authorship, ownership, or legal authority. It records platform stewardship authority only.

## Data model

### `legacyStewardshipGrants`

One active grant is protected by a unique `activeKey` (`creatorId:stewardId`). When revoked, the key is cleared while the grant record and append-only event evidence remain. Scope is stored as JSON so permissions are inspectable and expansion requires an explicit schema/router change.

### `legacyStewardshipEvents`

An append-only custody ledger records grant issuance, revocation, completed registry reconciliations, and public memorial publications. It never substitutes for a Work provenance event.

### `legacyMemorialStatements`

A memorial statement is a creator-page record authored by the Legacy Steward. It is immutable after publication, holds its own SHA-256 body hash, and is visibly separate from the Creator's original Testimonies and Work-level provenance.

## Authorization

- **Create or revoke a grant:** platform Admin only; the action is audited.
- **Read a stewardship dashboard or reconciliation:** matching active steward, or platform Admin.
- **Append a memorial statement:** matching active steward whose persisted scope includes `appendMemorialStatement`; verified server-side on every write.
- **Read published memorial statements:** public, presentation-only data.
- **Private records:** never made available through this model.

All failed authorization checks return the same uninformative `FORBIDDEN` response to avoid leaking relationship details.

## Public presentation

The public Creator Domain may render only published Legacy Memorial records. It must include an attribution line naming the Legacy Steward and an explanation that the record does not alter the creator's own testimony, authorship, or Work provenance.

No generic editor is added to the Creator page. A future, permission-gated stewardship workspace is the only composition route.

## Registry reconciliation model

The reconciliation inspects every Work where `songs.userId` equals the creator ID. The canonical per-Work WID is `songs.witnessId`; the historic auxiliary `wids` table is assessed as a separate index rather than a required duplicate source of truth.

Checks:

1. Exactly one creator identity for every returned Work.
2. Work count, publication status, and collection membership.
3. Presence, canonical `WID-*` format, and uniqueness of each `songs.witnessId`.
4. A separate count of auxiliary `wids`-table rows for the creator, without declaring absent rows to be missing canonical WIDs.
5. A SHA-256 digest of a stable, sorted Work/WID/status snapshot.

No reconciliation mutates Works, WIDs, media, hashes, creator attribution, or collections.

### Historic auxiliary-index drift

The live historic `wids` table uses `widCode`, `workType`, and `fileHash`; an old source declaration describes a different legacy shape. The reconciliation adapter reads the verified live fields directly and aliases `widCode` to `wid` for reporting. This is a read-only compatibility measure. It neither alters the historic table nor elevates it over `songs.witnessId` as the canonical per-Work identifier.

## Alternatives rejected

| Alternative | Reason rejected |
|---|---|
| Promote the creator account to `admin` | Global platform authority; does not give the named steward access; unsafe and semantically wrong. |
| Transfer the account to the steward | Erases or blurs creator identity and makes authorship appear transferred. |
| Reuse PNA or Correspondence | Those systems have different private-context or consent purposes. |
| Add a free-text memorial to creator bio | Editable, indistinguishable from the creator's own voice, and not auditable. |
| Create a new WID for the memorial | Would wrongly frame a platform custody notice as Randall's authored Work. |

## Architectural alignment

| Layer | Strengthening effect |
|---|---|
| Identity | Randall remains the original Creator on every existing Work. |
| Manifestation | The memorial appears as a distinct, dignified public record rather than altered Work copy. |
| Relationship | Documents the steward-to-creator relationship with an explicit limited scope. |
| Registry | Preserves canonical WID checks and a reproducible reconciliation digest. |
| Stewardship | Adds revocable, auditable continuity authority. |
| Legacy | Makes memorial preservation durable without misrepresenting authorship. |

## Risk and rollback

- **Risk:** memorial wording could be mistaken for the creator's testimony.  
  **Control:** separate record/type, steward attribution, immutable copy, explicit disclaimer.
- **Risk:** privilege escalation.  
  **Control:** scoped grant, server-enforced checks, no global-role change, audit events.
- **Risk:** incorrect identity selection among duplicate `Randall Smith` records.  
  **Control:** initial scope uses verified ID `1320247` and handle `Nero's Shadow`, never name matching.

Revocation sets the grant inactive and prevents future writes immediately; it does not delete earlier custody evidence or published memorial records. Removing the public route/component would hide memorial presentation without altering creator records.

## Validation plan

- Drizzle-generated migration after the active `0138_panoramic_satana` boundary.
- Unit/source contracts for scoped authorization, public-only memorial reads, immutable statement behavior, and no global-role change.
- Row-level reconciliation of every Work in the initial creator scope.
- `pnpm check`, focused Vitest, full Vitest, production build, `git diff --check`, and public creator-page smoke test.

## Implementation evidence — 2026-10-15

- Generated and applied additive migration `0139_dapper_iron_patriot.sql`; its SHA-256 was recorded in the Drizzle ledger. A subsequent `pnpm drizzle-kit migrate` completed successfully with no replay.
- Created active grant `legacyStewardshipGrants.id = 1` for the explicit pair `creatorId = 1320247` / `stewardId = 1`, with the four scopes listed above. The custody ledger contains its `granted` event.
- Completed a read-only reconciliation and recorded custody event `legacyStewardshipEvents.id = 2`. The full immutable inspection record is [`RANDALL-SMITH-NEROS-SHADOW-REGISTRY-RECONCILIATION-2026-10-15.md`](../audits/RANDALL-SMITH-NEROS-SHADOW-REGISTRY-RECONCILIATION-2026-10-15.md).
- Results: 61 current Work rows, 38 published, 23 non-published, 61 canonical `songs.witnessId` values, zero missing or malformed canonical WIDs, and three duplicate WID assignments retained for separate review. No Work, WID, hash, asset, testimony, rights, or creator record was changed.
- No memorial statement was published. The supplied wording remains a clearly labeled draft until an authorized steward deliberately publishes its exact text through the scoped interface.
- Validated with `pnpm check`; four focused suites / 21 tests; `pnpm build`; `git diff --check`; full Vitest: 122 files / 771 tests passed, one skipped; and unauthenticated desktop/mobile smoke of `/creator/Nero%27s%20Shadow` with no browser-console errors.
