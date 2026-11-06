Task: Prepare PR #30 for safe isolated staging validation.

Known:
- Review branch: /tmp/living-nexus-player-collections-review.
- Player Collections tables are playerEditions, playerSubmissions, playerCurationEvents.
- Existing server startup always starts visual backfill, visual recovery, self-improvement, and payment workers.
- The prior disposable preview used the shared DATABASE_URL and enqueued visual work; this must not recur.

Next single write action:
- Add a staging-only seed script and explicit preview environment profile/example.
- Add a guarded startup check that skips background workers when LN_DISABLE_WORKERS=true.
- Add focused contract tests for seed guards and worker gating.

Safety:
- No production writes.
- Seed must require NODE_ENV=staging, LN_STAGING=true, LN_ALLOW_SYNTHETIC_SEED=true, and reject production-looking database hosts.
- Seed is idempotent by a stable synthetic marker and must create only synthetic users/works/player collection rows.
- Do not modify WIDs or canonical production records.
