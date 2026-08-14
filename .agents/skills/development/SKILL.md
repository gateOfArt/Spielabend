---
name: development
description: Implement approved Spieleabend application changes within the App Router and documented architecture. Use for TypeScript, React components, server layers, styling, refactors, and dependency-aware implementation; do not use to invent requirements or bypass security and testing review.
---

# Development

Implement only a sourced requirement and keep the documented layering intact.

## Workflow

1. Read the source register, requirements, matrix, architecture, and relevant PRD. Confirm the acceptance criteria and runtime contract.
2. Inspect nearby code and version-specific Next.js documentation before choosing an API.
3. Keep App Router pages, layouts, loading states, and route handlers under `src/app/`. Use Server Components by default and add `"use client"` only at the smallest interactive boundary.
4. Put reusable UI in `src/components/`, business rules in `src/domain/`, server orchestration in `src/server/services/`, persistence behind repositories and stores, and framework-neutral helpers in `src/lib/`.
5. Mark executable server modules with `import "server-only";`. Validate external inputs at boundaries and keep server-only values out of client props.
6. Implement the smallest coherent change, update evidence and tests, then run the relevant checks.

## Coding rules

- Keep TypeScript strict. Do not use `any`; model unknown input as `unknown` and narrow it.
- Name React components and types in PascalCase, functions and variables in camelCase, and route folders in lowercase kebab-case.
- Prefer semantic HTML and accessible native controls. Use CSS Modules for component-scoped styles and global CSS only for application-wide tokens and resets.
- Define explicit, minimal props. Keep state controlled when a parent owns the value; otherwise keep state local to the smallest client component.
- Introduce enums or shared constants only for stable, repeated domain vocabulary. Keep one-off values close to their use.
- Preserve dependency direction and avoid importing `src/server/` from client components.
- Do not add Pages Router files, speculative abstractions, placeholder routes, or unrelated refactors.
