# Living Nexus — Provenance-First Creator Surface TODO

## Phase 1 — Schema, Styles, Dependencies
- [x] Install @noble/ed25519 for Ed25519 key management
- [x] Extend drizzle/schema.ts: users.publicKey, agents, events (append-only), wids tables
- [x] Generate and apply DB migration SQL
- [x] Set up global gold-on-dark CSS theme (--ln-gold, obsidian bg, parchment typography)
- [x] Configure dark theme in App.tsx and index.css

## Phase 2 — Backend API
- [x] Key generation procedure: generate Ed25519 keypair on first login, store public key
- [x] Encrypted private key backup download endpoint (user-initiated only)
- [x] Canonicalization utility: UTF-8, normalized line endings, trimmed whitespace, collapsed blank lines
- [x] SHA-256 hash utility
- [x] Ed25519 sign/verify utilities
- [x] events.checkpoint tRPC mutation (append-only, hash-chained)
- [x] events.anchor tRPC mutation (canonicalize → hash → sign → Event + WID)
- [x] satchel.list tRPC query
- [x] wids.lookup public endpoint (GET /wid/:wid)
- [x] agents.getOrCreate tRPC query (PNA per user)
- [x] agents.update tRPC mutation (style fingerprint update)
- [x] PPG tRPC mutation (3 variants: conservative, exploratory, divergent)
- [x] Agent message tRPC mutation (Guide/Conductor/Critic/Custodian modes)

## Phase 3 — Frontend Creator Surface
- [x] 4-panel layout: Satchel (left), Editor (center), Agent (right), Provenance bar (bottom)
- [x] Satchel panel: threaded sessions, entry timeline, fork action
- [x] Lyrics editor: zero-lag textarea with local draft autosave on every keystroke
- [x] Agent panel: mode selector (Guide/Conductor/Critic/Custodian), message thread
- [x] Provenance preview bar: creator_id, timestamp, pending hash display
- [x] Anchor button: triggers full provenance pipeline
- [x] Fork from here action

## Phase 4 — Full Flow Wiring
- [x] Autosave: ephemeral draft to sessionStorage on every keystroke
- [x] Checkpoint trigger: 7s idle OR structural change (new line block)
- [x] Anchor flow: canonicalize → hash → sign → create Event + WID → show WID
- [x] PPG variants display in agent panel
- [x] Fork creates new event branch without mutating origin
- [x] Private key backup download UI (user-initiated)

## Phase 5 — Polish and Delivery
- [x] Vitest unit tests: 20 passing (canonicalize, sha256, Ed25519, anchor pipeline)
- [x] Final checkpoint and delivery

## Phase 2a — Avatar Widget · Cinematic Mode · Now Playing
- [x] FloatingAvatar component: orb, skin slot, mode color ring, pulse animations
- [x] Draggable positioning with localStorage persistence
- [x] Expanded widget: agent thread + mode tabs + now playing strip
- [x] Cinematic mode: full-screen editor, panels slide out, transitions
- [x] Cinematic mode toggle button + F11 shortcut
- [x] Now Playing: Media Session API hook (external tab detection)
- [x] Now Playing strip in expanded widget (auto-detected)
- [x] Now Playing strip in cinematic mode (faint ambient overlay)
- [x] Avatar reacts to detected track (system message in agent thread)
- [x] Floating widget added to creator surface (agent panel kept as secondary)

## Phase 2a — Keeper Skin System
- [x] FloatingAvatar component with Keeper portrait, mode ring, pulse animation
- [x] Cinematic mode toggle with full transitions
- [x] Now Playing hook (Media Session API)
- [x] /keeper route: character screen with skin selection grid
- [x] 6 skin cards: Hooded Scholar (free), Conductor (50), Witness (75), Archivist (100), Cipher (150), Custom Upload (200)
- [x] Each skin card shows capability unlocks
- [x] Custom upload slot with file upload to S3
- [x] Keeper stats panel (Provenance Depth, Corpus Size, etc.)
- [x] Active mode selector (Guide/Conductor/Critic/Custodian)
- [x] Keeper loadout slots (Appearance, Voice Style, Response Tone, Anchor Seal, Aura)
- [x] DB schema: keeper_skins table, user skin ownership
- [x] Wire active skin to floating avatar orb portrait
