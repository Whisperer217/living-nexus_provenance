# Project TODO

- [x] Publish verified revision `39686522` to the managed Living Nexus platform.
- [x] Validate checkpoint `6e630442` (source revision `39686522`): `/`, `/explore`, `/manifest`, and `/manage` returned HTTP 200 on `livingnexus.manus.space`.
- [x] Synchronize the latest loop-release revision and inspect the registration migration plus affected schema.
- [x] Apply `drizzle/00xx_loop_registration_columns.sql` safely and verify the new registration columns exist without altering existing works.
- [ ] Run the required release checks and publish the loop release to the managed platform.
- [ ] Validate the live Register, work-detail, creator, and management surfaces; record the deployed version.
- [x] Merge approved PR #2 (`cursor/loop-music-provenance-redesign-0e97` at `eab094a2`) into `main` as `9d87a917`.
- [x] Verify the registration migration preserves existing songs and applies default participation and visual values (9 columns present; 0 legacy rows missing defaults).
- [ ] Validate Draft registration, WID tone and waveform output, and publish gating for visual plus witness-ready profile.
- [ ] Validate an existing pre-Loop work page and the creator testimony path after deployment.
