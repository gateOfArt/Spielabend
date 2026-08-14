# Component tree

Current foundation rendering tree:

```text
RootLayout (Server Component, src/app/layout.tsx)
└── Home (Server Component, src/app/page.tsx)
    └── main
        └── section
```

Current reusable UI atoms:

```text
src/components/ui/
├── Button
├── Input
└── Card
```

The atoms have no `"use client"` directive, hooks, or browser-only API, so they do not create a client boundary by themselves. `Button` and `Input` expose typed native props, including event/value props for a future Client Component caller; controlled state belongs to that caller. `Card` can render a `div`, `section`, or `article`. Each atom owns one CSS Module, while global CSS contains only shared tokens and resets.

No form, navigation, game component, or business component is implemented yet.
