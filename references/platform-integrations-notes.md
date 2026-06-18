# Platform Integration Architecture Notes
_Logged: 2026-06-18_

## External AI Platform Auto-Registration

Three models discussed for auto-registering works from external platforms to Living Nexus:

**Model 1 — Creator-linked profile polling**
Creator links their profile URL (e.g. suno.com/@handle) to their LN account. LN runs a periodic background job polling their public feed for new works. On detection: pulls title, audio URL, cover art, timestamp, genre tags, lyrics (if present), generates WID + WID-LYR automatically. Creator gets notified and can confirm/edit.

**Model 2 — API key delegation**
Creator pastes their platform API key into LN settings. LN queries their generation history directly. More reliable than polling but requires platform developer API support.

**Model 3 — LN public REST endpoint (already built)**
LN exposes `POST /api/v1/register` — any external tool, script, Zapier automation, or browser extension can call it with a payload (title, file URL, creator ID, timestamp, metadata) authenticated by the creator's LN API token. This is the open door that Models 1 and 2 walk through.

## Suno Integration Specifics

Suno public song pages expose: title, audio URL, cover art, style/genre tags, lyrics (if text-to-song was used), creation timestamp, creator handle. Genre maps to LN genre field. Lyrics populate `lyricsText` and trigger WID-LYR generation automatically. Instrumental/style-only songs (no lyrics) register with audio WID only — correct behavior.

## Substack Integration

Every Substack publication has a public RSS feed at `https://[publication].substack.com/feed`. Standards-based — no scraping needed. RSS provides: title, full body text, publish date, post URL, tags, author. LN would register each post as a `manuscript` or `article` content type with a WID anchored to the text at publish time. Provides timestamped proof of authorship for plagiarism/AI training attribution disputes. Simpler and more stable than Suno polling due to RSS standard.

## Key Design Principle
The WID generated at the moment LN pulls external content proves the work existed in that exact form on that date — same cryptographic logic for audio, lyrics, essays, and images.
