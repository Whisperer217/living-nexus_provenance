# Living Nexus Player Collections

Authored implementation: Codex, from Jake Ross's direction in the November 4, 2026 conversation. Base source: `ac12fe905e06d4994fd9e5a40f2e3223d16cd0d9`. This is a proposed implementation, not a claim of deployment, rights verification, or working device firmware.

## Product and scope

Replace the public PNA/avatar/AI promotion with **Player Collections**. A featured homepage card leads to `/player-collections`. Legacy `/pna`, its nested paths, `/settings/stewardship`, and `/avatar-registry` redirect to the successor. The legacy PNA subdomain redirects to the canonical www origin. Remove the floating avatar and Nexus AI launcher tile. Preserve historical PNA, avatar, entitlement, private-thread, creator, Work, WID, and provenance records and backend code; none of their data is converted into collection content. Existing private Keeper/Guide archives and their routes remain available rather than silently migrating them.

The new public page pairs a vertical list with a lightweight 3D player concept loaded from an actual `.3mf` asset. Clicking Preview uses the existing single PlayerContext. It changes the illustrative device screen, not the physical device. No second audio engine or AI provider is added.

An edition supports up to 50 selected audio Works, including audiobook chapters. Do not automatically copy 50 archive items into a commercial product: creators must submit and then accept edition-specific product terms. There is no seeded catalog, simulated creator content, or automatic commercial permission.

## Creator workflow

1. Creator uploads audio using the current archive/upload workflow. For an audiobook, upload narrated audio first; the new feature does not synthesize voices, convert a manuscript, or introduce a second asset registry.
2. Creator chooses one of their own published audio Works, music/audiobook, and audience/content notes. For chapters, include author, narrator, book title, and chapter order.
3. An unchecked disclosure explicitly explains that submission makes the existing public preview, title, artwork, and credit visible in the submission list. Submit and display publicly records the versioned opt-in and populates the public list on refresh (polling every 30 seconds).
4. The admin offers exact product terms covering the recordings, edition/unit or time limit, creator compensation, credit, and treatment of withdrawal and already-shipped devices.
5. Creator separately accepts those exact terms and confirms relevant rights permissions. The consent records the audio source hash. This is creator testimony, not an independent legal verification.
6. Admin selects an unused position within the edition's limit. Concurrent selections serialize on the edition row. Selected and submitted lists remain distinct.
7. Admin exports a JSON loading manifest containing the approved ordered works, URLs, artwork, lyrics, creator credits, source hashes, and accepted terms. Changed/unpublished/withdrawn/unaccepted works block export. Export is recorded as an event.
8. Admin manually downloads/prepares files, verifies the manifest and byte hashes, tests on the device, and copies the tested collection. The manifest is not a ZIP, device image, sales authorization enforcement system, or royalty payment processor. Existing legacy `fileHash` may describe pre-processing bytes; the export labels its hash basis, and actual stored bytes must be verified before production.

Submission grants no AI permission. Withdrawal removes public display and future export eligibility; it cannot recall sold hardware. Replacing terms requires renewed acceptance. No automated content suitability certification is claimed.

## Device research and evidence

| Item | Evidence and confidence |
|---|---|
| Listing | Jake's screenshot advertises 32GB, a 2.4-inch touchscreen, rotary control, FLAC, and $18.41 before complete landed/fulfillment costs. |
| Supplier lead | Alibaba indexed results associate the exact listing title with Shenzhen Lepai Digitai Technology Co.,Ltd. This identifies a lead, not verified original manufacture or branding permission. |
| Model family | Screenshot artwork shows D53; MECHEN's own catalog has a D53 player. Visually consistent family, not proof that its firmware/storage variant matches Jake's unit. |
| Tested by Jake | Lyrics display, stop/pause/resume and return to the song; Bluetooth and physical operation were reported in the conversation. No independent lab verification performed here. |
| Android/apps | Not established. App-like menu icons do not prove Android, APK installation, Wi-Fi, or a modifiable boot image. |
| Lyrics preparation | Obtain the exact manual and test UTF-8, same-basename LRC, encoding, timestamps, and embedded versus sidecar lyrics on this firmware. Plain lyric text in the manifest does not create synchronized timing. |
| Storage | Screenshot says 32GB; Jake described approximately 35GB. Neither establishes measured usable bytes. Do not advertise 35GB. A 32GB decimal capacity is approximately 29.8GiB before filesystem overhead. The implementation leaves capacity unset until measured. |
| Size budget | 50 four-minute MP3 tracks at 320kbps total about 480MB decimal, before artwork/lyrics. FLAC, long books and video require actual measurement; count alone does not establish capacity. |
| Firmware, video, books | Confirm supplier tooling and firmware identifiers; validate actual supported audio/video codecs and ebook formats. Do not promise EPUB/PDF, arbitrary video, or startup branding from the menu alone. |
| 3MF | Illustrative 50 × 83mm body with simple controls, based on the photo's general form. Not measured CAD, an engineered enclosure, replacement housing, or safety-tested print design. |

Primary research links:
- Alibaba exact-title category result: https://www.alibaba.com/category/MP3-Players_63710.html
- Alibaba listing title and supplier search result: https://www.alibaba.com/countrysearch/CN/wholesale-music-player.html
- MECHEN D53 catalog: https://www.mechen.com.cn/productinfo/1317704.html
- MECHEN manuals: https://www.mechen.com.cn/Manuals

The exact Alibaba product-detail page was inaccessible to the research tool. Related rebranded model specifications must not be promoted to verified specifications of Jake's unit.

## Integration and deployment

Reuse: canonical songs/archive records, auth, tRPC, creator routes, PlayerContext, existing CSS tokens, Three.js, upload workflow, and source hashes. Added: player collection router, page, homepage feature, shared export eligibility rule, illustrative 3MF asset, and focused tests.

Generated migration `0142_flaky_william_stryker.sql` creates only `playerEditions`, `playerSubmissions`, and `playerCurationEvents`, with an edition/work uniqueness constraint. Schema and migration snapshot/journal accompany the change. No SQL was applied. Review and apply through the managed database workflow before enabling the new UI. Do not use a force schema push.

After migration, an admin creates the first edition from the page. Real creators opt in. Confirm public display, withdrawal, renewed terms, ownership, duplicate prevention, selection limits, ordered export, keyboard access, empty/error states, and source-change blocking using the managed environment. The current code emits a download manifest and performs no sales, accounting, payout, or inventory operations.

Before fulfillment, add or establish a reviewed process for unit-limit enforcement, accepted recording versions, verified storage hashes, approved content suitability, creator payout accounting, and edition snapshots attached to physical sales. Capacity editing and closing editions are schema/API extension points; UI management is not supplied in this bounded first version.

Do not merge unrelated Jellyfin work. Publish through the managed interface only after these checks. Rollback the frontend/server release to the base checkpoint if needed; retain additive tables and consent/event records instead of dropping them.

## Validation status

- Production build: passed after final route and type fixes (Vite + server bundle). Existing analytics-variable and bundle-size warnings remain.
- Focused tests: 25 passed across six files (submission permissions and surrounding navigation/creator continuity).
- Generated migration inspected: exactly three CREATE TABLE statements, no DROP/ALTER of existing tables.
- 3MF package/XML: valid; five mesh objects, 60 triangles.
- Full suite: attempted, then stopped under resource pressure. Ten identified failures require unavailable managed database/secret/signing configuration. The retired TopBar PNA assertion was updated to the requested public Collections behavior and now passes. No full-suite pass claimed.
- Visual desktop/mobile QA: blocked because no browser executable was installed and the browser download returned invalid/truncated data. No visual pass claimed.
- TypeScript: final `pnpm check` passed. The new router narrows the existing `getDb(): any` connection to `MySql2Database`; the archive projection has an explicit type.
