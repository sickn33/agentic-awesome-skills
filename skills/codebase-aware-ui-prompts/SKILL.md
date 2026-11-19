---
name: codebase-aware-ui-prompts
description: Transform product requirements into precise, architecture-preserving UI implementation prompts for Cursor, Claude Code, v0, Lovable, and Stitch without duplicating packages or breaking design tokens.
category: design
risk: safe
source: self
source_type: self
date_added: '2026-11-19'
author: KatkamKoushik
license: MIT
---

# Codebase-Aware UI Implementation Prompts

Transform feature requests and visual requirements into precise, architecture-preserving implementation briefs for AI coding agents (**Cursor, Claude Code, Antigravity CLI, GitHub Copilot**) and UI generators (**v0.dev, Lovable, Bolt.new, Google Stitch**).

This skill enforces strict codebase discovery, token reuse, dependency preservation, component-applicable interaction states, and five-tier verification to prevent AI code generation from introducing duplicate libraries, hardcoded hex colors, and broken accessibility patterns.

---

## 1. Concrete Division of Labor (Skill Boundaries)

To prevent duplication and context bloat across agent interactions, adhere strictly to these ownership boundaries:

| Domain Area | Codebase-Aware UI Prompts (This Skill) | UI/UX Pro Max (`ui-ux-pro-max`) | Design System (`design-system`) | Cinematic UI/UX (`cinematic-ui-ux`) |
| :--- | :--- | :--- | :--- | :--- |
| **Primary Mission** | Transforms feature requests into architecture-preserving prompts & implementation briefs. | Reference catalog of 50+ styles, 96 palettes, 57 font pairings, and 99 UX heuristics. | Mechanical rules for token architecture, FOUT prevention, and loading order. | Production GSAP timelines, Lenis smooth scroll, canvas frame scrubbing, route transitions. |
| **Existing Codebases** | Audits installed packages, forces reuse of `@/components/ui/*` and existing CSS variables. | Look up optimal aesthetic style for a domain. | Defines 3-tier token hierarchy from scratch. | Animates existing components with physics and gesture mechanics. |
| **Prompt Engineering** | Platform-specific contracts (Cursor, v0, Lovable, Stitch) with applicable state matrices. | None; reference lookup. | None; CSS guidelines. | Illustrative Playwright E2E motion test fixtures. |
| **Interaction States** | Calibrated matrix defining which of the 8 states apply to which component types. | General UX guidelines on touch targets and hover states. | Surface elevation tokens (base, raised, overlay). | Decorator pause controller and reduced-motion branches. |
| **Dependency Guard** | Forbids installing competing packages or hardcoding hex colors. | Recommends libraries based on technology stack. | Forbids arbitrary hex colors in CSS tokens. | Coordinates Lenis with ScrollTrigger ticker authority. |

---

## 2. The Five Core Preservation Invariants

When prompting an AI agent to build a feature inside an existing codebase, enforce these non-negotiable constraints:

1. **Zero New Competing Dependencies**: Never install a package if an equivalent already exists in `package.json` (e.g., do not add `framer-motion` if `motion` or `tailwindcss-animate` is present; do not add `lucide-react` if `@radix-ui/react-icons` is present).
2. **Token Inheritance Over Hex Values**: Never allow hardcoded hex colors (`bg-[#0B0F19]`). All visual styles must inherit existing semantic CSS variables or theme classes (`bg-background`, `bg-card`, `text-card-foreground`, `border-border`, `text-primary`).
3. **Component Composition Over Duplication**: Never re-scaffold a basic primitive. If `button.tsx` or `dialog.tsx` exists in `@/components/ui/`, the prompt must instruct the agent to import and compose it.
4. **Synthetic Data Disclosure**: All mock metrics, user names, and test records must carry explicit `isMock: true` properties or `[MOCK_DATA]` labels to prevent placeholder data from masquerading as verified live telemetry.
5. **Non-Destructive File Scope**: Confine code creation to dedicated feature directories (e.g., `@/components/features/[feature-name]/[component].tsx`). Prohibit unauthorized overwrites of root configs (`package.json`, `tailwind.config.*`, `app/layout.tsx`).

---

## 3. Seven-Stage Codebase Discovery Protocol

Before writing an implementation prompt or generating UI code, inspect these seven structural dimensions:

1. **Framework & Runtime**: Detect Next.js App Router (requires `'use client'` for hooks), Pages Router, Vite/SPA, or Astro.
2. **Component Foundation**: Detect existing primitives: shadcn/ui with Radix UI vs modern Base UI (`@base-ui/react`), Mantine, or custom primitives.
3. **Styling Engine**: Detect Tailwind CSS v3 (`tailwind.config.*`) vs Tailwind CSS v4 (`@theme` in CSS), CSS Modules, or CSS-in-JS.
4. **Iconography System**: Detect installed icon library (`lucide-react`, `@radix-ui/react-icons`, `@heroicons/react`).
5. **Data & State Boundaries**: Detect Server Actions, TanStack Query, SWR, or local React state.
6. **Form & Validation**: Detect `react-hook-form` + `zod` vs native form elements.
7. **Testing & Quality Tooling**: Detect Playwright, Vitest, Jest, and existing accessibility test configurations.

*See [references/codebase-discovery-protocol.md](references/codebase-discovery-protocol.md) for detailed detection heuristics and the JSON audit output schema.*

---

## 4. Platform-Specific Prompt Contracts

Select the exact contract matching the execution environment:

- **Repository-Bound AI Agents (Cursor, Claude Code, Antigravity CLI)**: Requires target file paths, specific `@/components/ui/*` imports, exact CSS variable re-use, and unit test criteria.
- **Component Generators (v0.dev)**: Requires a self-contained single-file React component, typed props interface, children slots, semantic Tailwind classes, and inline mock data.
- **Full-Stack Application Builders (Lovable, Bolt.new)**: Requires multi-step route paths, mock API schemas, client state management, and network failure recovery.
- **Design-to-Code Tools (Google Stitch)**: Requires 12-column responsive layout, typography hierarchy, high data-ink ratios, and multi-screen variants.

*See [references/platform-prompt-contracts.md](references/platform-prompt-contracts.md) for complete copy-ready prompt templates.*

---

## 5. Component-Applicable State Matrix

Do not demand that every component implement all interaction states. Apply states based on component archetype:

- **Interactive Triggers (Button, Tab, Toggle)**: Default, Hover, Focus-Visible, Active/Pressed, Disabled, Loading/Spinner. (Empty and Error do not apply).
- **Data Displays & Collections (Table, Grid, List)**: Default, Loading (Layout-matching skeleton), Empty (System empty vs Filter empty), Error (Fetch failed + Retry CTA), Partial/Truncated.
- **Form Controls & Inputs (Input, Select, Textarea)**: Default, Hover, Focus-Visible, Filled/Valid, Disabled, Read-only, Validation Error (with `aria-invalid` and `aria-describedby`).
- **Overlays & Dialogs (Modal, Sheet, Popover)**: Closed, Opening, Opened (Focus trapped), Closing, Dismissed via Escape/Backdrop.
- **Multi-Step & Async Flows (Checkout, Uploader)**: Step In-Progress, Step Completed, Validation Blocked, Async Submitting, Network Offline, Final Success.

*See [references/ui-state-matrix.md](references/ui-state-matrix.md) for visual specifications and WCAG 2.2 accessibility attributes.*

---

## 6. Five-Tier UI Verification Rubric

Evaluate UI implementations across five independent tiers rather than relying solely on visual appearance:

1. **Tier 1: Prompt Structural Completeness**: Discovery findings documented, no competing packages, token re-use enforced, mock data labeled.
2. **Tier 2: Static Code & Type Compilation**: `npx tsc --noEmit` exits with code 0; props extend standard HTML attributes; zero untyped `any`.
3. **Tier 3: Component Behavior & States**: Applicable interaction states (skeletons, empty illustrations, error banners) render under appropriate conditions.
4. **Tier 4: Accessibility Conformance**: WCAG 2.2 Level AA compliance; minimum 4.5:1 text contrast; 24px/44px touch targets; visible `:focus-visible` rings; zero automated axe-core violations.
5. **Tier 5: Runtime Browser Validation**: Responsive across 375px, 768px, and 1280px without horizontal overflow; no unhandled console exceptions; CLS < 0.1.

*See [references/ui-verification-rubric.md](references/ui-verification-rubric.md) for evaluation rubrics and Playwright test fixtures.*

---

## 7. Concrete Implementation Examples

### Example 1: Existing Enterprise Telemetry Dashboard (Repository-Bound Agent)

```markdown
Role: Senior Frontend Engineer
Task: Implement a Real-Time Incident Telemetry Drawer in `@/components/incidents/incident-drawer.tsx`.

1. Codebase Discovery Findings:
   - Framework: Next.js 15 (App Router). Add `'use client'` directive.
   - Component Foundation: Import existing primitives from `@/components/ui/sheet`, `@/components/ui/button`, and `@/components/ui/badge`.
   - Styling: Use existing Tailwind CSS tokens: `bg-card`, `text-card-foreground`, `border-border`, `text-primary`. Do NOT add hex colors.
   - Icons: Import `{ AlertTriangle, Clock, RefreshCw, X }` from `lucide-react`.

2. Props & Types:
   - Export interface `IncidentDrawerProps`: `isOpen: boolean; onClose: () => void; incidentId?: string;`
   - Model telemetry items with `{ id: string; metric: string; value: string; status: 'nominal' | 'degraded'; isMock: true; }`

3. Interaction States:
   - Loading: Render 4 shimmer skeleton rows while incident details load (`aria-busy="true"`).
   - Error: If fetch fails, show a high-contrast alert banner with a "Retry Connection" button (`role="alert"`).
   - Keyboard Focus: Focus must be trapped inside the drawer; pressing `Escape` must trigger `onClose()`.
```

### Example 2: Incomplete Requirements with Visible Assumptions (Greenfield Specification)

```markdown
Task: Create an Analytics Export Modal.

[CONFIRMED CONSTRAINTS]
- Target Stack: React 19 + Tailwind CSS v3.4 + Radix UI Dialog.
- Reused Tokens: `bg-background`, `border-border`, `text-foreground`.
- Export Formats: CSV and JSON.

[WORKING ASSUMPTIONS - REQUIRE USER VALIDATION]
- Assumption A: Date range defaults to "Last 30 Days" if unselected.
- Assumption B: Large exports (> 10,000 rows) trigger an asynchronous email delivery flow rather than direct browser download.
- Assumption C: User possesses standard read-only export permissions; no enterprise role-based access control (RBAC) gating applied.

Implementation Directive:
- Implement the modal UI honoring confirmed constraints.
- Render an informational badge labeled "[MOCK_SPEC: Async Email Flow]" next to large export options to clearly demarcate unconfirmed assumptions.
```

### Example 3: Accessible Multi-Step Form with Error Recovery (Full-Stack Builder)

```markdown
Build a 3-step Vendor Onboarding Flow (`/onboarding/vendor`):
- Step 1: Legal Entity Details (Company Name, Tax ID, Registration Country).
- Step 2: Bank Disbursal Account (IBAN/Routing, Currency, Account Holder).
- Step 3: Compliance Certification & Document Upload.

State & Accessibility Architecture:
- Step Progress: Render `<ol role="list">` with `aria-current="step"` on the active step.
- Validation: Validate on field blur. When invalid, mark `<input aria-invalid="true" aria-describedby="[field]-error">` and display inline error message.
- Keyboard Trap: Ensure `Enter` key submits the current step; `Tab` loops strictly within active form controls.
- Network Failure Recovery: If submission times out, persist entered values in `sessionStorage`, show a contextual recovery banner with "Retry Submission", and prevent data loss.
- Synthetic Evidence: Label all mock banking verification tokens with `[MOCK_DATA]`.
```

---

## Overview

Codebase-Aware UI Prompts provides an architecture-preserving prompt engineering framework. It transforms product and design requirements into precise implementation briefs that respect an existing project's dependencies, design tokens, component primitives, and accessibility standards without introducing architectural fragmentation.

## When to Use

Use this skill when:
- Instructing an AI coding agent (Cursor, Claude Code, Antigravity CLI) to implement a new UI feature or page in an existing application.
- Generating a self-contained component in v0.dev that must cleanly integrate into a project with existing design tokens.
- Creating a full-stack screen specification in Lovable or Bolt.new that requires structured mock APIs and explicit error recovery states.
- Authoring Google Stitch design prompts that demand precise visual hierarchy, 12-column layouts, and responsive variants.
- Auditing AI-generated UI code to ensure it reuses existing component primitives rather than installing competing packages.

When NOT to use:
- For low-level animation physics, spring curves, or canvas frame scrubbing; use `cinematic-ui-ux` instead.
- For looking up color palettes, font pairings, or general UX laws; use `ui-ux-pro-max` instead.
- For generating raw CSS design token manifests from scratch; use `design-system` instead.
- For generic LLM prompt engineering unrelated to user interface implementation; use `prompt-engineering-patterns` instead.

## Prerequisites

- Target application running React 18+ or React 19 (Next.js App/Pages Router, Vite, or Astro).
- Styling framework (Tailwind CSS v3 or v4, CSS Modules, or CSS Variables).
- Node.js environment supporting standard frontend package tooling.

## Limitations

- The skill produces prompt specifications, implementation contracts, and evaluation rubrics; it does not automatically modify project configuration files without user instruction.
- Automated accessibility tests provided in `references/ui-verification-rubric.md` require a local test runner (`@playwright/test`, `@axe-core/playwright`) configured in the target project.
- Visual token discovery depends on accessing local project configuration files (`tailwind.config.*`, CSS globals, or `components.json`).

## Safety and Side Effects

- Zero external package mutations: explicitly forbids AI agents from adding conflicting dependencies to `package.json`.
- Non-destructive execution: confines component generation to targeted feature folders without modifying root layouts or shared utilities.
- Synthetic data protection: mandates that all mock metrics, placeholder lists, and demo accounts are tagged with `[MOCK_DATA]` or `isMock: true` to prevent leakage into production schemas.

## Reference Documents

- [references/codebase-discovery-protocol.md](references/codebase-discovery-protocol.md)
- [references/platform-prompt-contracts.md](references/platform-prompt-contracts.md)
- [references/ui-state-matrix.md](references/ui-state-matrix.md)
- [references/ui-verification-rubric.md](references/ui-verification-rubric.md)
