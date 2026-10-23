# Jellyfin Portable Witness Integration — Implementation Record

**Date:** 2026-10-23
**Scope:** Read-only remote-media discovery for eligible public Living Nexus Works, plus a Jellyfin 12.2 Channel plug-in package.
**Base checkpoint:** `cb9272891603d7773f30af819d2dd1a6cde0748a` (mobile-alignment checkpoint)
**Deployment / publication:** **Not performed.**
**Database / migration / production data changes:** **None.**

## Decision and Boundaries

Living Nexus remains the canonical authority for Works, WIDs, attribution, publication state, companion withdrawal, and media authorization. The integration does **not** add a second registry, media store, playback engine, player queue, creator permission system, or cache of manifest records.

The existing generic `/api/v1/catalog` and `/api/v1/stream/:id` endpoints remain untouched because the legacy stream endpoint redirects to raw storage media. The additive endpoint below is the sole external-media discovery path introduced by this slice:

```text
GET /api/v1/provenance-player/catalog?limit=1..100&offset=N
```

It is intentionally distinct from a `living-nexus-player/1` import manifest. It returns only individual track projections already validated by the current Portable Witness adapter, under a separate catalog schema:

```text
living-nexus-provenance-catalog/1
```

## Implemented Surface

### 1. Eligible-work discovery adapter

`server/domains/provenancePlayer/catalog.ts` builds a stable, bounded page from the same single-Work adapter used for `living-nexus-player/1` exports.

- Reuses `buildProvenancePlayerManifest` rather than reserializing provenance fields.
- Excludes candidates with missing WIDs or active-record WID ambiguity.
- Silently excludes adapter-ineligible candidates; unexpected errors remain errors.
- Preserves deterministic candidate order and page offsets.
- Caps returned pages at 100 and source scanning at 500 candidates.

**Evidence:** [`catalog.ts`](../../server/domains/provenancePlayer/catalog.ts) lines 8–64.

### 2. Safe public catalog endpoint

`server/routes/publicApiRoute.ts` now serves `/api/v1/provenance-player/catalog`.

The route:

- asks the existing database projection only for public, published, unflagged audio candidates with a WID, media reference, and no companion withdrawal;
- uses `getAmbiguousProvenancePlayerWids` to reject duplicate current identities while excluding only historical `Deleted` rows;
- runs each candidate through the existing adapter;
- emits `Cache-Control: no-store` and existing public CORS headers;
- exposes the existing revocable `/api/provenance-player/media/:workId` gateway rather than raw storage media; and
- leaves all legacy public catalog and stream routes unchanged.

**Evidence:** [`publicApiRoute.ts`](../../server/routes/publicApiRoute.ts) lines 100–143; [`db.ts`](../../server/utils/db.ts) lines 2823–2903.

### 3. Jellyfin 12.2 plug-in package

The additive plug-in source lives under `integrations/jellyfin/`.

- Target: `net10.0`; package metadata declares Jellyfin target ABI `12.2.0.0`.
- Channel: `LivingNexusChannel` implements Jellyfin `IChannel` and calls only `https://www.livingnexus.org/api/v1/provenance-player/catalog`.
- Media safety: it accepts only HTTPS `www.livingnexus.org` media URLs at `/api/provenance-player/media/…`, rejects raw-storage and other-host URLs, maps WID and Work ID into provider identifiers, and declares remote audio only.
- Discovery: `LivingNexusServiceRegistrator` implements Jellyfin's required `IPluginServiceRegistrator` and registers exactly one singleton `IChannel`. This was the missing native-host registration step; an `IChannel` assembly alone is not automatically surfaced by Jellyfin.
- No credentials, background worker, local library copy, download, synchronization, webhook, or cache is added.

**Evidence:**

- [`LivingNexusChannel.cs`](../../integrations/jellyfin/LivingNexus.Jellyfin/Channel/LivingNexusChannel.cs) lines 12–132.
- [`LivingNexusServiceRegistrator.cs`](../../integrations/jellyfin/LivingNexus.Jellyfin/LivingNexusServiceRegistrator.cs) lines 9–18.
- [`build.yaml`](../../integrations/jellyfin/build.yaml).

The implementation was checked against the pinned [Jellyfin 12.2 source](https://github.com/jellyfin/jellyfin/tree/v12.2), including `IChannel` and `IPluginServiceRegistrator`, plus the [official plug-in template](https://github.com/jellyfin/jellyfin-plugin-template).

## Validation

| Check | Result | Evidence |
|---|---|---|
| Living Nexus TypeScript | Passed | `pnpm check` |
| Focused catalog / manifest / legacy-route contracts | Passed — 4 files, 22 tests | `provenancePlayerCatalog`, `provenancePlayerCatalogRoute`, `provenancePlayerManifestRouter`, `provenancePlayerManifestExport.contract` |
| Full Living Nexus regression suite | Passed — 401 files, 930 tests; 1 skipped | machine-readable Vitest output |
| Living Nexus production build | Passed | `pnpm build`; existing Vite chunk-size warnings retained |
| Jellyfin plug-in unit tests | Passed — 4 tests | `dotnet test` against `Jellyfin.Controller` / `Jellyfin.Model` 10.11.11 packages |
| Plug-in package | Passed | ZIP integrity check confirms `LivingNexus.Jellyfin.dll` and `build.yaml` |
| Jellyfin 12.2 host rehearsal | Passed | disposable Jellyfin 12.2.0 host loaded `Living Nexus 0.1.0.0`; authenticated `/Channels` response listed `Living Nexus` |
| Local endpoint read | Passed | 3 real eligible entries, schema `living-nexus-provenance-catalog/1`, `nextOffset: 3`, WID/creator/Work identity present, all returned audio URLs gateway-only |
| Refinement | Existing baseline retained — 70/100 C | isolated `pnpm refine`; no new integration-specific debt signal |

The channel-registration test is explicit: [`LivingNexusChannelTests.cs`](../../integrations/jellyfin/LivingNexus.Jellyfin.Tests/LivingNexusChannelTests.cs) lines 12–23. The route test checks no-store output, bounded paging, gateway-only media, and preservation of legacy routes: [`provenancePlayerCatalogRoute.test.ts`](../../server/tests/provenancePlayerCatalogRoute.test.ts) lines 65–108.

## Packaged Artifact

A reproducible local package was created and validated, but not published:

```text
integrations/jellyfin/repository/artifacts/living-nexus_0.1.0.zip
SHA-256: 87b0ec470eeb58161d85076d75f3f4415e569124637fed46c78e6c6d7e118177
```

The package contains only:

```text
LivingNexus.Jellyfin.dll
build.yaml
```

## Deliberate Repository-Manifest Hold

`integrations/jellyfin/repository/manifest.json` was **not created** and no Jellyfin repository was published.

A Jellyfin repository manifest needs a real immutable download URL. There is no approved hosted release asset or validated public download URL for `living-nexus_0.1.0.zip` in this task. Creating a manifest with a placeholder, local path, or unverified URL would falsely advertise an installable release and violate the requested release rule.

## Remaining Preconditions Before Any Public Plug-in Repository

1. Approve and perform a separate Living Nexus deployment that includes `/api/v1/provenance-player/catalog`. The current production site does not yet contain this new endpoint.
2. Host the exact ZIP at a versioned, immutable public HTTPS URL.
3. Fetch that exact URL and verify its SHA-256 equals `87b0ec470eeb58161d85076d75f3f4415e569124637fed46c78e6c6d7e118177`.
4. Run one fresh Jellyfin 12.2 end-to-end rehearsal against the deployed endpoint: channel browse, page advancement, and a gateway authorization response. Do not treat registration alone as proof of a deployed catalog.
5. Only then create and publish the Jellyfin repository `manifest.json` that names the validated version, ABI, direct ZIP URL, and checksum.

## No-Change Conclusion

No production deployment, publication, migration, database write, Registry record change, WID change, media download, or playback action occurred. The integration source and validated local package are checkpoint candidates only. Existing release gates—including the PWA activation root cause, approved authenticated creator journeys, startup rehearsal, and deployment approval—remain in force.
