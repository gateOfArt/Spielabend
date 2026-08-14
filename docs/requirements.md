# Requirements

## Foundation scope

These requirements derive from SRC-001. They establish a development baseline without defining business features.

| ID | Requirement | Acceptance criterion |
| --- | --- | --- |
| FND-001 | Maintain one Next.js application at the repository root using the App Router, TypeScript, `src/`, ESLint, and `@/*`. | Root scripts run; `src/app/` exists; no Pages Router or nested application exists. |
| FND-002 | Pin and record the installed Next.js and React runtime. | `package.json`, lockfile, README, and architecture agree on Next.js 16.3.1 and React/React DOM 19.2.4. |
| FND-003 | Establish the requested architecture and evidence directories without speculative feature routes or TypeScript placeholders. | Every requested path exists and empty code layers contain only directory markers. |
| FND-004 | Provide focused executable development, security, testing, and quality-review skills. | Each generated skill has valid frontmatter, exact directory/name alignment, focused instructions, and validator evidence. |
| FND-005 | Configure a narrow read-only quality-assurance custom agent. | TOML contains no model pin, uses read-only sandboxing, produces evidence-backed review findings and a commit verdict, and forbids feature implementation. |
| FND-006 | Separate private local notes from tracked factual AI evidence. | `.local/` is ignored and `docs/ai-usage.md` contains an empty factual schema. |
| FND-007 | Expose all required formal submission facts as human-entered or human-verified fields. | Formal checklist includes every fact from SRC-001 without inventing a Matrikelnummer or external verification. |
| FND-008 | Validate the foundation. | Available lint, typecheck, and build pass; path, `any`, and likely-secret checks are recorded truthfully. |

## Testing and minimal UI scope

These requirements derive from SRC-002 and remain infrastructure-only.

| ID | Requirement | Acceptance criterion |
| --- | --- | --- |
| P04-001 | Configure the smallest justified test stack. | Vitest, React Testing Library, user-event, jest-dom, jsdom, and Playwright are exactly pinned in the lockfile; scripts cover focused tests, watch mode, E2E, and combined verification. |
| P04-002 | Add infrastructure smoke coverage without inventing feature tests. | Node-environment, UI-atom, and production landing smoke tests pass; no business test, production reset endpoint, or async Server Component unit test is introduced. |
| P04-003 | Implement only the approved reusable UI atoms. | Typed `Button`, `Input`, and `Card` components exist with primary/secondary/outlined buttons, controlled-input support, and a semantic card element option. |
| P04-004 | Provide accessible, narrowly scoped styling hooks. | Native elements, visible input labels, error associations, focus and disabled styles, one CSS Module per atom, and a small global token set are present. |
| P04-005 | Validate and record the phase honestly. | Lint, strict typecheck, all smoke tests, production build, selected Playwright flow, lockfile consistency, and dependency audit pass; evidence does not claim business coverage or human corrections. |

## Out of scope

Authentication, users, invitations, games, rounds, scoring, persistence, APIs, and other business behavior require a sourced PRD and are not part of this phase.
