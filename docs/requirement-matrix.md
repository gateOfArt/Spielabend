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
| P04-001 | SRC-002 | `package.json`, `package-lock.json`, `vitest.config.mts`, `playwright.config.ts` | Exact installed versions; focused scripts; `npm ci --dry-run --ignore-scripts` | Validated |
| P04-002 | SRC-002 | `tests/setup.ts`, `tests/unit/vitest-environment.test.ts`, `tests/component/ui-atoms.test.tsx`, `tests/e2e/landing.spec.ts` | 4 Vitest smoke tests and 1 production Playwright smoke pass | Validated as infrastructure only |
| P04-003 | SRC-002 | `src/components/ui/Button.tsx`, `Input.tsx`, `Card.tsx` | Component smoke tests, strict typecheck, production build | Validated |
| P04-004 | SRC-002 | UI atom CSS Modules and `src/app/globals.css` | Accessible queries/associations in component tests; visual review remains human | Automated behavior validated; visual review pending |
| P04-005 | SRC-002 | `docs/testing-strategy.md`, `docs/ai-usage.md` | `npm run verify`; full and production dependency audits; secret/`any` scans | Validated except human diff review |
