# ADR — Discovery Query Interpretation

**Status:** Accepted for implementation  
**Date:** 2026-10-01  
**Scope:** Explore and the existing `/search` public discovery surfaces

## Decision

Living Nexus will extend its existing discovery surfaces with:

1. a shared, accessible loading and recoverable-error treatment;
2. transparent client-side filtering and sorting on the Explore music-and-creators surface; and
3. an optional server-side natural-language query interpreter.

The interpreter receives **only the visitor’s query**, extracts a bounded set of discovery constraints, and returns those constraints to the existing Registry search path. It never generates Works, creators, WIDs, provenance claims, or search results. Results continue to come exclusively from published public Registry records.

## Why

The public discovery surface already offers local title, creator, and genre matching, while `/search` offers the canonical cross-record search and WID redirect. Creating a parallel search index or a second discovery system would fragment attribution, routing, and cache behavior.

The query interpreter strengthens:

- **Identity:** creator handles can be recognized as an explicit filter.
- **Manifestation:** an intentional, readable discovery control surface replaces opaque matching.
- **Registry:** a WID remains a direct canonical lookup rather than an AI inference.
- **Stewardship and Legacy:** the interface explains how the query was understood and fails closed to deterministic matching when interpretation is unavailable.

## Request and data flow

```text
Visitor phrase
  │
  ├─ Normal search ────────────────► existing global Registry search
  │
  └─ “Guide the search”
       │
       ▼
  bounded query interpreter
       │  (query text only; no corpus leaves the Registry)
       ▼
  { terms, creator, genre, sort }
       │
       ▼
  existing public Registry query + explicit filters
       │
       ▼
  published public Works / creators / guides / collections
```

## Alternatives rejected

| Alternative | Why rejected |
|---|---|
| Create a separate vector store and semantic corpus | Requires an ingestion/index lifecycle and custody rules not present in the current Registry architecture. |
| Send Registry records to a model for ranking | Would expose more creator record data than the query-interpreter use case requires and could falsely imply AI authority over discovery. |
| Call the model on every keystroke | Creates latency, cost, and an opaque interaction. The interpreter is an explicit action. |
| Client-only keyword heuristics | Retained as a safe fallback, but insufficient for varied natural language. |

## Failure and rollback behavior

- Interpreter timeout, parsing failure, or model failure falls back to deterministic phrase parsing.
- Registry query failure shows a retryable error panel; it does not hide previously loaded records.
- The existing `search.global` procedure remains compatible for current consumers.
- Removing the optional `search.natural`/`search.interpret` procedures returns the product to its existing keyword discovery behavior without a schema migration.

## Verification

- Unit-test deterministic parsing and model-output normalization.
- Verify the query interpreter never returns unsupported filter values.
- Run `pnpm check`, focused discovery/search tests, and the full test suite.
- Browser-test Explore filtering, sorting, interpreter fallback, WID lookup, loading, and retry behavior.

## Release boundary

This ADR authorizes local implementation and validation only. It does **not** lift the project-wide checkpoint or deployment hold.
