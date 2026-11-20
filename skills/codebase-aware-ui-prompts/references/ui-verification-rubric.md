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
Tier 4A: Automated Accessibility Scans (Axe-core rule audit, contrast calculations, ARIA syntax)
   ↓
Tier 4B: Manual & Semantic Conformance (WCAG 2.2 Level AA, keyboard navigation, screen readers)
   ↓
Tier 5: Runtime Browser & Responsive Validation (375px/768px/1280px, No layout shift, Zero console errors)
```

| Tier | Evaluation Gate | Verification Tool / Command | Pass Criteria |
| :--- | :--- | :--- | :--- |
| **Tier 1: Prompt Structure** | Checks that discovery findings, target paths, state checklist, and token invariants are specified. | Code review / AST inspection | All 7 discovery items present; no conflicting packages requested; mock data tagged `[MOCK_DATA]`. |
| **Tier 2: Type Compilation** | Verifies strict TypeScript type-checking without runtime type holes. | `npx tsc --noEmit` | Exit code 0; 0 type errors; props extend `React.HTMLAttributes`; no untyped `any`. |
| **Tier 3: Component States** | Verifies rendering of all applicable interaction and async states. | Storybook / React Testing Library | Loading skeleton renders during fetch; empty state displays when array is `[]`; error callout renders on rejection. |
| **Tier 4A: Automated A11y Scans** | Checks programmatic ARIA syntax, color contrast, and label associations. *(Note: Automated rule audits evaluate computable syntax and contrast only).* | `@axe-core/playwright` / Lighthouse | Zero automated axe violations across `wcag2a`, `wcag2aa`, `wcag21aa`, `wcag22aa`; color contrast ≥ 4.5:1. |
| **Tier 4B: Semantic Conformance** | Evaluates behavioral WCAG 2.2 Level AA criteria: keyboard flow, screen reader clarity, no traps. | Keyboard testing / Screen Reader (NVDA, VoiceOver) | Full keyboard operability; zero keyboard traps in in-page forms (WCAG 2.1.2); modal-only focus containment; clear status announcements. |
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

### Accessibility Criteria (WCAG 2.2 AA)
- [ ] All form fields have programmatically associated `<label>` elements via `htmlFor` / `id`.
- [ ] Validation errors are linked to their respective input fields via `aria-describedby` and marked with `aria-invalid="true"`.
- [ ] Modal dialogs and sheets trap keyboard focus, set `aria-modal="true"`, support `Escape` key closing, and return focus to the trigger upon unmount.
- [ ] In-page multi-step forms do NOT trap keyboard focus; document Tab order is preserved, and focus programmatically advances to the active step's heading or first interactive input.
- [ ] Non-modal popovers and menus do NOT trap keyboard focus; menus support Arrow-key navigation and Tab exits cleanly to the next document element.
- [ ] Automated accessibility scan (`axe-core`) passes with zero computable rule violations.
- [ ] Manual keyboard audit confirms full operability without mouse and absence of keyboard traps across all interactive paths.
- [ ] Interactive elements have minimum target sizes: 24×24px desktop, 44×44px mobile.

---

## 3. Automated Verification Fixtures

### A. Strict TypeScript Compilation Verification
```bash
# Verify zero compilation or type errors in the target component
npx tsc --noEmit --project tsconfig.json
```

### B. Playwright Automated Accessibility & Keyboard Focus Audit

The example fixture has an "Open settings" button and a modal named "Settings".
When the modal opens, focus moves to its first button, "Cancel". The last
focusable button is "Save". Adapt these selectors to the verified component.
```typescript
// e2e/component-a11y.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Component Accessibility & Keyboard Navigation', () => {
  // CRITICAL DISTINCTION: Automated Axe scans evaluate computable syntactic and structural rules only.
  // Zero Axe violations is a necessary baseline, but does NOT constitute verified WCAG 2.2 AA conformance.
  // Full conformance requires manual evaluation of screen reader announcements, cognitive flow, reading order, and focus management.
  test('Tier 4A: Zero automated rule violations (Axe-core rule audit)', async ({ page }) => {
    await page.goto('/components/feature-showcase');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Tier 4B: Modal opens from the keyboard, contains focus and restores it', async ({ page }) => {
    await page.goto('/components/feature-showcase');

    const trigger = page.getByRole('button', { name: 'Open settings' });
    await trigger.focus();
    await expect(trigger).toBeFocused();
    await page.keyboard.press('Enter');

    const modal = page.getByRole('dialog', { name: 'Settings' });
    await expect(modal).toBeVisible();
    await expect(modal).toHaveAttribute('aria-modal', 'true');

    const firstButton = modal.getByRole('button', { name: 'Cancel' });
    const lastButton = modal.getByRole('button', { name: 'Save' });
    await expect(firstButton).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(lastButton).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(firstButton).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(modal).toBeHidden();
    await expect(trigger).toBeFocused();
  });
});
```
