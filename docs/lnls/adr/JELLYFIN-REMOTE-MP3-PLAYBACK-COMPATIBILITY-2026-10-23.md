# ADR — Jellyfin Remote MP3 Playback Compatibility

**Date:** 2026-10-23
**Status:** Validated correction; public prerelease publication authorized
**Baseline:** `c6c6bd806e152c0ace0f11171dcd0118a8bd0fd9`

## Decision

Correct the Living Nexus Jellyfin plug-in so it returns a technically complete `MediaSourceInfo` only after it has transiently verified the existing revocable gateway serves an MP3 bitstream. The plug-in will retain the original Living Nexus gateway URL as its playback path. It will neither expose nor store the redirected object URL or media bytes.

The initial `0.1.0.0` implementation supplies `Path`, `Protocol`, `IsRemote`, and source type but no container or Audio stream. In a fresh Jellyfin 12.2 Web session, Jellyfin requested `/Audio/{item}/universal` and failed before it requested the Living Nexus gateway: `StreamBuilder.GetOptimalAudioStream` threw `ArgumentNullException` for `audioStream`. The browser then reported `MEDIA_ELEMENT_ERROR` code 4.

Jellyfin 12.2 uses the source container and selected Audio-stream codec to choose a direct-play profile. The current portable catalog deliberately does not contain verified container or codec fields. Adding fixed MP3 metadata to every item would therefore invent a claim and could make future non-MP3 Works unsound.

## Chosen implementation

Only `integrations/jellyfin` changes are authorized.

1. The channel issues a 16-byte, range-limited transient read of the existing HTTPS Living Nexus gateway for each candidate item, with bounded concurrency. It accepts either a valid MPEG audio frame at the beginning of the response, or an ID3v2 header paired with the HTTPS gateway's transiently resolved object path ending in `.mp3`. It never treats an ID3 header alone as an MP3 claim.
2. A verified result creates the channel source with `Container = "mp3"`, one default Audio stream with `Codec = "mp3"`, `MediaProtocol.Http`, `IsRemote = true`, `SupportsDirectPlay = true`, `SupportsDirectStream = false`, and `SupportsTranscoding = true`.
3. A probe failure, non-MP3 payload, or non-success response omits that item from the Jellyfin channel rather than fabricating source facts. This does not alter any Work, WID, catalog authority, or gateway authorization rule.
4. The released package remains immutable. The validated patch is published as Jellyfin `0.1.1.0` in a separate immutable prerelease asset and manifest entry; `0.1.0.0` remains the rollback reference.

## Alternatives rejected

Hard-coding MP3 based only on an extensionless gateway URL was rejected because the current portable catalog has no media-format field. Adding a database column, migration, backfill, or production deployment was rejected because the authorized scope prohibits them. Caching raw remote media or using a raw storage path was rejected because the gateway must continue to re-evaluate authorization and revocation for each playback fetch.

## Affected surfaces

| Surface | Change | Authority impact |
|---|---|---|
| `LivingNexusChannel.cs` | Verify a direct MPEG header or an ID3-plus-resolved-MP3 source contract, then map truthful Jellyfin 12.2 metadata. | Retains Living Nexus gateway and read-only channel boundary. |
| `LivingNexusChannelTests.cs` | Add positive metadata/probe and negative unverified-media coverage. | Proves no raw URL and no fabricated media source. |
| Plug-in project/build metadata | Public prerelease version `0.1.1.0`. | Adds one immutable release asset and manifest entry; does not change application authority. |
| Server, Registry, database, WIDs, media gateway | No change. | Preserved exactly. |

## Architectural alignment

The correction strengthens **Identity** because creator attribution, Work ID, and WID stay on the item; it strengthens **Registry** and **Stewardship** because playback continues through the revocable authority gateway; and it strengthens **Legacy** by making the external Jellyfin representation accurately describe what the client can play. It introduces no database migration, Registry write, raw-storage publication, entitlement, or persistent unauthorized media cache.

## Risks and controls

Each catalog load may make small gateway range requests. Concurrency is bounded at eight and each probe reads at most 16 bytes; response bodies and redirect URLs are discarded. The current public audit found 99 of 100 first-page items had both an ID3v2 header and a resolved `.mp3` object path; the remaining item had a RIFF/WAV signature and `.wav` path, and is intentionally excluded. Playback continues to use the original gateway path, so the gateway’s current eligibility, ambiguity, withdrawal, CORS, and no-store checks remain the enforcing boundary.

The storage origin’s generic `application/octet-stream` header remains a production delivery limitation outside this authorized correction. The candidate must demonstrate actual browser playback through Jellyfin’s server route before any patch release is considered.

## Validation and rollback

Run focused C# tests, server catalog/gateway regression tests, TypeScript checking, and the isolated Jellyfin 12.2 Web flow. The flow must demonstrate selected gateway playback, actual decoded audio, pause, resume, and a seek; it must also confirm attribution, Work ID, WID, artwork, and unavailable-Work failure behavior. If validation does not pass, do not package a candidate and report the smallest remaining dependency. The existing `0.1.0.0` public package is untouched and remains the rollback reference.

## Jellyfin 12.2 implementation evidence

Jellyfin 12.2 accepts remote Channel sources through `ChannelItemInfo.MediaSources`. Its direct-play selection checks the declared source container and Audio-stream codec against the client profile; an empty audio-stream list produced the captured `audioStream` null exception. `MediaSourceInfo` defaults its capability booleans to true, so the candidate explicitly sets the flags instead of relying on those defaults.

The closest finite remote-audio comparator is the Tilapia podcast channel. It receives trustworthy RSS enclosure MIME, derives a container/codec, maps a remote HTTP source with a populated Audio stream, and supports an extensionless URL only when feed metadata establishes its type. That supports transient verification in this integration, where Living Nexus deliberately does not expose raw storage URLs or a MIME/codec catalog field. The older TuneIn channel’s extension-only MP3 fallback was explicitly rejected because this catalog contains at least one current WAV object.

**Sources:**

- https://github.com/jellyfin/jellyfin/blob/v12.2/MediaBrowser.Model/Dto/MediaSourceInfo.cs
- https://github.com/jellyfin/jellyfin/blob/v12.2/MediaBrowser.Model/Dlna/StreamBuilder.cs
- https://github.com/jellyfin/jellyfin/blob/v12.2/Jellyfin.Api/Controllers/UniversalAudioController.cs
- https://github.com/jellyfin/jellyfin-web/blob/v12.2/src/scripts/browserDeviceProfile.js
- https://github.com/sevquis-collab/jellyfin-plugin-tilapia/blob/main/Jellyfin.Plugin.Podcasts/PodcastChannel.cs
- https://github.com/jellyfin-archive/emby-plugin-tunein/blob/master/MediaBrowser.Plugins.TuneIn/ChannelMediaInfo.cs
