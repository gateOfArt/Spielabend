# Testing strategy

Select the lowest layer that proves the requirement:

- Unit tests in `tests/unit/` for pure domain rules and boundary-heavy calculations.
- Integration tests in `tests/integration/` for repositories, stores, server services, authentication, authorization, and validation boundaries.
- End-to-end tests in `tests/e2e/` for critical user journeys through the running application.

For behavior changes, use meaningful RED, GREEN, Refactor evidence. Cover positive, negative, and boundary cases. Control clocks, randomness, identifiers, and external effects so tests remain deterministic. Do not add production test endpoints, bypasses, arbitrary sleeps, or live-service dependencies.

No test framework is selected yet because no business behavior exists to test. Lint, strict typecheck, and production build are the foundation gates.
