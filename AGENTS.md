# Spieleabend agent map

Before changing code, read `docs/requirements.md` and the relevant consolidated concept and test documents. Invoke the relevant repository skill explicitly: `$development`, `$security`, `$testing`, or `$quality-review`. For version-sensitive Next.js work, consult the matching guide in `node_modules/next/dist/docs/`.

- Use the App Router and Server Components by default. Add Client Components only at an interaction boundary.
- Keep server modules under `src/server/`, mark executable server modules with `server-only`, and never import them into client code.
- Validate every external boundary. Re-check authentication, authorization, ownership, and server authority for each protected operation.
- Preserve the runtime contract recorded in `docs/technical-concept.md`; change pinned dependencies deliberately and update the lockfile.
- Keep changes within the approved requirement and scope; avoid unrelated cleanup.
- After a meaningful feature phase, update only the affected tests and consolidated documentation with confirmed facts.
- Run the relevant lint, typecheck, test, and build checks. Require a human diff review, and log factual human corrections without inventing verification.

## Documentation maintenance

Do not update documentation after every prompt or commit. Use these checkpoints from the current playbook:

| Checkpoint | Files eligible for update |
| --- | --- |
| Now, after PROMPT 05B | Create the five baseline documents |
| After PROMPT 06B, not PROMPT 06A | Authentication/session requirements, technical concept, test cases, and AI usage |
| After AUDIT A3 reports `CORE READY` | Synchronize Dice, lobby, leaderboard, core API, and UI evidence |
| After PROMPT 11 and AUDIT A4 | Synchronize Roulette and shared-game evidence |
| After AUDIT A5 — Pre-Documentation Technical Gate | Update only concepts or tests that actually changed during security, UX, and integration work |
| During PROMPT 14, before PROMPT 15 and PROMPT 16 | Perform one complete code–test–documentation consistency review |

- Update `docs/requirements.md` only when scope, status, or acceptance criteria change.
- Update `docs/technical-concept.md` only when architecture, data model, API, rendering, or security decisions change.
- Update `docs/ui-concept.md` only after a completed UI milestone or an actual component or boundary change.
- Update `docs/test-cases.md` only after a complete GREEN vertical slice or integration-test milestone.
- Update `docs/ai-usage.md` once per meaningful phase, never after every prompt or commit.
- Never create new PRD, matrix, source-register, progress-report, or audit-log files.
