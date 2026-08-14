# Testing strategy

Select the lowest layer that proves the requirement:

- Unit tests in `tests/unit/` for pure domain rules and boundary-heavy calculations.
- Integration tests in `tests/integration/` for repositories, stores, server services, authentication, authorization, and validation boundaries.
- End-to-end tests in `tests/e2e/` for critical user journeys through the running application.

For behavior changes, use meaningful RED, GREEN, Refactor evidence. Cover positive, negative, and boundary cases. Control clocks, randomness, identifiers, and external effects so tests remain deterministic. Do not add production test endpoints, bypasses, arbitrary sleeps, or live-service dependencies.

## Installed infrastructure

The pinned stack is Vitest 4.1.10, React Testing Library 16.3.2, user-event 14.6.4, jest-dom 6.9.1, jsdom 27.4.0, and Playwright 1.62.1.

- Vitest defaults to Node; component files opt into jsdom explicitly.
- `tests/unit/vitest-environment.test.ts` proves runner/environment wiring only.
- `tests/component/ui-atoms.test.tsx` checks native button behavior, controlled input and accessible error association, and semantic card rendering.
- `tests/e2e/landing.spec.ts` checks the existing landing page through a production Next.js server in Chromium.
- Async Server Components are not unit-rendered. Future cross-boundary behavior belongs in integration tests or selected Playwright flows.

The component test was observed failing when the approved atom modules were absent and passing after their implementation. Current evidence is infrastructure smoke coverage, not registration, authentication, credit, game, API, or persistence coverage.

## Commands

- `npm run test`, `test:unit`, and `test:component` run deterministic non-browser suites.
- `npm run test:watch` provides local watch mode.
- `npm run test:e2e` builds the application and runs selected Playwright flows against `next start`.
- `npm run verify` runs lint, strict typecheck, Vitest, production build, and Playwright.

PROMPT 04 validation on 2026-08-14 passed lint, typecheck, 4 Vitest smoke tests in 2 files, a Next.js 16.3.1 production build, and 1 Chromium smoke test. No production test endpoint or test-only runtime branch was added.
