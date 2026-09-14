# Lesson — Public WID Projection Must Filter Before Selection

**Date:** 2026-09-14  
**Category:** Registry stewardship  
**Checkpoint:** Pending

## Problem

The legacy WID Protocol selected the first Work row sharing a WID and evaluated public eligibility only after selection. When a public Work shared that WID with a deleted or unlisted historical row, the route could select the non-public row and report a misleading public 404. Separately, a Registry provenance read-model failure escaped the route and terminated the development process.

## Solution

Constrain public WID lookup at query time to public-published Work rows, order only for deterministic inspection, and classify the result into `resolved`, `not_found`, or `ambiguous`. A WID with multiple public candidates must return a truthful ambiguity response rather than selecting an owner by query order. Convert provenance read-model failures into a typed availability response without disclosing internal schema details.

## Files

| File | Purpose |
|---|---|
| `server/domains/registry/publicWitnessProjection.ts` | Pure public-candidate classifier. |
| `server/utils/db.ts` | Read-only public WID lookup with eligibility filtering. |
| `server/routes/workRoute.ts` | `200` / `404` / `409 WID_AMBIGUOUS` projection behavior. |
| `server/routes/registryApiRoute.ts` | Controlled `503 REGISTRY_READ_UNAVAILABLE` provenance response. |
| `server/tests/registryPublicProjection.contract.test.ts` | Regression contracts for resolved, ambiguous, absent, and unavailable states. |

## Rule

> **Projection order may make a read deterministic; it may never adjudicate WID ownership.**

## Score delta

The refinement baseline remained **70/100**. This change strengthens Registry and Stewardship layers by making public read states explicit while preserving all canonical records.

## Tags

`registry`, `wid`, `public-projection`, `ambiguity`, `append-only`, `error-containment`, `creator-sovereignty`
