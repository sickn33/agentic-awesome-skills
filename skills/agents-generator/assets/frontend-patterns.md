# Frontend Patterns

## File Structure

```text
{{FILE_STRUCTURE}}
```

## Component Rules

{{COMPONENT_RULES}}

## State Management

{{STATE_MANAGEMENT}}

## Toast / Notification System

{{TOAST_SYSTEM}}

## Analytics

{{ANALYTICS_SECTION}}

## Trust Boundaries

{{TRUST_BOUNDARIES}}

## Generation Rules

- **FILE_STRUCTURE**: ASCII tree of relevant source directories (app/, components/, lib/, src/). Include only code directories, not node_modules, .git, etc.
- **COMPONENT_RULES**:
  - Next.js App Router: "use client" rule, server/client component split, where each type lives.
  - Vite/SPA: folder structure, lazy loading.
  - Tailwind: prohibit inline `style={{}}` (except cases like global-error).
  - shadcn/ui: atomic components in components/ui/.
  - UI language for labels/navigation (English/Spanish/etc.) based on project detection.
- **STATE_MANAGEMENT**:
  - Zustand/Redux/Jotai: document stores, server hydration patterns.
  - useState only: document where main state lives.
  - Shared hooks: list them with their purpose.
- **TOAST_SYSTEM**: Detect sonner, shadcn toast, custom system, or none. Document the API.
- **ANALYTICS_SECTION**: If Google Analytics, GTM, Plausible, etc. exists. Document the hook or helper.
- **TRUST_BOUNDARIES**: Document what the client validates vs what the server validates, what goes through server actions vs client-side.
