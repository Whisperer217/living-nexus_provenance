# Manifestation Studio Architecture Notes

## Current State
- UploadPage.tsx (1898 lines) — single monolithic file
- 4 modes: audio, lyrics, manuscript, comic
- 4 steps: 1) Select Files, 2) Metadata, 3) Provenance/WID, 4) Publish
- Uses CosmicMediumIcon for type selector
- Has HarmonicWaveform component for audio
- Has WID generation (SHA-256 + ECDSA)
- Has upload pipeline (client-side metadata extraction)
- Route: /upload

## Plan: ManifestationStudio
Replace the UploadPage with a new ManifestationStudio that:
1. Uses a split-layout (left: guided process, right: live preview)
2. Adapts atmosphere per medium type
3. Has unique onboarding language per type
4. Shows live previews as files are added
5. Provides progress milestones and provenance indicators

## Architecture
- `/upload` → ManifestationStudio (new page)
- ManifestationStudio renders:
  - TypeGateway (initial type selection — immersive cards)
  - MusicManifestationEnv
  - LyricsManifestationEnv
  - ComicManifestationEnv
  - ManuscriptManifestationEnv
  - VideoManifestationEnv
- Each env shares:
  - StudioShell (split layout container)
  - ProvenancePanel (WID generation, integrity indicators)
  - ProgressMilestones (step tracker with reassurance messaging)
  - PublishGate (final review + publish)

## Key Reuse
- Keep all WID generation logic (sha256, ECDSA, formatWID)
- Keep upload pipeline (runUploadPipeline)
- Keep HarmonicWaveform
- Keep CosmicMediumIcon (for type gateway)
- Keep AI consent / HAAI declaration forms
- Keep the tRPC mutations (songs.upload, songs.uploadVideoByUrl)

## Type-Specific Atmospheres
- Music: violet/gold gradient, waveform animations, "resonance" language
- Lyrics: amber/parchment, quill animations, "inscription" language  
- Comic: coral/crimson, panel grid animations, "sequencing" language
- Manuscript: emerald/teal, scroll animations, "archival" language
- Video: deep blue/silver, frame extraction, "cinematic" language

## Split Layout
- Left (60%): Guided steps, metadata, instructions
- Right (40%): Live preview, provenance state, integrity indicators
- On mobile: stacked (preview collapses to top strip)
