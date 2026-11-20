# Platform-Specific UI Implementation Prompt Contracts

AI design tools and coding agents operate under fundamentally different execution boundaries, context windows, and file permissions. This document specifies the exact prompt contracts tailored for **Repository-Bound AI Agents (Cursor, Claude Code, Antigravity CLI)**, **Isolated Component Generators (v0.dev)**, **Full-Stack Application Builders (Lovable, Bolt.new)**, and **Design-to-Code Generators (Google Stitch)**.

Before moving from a local codebase to a hosted generator, confirm the user
approves the destination and the exact material to share. Use synthetic content
and a minimal implementation description by default. Exclude secrets, private
source, internal endpoints, user data, and unapproved screenshots from prompts.

---

## 1. Comparison of Platform Execution Models

| Dimension | Repository-Bound Agents (Cursor, Claude Code, Antigravity) | Component Generators (v0.dev) | Full-Stack Builders (Lovable, Bolt.new) | Design-to-Code Tools (Google Stitch) |
| :--- | :--- | :--- | :--- | :--- |
| **Filesystem Access** | Full read/write to local repo disk. | Zero local disk access; isolated web sandbox. | Web sandbox with multi-file virtual filesystem. | Canvas generation with HTML/CSS & DESIGN.md export. |
| **Dependency Control**| Reads real `package.json`; must reuse installed libraries. | Bundles popular packages on-demand; self-contained. | Scaffolds Vite/Next.js dependencies automatically. | Pure visual rendering and CSS structure. |
| **File Scope** | Specific target files and imports. | Single contiguous file output. | Multi-route screens + database/mock schemas. | Visual layouts, screen variants, and design tokens. |
| **Primary Risk** | Installing duplicate packages, overwriting unrelated files. | Copy-paste mismatch with local project tokens. | Generating brittle full-stack abstractions. | Incomplete interactivity or fake functional states. |

---

## 2. Contract 1: Repository-Bound AI Coding Agents (Cursor, Claude Code, Antigravity)

Use this format when delegating UI implementation tasks to an agent running directly inside an existing workspace:

```markdown
Role: Senior Frontend Engineer
Task: Implement [Feature Name] inside the existing repository.

1. Pre-Implementation Codebase Discovery:
   - Framework & Runtime: [e.g. Next.js 15 App Router - use 'use client' where interactive hooks are needed]
   - Component Foundation: Reuse existing primitives from `@/components/ui/` (do NOT duplicate [Button, Dialog, Badge, Input])
   - Styling & Tokens: Use existing semantic Tailwind tokens (`bg-card`, `text-card-foreground`, `border-border`, `text-primary`). Do NOT introduce hardcoded hex colors.
   - Icon Library: Use existing [e.g. `lucide-react`] imports only.
   - Utilities: Use existing `@/lib/utils` (`cn()` helper) for class merging.

2. Target Files & Location:
   - Primary Component: `@/components/[feature-domain]/[component-name].tsx`
   - Data Types: `@/types/[feature-domain].ts` (or colocated if local)
   - Do NOT modify root configuration files (`tailwind.config.*`, `package.json`) unless explicitly instructed.

3. Applicable State Implementation:
   - Default: Render standard interactive layout with semantic HTML landmarks.
   - Hover / Focus-Visible: Subdued background shift and high-contrast 2px focus ring (`focus-visible:ring-2 focus-visible:ring-ring`).
   - Disabled: Suppress pointer events, set `opacity-50`, apply `disabled` and `aria-disabled="true"`.
   - Loading: Render shimmer skeleton matching layout dimensions when `isLoading` is true (`aria-busy="true"`).
   - Empty: Display centered icon, message, and action CTA when items array is empty.
   - Error: Display contextual alert banner with retry trigger (`role="alert"`).

4. Data Boundary & Synthetic Content:
   - Accept typed props interface extending `React.HTMLAttributes<HTMLDivElement>`.
   - All sample/mock arrays must be clearly marked with `isMock: true` or `[MOCK_DATA]`.

5. Verification Criteria:
   - Run `npx tsc --noEmit` and confirm 0 TypeScript errors.
   - Verify keyboard operability: Tab key enters interactive elements; Enter/Space triggers actions; Escape closes overlays (modal dialogs trap focus; popovers and menus do NOT trap focus).
```

---

## 3. Contract 2: Standalone Component Generators (v0.dev)

Use this format when generating a component in v0.dev that must cleanly drop into an existing application without refactoring:

```markdown
Generate a production-ready, self-contained React component for [Feature Name e.g. Audit Log Telemetry Drawer].

Technical Architecture:
- Framework: React 19 / Next.js 15 App Router (`'use client'`).
- Styling: Tailwind CSS using standard CSS variable semantic tokens:
  - Surface: `bg-background`, `bg-card`, `bg-muted`, `bg-popover`
  - Typography: `text-foreground`, `text-muted-foreground`, `text-card-foreground`
  - Borders: `border-border`, `border-input`
  - Accents: `bg-primary text-primary-foreground`, `bg-accent text-accent-foreground`
  - Do NOT use hardcoded hex values (`#1e293b`).
- Components & Primitives: Base on headless Radix UI / shadcn conventions.
- Icons: Import from `lucide-react`.

Component Specifications:
- Export a named component: `export function ComponentName({ ... }: ComponentNameProps)`
- Export TypeScript interfaces for all props and data entities.
- Include props: `isOpen?: boolean; onClose?: () => void; data?: TelemetryItem[]; isLoading?: boolean; error?: string | null;`
- Support slots or `children` for custom header and action bars.

Interactive States Included:
1. Default: Structured layout with responsive container.
2. Loading Skeleton: Shimmer placeholders when `isLoading={true}`.
3. Empty State: Shown when `data.length === 0`, with a clear icon and action button.
4. Error State: High-contrast alert callout with a "Retry" button when `error` is provided.

Data Transparency:
- Provide self-contained mock data labeled with `[MOCK_DATA]` so the component renders immediately in preview.
```

---

## 4. Contract 3: Full-Stack Application Builders (Lovable, Bolt.new)

Use this format when prompting AI systems that scaffold complete multi-page web applications with routing and mock backends:

```markdown
Build a multi-page web application feature: [Feature Name e.g. B2B Client Onboarding Portal].

Application Structure & Routing:
- Route 1: `/onboarding/company` (Step 1: Organization details)
- Route 2: `/onboarding/billing` (Step 2: Subscription & payment setup)
- Route 3: `/onboarding/review` (Step 3: Review & confirmation)

Architectural Invariants:
1. Design System:
   - Establish consistent light and dark mode tokens via CSS variables.
   - Use a clean SaaS palette (neutral slate backgrounds, indigo primary accent, amber warning, red destructive).
2. Data Flow & Mock APIs:
   - Model client state in a structured store or URL search params across multi-step routes.
   - Colocate mock API responses in a dedicated mock service layer with simulated 600ms latency.
   - Mark all synthetic records with `[MOCK_DATA]`.
3. Validation & Recovery:
   - Validate form fields inline using schema constraints.
   - Show field-level validation errors on blur or submit.
   - Provide network-error simulation with a "Retry Submission" button.
   - Preserve draft form values in transient memory; never persist unencrypted sensitive payment or credential tokens in `localStorage` or `sessionStorage`.
4. Accessibility:
   - Preserve natural document Tab navigation (do NOT trap keyboard focus inside in-page forms); advance focus programmatically to step heading or first input upon transition.
   - Ensure all form inputs have associated `<label>` elements and visible focus rings.
```

---

## 5. Contract 4: Design-to-Code Generators (Google Stitch)

Use this format when generating screen layouts, responsive variants, or `DESIGN.md` tokens in Google Stitch:

```markdown
Design a modern, high-density [Screen/Component e.g. Cloud Security Posture Overview] for enterprise operators.

Visual Hierarchy & Layout:
- Layout Grid: 12-column responsive layout, desktop (1440px), tablet (768px), and mobile (375px) breakpoints.
- Header: Sticky navigation bar with environment indicator (`Production [MOCK]`), global search trigger (`Ctrl+K`), and user avatar.
- Main Section: 4 metric summary KPI cards at the top, followed by a split layout (70% active incidents table, 30% risk breakdown radar chart).

Aesthetic Tokens:
- Theme: Dark Obsidian (`#09090B`) with high data-ink ratio.
- Border Styling: 1px subtle borders (`rgba(255, 255, 255, 0.1)`), 8px card border-radius.
- Typography Scale: Inter or Geist; H1 24px/32px bold, Data values 28px tabular mono, Labels 12px uppercase medium.
- Color Accents: Emerald (`#10B981`) for normal status, Amber (`#F59E0B`) for elevated risk, Rose (`#F43F5E`) for critical incident.

Screen Variants to Generate:
- Variant A: Active Monitoring (Normal operational state with live data points).
- Variant B: Incident Alert Triggered (Critical alert banner visible, row highlighted).
- Variant C: Filtered Zero Results (Empty state illustration and "Clear Filters" CTA).
```
