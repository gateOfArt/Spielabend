# Security baseline

The foundation has no authentication, persistence, or state-changing API. Future work must begin with a threat model and apply these rules:

- Treat requests, client state, cookies, identifiers, and stored input as untrusted.
- Validate boundaries with narrow Zod schemas once boundary-bearing features are approved.
- Enforce authentication, authorization, ownership, and valid state transitions on the server.
- Keep passwords, sessions, secrets, and privileged modules server-only; never expose or log sensitive values.
- Use established password and session libraries, secure cookies, rotation, expiry, and safe errors.
- Keep the server authoritative and make settlement or other multi-write invariants atomic.
- Rate-limit authentication, invitations, expensive reads, and mutations according to abuse risk.
- Review dependency and lockfile changes, advisories, environment handling, and deployment controls.

Security controls and residual risks must be backed by tests or clearly identified manual evidence.
