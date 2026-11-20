# Existing-Codebase Discovery Protocol

Before an AI coding agent or prompt engineer outputs an implementation brief or UI code snippet for an existing project, it must execute this deterministic 7-step inspection protocol. This protocol prevents library conflicts, styling fragmentation, and architecture regressions.

---

## 1. The 7-Step Inspection Hierarchy

### Step 1: Framework & Routing Engine
Inspect the root configuration files to identify the framework, version, and routing paradigm:

| Framework Target | Inspection Target | Key Indicators | Architectural Constraints |
| :--- | :--- | :--- | :--- |
| **Next.js App Router** | `package.json`, `app/` directory | `next: >=13.4`, `app/layout.tsx`, `app/page.tsx` | Components with state/effects must include `'use client'`; async data fetching stays in Server Components. |
| **Next.js Pages Router**| `package.json`, `pages/` directory| `pages/_app.tsx`, `pages/index.tsx` | Standard React lifecycle; client/server boundary defined by `getServerSideProps` / `getStaticProps`. |
| **Vite / SPA** | `vite.config.ts`, `src/App.tsx` | `vite`, `react-router-dom` | Pure client-side bundle; no `'use client'` directives; client routing hooks. |
| **Astro / Hybrid** | `astro.config.mjs`, `src/pages/` | `astro`, `@astrojs/react` | Client components require hydration directives (`client:load`, `client:visible`). |

### Step 2: Styling Engine & Design Token Architecture
Inspect how colors, typography, spacing, and dark mode are configured:

```text
Discovery Targets:
- package.json -> dependencies / devDependencies
- tailwind.config.ts / tailwind.config.js / tailwind.config.cjs
- app/globals.css / src/index.css / styles/globals.css
```

**Tailwind CSS Version Detection Heuristic**:
- **Tailwind CSS v3**: Uses `tailwind.config.js` or `tailwind.config.ts` with `theme.extend.colors`. Tokens map via `hsl(var(--card))` or `rgb(var(--primary))`.
- **Tailwind CSS v4**: Uses `@import "tailwindcss";` and `@theme { --color-*: ...; }` directives directly inside CSS files without a mandatory JavaScript config file.
- **CSS Modules / Plain CSS**: Look for `*.module.css` files and class imports.
- **Rule**: Never introduce hardcoded hex codes (`bg-[#0B0F19]`, `text-[#3B82F6]`). Always map colors to existing semantic tokens (`bg-background`, `bg-card`, `text-foreground`, `border-border`, `text-primary`).

### Step 3: Component Primitive Foundation
Inspect existing component libraries before introducing new UI elements:

```text
Discovery Targets:
- components.json (shadcn/ui configuration)
- components/ui/ or src/components/ui/
- package.json -> @radix-ui/*, @base-ui/react, @headlessui/react, @mantine/core
```

- **shadcn/ui with Radix UI**: Look for `@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu` in `package.json`. Reuse `@/components/ui/button`, `@/components/ui/dialog`.
- **shadcn/ui with Base UI**: Look for modern `@base-ui/react` (do NOT use obsolete `@base-ui-components/react`).
- **Rule**: If a component already exists in `@/components/ui/` (e.g. `button.tsx`, `badge.tsx`), the generated implementation must import and compose it. Never generate a duplicate standalone button.

### Step 4: Iconography System
Detect the installed icon set to maintain visual consistency:

```text
Discovery Targets:
- package.json -> lucide-react, @radix-ui/react-icons, @heroicons/react, react-icons, tabler-icons-react
```

- If `lucide-react` is present: `import { AlertCircle, Check, ChevronDown } from 'lucide-react'`
- If `@radix-ui/react-icons` is present: `import { ExclamationTriangleIcon, CheckIcon } from '@radix-ui/react-icons'`
- If `@heroicons/react` is present: `import { CheckCircleIcon } from '@heroicons/react/24/outline'`
- **Rule**: Do not add a second icon library if one is already installed. Use existing icons or clean inline SVG paths matching the installed style (stroke-width 1.5px or 2px).

### Step 5: State Management & Data Fetching Boundaries
Identify how data moves through the interface:

```text
Discovery Targets:
- package.json -> @tanstack/react-query, swr, zustand, redux, jotai
- app/ actions.ts (Server Actions)
```

- When using Server Actions: Client components trigger async transitions via `useTransition` or `useActionState`.
- When using TanStack Query: `const { data, isLoading, error } = useQuery(...)`.
- **Rule**: Follow the established data-fetching convention. Do not introduce a global store (Zustand/Redux) for local component state.

### Step 6: Form & Validation Infrastructure
Check for schema validation and form handling:

```text
Discovery Targets:
- package.json -> react-hook-form, zod, yup, valibot
```

- If `react-hook-form` + `zod` are present: Use `useForm({ resolver: zodResolver(schema) })`.
- If native forms are used: Provide explicit `name`, `type`, `required`, and handle standard `FormData`.

### Step 7: Testing Conventions & Accessibility Tooling
Identify test runners and accessibility tooling:

```text
Discovery Targets:
- package.json -> @playwright/test, vitest, jest, @testing-library/react, axe-core
```

- Supply `data-testid` attributes or accessible role queries (`getByRole('button', { name: /save/i })`) matching existing test patterns.

---

## 2. Preservation & Non-Duplication Invariants

1. **Zero New Competing Dependencies**: Never instruct the agent to run `npm install <package>` if an equivalent package already exists in `package.json`.
2. **Design Token Inheritance**: All typography sizes, border radiuses, and color variables must use the project's existing theme tokens.
3. **Non-Destructive File Scope**: Output components in dedicated feature directories (e.g., `@/components/features/[feature-name]/[component].tsx`). Never overwrite root layouts or shared utility files unless specifically tasked.
4. **Synthetic Data Disclosure**: Any sample array or mock object must be typed with `isMock: true` or labeled with `[MOCK_DATA]` to prevent accidental production commits of placeholder data.

---

## 3. Discovery Audit Output Schema

Before writing implementation prompts or code, the AI agent must output this structured discovery block:

```json
{
  "codebaseAudit": {
    "framework": "Next.js 15 (App Router)",
    "reactVersion": "19.0.0",
    "clientDirectiveRequired": true,
    "stylingEngine": "Tailwind CSS v3.4 (CSS Variables)",
    "componentFoundation": "shadcn/ui (@radix-ui primitives)",
    "iconLibrary": "lucide-react (v0.460)",
    "formValidation": "react-hook-form + zod",
    "reusedComponents": [
      "@/components/ui/button",
      "@/components/ui/dialog",
      "@/components/ui/badge",
      "@/components/ui/skeleton"
    ],
    "preservedTokens": [
      "bg-background",
      "text-foreground",
      "bg-card",
      "text-card-foreground",
      "border-border",
      "bg-primary",
      "text-primary-foreground"
    ],
    "forbiddenPackages": [
      "framer-motion (use existing tailwindcss-animate)",
      "@heroicons/react (use existing lucide-react)"
    ]
  }
}
```
