# Living Nexus — Diagnostic Triage Protocol
## MARCH Algorithm for Codebase Health + DD Form 1380 Report Standard
**Authority:** BDDT Publishing / Command Domains LLC  
**Curated by:** Manus AI Recon Agent — April 11, 2026  
**Classification:** Custodian Standing Orders — Diagnostic Wing

---

## Doctrine

> *"Truth enters through witnesses, survives through return, and collapses when systems sever it from its origin."*

A platform that cannot report its own condition cannot be sustained. This protocol gives every Manus instance — custodian or specialist — a standardized method to assess the health of Living Nexus, triage findings by severity, and report in a format that any future instance or the NCO can read and act on immediately.

The MARCH Algorithm is the Combat Casualty Care standard for managing life-threatening conditions in priority order. Applied here, it maps directly to the categories of platform failure that, if left untreated, will kill the system.

---

## The MARCH Algorithm — Applied to Living Nexus

Each letter represents a category of platform health. Assess in order. Do not skip ahead. A failure in an earlier category is always more urgent than a finding in a later one.

---

### M — Massive Hemorrhage
**In combat:** Uncontrolled bleeding. The patient dies in minutes if not addressed.  
**In Living Nexus:** **Data loss or corruption.** Any condition that threatens the integrity of the WID registry, the database, or the storage layer.

**What to check:**
- Are all `witnessId` values on published songs non-null and unique?
- Are `fileUrl` values resolvable — do the audio files actually exist in storage?
- Are `certificateUrl` values resolvable?
- Are there any songs with `status = 'Published'` but `fileUrl = NULL`?
- Are there any duplicate `witnessId` values across the `songs` table?
- Is the database connection healthy? Can `db.ts` functions execute without timeout?

**Triage command:**
```sql
-- Check for published songs missing audio
SELECT id, title, userId, witnessId FROM songs WHERE status = 'Published' AND fileUrl IS NULL;

-- Check for duplicate WIDs (should return 0 rows)
SELECT witnessId, COUNT(*) as cnt FROM songs WHERE witnessId IS NOT NULL GROUP BY witnessId HAVING cnt > 1;
```

**Severity:** If any M-category finding is present, **STOP all other work.** Report immediately to the NCO. Do not proceed to A, R, C, or H until M is resolved.

---

### A — Airway
**In combat:** Blocked airway. The patient cannot breathe.  
**In Living Nexus:** **Authentication and access failure.** Any condition where creators cannot log in, upload, or access their works.

**What to check:**
- Is the Manus OAuth integration responding? (`server/_core/oauth.ts`)
- Are `sdk.authenticateRequest()` calls succeeding in `uploadRoute.ts` and `stampRoute.ts`?
- Are session cookies being set and read correctly?
- Are there any 401 errors appearing in recent server logs?
- Is the TOS acceptance gate (`tosAcceptedAt`) blocking legitimate users?

**Triage command:**
```bash
# Check recent auth errors in server logs
grep -i "401\|unauthorized\|auth\|session" .manus-logs/networkRequests.log | tail -20
```

**Severity:** A-category findings block all creator activity. Report within the session. Fix before deploying any new features.

---

### R — Respiration
**In combat:** Breathing is compromised — tension pneumothorax, open chest wound.  
**In Living Nexus:** **Upload and file pipeline failure.** The platform cannot receive new works.

**What to check:**
- Is `POST /api/upload-file` returning 200 for valid requests?
- Is the Forge storage proxy (`BUILT_IN_FORGE_API_URL`) reachable?
- Are `storagePut()` calls succeeding? Check for Forge API errors in logs.
- Is the streaming multipart relay in `uploadRoute.ts` handling large files (>10MB WAV) without timeout?
- Is the `visualQueue.ts` worker processing new uploads without stalling?

**Triage command:**
```bash
# Check for upload errors
grep -i "upload\|forge\|storage\|500\|failed" .manus-logs/networkRequests.log | tail -20
```

**Severity:** R-category findings stop new registrations. Report within the session. The WID pipeline depends on successful uploads.

---

### C — Circulation
**In combat:** Shock, inadequate blood flow to vital organs.  
**In Living Nexus:** **Payment and subscription system failure.** Revenue flow is compromised.

**What to check:**
- Is the `paymentIntegrityWorker.ts` running without errors?
- Are Stripe webhook events being received and processed?
- Are `songSlotsUsed` and `songSlotsTotal` values on user accounts accurate?
- Are Living Archive subscription statuses (`livingArchiveExpiresAt`) current?
- Are any payment events stuck in a failed state? (`server/payment.flow.test.ts` covers the key flows)

**Triage command:**
```bash
# Check payment worker logs
grep -i "payment\|stripe\|webhook\|subscription" .manus-logs/devserver.log | tail -20
```

**Severity:** C-category findings affect revenue but do not immediately block creator activity. Report within 24 hours. Do not deploy payment-adjacent changes without resolving.

---

### H — Hypothermia / Head Trauma / Hypoxia
**In combat:** Secondary threats — exposure, brain injury, oxygen deprivation.  
**In Living Nexus:** **Performance, UI, and secondary system degradation.** The platform works but is degraded.

**What to check:**
- Are any frontend pages throwing TypeScript errors or console errors?
- Are any tRPC procedures returning unexpected errors in `routers.ts`?
- Is the `selfImprovementWorker.ts` reporting anomalies?
- Are any test suites failing? (`pnpm test`)
- Are there any pages with broken image links or missing cover art?
- Is the WID verification page (`VerifyPage.tsx`) resolving all WID types correctly?
- Are Discord notifications (`discord.ts`) firing correctly for key events?

**Triage command:**
```bash
# Run the full test suite
pnpm test 2>&1 | tail -30

# Check browser console errors
grep -i "error\|warn\|failed" .manus-logs/browserConsole.log | tail -20
```

**Severity:** H-category findings are quality issues. Log them in the DD-1380 report. Address in the next available session. Do not block deployments for H-category findings alone.

---

## The DD Form 1380 — Platform Field Report

Every diagnostic session must produce a report in this format. Save it to `docs/triage-reports/DD1380-{YYYY-MM-DD}.md`. This is the institutional memory of the platform's health over time.

---

### Report Template

```markdown
# DD Form 1380 — Living Nexus Platform Field Report
**Report Date:** {YYYY-MM-DD HH:MM UTC}
**Reporting Instance:** Manus {session type — Custodian / Specialist / Recon}
**Session Scope:** {brief description of what was being worked on}
**Authority:** BDDT Publishing / Command Domains LLC

---

## MARCH Assessment

### M — Massive Hemorrhage (Data Integrity)
**Status:** [ ] GREEN — No findings | [ ] AMBER — Minor findings | [ ] RED — Critical findings
**Findings:**
{List any findings or write "None identified."}
**Actions Taken:**
{What was done, or "None required."}

---

### A — Airway (Authentication & Access)
**Status:** [ ] GREEN | [ ] AMBER | [ ] RED
**Findings:**
{List any findings or write "None identified."}
**Actions Taken:**
{What was done, or "None required."}

---

### R — Respiration (Upload & File Pipeline)
**Status:** [ ] GREEN | [ ] AMBER | [ ] RED
**Findings:**
{List any findings or write "None identified."}
**Actions Taken:**
{What was done, or "None required."}

---

### C — Circulation (Payments & Subscriptions)
**Status:** [ ] GREEN | [ ] AMBER | [ ] RED
**Findings:**
{List any findings or write "None identified."}
**Actions Taken:**
{What was done, or "None required."}

---

### H — Hypothermia / Head / Hypoxia (Performance & Secondary Systems)
**Status:** [ ] GREEN | [ ] AMBER | [ ] RED
**Findings:**
{List any findings or write "None identified."}
**Actions Taken:**
{What was done, or "None required."}

---

## Overall Platform Status
**LITTER** (Non-ambulatory — critical, cannot function): All M or A findings are RED  
**AMBULATORY** (Walking wounded — degraded but operational): Any C or H findings, M/A/R are GREEN  
**DUTY** (Fit for duty — fully operational): All categories GREEN

**Current Status:** [ ] LITTER | [ ] AMBULATORY | [ ] DUTY

---

## Work Completed This Session
{Brief summary of what was built, changed, or fixed.}

## Open Items for Next Session
{What was not completed and needs to be picked up.}

## Escalations to NCO
{Anything that requires the NCO's decision or awareness.}

---
*Report filed by Manus AI. Chain of custody: BDDT Publishing / Command Domains LLC.*
```

---

## When to Run a Diagnostic

A diagnostic MARCH assessment must be run in the following situations:

| Trigger | Required Depth |
| :--- | :--- |
| Start of any new custodian session | Full MARCH — all five categories |
| Before deploying any change to `routers.ts` or `db.ts` | M and R categories minimum |
| After a failed deployment or unexpected error | Full MARCH |
| After running the batch stamp script | M category only (data integrity check) |
| Weekly maintenance session | Full MARCH |
| When the NCO requests a status report | Full MARCH + DD-1380 report filed |

---

## The Triage Priority Rule

This is non-negotiable. It mirrors the combat standard:

> **Treat in order. M before A. A before R. R before C. C before H. A RED finding in any category blocks all work in categories below it.**

A custodian instance that discovers a RED M-category finding — data loss, duplicate WIDs, missing audio files — does not proceed to build new features. It stops, treats the wound, files the DD-1380, and reports to the NCO. The platform's provenance chain is the mission. Everything else is secondary.

---

*This protocol was established by a Manus AI recon agent on April 11, 2026, under the authority of BDDT Publishing / Command Domains LLC. It is a living document — update it as new diagnostic checks are identified.*
