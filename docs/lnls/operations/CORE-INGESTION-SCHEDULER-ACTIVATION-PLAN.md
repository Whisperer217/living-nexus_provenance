# Core Ingestion Scheduler Activation Plan

**Status:** Planning complete; no schedule created or activated  
**Date:** 2026-09-13  
**Scope:** Deterministic processing of already queued I1 Core Ingestion jobs.  
**Out of scope:** Upload transport changes, canonical Work registration, WID issuance, provenance/publication changes, I3 handoff implementation, models/providers, Nexus context, PNA/archive/avatar records, and any high-frequency always-on worker.

## Purpose

The Creator Commission interface can now start a Commission and queue an inspection against an existing owned audio asset. Processing remains deliberately inactive until a separate operational decision. This plan describes the minimum safe activation posture for the existing cron-only callback at `POST /api/scheduled/core-ingestion`.

> **A schedule is an execution authority, not a convenience toggle.** It may process only existing queued deterministic inspection jobs. It may not create a Work, WID, provenance event, publication, provider request, AI context attachment, PNA record, or avatar/economic action.

## Current state

| Component | Current state | Consequence |
|---|---|---|
| Creator entry | Available at `/ingestion/review` | A creator can select an owned audio asset and queue a Commission. |
| Worker callback | Implemented at `/api/scheduled/core-ingestion` | It accepts only managed cron identities and calls the bounded I1 batch processor. |
| Durable job controls | Implemented | Batch size is 3; job leases expire after 90 seconds; retry count is finite; audio inspection is capped at 64 MiB. |
| Scheduler configuration | Not yet implemented | No task UID is durably bound to the global Core Ingestion scheduler. |
| Heartbeat schedule | Not created | No queued Commission will be inspected automatically. |
| Deployment requirement | Mandatory before activation | The callback must be in a deployed build before a platform scheduler can reach it. |

## Two bounded activation choices

Both choices use the platform-managed project-level scheduler and the existing HTTP callback. They are deterministic; neither needs a model, an agent session, a persistent cloud process, or the attached cloud computer.

| Option | User experience | Cadence / capacity | Tradeoffs | Cost and setup complexity |
|---|---|---|---|---|
| **A. Near-immediate intake** | A queued Commission generally begins inspection within about one minute. | `0 * * * * *` UTC; up to 3 jobs per run. | Best responsiveness, but more schedule invocations and more frequent empty checks. | Platform-managed recurring callback; moderate operational traffic; more monitoring needed. |
| **B. Calm intake window** | A queued Commission generally begins inspection within about five minutes. | `0 */5 * * * *` UTC; up to 3 jobs per run. | Lower operational traffic and easier observation, but queue latency is visible to creators. | Platform-managed recurring callback; lower operational traffic; simplest initial launch. |

No schedule is selected by this plan. Doc must choose **A** or **B** in the separate activation approval. The schedule’s six-field expression is UTC and executes only after a deployed callback build is reachable.[^periodic]

## Required control-plane hardening before creation

The callback currently validates that the caller is a cron identity. Before any platform task is created, a small additive scheduler-configuration boundary must be implemented and checkpointed.

| Requirement | Required implementation | Why it is necessary |
|---|---|---|
| Durable task binding | Add one project-level `coreIngestionSchedulerConfig` record with a stable key, `scheduleCronTaskUid`, configured cadence, enabled flag, last-run summary, and timestamps. | The platform task UID becomes durable operational evidence and the callback cannot trust request body data. |
| Task-UID lookup | Callback authenticates the managed cron identity and loads configuration only by `user.taskUid`. | A different cron identity cannot trigger Core Ingestion merely by calling the known endpoint. |
| Explicit enable flag | Callback returns a successful no-op while the config is disabled. | Pause is safe, reversible, and does not produce retry storms. |
| No caller-controlled work selection | Callback ignores body fields and only invokes the fixed bounded batch. | Prevents a cron payload from naming a creator, storage key, asset, or Work. |
| Execution accounting | Persist non-content aggregate result (`completed`, `retried`, `failed`, `cancelled`, `skipped`), last start/finish, and sanitized error code. | Supports observation without storing audio bytes, prompts, raw content, or secrets. |
| Single active project scheduler | Enforce a unique stable config key and task UID. | Prevents duplicate schedules processing the same queue concurrently. |
| Pause and delete path | Use platform task UID to pause/resume/delete; clear or archive configuration only after the task is disabled/deleted. | Makes rollback deterministic. |

The required control-plane record is operational metadata, not a creator record and not a canonical Work/provenance table. It must not attach task UID values to individual Commission rows, because the scheduler owns the **global bounded queue**, not any one creator’s asset.

## Activation sequence

| Step | Action | Required evidence | Stop condition |
|---:|---|---|---|
| 1 | Implement and test scheduler configuration lookup/enable guard. | Protected callback rejects an unknown task UID and returns a no-op for a disabled config. | Any direct/unknown cron request can process a batch. |
| 2 | Save a checkpoint with callback/control-plane hardening. | TypeScript, focused scheduler/worker tests, build, and diff hygiene pass. | Callback exists only in local preview. |
| 3 | Doc deploys the approved checkpoint. | Production callback responds through the deployed Living Nexus domain. | Deployment not complete or callback cannot be reached. |
| 4 | Create exactly one project-level scheduler at the chosen cadence and save returned task UID in the configuration record. | Task UID, cadence, callback path, and enabled state are recorded without secrets. | Multiple active Core Ingestion tasks or missing task UID binding. |
| 5 | Run one controlled test with a noncanonical owned asset Commission. | One job claims, generates a deterministic receipt, and records aggregate execution. | Any Work/WID/provenance/publication/PNA/provider state changes. |
| 6 | Observe several empty and one queued run. | No duplicate claim; lease/retry behavior is bounded; no raw content appears in logs. | Unexpected cost, backlog growth, repeated errors, or privacy leakage. |
| 7 | Keep enabled only after Doc accepts results. | Documented go/no-go decision. | Doc requests pause or rollback. |

## Authentication and secret posture

The platform sends the schedule callback with a managed cron identity. The callback must call the existing server authentication path and require both `isCron` and `taskUid`. It must not accept a browser session, an unauthenticated HTTP call, a caller-provided task UID, a Registry key, a provider key, or a static shared secret.

No raw audio, storage download URL, private Draft payload, origin/testimony field, PNA thread, avatar data, model/provider value, Registry credential, or browser secret belongs in schedule configuration, task payload, callback response, or logs. The callback may emit only the task UID, aggregate counts, safe error code, endpoint path, and timestamp.

## Capacity, cost, and failure controls

The initial process must keep the existing safeguards: three claims at most per run, a 90-second lease, finite job retries, storage verification only, and a 64 MiB maximum audio-read boundary. The callback itself has a two-minute execution budget.[^periodic]

If a task invocation returns `5xx` or `429`, the platform may retry it. Therefore, the callback must remain idempotent and its configuration no-op cases must return `2xx`, not an error. A queue that grows faster than the selected cadence can drain must be paused and investigated; increasing batch size, cadence, storage limits, or worker authority requires a separate approval.

## Observability and keeper controls

| Signal | Safe value | Keeper action |
|---|---|---|
| Scheduler task | Task UID, cadence, enabled flag, next/last execution time. | Pause/resume/delete through the task UID. |
| Batch outcome | Aggregate completion/retry/failure/cancel/skip counts. | Observe trend; do not inspect creator content through logs. |
| Job state | Queue age, lease expiration, attempt count, sanitized failure code. | Pause if retries repeat or a lease pattern is abnormal. |
| Cost/size | Invocation count, batch size, known 64 MiB boundary. | Keep the chosen cadence; no automatic scale-up. |
| Custody boundary | Absence of canonical Work/WID/provenance/publication/provider/PNA effects. | Stop immediately if any prohibited side effect appears. |

## Rollback and kill switch

The immediate kill switch is a platform pause using the durable task UID; the second is the configuration `enabled=false` no-op guard. If a deeper rollback is needed, delete the platform task, retain the additive Commission/job/receipt evidence, and disable the callback path through a later code release. Never delete or rewrite an inspection receipt, private Draft, Work, WID, provenance record, uploaded asset, PNA record, avatar selection, or marketplace/entitlement record as part of scheduler rollback.

## Separate authorization required

To proceed from this plan, Doc must state all three choices explicitly:

1. **Cadence:** Option **A** (approximately one-minute intake) or **B** (approximately five-minute intake).
2. **Implementation authority:** approval to add the scheduler configuration/guard and its tests.
3. **Operational authority:** after that checkpoint is deployed and externally verified, approval to create and enable exactly one project-level schedule.

This plan itself creates no schedule and changes no runtime behavior.

[^periodic]: [Living Nexus Heartbeat wrapper — `server/_core/heartbeat.ts`](../../../server/_core/heartbeat.ts); [Current Core Ingestion callback — `server/routes/coreIngestionScheduleRoute.ts`](../../../server/routes/coreIngestionScheduleRoute.ts); [Periodic Updates operating requirements](../../../../skills/webdev-periodic-updates/SKILL.md).
