# Living Nexus × Jellyfin — Release-Candidate Preparation

**Date:** 2026-10-23
**Base checkpoint:** `1d868414`
**Status:** **VALIDATED RELEASE CANDIDATE — PUBLICATION HOLD**

## Decision

The Living Nexus Portable Witness Jellyfin plug-in release candidate is locally packaged, checksum-bound, installed, loaded, and exercised against a disposable **Jellyfin 12.2.0** host. The candidate remains private to the repository worktree and a loopback-only rehearsal. No Living Nexus deployment, GitHub release, public repository-manifest publication, production-data write, migration, or media-library change was performed in this preparation task.

The release candidate is suitable for a publication review, not for public installation yet. Its public download and manifest URLs intentionally return `404` because neither the GitHub release nor the repository file has been published.

## Exact candidate

| Property | Value |
|---|---|
| Plug-in name | Living Nexus |
| Plug-in GUID | `4bb75dc8-b3db-4bd7-8db3-4e16d378d84e` |
| Candidate version | `0.1.0.0` |
| Target Jellyfin ABI | `12.2.0.0` |
| Candidate ZIP | `integrations/jellyfin/repository/release-candidates/living-nexus_0.1.0.0.zip` |
| Candidate MD5 (Jellyfin manifest checksum) | `49bf0232e21b6fbfcd5155754a88939e` |
| Candidate SHA-256 | `f5caa65e75f10c124db343b51b7783d88ea41bfc79c4ebee1f82a2eb4fec8df6` |
| Proposed immutable package URL | `https://github.com/Whisperer217/living-nexus_provenance/releases/download/jellyfin-v0.1.0.0/living-nexus_0.1.0.0.zip` |
| Proposed repository manifest URL | `https://raw.githubusercontent.com/Whisperer217/living-nexus_provenance/main/integrations/jellyfin/repository/manifest.json` |
| Candidate repository manifest | `integrations/jellyfin/repository/manifest.json` |

The candidate manifest uses the exact package MD5 required by Jellyfin. The separately retained SHA-256 file is an additional human/operator verification record.

> The older `integrations/jellyfin/repository/artifacts/living-nexus_0.1.0.zip` is an earlier package and is **not** the release candidate. Do not publish it under the `0.1.0.0` release coordinate.

## What was validated

### Artifact and manifest integrity

- The candidate manifest is valid JSON and contains the expected plug-in GUID, version, ABI, proposed immutable package URL, and the MD5 of the **exact** `0.1.0.0` candidate archive.
- The candidate archive contains only `LivingNexus.Jellyfin.dll` and `build.yaml`.
- The DLL extracted from the candidate archive matched byte-for-byte the DLL installed by the isolated Jellyfin host.
- The candidate package contains no Living Nexus credential, raw media URL, token, or database data.
- At preparation time, both proposed public URLs returned `404`, confirming no public release asset or public manifest was created.

### Isolated Jellyfin 12.2 installation rehearsal

A disposable Jellyfin `12.2.0` host was bound only to `127.0.0.1`. A loopback-only local repository mirror served the same candidate bytes and a structurally equivalent manifest.

1. Jellyfin discovered the `0.1.0.0` candidate as ABI-compatible.
2. Jellyfin accepted the installation request and recorded `Plugin installed: Living Nexus 0.1.0.0`.
3. Jellyfin was restarted solely inside the disposable environment.
4. Jellyfin loaded `LivingNexus.Jellyfin, Version=0.1.0.0` and the `Living Nexus` plug-in.
5. The native `Living Nexus` Channel was registered and returned one channel to the authenticated local test administrator.

No user account, repository, configuration, or plug-in state outside the disposable Jellyfin host was changed.

### Discovery, pagination, attribution, and gateway playback path

The installed channel used its configured Living Nexus discovery endpoint and returned an eligible public catalog:

- First page: `startIndex=0`, `limit=2` → 2 items.
- Second page: `startIndex=2`, `limit=2` → 2 different items.
- Catalog total reported by Jellyfin: 50 items.
- Both pages had distinct channel item IDs.
- Each inspected item had creator attribution, a Living Nexus Work ID provider value, and a WID provider value.
- Jellyfin `PlaybackInfo` produced exactly one remote media source for the inspected item.
- That source was the existing Living Nexus gateway form: `https://www.livingnexus.org/api/provenance-player/media/:workId`, never a raw storage URL.
- A single-byte HTTP range request through that gateway followed the eligibility-authorized redirect and received `206`; the gateway response carried `Cache-Control: no-store`.

This verifies the remote media path without downloading or playing a full media file.

### Denial and revocation boundary

No production Work was edited, withdrawn, flagged, or made ineligible for testing. Denial remains proven by the existing focused contracts:

- Individually withdrawn Works receive `404 {"error":"Media unavailable"}` from the gateway.
- Active WID ambiguity receives the same fail-closed response.
- Malformed Work IDs are rejected without a Work lookup.
- Catalog discovery excludes withdrawn, WID-ambiguous, malformed, and creator-less candidates.

These conditions are enforced by `server/routes/provenancePlayerMediaRoute.ts` and `server/domains/provenancePlayer/catalog.ts`; regression coverage is in `server/tests/provenancePlayerMediaRoute.test.ts` and `server/tests/provenancePlayerCatalog.test.ts`.

## Validation record

| Validation | Result |
|---|---|
| Focused Living Nexus catalog/manifest/gateway contracts | 6 files, 38 tests passed |
| Jellyfin plug-in and repository-manifest tests | 5 passed |
| Full Living Nexus regression suite | 153 files passed, 930 tests passed, 1 intentionally skipped |
| TypeScript | `pnpm check` passed |
| Production build | `pnpm build` passed |
| Diff whitespace | `git diff --check` passed |
| Jellyfin 12.2 package discovery/install/restart | passed in isolated localhost host |
| Channel registration and two-page catalog query | passed |
| Creator/WID attribution and gateway-only media source | passed |
| One-byte range through current media gateway | passed (`206`, `no-store`) |

## Files prepared in this release-candidate slice

- `integrations/jellyfin/build.yaml` — aligns the release label with the actual assembly version.
- `integrations/jellyfin/scripts/package-release.sh` — defaults its output to the assembly-compatible candidate version.
- `integrations/jellyfin/LivingNexus.Jellyfin.Tests/LivingNexus.Jellyfin.Tests.csproj` — treats the project as a test project and copies the draft manifest into test output.
- `integrations/jellyfin/LivingNexus.Jellyfin.Tests/JellyfinRepositoryManifestTests.cs` — validates candidate manifest identity, ABI, URL form, and checksum.
- `integrations/jellyfin/repository/manifest.json` — unpublished Jellyfin-format repository manifest.
- `integrations/jellyfin/repository/release-candidates/living-nexus_0.1.0.0.zip` plus `.md5` and `.sha256` — exact private release-candidate archive and verification records.

No Registry record, Work, WID, creator attribution, media object, permission, queue, Global Player, database schema, or migration changed in this preparation.

## Required approvals before publication

1. **Source review and checkpoint/commit approval** for the prepared candidate files. This task did not create a checkpoint or commit.
2. **GitHub release approval** to create the immutable tag `jellyfin-v0.1.0.0` and upload exactly `living-nexus_0.1.0.0.zip` whose MD5 and SHA-256 are stated above.
3. **Repository-manifest publication approval** to make the reviewed `manifest.json` available at the stated URL (or to approve a different final immutable manifest host and update the URL before release).
4. **Post-publication retrieval verification approval** to fetch the public manifest and release asset, confirm exact bytes/checksums, install from those public URLs into a fresh isolated Jellyfin 12.2 host, and re-run catalog/gateway checks.
5. **Separate Living Nexus deployment approval only if required.** This task did not deploy Living Nexus. The installed plug-in did receive a successful catalog response from the current configured public endpoint, but that observation does not authorize or substitute for a controlled application deployment decision.

## Remaining limitations

- The catalog contains only Works eligible under the existing Portable Witness rules: public, published audio with a current unambiguous WID, clean current media, valid creator attribution, and no individual companion withdrawal.
- Remote playback remains revocable on every gateway request. A manifest or catalog response is not an irrevocable download entitlement.
- Jellyfin requires a restart after installation before a newly installed plug-in is loaded.
- The candidate is not listed in an official public Jellyfin repository and no public installation URL is live.
- This is a remote discovery channel, not an account-sync, registry-verification, library-copy, or second playback-authority system.

## Publication conclusion

**Publication status: HOLD.** The artifact is locally validated and ready for review. No public package, repository manifest, deployment, or release tag exists. The next authorized action is approval to checkpoint/commit the prepared release-candidate files and, separately, approval of the exact GitHub release and repository-manifest publication plan.
