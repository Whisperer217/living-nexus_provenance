# Living Nexus — Creator Provenance Platform

> *"In him all things hold together."* — Colossians 1:17

Living Nexus is the cryptographic provenance layer for the creator economy. Every work registered on this platform receives a **Witness ID (WID)** — an immutable, timestamped, ECDSA-signed identity record that cannot be altered, deleted, or severed from its originator.

The platform is built on the **LAMININ Doctrine**: four structural arms (Registry, Community, Commerce, Doctrine) that hold the creator and their creation together the way laminin — the cross-shaped protein — holds the human body together at the cellular level.

---

## Architecture Documentation

> **Start here before writing a single line of code.**

| Document | Purpose |
|---|---|
| **[docs/LAMININ.md](./docs/LAMININ.md)** | Foundational Architecture Doctrine — the load-bearing structure of this entire codebase. Read this first. |
| **[MOBILE_ROADMAP.md](./MOBILE_ROADMAP.md)** | Native mobile app (Expo/React Native) — current state and full build roadmap. |
| **[LN-PHASE2-SPEC.md](./LN-PHASE2-SPEC.md)** | Phase 2 spec: Floating Avatar Widget, Cinematic Mode, Global Player. |
| **[docs/first-witness-flow-ux.md](./docs/first-witness-flow-ux.md)** | UX spec for the First Witness onboarding ceremony. |
| **[CHANGELOG.md](./CHANGELOG.md)** | Full version history of all platform changes. |

---

## Platform Status

| Layer | Status | Notes |
|---|---|---|
| **Web App (provenance)** | Production-deployed | 151+ phases shipped, 201 tests passing |
| **Mobile App (Expo)** | Phase 1 complete — shell built | 5 screens, mock data, dual theme |
| **WID Registry** | Live | ECDSA-signed, append-only ledger |
| **Stripe Commerce** | Live | 90/10 creator split, Connect Express |
| **Keeper AI Agent** | Live | Floating avatar, voice, cinematic mode |
| **Guide Entity Pipeline** | In progress | 6-step upload wizard, AI extraction |

---

## Repositories

| Repo | Description |
|---|---|
| **`living-nexus_provenance`** *(this repo)* | Web platform — React 19 + Express + MySQL |
| **`living-nexus-mobile`** | Native mobile app — Expo SDK 54 + React Native |

---

## Quick Start (Web)

```bash
pnpm install
pnpm db:push
pnpm dev
```

---

## Quick Start (Mobile)

```bash
cd living-nexus-mobile
pnpm install
pnpm dev          # starts Metro + API server
# Scan QR with Expo Go to preview on device
```

---

## Web Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Tailwind 4 + Wouter |
| Backend | Express 4 + tRPC 11 |
| Database | MySQL / TiDB (Drizzle ORM) |
| Auth | Manus OAuth |
| Payments | Stripe Connect |
| Storage | S3 |
| AI | Gemini multimodal (Keeper agent) |

## Mobile Stack

| Layer | Technology |
|---|---|
| Framework | Expo SDK 54 + React Native 0.81 |
| Navigation | Expo Router 6 (file-based) |
| Styling | NativeWind 4 (Tailwind CSS) |
| State | React Context + AsyncStorage |
| API | tRPC client (ready for wiring) |
| Backend | Shared Express server (same as web) |

---

## Key Directories (Web)

```
client/src/pages/     ← Feature UI (React)
server/routers.ts     ← tRPC procedures
drizzle/schema.ts     ← Database schema
docs/LAMININ.md       ← Architecture doctrine (read first)
```

## Key Directories (Mobile)

```
app/(tabs)/           ← 5 tab screens (Discover, Profile, Witness, Studio, You)
components/           ← Shared components (WID badge, creator card, audio player)
lib/mock-data.ts      ← Mock data (replace with tRPC calls in Phase 2)
lib/trpc.ts           ← API client (pre-wired, needs env URL)
```

---

## The LAMININ Four Arms

| Arm | Name | Status |
|---|---|---|
| I | Registry — Cryptographic Provenance | Live (WID pipeline, ECDSA, ledger) |
| II | Community — Creator Network | Live (profiles, guilds, Signals, Jukebox) |
| III | Commerce — Marketplace | Live (Stripe Connect, gifts, sync licensing) |
| IV | Doctrine — LAMININ Protocol | Live (manifesto, Lexicon, BDDT publications) |

---

*Command Domains LLC — Montgomery, TX*
*In honor of PFC Miller.*
*Colossians 1:17*
