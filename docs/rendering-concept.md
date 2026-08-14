# Rendering concept

The foundation uses App Router Server Components. The root layout supplies metadata, fonts, document language, and global styles; the home page renders a static server-owned shell.

Choose static rendering when content has no request-specific data. Use dynamic server rendering only when a sourced requirement needs request-time identity or data. Add client rendering at the smallest interaction boundary, keep server data access out of client modules, and document caching, revalidation, loading, error, and empty states per PRD.
