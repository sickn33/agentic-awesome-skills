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
- **Modal Overlays (Modal Dialog, Sheet Drawer)**: Closed, Opening, Opened (Focus trapped within modal container), Closing, Dismissed via Escape/Backdrop, Focus restored to trigger on close.
- **Popovers & Menus**: Closed, Opening, Opened (No focus trap; focus remains in document flow; light dismiss via Escape or click-outside; Arrow key navigation for menus).
- **Multi-Step & Async Flows (Checkout, Uploader)**: Step In-Progress, Step Completed, Validation Blocked, Async Submitting, Network Offline, Final Success. (Natural Tab navigation preserved; no focus trapping in in-page forms).

*See [references/ui-state-matrix.md](references/ui-state-matrix.md) for visual specifications and WCAG 2.2 accessibility attributes.*

---

## 6. Five-Tier UI Verification Rubric

Evaluate UI implementations across five independent tiers rather than relying solely on visual appearance:

1. **Tier 1: Prompt Structural Completeness**: Discovery findings documented, no competing packages, token re-use enforced, mock data labeled.
2. **Tier 2: Static Code & Type Compilation**: `npx tsc --noEmit` exits with code 0; props extend standard HTML attributes; zero untyped `any`.
3. **Tier 3: Component Behavior & States**: Applicable interaction states (skeletons, empty illustrations, error banners) render under appropriate conditions.
4. **Tier 4: Accessibility Verification (Automated + Semantic)**: Zero automated axe-core rule violations (syntax, labels, contrast ≥ 4.5:1); manual evaluation for WCAG 2.2 Level AA behavioral criteria (keyboard navigation without traps, screen reader clarity, modal-only focus containment).
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
   - Keyboard Focus: Focus must be trapped inside the drawer while open (`aria-modal="true"`); pressing `Escape` must trigger `onClose()`, and focus must return to the trigger upon closing.
```

### Example 2: Incomplete Requirements with Visible Assumptions (Greenfield Specification)

```markdown
User Feature Request: "Add an export option for our analytics reports."

[CONFIRMED PRODUCT REQUIREMENT]
- Product Goal: Provide users with an interface action to export analytics report data from the dashboard.

[WORKING ASSUMPTIONS - REQUIRE USER VALIDATION]
- Assumption A (Presentation Pattern): Deliver the feature as a modal dialog (`@/components/ui/dialog`) triggered from the analytics header, rather than a dedicated export page or dropdown action.
- Assumption B (Technology Foundation): Assume target stack is React 19 + Tailwind CSS v3.4 + Radix UI Dialog, using semantic tokens (`bg-background`, `border-border`, `text-foreground`).
- Assumption C (Export Formats): Provide CSV and JSON export options (PDF / Excel generation deferred until user confirms server capacity).
- Assumption D (Date Range): Default export date range to "Last 30 Days" if no custom filter is active.
- Assumption E (Delivery Mechanism): Exports < 10,000 rows download directly in-browser; exports >= 10,000 rows trigger an asynchronous background job with email delivery to avoid browser timeout.
- Assumption F (Permissions): User possesses standard report export permissions; advanced role-based access control (RBAC) restrictions are not yet specified.

Implementation Directive:
- Structure the prompt to flag unconfirmed technical stack and product assumptions to the product owner before merging.
- Render an informational badge labeled "[WORKING_ASSUMPTION: Async Email Flow]" next to large export options so unverified behavior is immediately recognizable in review.
```

### Example 3: Accessible Multi-Step Form with Privacy-Conscious Recovery (Full-Stack Builder)

```markdown
Build a 3-step Vendor Onboarding Flow (`/onboarding/vendor`):
- Step 1: Legal Entity Details (Company Name, Tax ID, Registration Country).
- Step 2: Bank Disbursal Account (IBAN/Routing, Currency, Account Holder).
- Step 3: Compliance Certification & Document Upload.

State & Accessibility Architecture:
- Step Progress: Render `<ol role="list">` with `aria-current="step"` on the active step indicator.
- Validation: Validate on field blur. When invalid, mark `<input aria-invalid="true" aria-describedby="[field]-error">` and display an inline error message.
- Keyboard Navigation: Preserve natural document Tab flow (do NOT trap keyboard focus inside in-page forms). When the user advances to the next step, programmatically shift focus to the first interactive input or step heading. `Enter` submits the active step's primary action.
- Privacy-Conscious Failure Recovery: If submission times out or fails, retain uncommitted form state in transient component memory during the active session. Never persist sensitive banking credentials (IBAN, routing, tax IDs) to unencrypted browser storage (`sessionStorage` or `localStorage`). Mask displayed account numbers, render a contextual error banner with "Retry Submission", and require session re-authentication if the auth token expires.
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

- For hosted design and code generators, use synthetic inputs by default. Confirm the destination and exact approved material before sharing anything from a private project.

- Zero external package mutations: explicitly forbids AI agents from adding conflicting dependencies to `package.json`.
- Non-destructive execution: confines component generation to targeted feature folders without modifying root layouts or shared utilities.
- Synthetic data protection: mandates that all mock metrics, placeholder lists, and demo accounts are tagged with `[MOCK_DATA]` or `isMock: true` to prevent leakage into production schemas.

## Reference Documents

- [references/codebase-discovery-protocol.md](references/codebase-discovery-protocol.md)
- [references/platform-prompt-contracts.md](references/platform-prompt-contracts.md)
- [references/ui-state-matrix.md](references/ui-state-matrix.md)
- [references/ui-verification-rubric.md](references/ui-verification-rubric.md)
