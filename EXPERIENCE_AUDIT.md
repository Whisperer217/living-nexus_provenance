# Living Nexus — Experience Audit
**Date:** Aug 2, 2026  
**Framework:** Seven Doctrine Questions  
**Auditor:** Manus

---

## The Seven Questions

1. Does this increase trust?
2. Does authorship feel visible?
3. Does provenance feel tangible?
4. Can the creator's story be understood in seconds?
5. Can someone support the creator with one obvious action?
6. Does this screen preserve context instead of hiding it?
7. Is the work treated like a living artifact rather than just a file?

---

## Page-by-Page Audit

### 1. VerifyPage (`/verify/:wid`) — **CRITICAL FAILURES**

| Question | Answer | Finding |
|---|---|---|
| Trust | ✅ | Cryptographic hash display, ECDSA signature, timestamp — excellent |
| Authorship visible | ⚠️ | Creator name shown but no avatar, no link to profile, no bio |
| Provenance tangible | ✅ | Hash, signature, version history all present |
| Creator story in seconds | ❌ | **No bio, no origin story, no artist statement — just a name** |
| Support with one action | ❌ | **Zero support CTA. The highest-intent page on the platform — someone scanned a QR code — and there is no way to support the creator** |
| Context preserved | ⚠️ | No link back to the work's full page, no "Listen Now" button |
| Living artifact | ✅ | Version history, audio versions present |

**Priority fixes:** Add creator avatar + bio + origin story panel. Add "Support Creator" button (tip/patronage). Add "Listen / View Full Work" CTA. Add "View Creator Profile" link.

---

### 2. SongDetailPage (`/song/:id`) — **MODERATE FAILURES**

| Question | Answer | Finding |
|---|---|---|
| Trust | ✅ | WID badge, ChainOfRecordFooter, ProvenanceTimeline all present |
| Authorship visible | ✅ | Creator name, handle, avatar in header |
| Provenance tangible | ✅ | WIDPanel, ProvenanceTimeline, LineageGraph present |
| Creator story in seconds | ⚠️ | **Origin story (haaiOriginStory) is buried in a collapsed panel — not visible on first scroll** |
| Support with one action | ⚠️ | Tip button exists but requires scrolling past the hero to find it |
| Context preserved | ✅ | Related works, event thread, comments all present |
| Living artifact | ✅ | Version history, waveform, reactions present |

**Priority fixes:** Surface origin story above the fold in the hero. Make the tip/support button sticky or more prominent in the hero area.

---

### 3. CreatorProfilePage (`/creator/:id`) — **MODERATE FAILURES**

| Question | Answer | Finding |
|---|---|---|
| Trust | ✅ | Witness count, WID badges on works |
| Authorship visible | ✅ | Avatar, name, handle, banner all present |
| Provenance tangible | ⚠️ | WID badges on individual works but no creator-level provenance summary |
| Creator story in seconds | ⚠️ | **Bio/origin statement exists in DB but placement is unclear — not guaranteed above the fold** |
| Support with one action | ⚠️ | Witness/Follow button exists; tip button requires finding a specific work |
| Context preserved | ✅ | Works grid, witness network present |
| Living artifact | ⚠️ | No creator-level provenance timeline (when did they join, first work, milestones) |

**Priority fixes:** Pin bio/origin statement directly under the creator's name — always above the fold. Add a "Support This Creator" button at the profile level (not just per-work). Add a creator milestone timeline (first registered work, total WIDs, founding member status).

---

### 4. HomePage (`/`) — **MINOR FAILURES**

| Question | Answer | Finding |
|---|---|---|
| Trust | ✅ | WID counter, witnessed works count, trust layer present |
| Authorship visible | ✅ | Featured creators section present |
| Provenance tangible | ⚠️ | Counter is present but abstract — no single example of a real WID with a real creator story |
| Creator story in seconds | ⚠️ | **Showcase cards show cover art + title but no creator bio excerpt or story hook** |
| Support with one action | ⚠️ | No support CTA on homepage — users who arrive from a QR code or link have no obvious next action |
| Context preserved | ✅ | Sections are clearly separated |
| Living artifact | ⚠️ | Works displayed as streaming cards, not as registered artifacts with provenance |

**Priority fixes:** Add a "Featured Artifact" spotlight on the homepage — one work, one creator, their story in 2 sentences, their WID, and a Support button. Make the WID counter link to a real example verification.

---

### 5. ExplorePage (`/explore`) — **MINOR FAILURES**

| Question | Answer | Finding |
|---|---|---|
| Trust | ✅ | WID badges on list rows |
| Authorship visible | ✅ | Creator name on every row |
| Provenance tangible | ⚠️ | WID badge present but not clickable to verify |
| Creator story in seconds | ❌ | **No bio, no caption, no origin story visible in list view** |
| Support with one action | ✅ | Support button on every row via SupportCreatorDrawer |
| Context preserved | ✅ | Section architecture preserved |
| Living artifact | ⚠️ | Works feel like tracks in a playlist, not registered artifacts |

**Priority fixes:** Make WID badge in WorkListRow clickable (link to `/verify/:wid`). Add caption/description as a second line in list view when available. In grid view, show WID seal overlay on cover art.

---

### 6. ArchivePage (`/archive`) — **MINOR FAILURES** (owner-only page)

| Question | Answer | Finding |
|---|---|---|
| Trust | ✅ | Owner's own works, WID badges |
| Authorship visible | ✅ | Owner's own page |
| Provenance tangible | ⚠️ | WID shown but no quick-view of provenance chain without opening the work |
| Creator story in seconds | N/A | Owner's own archive |
| Support with one action | N/A | Owner's own archive |
| Context preserved | ✅ | Full work management |
| Living artifact | ⚠️ | Works feel like a file manager, not a living archive |

**Priority fixes:** Add a "Provenance Summary" tooltip on WID badge hover — show registered date, hash, and a "View Certificate" link without leaving the page.

---

### 7. UploadPage (`/upload`) — **MINOR FAILURES**

| Question | Answer | Finding |
|---|---|---|
| Trust | ✅ | Duplicate detection, WID generation confirmation |
| Authorship visible | ✅ | Creator's own upload flow |
| Provenance tangible | ✅ | Step 3 is explicitly "Provenance / Witness ID" |
| Creator story in seconds | ⚠️ | **Origin story field (haaiOriginStory) is present but not prominently framed — feels like a form field, not a sacred act** |
| Support with one action | N/A | Upload flow |
| Context preserved | ✅ | Multi-step wizard preserves state |
| Living artifact | ⚠️ | The moment of registration should feel more ceremonial — the WID generation confirmation is a toast, not a moment |

**Priority fixes:** Reframe the origin story field as "The Story Behind This Work" with a prompt. Make the WID generation confirmation a full-screen ceremony moment, not just a toast.

---

## Summary: Ranked Fixes by Impact

### Tier 1 — Redesign before any new features

1. **VerifyPage: Add creator panel + Support CTA** — highest-intent page, zero support path
2. **VerifyPage: Add "Listen / View Full Work" CTA** — users land here from QR codes with no escape route
3. **SongDetailPage: Surface origin story above the fold** — the creator's story is buried
4. **CreatorProfilePage: Pin bio above the fold + profile-level Support button**
5. **ExplorePage WorkListRow: Make WID badge clickable to `/verify/:wid`**

### Tier 2 — High value, lower regression risk

6. **HomePage: Add Featured Artifact spotlight** — one creator, one story, one WID, one Support button
7. **ExplorePage: Add caption/description as second line in list view**
8. **UploadPage: Reframe origin story field + ceremonial WID confirmation**
9. **ArchivePage: WID badge hover tooltip with provenance summary**

---

## Implementation Order

All Tier 1 fixes will be implemented before any new functionality is added, per the doctrine.
