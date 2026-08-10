# Project TODO

- [x] Publish verified revision `39686522` to the managed Living Nexus platform.
- [x] Validate checkpoint `6e630442` (source revision `39686522`): `/`, `/explore`, `/manifest`, and `/manage` returned HTTP 200 on `livingnexus.manus.space`.
- [x] Synchronize the latest loop-release revision and inspect the registration migration plus affected schema.
- [x] Apply `drizzle/00xx_loop_registration_columns.sql` safely and verify the new registration columns exist without altering existing works.
- [x] Run the required release checks and publish the Loop release to the managed platform (typecheck and 406-test suite passed; checkpoint `fe76d568` published).
- [x] Validate public Register, work-detail, creator, and management route availability; record the deployed version (`fe76d568`).
- [x] Merge approved PR #2 (`cursor/loop-music-provenance-redesign-0e97` at `eab094a2`) into `main` as `9d87a917`.
- [x] Verify the registration migration preserves existing songs and applies default participation and visual values (9 columns present; 0 legacy rows missing defaults).
- [x] Hand off the authenticated Draft-registration, WID tone/waveform, and visual/profile publish-gate checks to the user at their request; no production work was created by the agent.
- [x] Validate a pre-Loop public work (`/song/1`) and creator profile (`/creator/1`): both load with the WID chain, participation defaults, 5W profile, and testimony section.
- [x] Confirm the live logged-out Register route presents the Loop registration entry point and sign-in handoff.
- [x] Review PR #3 for the batch Draft/Published toggle and Loop domain hierarchy scope: clean merge state, five focused files, and no schema or migration changes.
- [x] Merge approved PR #3 (`cursor/loop-post-release-followups-0e97`) into `main` as `0af48d55`.
- [x] Run release checks and publish the post-release follow-up revision (typecheck passed; 39 test files and 406 tests passed; checkpoint `8d8adfd3` published).
- [x] Validate public routes and the Loop creator page; verify in the merged implementation that batch intent defaults to Draft and propagates status, while non-music shelves remain preserved but hidden.
- [x] Hand off the authenticated Batch Upload toggle and rendered domain-layout smoke test to the user’s signed-in checklist; no account-bound production action was performed by the agent.
