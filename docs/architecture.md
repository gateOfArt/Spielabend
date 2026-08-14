# Architecture

## Runtime contract

The installed and locked baseline is Next.js **16.3.1**, React **19.2.4**, and React DOM **19.2.4**. The application uses npm lockfile version 3, the App Router, strict TypeScript, `src/`, ESLint, and the `@/*` alias. Dependency upgrades must be deliberate, lockfile-backed, tested, and reflected here.

## Application shape

The project is a single deployable Next.js application. Use Server Components by default. Introduce Client Components only for browser interaction, keep their props serializable and minimal, and never import server modules across that boundary.

Dependencies flow inward:

1. `src/app/` composes routes and rendering.
2. `src/components/` holds reusable presentation.
3. `src/server/services/` orchestrates server use cases.
4. `src/server/repositories/` defines persistence access over `src/server/store/`.
5. `src/domain/` holds framework-independent rules and types.
6. `src/lib/` holds framework-neutral technical helpers.

`src/server/auth/` and `src/server/rate-limit/` are server infrastructure. Mark executable server modules with `server-only`, validate external input at entry points, and enforce authentication, authorization, and ownership on the server.

No business entities, persistence technology, API routes, background workers, or external services are selected in the foundation phase.
