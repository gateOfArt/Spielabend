# Requirements

## Foundation scope

These requirements derive from SRC-001. They establish a development baseline without defining business features.

| ID | Requirement | Acceptance criterion |
| --- | --- | --- |
| FND-001 | Maintain one Next.js application at the repository root using the App Router, TypeScript, `src/`, ESLint, and `@/*`. | Root scripts run; `src/app/` exists; no Pages Router or nested application exists. |
| FND-002 | Pin and record the installed Next.js and React runtime. | `package.json`, lockfile, README, and architecture agree on Next.js 16.2.10 and React/React DOM 19.2.4. |
| FND-003 | Establish the requested architecture and evidence directories without speculative feature routes or TypeScript placeholders. | Every requested path exists and empty code layers contain only directory markers. |
| FND-004 | Provide focused executable development, security, testing, and quality-review skills. | Each generated skill has valid frontmatter, exact directory/name alignment, focused instructions, and validator evidence. |
| FND-005 | Configure a narrow read-only quality-assurance custom agent. | TOML contains no model pin, uses read-only sandboxing, produces evidence-backed review findings and a commit verdict, and forbids feature implementation. |
| FND-006 | Separate private local notes from tracked factual AI evidence. | `.local/` is ignored and `docs/ai-usage.md` contains an empty factual schema. |
| FND-007 | Expose all required formal submission facts as human-entered or human-verified fields. | Formal checklist includes every fact from SRC-001 without inventing a Matrikelnummer or external verification. |
| FND-008 | Validate the foundation. | Available lint, typecheck, and build pass; path, `any`, and likely-secret checks are recorded truthfully. |

## Out of scope

Authentication, users, invitations, games, rounds, scoring, persistence, APIs, and other business behavior require a sourced PRD and are not part of this phase.
