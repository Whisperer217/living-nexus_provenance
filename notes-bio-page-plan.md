# Bio Page / Creator Identity - Implementation Plan

## Existing Schema Fields (users table)
- name, artistHandle, bio, profilePhotoUrl, bannerUrl
- website, location, twitterHandle, instagramHandle, youtubeHandle
- aiDisclosure, primaryGenre
- expressionId, expressionPrompt, expressionStyleTags, expressionComposerNote
- toneFrequencyNote, dominantKey, tempoRange, energyProfile
- founderWid, founderGrantedAt
- publicKey (Ed25519 for provenance)

## New Fields Needed for Dual-Layer Identity

### Witness Identity Layer (new columns on users table)
- originStatement (text) — "Why I create" / origin story
- creativePhilosophy (text) — manifestation philosophy
- creativeDoctrine (text) — personal doctrine/methodology
- sigilUrl (text) — personal sigil/mark image
- activeMediums (JSON) — ["music", "books", "comics", "manuscripts", "video"]
- archiveContinuity (text) — statement about archive direction

### Distribution Identity Layer (new columns on users table)
- officialArtistName (varchar 128) — industry-facing name
- localizedName (varchar 128) — localized/alternate name
- dspSpotifyUrl (text) — existing Spotify profile
- dspAppleMusicUrl (text) — existing Apple Music profile
- dspTikTokHandle (varchar 64) — TikTok handle
- producerCredits (text) — producer/engineer credits
- labelName (varchar 128) — label or self-released

## Architecture
- CreatorProfilePage already has: bio, social links, badges, witness network
- ProfilePage (editable) has: testimony tab, field notes, works
- NEW: Add a dedicated "Identity" tab/section on CreatorProfilePage that shows:
  - Witness Identity (testimony, philosophy, doctrine, origin, sigil, mediums)
  - Distribution Identity (DSP profiles, credits, industry metadata)
- NEW: Creator Card component for hover/tap on track cards and discover feed

## Design Direction
- Registry archive entry / museum placard / author provenance card
- NOT a social media profile
- Cinzel headings, archival typography, gold accents on dark
