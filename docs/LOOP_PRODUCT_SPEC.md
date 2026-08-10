# Loop Product Spec — Frozen Law

**Status:** Solid — implementation authority  
**Scope:** Music/audio provenance only  
**Rule:** Easy to start · Hard to fake · Optional to go deep · Non-destructive

---

## 1. Product spine

Discover → Register → Work → Creator → Manage → Verify

Canonical unit: **one audio work + bound visual + participation chain + WID + tone-from-metadata + downloadable waveform.**

Albums/collections are relationship wrappers over independent works.

---

## 2. Registration law

### Minimum to publish
1. Canonical audio file (WAV/MP3/FLAC/AAC/OGG/M4A/etc.)
2. Title
3. Bound visual (embedded metadata art → upload → AI generate/remix)
4. Participation axes — **Music / Lyrics / Voice** each: `Human | AI | Both`
5. Attestation confirm
6. Explicit **Draft | Published** choice (never silent default-publish without choice)

### Assisted fill (Suggested / Detected)
- BPM / Key from audio analysis where possible
- Genre / Mood suggestions
- Tool fingerprints when present
- Creator always confirms

### Depth (optional / later edit)
Prompts, style language, instrumentation, origin story, richer disclosure.

### AI on register (only allowed AI product surface)
- Assist metadata suggestions
- **Visual generate / remix with prompt mechanics**
- Prompt + visual source stored as provenance
- Delisted from **Loop chrome** (floating over Discover/Register/Work): moving-head Keeper overlay, AmbientWidget theatre
- **Stewarded separately:** Provenance Nexus Avatar (PNA) — see §7. Not destroyed. Not delisted from product existence.

### Visual merge
1. Bring embedded/ID3 cover if present  
2. Else upload or AI generate  
3. Remix = new visual from current + prompt; active cover updates; lineage retained  
4. Publish requires bound visual  
5. Batch = per-track visual; album art optional shared

### At WID seal
Emits:
1. **WID** (immutable identity)
2. **Tone-from-metadata** (stable profile derived from confirmed metadata)
3. **Downloadable waveform** (from canonical audio)

New version / re-register → new WID + new tone + new waveform; prior retained in archive.

---

## 3. Creator profile (flagship)

Must answer **who / what / when / where / why**.  
**Testimonies** required for witness-ready public presence.  
Publish/public registry visibility gated on witness-ready profile; **drafts allowed before**.

Creator edit is first-class (identity, testimony, domain hierarchy, support).

Domains: music-only adjustable hierarchy; identity/testimony first.

---

## 4. Work page (public)

Must show above the fold / primary provenance:
- Who participated (Music / Lyrics / Voice)
- WID
- Tone identity
- Waveform download (when permitted)
- Lyrics if present
- Established metadata
- Bound visual
- Support / creator link
- Owner: Edit on page

---

## 5. Non-music & cleanup

- Delist from product surface (nav, register, explore, profiles)
- Retain for owner export/download
- Do **not** destroy registered works or WIDs
- Remove UI chrome first; hard-delete dead modules only after redirects + export are safe

---

## 6. Implementation phases

| Phase | Deliverable |
|---|---|
| P0 | This spec (authority) |
| P1 | Register: participation + Draft/Publish + assisted metadata |
| P2 | WID seal: tone-from-metadata + downloadable waveform |
| P3 | Visual merge + AI generate/remix + prompt provenance |
| P4 | Flagship creator + testimony publish gate |
| P5 | Work page surfaces + delist AI chrome **from Loop spine** |
| P6 | Batch parity + cleanup |
| P7 | **Steward PNA Avatar** as companion OS (not Loop overlay) |

---

## 7. Provenance Nexus Avatar (PNA) — stewarded companion

**Full name:** Provenance Nexus Avatar  
**Home:** `/pna` and `pna.livingnexus.org`  
**Law:** Loop stays reductionist. PNA stays amazing. Stewardship ≠ deletion.

### What we steward
- PNA shell — persistent creator intelligence (stewardship modes)
- Keeper Avatar surfaces — skins, attributes, cinematic presence (`/keeper`)
- Avatar Registry — AVT-WID registered creative skins (`/avatar-registry`)
- Floating / Nexus avatar presence **on PNA stewarded routes only**

### What stays off Loop chrome
- No floating Keeper head over Explore / Register / Work / Manage by default
- No AmbientWidget theatre on the music provenance spine
- Register AI remains: metadata assist + cover generate/remix only

### Non-destructive
- Do not destroy Keeper skins, AVT records, PNA notes, or chat capability
- Entry from Manage / TopBar “Provenance” is first-class stewardship access
- Quick actions inside PNA may deep-link into Loop spine (Register, Archive, Manage)

---

*Living Nexus Loop — Command Domains LLC*
