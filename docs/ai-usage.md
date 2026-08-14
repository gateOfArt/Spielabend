# AI usage register

Record only actual AI assistance and human review. Add one row per interaction or coherent task; do not backfill assumptions.

## Interaction schema

| Date/time | Tool or model | Requirement/purpose | Inputs or sources | Files/outputs affected | Validation performed | Human review/corrections |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-08-14 05:08 +0200 | Codex (model not recorded) | PROMPT 04 testing infrastructure and minimal `Button`, `Input`, and `Card` foundation | SRC-002; repository `$testing`, `$development`, and `$quality-review` instructions; installed package metadata | Test dependencies/scripts/lockfile; Vitest and Playwright configs; infrastructure smoke tests; three typed UI atoms and CSS Modules; shared CSS tokens; current requirement/testing/component evidence | Component imports were observed RED before implementation; `npm run verify` passed with lint, strict typecheck, 4 Vitest tests, Next.js 16.3.1 production build, and 1 Chromium test; full dependency audit reported 0 vulnerabilities | User requested verification and commit. No line-by-line human diff review or human correction is claimed. |

## Manual-correction schema

| Date/time | Related interaction | Reviewer | Factual correction | Resulting change | Verification |
| --- | --- | --- | --- | --- | --- |
