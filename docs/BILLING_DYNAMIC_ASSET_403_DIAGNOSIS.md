# Billing Dynamic Asset 403 Diagnosis

**Incident:** `/settings/billing` reportedly failed to dynamically import `/assets/LivingArchiveBillingPage-D9Cssdpr.js` with HTTP 403.  
**Diagnostic boundary:** Production asset-delivery chain only. No Billing logic, database, schema, WID, provenance, route, publication, cache configuration, deployment configuration, or static-file code was changed.  
**Result:** The reported fault was **not reproducible** during this investigation. No speculative repair was applied.

> **Current production state:** the deployed index module graph references the exact reported Billing chunk, the chunk returns HTTP 200 as JavaScript on every production domain, and `/settings/billing` renders normally without a dynamic-import or console error.

## 1. Root Cause Determination

The historic HTTP 403 cannot be attributed conclusively to a missing file, a current static permission, a route fallback, a WAF policy, or an active manifest mismatch because all of those checks are healthy now. The evidence supports a **transient deployment/cache delivery incident**, with a service-worker stale-pairing window as the only plausible client-side contributor observed in the current architecture.

The live browser was controlled by `/sw.js`, had both an active and a waiting worker, and contained multiple versioned caches. The successful Billing module load had `transferSize: 0`, meaning the current browser served it from its cache. The worker uses cache-first handling for `/assets/*` requests, while navigation is network-first. Thus, during a deployment boundary an old main bundle can theoretically request an old lazy chunk that is neither cached nor available yet at the origin. That mechanism is consistent with a transient dynamic-import failure, but the original 403 response and its timestamp are no longer available to prove a single exact historical cause. [1] [2]

The application already has an update safeguard: the deployed worker calls `skipWaiting()` and `clients.claim()`, while `client/src/main.tsx` reloads an existing controlled page when `controllerchange` occurs. No project-controlled worker source exists in the checkout; it is deployment/platform supplied. [2] [3]

## 2. Current Evidence

| Layer | Direct evidence | Current result |
|---|---|---|
| Exact reported chunk | `https://www.livingnexus.org/assets/LivingArchiveBillingPage-D9Cssdpr.js` | HTTP 200, `Content-Type: application/javascript; charset=UTF-8`. |
| All production domains | `www.livingnexus.org`, `livingnexus.manus.space`, and `livingnexus-7khkqvmb.manus.space` | All returned the same successful JavaScript response and ETag for the exact reported chunk. |
| Deployed module graph | Current `index.html` loads `/assets/index-DPaGLPKc.js`; its dynamic imports include `LivingArchiveBillingPage-D9Cssdpr.js`. | Index and lazy chunk are currently paired correctly. |
| Billing route | Guest navigation to `/settings/billing` | Route rendered Slot Store/Billing content normally; no auth or Billing business action was invoked. |
| Browser console | Live production Billing route | No dynamic-import or console error recorded. |
| Service worker | `/sw.js` and browser runtime | Worker is active; one waiting worker and versioned caches were present. It uses versioned cache cleanup, `skipWaiting`, `clients.claim`, network-first navigation, and cache-first static assets. |
| Static delivery | Asset headers | Response came through Cloudflare and the Express/managed edge path with normal JavaScript headers; no current S3 `AccessDenied`, WAF denial, permission failure, or SPA HTML fallback was observed. |

## 3. Category Assessment

| Candidate category | Determination | Reason |
|---|---|---|
| Missing asset | **Not current** | Exact reported asset exists and returns HTTP 200 on all production domains. |
| Stale deployment | **Plausible historical/transient** | A temporary build/asset availability mismatch could cause the reported failure, but current index and chunk are paired. |
| Stale service worker | **Plausible historical/transient** | Live cache-first static asset policy, multiple versioned caches, and a waiting worker make an old main-to-chunk pairing possible during update transition. Existing controller-change reload protection is present. |
| CDN/cache problem | **Not currently reproducible** | Current edge responses are valid; a past edge propagation interval cannot be proven from present state. |
| Static asset permission | **Rejected as current cause** | Current exact chunk returns public JavaScript, not a 403/AccessDenied response. |
| Routing/server configuration | **Rejected as current cause** | Exact asset returns JavaScript rather than an SPA fallback or route error. |

## 4. Repair Decision

No code or deployment change was made because the requested production failure no longer exists and the current project already contains the relevant controlled-client reload safeguard. Changing worker or static-cache behavior without reproducing the fault would be speculative and could disrupt the existing PWA/offline contract.

The smallest safe operational action, if the error reappears in a user browser, is to capture the exact requested chunk URL, timestamp, response headers/body, worker cache names, and current index bundle name before clearing cache or reloading. That evidence would distinguish an origin availability problem from a stale client graph. This is an operational diagnostic instruction, not an application change.

## 5. Verification

| Required verification | Result |
|---|---|
| `/settings/billing` loads normally | **Passed** on live production as guest. |
| Reported Billing lazy chunk returns HTTP 200 | **Passed** on all three production domains. |
| No dynamic-import error occurs | **Passed** in the live browser console. |
| No new console error introduced | **Passed**; console was empty after route load. |
| Billing business logic unchanged | **Passed**; no Billing code or mutation was touched. |

## 6. Files and Configuration Changed

No application, Vite, static-server, Docker, CDN, proxy, WAF, service-worker, Billing, database, schema, WID, provenance, storage, route, or deployment configuration file changed. This diagnosis adds this report and the session ledger only.

## 7. Rollback

There is no runtime repair to roll back. Removing this diagnosis document and its ledger entry is sufficient if the documentation record itself must be reverted.

## References

[1]: Live HTTP/module-graph/browser diagnostic, 18 August 2026: `https://www.livingnexus.org/index.html`, `https://www.livingnexus.org/assets/index-DPaGLPKc.js`, and `https://www.livingnexus.org/assets/LivingArchiveBillingPage-D9Cssdpr.js`  
[2]: Live deployed service worker: `https://www.livingnexus.org/sw.js`  
[3]: [Project-side service-worker registration and controller-change reload](../client/src/main.tsx)
