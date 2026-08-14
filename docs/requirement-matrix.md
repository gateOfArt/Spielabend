# Requirement matrix

Status means repository evidence exists; it does not replace human or external verification.

| Requirement | Source | Implementation or documentation evidence | Validation evidence | Status |
| --- | --- | --- | --- | --- |
| FND-001 | SRC-001 | `package.json`, `tsconfig.json`, `eslint.config.mjs`, `src/app/` | lint, typecheck, build | Validated |
| FND-002 | SRC-001 | `package.json`, `package-lock.json`, `README.md`, `docs/architecture.md` | installed-package and lockfile comparison | Validated |
| FND-003 | SRC-001 | `src/`, `tests/`, and `docs/` structure | path inventory | Validated |
| FND-004 | SRC-001 | `.agents/skills/*/SKILL.md` | `quick_validate.py` per skill; fresh-session discovery remains manual | Skills validated; discovery pending manual verification |
| FND-005 | SRC-001 | `.codex/agents/quality-assurance.toml` | TOML parse and manual config review | Config validated; custom agent not run |
| FND-006 | SRC-001 | `.gitignore`, `.local/project-journal.md`, `docs/ai-usage.md` | `git check-ignore` | Validated |
| FND-007 | SRC-001 | `docs/formal-submission.md` | Human verification | Awaiting human input |
| FND-008 | SRC-001 | `docs/reviews/foundation-validation.md` | Recorded command results | Validated |
