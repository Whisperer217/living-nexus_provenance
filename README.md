# Living Nexus — Audio Provenance Platform

> *"In him all things hold together."* — Colossians 1:17

Living Nexus is the cryptographic provenance layer for the creator economy. Every work registered on this platform receives a Witness ID (WID) — an immutable, timestamped, ECDSA-signed identity record that cannot be altered, deleted, or severed from its originator.

---

## Architecture Documentation

> **Start here before writing a single line of code.**

| Document | Purpose |
|---|---|
| **[docs/LAMININ.md](./docs/LAMININ.md)** | Foundational Architecture Doctrine — the load-bearing structure of this entire codebase. Read this first. |

---

## Quick Start

```bash
pnpm install
pnpm db:push
pnpm dev
```

---

## Stack

- **Frontend:** React 19 + Tailwind 4 + Wouter
- **Backend:** Express 4 + tRPC 11
- **Database:** MySQL / TiDB (Drizzle ORM)
- **Auth:** Manus OAuth
- **Payments:** Stripe
- **Storage:** S3

---

## Key Directories

```
client/src/pages/     ← Feature UI
server/routers.ts     ← tRPC procedures
drizzle/schema.ts     ← Database schema
docs/LAMININ.md       ← Architecture doctrine (read first)
```

---

*Command Domains LLC — Montgomery, TX*  
*In honor of PFC Miller.*
