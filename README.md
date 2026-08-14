# Spieleabend

Repository foundation for the university project “Spieleabend.” Business features are intentionally not implemented in this phase.

## Runtime contract

- Next.js 16.3.1, App Router only
- React and React DOM 19.2.4
- TypeScript in strict mode
- Source root `src/` and alias `@/*`
- npm lockfile version 3

## Getting started

Install the pinned dependency graph and run the development server:

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in a browser.

## Checks

```bash
npm run lint
npm run typecheck
npm run test
npm run verify
```

Start with `AGENTS.md` and the documents in `docs/` before implementing a requirement.
