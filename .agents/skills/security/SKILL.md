---
name: security
description: Threat-model and review Spieleabend trust boundaries. Use for authentication, authorization, ownership, validation, sessions, passwords, mutations, rate limits, dependencies, secrets, or error handling; provide security guidance and scoped hardening without inventing product behavior.
---

# Security

Treat every client, request, cookie, environment value, and persisted identifier as untrusted until verified by the server.

## Workflow

1. Read the requirement, data model, API contract, architecture, and security document. List assets, actors, entry points, trust boundaries, abuse cases, and required invariants.
2. Separate authentication from authorization. For every protected read and mutation, verify the current identity, role or permission, resource ownership, and allowed state transition on the server.
3. Parse untrusted data with a narrow Zod schema at the boundary. Reject unknown or invalid states before domain or persistence work.
4. Keep credentials and session material server-only. Use an established password hash, secure cookie settings, session rotation and expiry, and constant-time library operations; never log secrets or passwords.
5. Make the server authoritative for game state, scores, randomness, prices, timestamps, and settlement. Perform settlement and other multi-write invariants atomically and make retry behavior explicit.
6. Apply rate limits to authentication, invitations, expensive reads, and state-changing endpoints according to the threat model.
7. Return safe, stable errors to clients while retaining actionable server diagnostics without sensitive data.
8. Review dependency necessity, lockfile changes, advisories, environment handling, and secret exposure before approval.

## Security gate

- Test permitted and denied identities, cross-owner access, malformed input, replay or duplicate actions, boundary values, and concurrent mutation risks.
- Fail closed when identity, ownership, or state cannot be proven.
- Do not rely on hidden UI, client validation, client-generated authority, or sequential non-atomic writes as a security control.
- Record residual risks and required human or deployment checks factually.
