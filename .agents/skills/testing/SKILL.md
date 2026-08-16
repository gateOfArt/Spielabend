---
name: testing
description: Design and implement meaningful Spieleabend test coverage from approved PRDs and acceptance criteria. Use when adding or changing behavior, fixing regressions, choosing a test layer, or reviewing test evidence; do not create production-only test hooks or endpoints.
---

# Testing

Derive tests from observable requirements and failure risks rather than implementation details.

## Workflow

1. Read the relevant PRD under `docs/prds/`, the acceptance criteria in `docs/requirements.md`, `docs/test-cases.md`, and existing tests. Identify the behavior and regression being proved.
2. Choose the lowest sufficient layer: unit tests for pure domain rules, integration tests for boundaries and persistence, and end-to-end tests for critical user journeys across the running application.
3. Work RED, GREEN, Refactor for behavior changes: first observe a meaningful failure, implement the smallest change, then improve structure while keeping the suite green. Do not add a test that was already green unless it captures existing behavior intentionally.
4. Cover positive, negative, and boundary cases. Include authentication, authorization, ownership, invalid state, and retry or concurrency cases where relevant.
5. Make randomness, clocks, identifiers, and external effects injectable or seeded at a domain boundary so results are deterministic without weakening production behavior.
6. Run focused tests during iteration, then the relevant broader suite, lint, typecheck, and build. Record commands and outcomes as evidence.

## Test integrity

- Assert public behavior and domain invariants, not private call sequences.
- Keep fixtures small, named, isolated, and resettable.
- Do not use arbitrary sleeps, live external services, shared mutable order, or unseeded randomness.
- Do not add production test endpoints, test-only authentication bypasses, or runtime branches controlled by test mode.
- Map each material acceptance criterion to evidence and state honestly when a layer is not yet available.
