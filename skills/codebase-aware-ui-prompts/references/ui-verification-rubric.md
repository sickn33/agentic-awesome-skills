# Five-Tier UI Verification Rubric & Acceptance Standards

Never equate a well-structured prompt or plausible code snippet with a verified production implementation. To evaluate whether generated UI code is truly production-ready, apply this five-tier verification rubric across Prompt Structure, Type Compilation, Component Behavior, Accessibility, and Browser Validation.

---

## 1. The Five-Tier Quality Rubric

```text
Tier 1: Prompt Structural Completeness (Discovery, Token Re-use, Non-Duplication)
   ↓
Tier 2: Static Code & Type Compilation (TypeScript strict mode, Zero any, Valid HTML attributes)
   ↓
Tier 3: Component Behavior & State Completeness (Loading skeleton, Empty fallback, Error banner)
   ↓
Tier 4: Accessibility Conformance (WCAG 2.2 Level AA, Keyboard focus rings, ARIA descriptors)
   ↓
Tier 5: Runtime Browser & Responsive Validation (375px/768px/1280px, No layout shift, Zero console errors)
```

| Tier | Evaluation Gate | Verification Tool / Command | Pass Criteria |
| :--- | :--- | :--- | :--- |
| **Tier 1: Prompt Structure** | Checks that discovery findings, target paths, state checklist, and token invariants are specified. | Code review / AST inspection | All 7 discovery items present; no conflicting packages requested; mock data tagged `[MOCK_DATA]`. |
| **Tier 2: Type Compilation** | Verifies strict TypeScript type-checking without runtime type holes. | `npx tsc --noEmit` | Exit code 0; 0 type errors; props extend `React.HTMLAttributes`; no untyped `any`. |
| **Tier 3: Component States** | Verifies rendering of all applicable interaction and async states. | Storybook / React Testing Library | Loading skeleton renders during fetch; empty state displays when array is `[]`; error callout renders on rejection. |
| **Tier 4: Accessibility** | Evaluates compliance with W3C WCAG 2.2 Level AA standards. | `@axe-core/playwright` / DevTools | Color contrast ≥ 4.5:1 (normal text); touch target ≥ 24px (mobile 44px); focus visible on Tab navigation; 0 axe violations. |
| **Tier 5: Browser Runtime** | Verifies layout stability, responsive reflow, and runtime console hygiene. | Playwright E2E / Chromium engine | Viewports (375px, 768px, 1280px) show no horizontal overflow; zero unhandled JS exceptions; CLS < 0.1. |

---

## 2. Measurable Acceptance Criteria Checklist

Before accepting AI-generated UI code into an existing repository, verify these concrete assertions:

### Architectural Criteria
- [ ] No new dependencies were added to `package.json` that duplicate existing utility or UI packages.
- [ ] No hardcoded hex color codes (`#...`) are used for surface, text, or border styling; all colors reference existing semantic tokens (`bg-background`, `text-foreground`, `border-border`, `text-primary`).
- [ ] Existing primitives from `@/components/ui/` (buttons, dialogs, badges) are imported and composed rather than re-implemented.
- [ ] File creation is confined to the targeted feature directory (e.g. `@/components/features/...`).

### Functional State Criteria
- [ ] Interactive controls implement visible `:focus-visible` rings with at least 2px high-contrast outline.
- [ ] Data collections implement layout-preserving shimmer skeletons instead of full-page blocking spinners.
- [ ] Empty state explains what is missing and provides a primary action CTA or search reset.
- [ ] Error banner provides human-readable diagnostic text and an immediate retry trigger.
- [ ] All mock or sample records carry explicit `isMock: true` or `[MOCK_DATA]` labels.

### Accessibility Criteria (WCAG 2.2)
- [ ] All form fields have programmatically associated `<label>` elements via `htmlFor` / `id`.
- [ ] Validation errors are linked to their respective input fields via `aria-describedby` and marked with `aria-invalid="true"`.
- [ ] Modals and sheets trap keyboard focus, support `Escape` key closing, and return focus to the trigger upon unmount.
- [ ] Interactive elements have minimum target sizes: 24×24px desktop, 44×44px mobile.

---

## 3. Automated Verification Fixtures

### A. Strict TypeScript Compilation Verification
```bash
# Verify zero compilation or type errors in the target component
npx tsc --noEmit --project tsconfig.json
```

### B. Playwright Automated Accessibility & Keyboard Focus Audit
```typescript
// e2e/component-a11y.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Component Accessibility & Keyboard Navigation', () => {
  test('Passes automated WCAG 2.2 Level AA accessibility scans', async ({ page }) => {
    await page.goto('/components/feature-showcase');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Operable strictly via keyboard navigation', async ({ page }) => {
    await page.goto('/components/feature-showcase');

    // Tab into the interactive control
    await page.keyboard.press('Tab');
    const firstInteractive = page.locator(':focus');
    await expect(firstInteractive).toBeVisible();

    // Verify focus ring styling is active
    await expect(firstInteractive).toHaveCSS('outline-style', /(solid|auto)/);

    // Press Escape to verify overlay dismissal if dialog/menu is open
    const dialog = page.locator('[role="dialog"]');
    if (await dialog.isVisible()) {
      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
    }
  });
});
```
