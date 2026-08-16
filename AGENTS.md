# Spieleabend agent map

Before changing code, read `docs/requirements.md` and the relevant consolidated concept and test documents. Invoke the relevant repository skill explicitly: `$development`, `$security`, `$testing`, or `$quality-review`. For version-sensitive Next.js work, consult the matching guide in `node_modules/next/dist/docs/`.

- Use the App Router and Server Components by default. Add Client Components only at an interaction boundary.
- Keep server modules under `src/server/`, mark executable server modules with `server-only`, and never import them into client code.
- Validate every external boundary. Re-check authentication, authorization, ownership, and server authority for each protected operation.
- Preserve the runtime contract recorded in `docs/technical-concept.md`; change pinned dependencies deliberately and update the lockfile.
- Keep changes within the approved requirement and scope; avoid unrelated cleanup.
- Follow the binding documentation checkpoints below; do not update lecturer-facing documentation after every prompt or commit.
- Run the relevant lint, typecheck, test, and build checks. Require a human diff review, and log factual human corrections without inventing verification.

## Documentation maintenance

The only maintained lecturer-facing documentation is:

- `docs/requirements.md`
- `docs/technical-concept.md`
- `docs/ui-concept.md`
- `docs/test-cases.md`
- `docs/ai-usage.md`
- `docs/wireframes/`

Do not create or restore feature PRDs, a requirement matrix, source register, testing-strategy document, prompt reports, or separate architecture, API, security, or data-model documents.

| Checkpoint | Required documentation action |
| --- | --- |
| After PROMPT 05B | Baseline consolidation of all five Markdown documents. Already completed; do not repeat it. |
| After PROMPT 06A | No documentation update. PROMPT 06A contains contract seams and RED tests only. |
| After PROMPT 06B | Update `requirements.md`, `technical-concept.md`, `test-cases.md`, and `ai-usage.md` for implemented authentication, sessions, protected access, and logout. Update `ui-concept.md` only if the implemented authentication UI differs materially from the existing concept. |
| After AUDIT A2, between PROMPT 06B and AUDIT A3 | No routine documentation update. Update an affected document only when the audit causes an actual code, requirement, or architecture correction. |
| After PROMPT 07 — Dice RED | No documentation update. Executable RED tests are the evidence at this point. |
| After PROMPT 08 — Dice GREEN/UI | Do not perform the full documentation synchronization yet; defer it to AUDIT A3 unless an architecture decision changes immediately. |
| After PROMPT 09A, PROMPT 09B, or PROMPT 09C individually | No documentation update after each sub-prompt. Accumulate the completed lobby, leaderboard, navigation, REST, and responsive-layout evidence until AUDIT A3. |
| After AUDIT A3 reports `CORE READY` | Update all affected consolidated documents once: `requirements.md`, `technical-concept.md`, `ui-concept.md`, `test-cases.md`, and `ai-usage.md`. Record the completed Dice/core vertical slice, lobby, leaderboard, REST API, and Grid/Flex evidence. |
| After PROMPT 10 | No documentation update. Roulette is still in its RED/contract phase. |
| After PROMPT 11 | Defer the full update until AUDIT A4 unless implementation forced an immediate architecture correction. |
| After AUDIT A4 | Update all affected consolidated documents once for completed Roulette and the reusable shared-game architecture. |
| After PROMPT 12 or PROMPT 13 | Do not update documentation routinely. Accumulate changes until AUDIT A5 unless an actual correction requires an affected document to change immediately. |
| After AUDIT A5 — Pre-Documentation Technical Gate | Update only `technical-concept.md`, `ui-concept.md`, `test-cases.md`, and `ai-usage.md`, and only where verified implementation or evidence changed. Update `requirements.md` only if scope or acceptance criteria actually changed. |
| Before final PDF/documentation work in PROMPT 14 | Perform one complete synchronization of all five Markdown documents with code, tests, and Git history. Verify the real wireframe evidence in `docs/wireframes/`. |

- `requirements.md`: update only for an actual scope, status, or acceptance-criteria change.
- `technical-concept.md`: update only for a verified architecture, data-model, API, rendering, persistence, or security change.
- `ui-concept.md`: update only after a completed UI milestone or a material component-tree, Props/state, Grid/Flex, or Server/Client-boundary change.
- `test-cases.md`: update only after a complete GREEN vertical slice, an integration milestone, or a final test audit. Do not rewrite it merely because a RED test file was added.
- `ai-usage.md`: add one concise entry per meaningful completed phase, never per prompt or commit. Record only actual AI assistance, technical validation, and confirmed human decisions.
- `docs/wireframes/`: update when real wireframes are created or intentionally revised, and perform a final evidence check before the PDF. Never generate fake photographs or claim absent evidence.
- Audit prompts do not automatically trigger documentation edits. Only an actual resulting correction does.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
