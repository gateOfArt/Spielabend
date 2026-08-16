---
name: quality-review
description: Perform an evidence-backed review of Spieleabend changes before a phase commit or handoff. Use to assess correctness, security, dependencies, maintainability, requirement coverage, tests, architecture drift, and regressions; report findings and a verdict without implementing features.
---

# Quality Review

Review the diff against its sources and evidence. Do not turn the review into a feature implementation pass.

## Workflow

1. Read `docs/requirements.md`, `docs/technical-concept.md`, the relevant PRD under `docs/prds/`, and `docs/test-cases.md`.
2. Inspect the complete scoped diff and nearby code. Trace affected flows through UI, domain, server, persistence, and external boundaries.
3. Check correctness and acceptance criteria, AuthN/AuthZ and ownership, input validation, server authority, safe errors, secret handling, and dependency or lockfile changes.
4. Check maintainability, naming, duplication, unnecessary abstraction, stale comments, architecture drift, runtime compatibility, and likely regressions.
5. Verify tests cover positive, negative, and boundary behavior at the right layer. Distinguish test evidence from unverified claims.
6. Run or inspect the relevant checks and compare `docs/test-cases.md` and other documentation claims with actual files and outputs.

## Findings format

- Report only evidence-backed findings as Critical, Major, or Minor.
- For each finding, give the file and location, observed evidence, impact, and smallest corrective direction.
- Identify assumptions, missing evidence, and manual checks separately from defects.
- End with a commit verdict of `PASS` or `BLOCK`, naming the blocking findings.
- Do not implement features. Make review-only edits only when the user explicitly asks for them.
