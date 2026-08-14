# Spieleabend agent map

Before changing code, read `docs/source-register.md`, `docs/requirements.md`, `docs/requirement-matrix.md`, `docs/architecture.md`, and the relevant file in `docs/prds/`. Invoke the relevant repository skill explicitly: `$development`, `$security`, `$testing`, or `$quality-review`. For version-sensitive Next.js work, consult the matching guide in `node_modules/next/dist/docs/`.

- Use the App Router and Server Components by default. Add Client Components only at an interaction boundary.
- Keep server modules under `src/server/`, mark executable server modules with `server-only`, and never import them into client code.
- Validate every external boundary. Re-check authentication, authorization, ownership, and server authority for each protected operation.
- Preserve the runtime contract recorded in `docs/architecture.md`; change pinned dependencies deliberately and update the lockfile.
- Keep changes within the approved requirement or PRD and avoid unrelated cleanup.
- Before a phase commit, update relevant tests, requirement evidence, review evidence, and `docs/ai-usage.md` with facts only.
- Run the relevant lint, typecheck, test, and build checks. Require a human diff review, and log factual human corrections without inventing verification.
