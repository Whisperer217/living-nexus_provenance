# Batch Upload H3 — Private UI Implementation

**Status:** Implemented as creator-private Draft preparation; H4 authenticated smoke and H5 public promotion remain separately authorized.

## Scope

The existing `/batch-upload` surface now prepares local track metadata and routes selected assets through the protected H1/H2 evidence boundary. It creates no Work, WID, collection, public release, or registration outcome. A creator action may create a private operation and upload a creator-owned artifact only after H4 authorizes an authenticated smoke path; no such action was used for implementation validation.

## UI Contract

| Surface | H3 behavior | Explicitly excluded |
|---|---|---|
| Collection controls | Retain name, art, genre, disclosure, and track-card metadata editing; bind a local metadata-intent hash on preparation. | Collection creation, collection WID, shared-art custody finalization. |
| Track cards | Prepare source SHA-256 locally; call H2 canonical-first reconciliation; bind audio/cover only through server-attested receipt fields. | Client WID construction, ECDSA witness construction, direct registration. |
| Conflict handling | Display a no-selection ambiguity state; recovered exact source is described as recovery, not re-registration. | Selecting a candidate by WID/order or changing ownership. |
| Sticky action | **Prepare Private Draft** and Draft-only explanation. | Publish toggle, Archive/Verify result, automatic publication. |
| Private status | Shows operation reference, receipt/readiness facts, and cancel action; restores only an opaque creator-owned operation reference from tab session state through H2 ownership checks. | Public-facing operational data, browser-persisted metadata or evidence, or a public payment/creator surface. |

## Evidence Boundaries

The client may calculate a local source digest for a prospective exact-source reconciliation. The upload route remains the authority for the stored-artifact hash and transform version. The client sends `batchOperationId`, `batchClientCardId`, and `batchAssetKind` only in authenticated multipart form data; it does not trust a raw storage key or URL as a receipt.

## H4 and H5 Gates

H4 requires separate authorization because it can create one creator-private operation and persist test asset receipts. H5 requires separate authorization after H4 evidence is reviewed. Neither gate is satisfied by typechecking, contract tests, screenshots, or this UI implementation.
