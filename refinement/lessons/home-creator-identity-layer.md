# Home Creator Identity Layer — 2026-09-04

| Field | Record |
|---|---|
| Problem | The Home showcase showed public Works and compact creator pills but did not give creators a prominent visual identity or a clear return path to their domains. |
| Solution | Added a larger responsive creator-card layer derived only from the existing public creator projection, using uploaded avatar/banner assets when available and a stable initial sigil otherwise. |
| Eligibility | A creator needs a non-placeholder public identity and at least one Work where `status = Published` and `isPublic = true`; login alone does not expose a profile. |
| Freshness | The public reader refreshes on Home after 60 seconds and focus, avoiding a worker for a database-backed live projection. |
| Files changed | `HomePage.tsx`, `server/utils/db.ts`, `bestPlayedThisWeek.contract.test.ts`. |
| Score delta | Retained the pre-existing 69/100 refinement baseline. |
| Tags | identity, creator, discovery, public-visibility, no-worker, home |

The reusable rule is: **derive visual distinction from creator-declared public materials and verifiable public catalog state, never from invented personas or opaque engagement scoring.**
