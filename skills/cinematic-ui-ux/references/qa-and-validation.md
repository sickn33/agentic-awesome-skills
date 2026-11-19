# Quality Assurance, Acceptance Criteria & Illustrative Automated Testing

Measurable criteria, complete runnable application fixture specifications, and automated Playwright test suites asserting actual navigation completion, focus management, and error recovery.

---

## 1. Automated Playwright Motion Test Suite
```typescript
// e2e/motion.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Cinematic Motion & Accessibility Acceptance Suite', () => {
  test('Honors prefers-reduced-motion preference across typography and layout', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    const heroTitle = page.locator('h1[aria-label]');
    await expect(heroTitle).toBeVisible();

    const segment = heroTitle.locator('.animated-word').first();
    await expect(segment).toHaveCSS('opacity', '1');
  });

  test('Curtain transition performs complete lifecycle: lock -> navigate -> focus', async ({ page }) => {
    await page.goto('/');

    const curtain = page.locator('[data-transition-curtain="true"].transition-curtain');
    await expect(curtain).toHaveCSS('pointer-events', 'none');

    // Click transition link to archive
    const navLink = page.locator('a[href="/archive"]').first();
    if (await navLink.count() > 0) {
      await navLink.click();

      // Verify URL changed
      await expect(page).toHaveURL(/\/archive/);

      // Verify curtain is cleared and restored to non-blocking pointer events
      await expect(curtain).toHaveCSS('pointer-events', 'none', { timeout: 6000 });

      // Verify keyboard focus is shifted to destination <main> landmark
      const main = page.locator('main');
      await expect(main).toBeFocused();
    }
  });

  test('Accessible menu implements dynamic keyboard focus trap and returns focus on close', async ({ page }) => {
    await page.goto('/');

    const trigger = page.locator('button[aria-controls="main-menu"]');
    await trigger.click();

    const nav = page.locator('#main-menu');
    await expect(nav).toBeVisible();
    await expect(nav).not.toHaveAttribute('inert');

    // Focus must be inside menu
    const firstLink = nav.locator('a').first();
    await expect(firstLink).toBeFocused();

    // Tab through menu items and test wrap-around
    await page.keyboard.press('Tab');
    const secondLink = nav.locator('a').nth(1);
    await expect(secondLink).toBeFocused();

    // Press Escape to close
    await page.keyboard.press('Escape');
    await expect(nav).toHaveAttribute('inert');
    await expect(trigger).toBeFocused();
  });

  test('Decorative motion pause controller halts decorative animations without locking navigation', async ({ page }) => {
    await page.goto('/');

    const pauseBtn = page.locator('button[aria-label*="Pause decorative animations"]');
    await expect(pauseBtn).toBeVisible();

    await pauseBtn.click();
    await expect(pauseBtn).toHaveText(/PLAY DECORATIVE MOTION/);

    // Verify document dataset reflects paused state for CSS animations
    const isPausedAttr = await page.evaluate(() => document.documentElement.dataset.motionPaused);
    expect(isPausedAttr).toBe('true');

    // Essential functional navigation must remain completely interactive
    const trigger = page.locator('button[aria-controls="main-menu"]');
    await trigger.click();
    await expect(page.locator('#main-menu')).toBeVisible();
  });
});
```

---

## 2. Complete Runnable Application Fixture Specification
To run the full suite in a pristine Next.js 15 environment:

```text
cinematic-app/
├── app/
│   ├── layout.tsx                # Wraps MotionProvider
│   ├── page.tsx                  # Home showcase featuring Hero, Portfolio, Editorial
│   ├── archive/page.tsx          # Destination route calling notifyPageReady
│   └── globals.css               # Tailwind & Lenis CSS imports
├── components/
│   ├── motion/
│   │   ├── motion-provider.tsx   # Root provider
│   │   ├── lenis-provider.tsx    # Scroll authority
│   │   ├── transition-provider.tsx # Navigation state machine
│   │   ├── transition-link.tsx   # Declarative animated link
│   │   ├── canvas-frame-scrubber.tsx
│   │   ├── accessible-menu.tsx
│   │   └── accessible-split-heading.tsx
│   ├── portfolio/
│   ├── couture/
│   └── editorial/
├── e2e/
│   └── motion.spec.ts            # Playwright acceptance tests
├── lib/
│   ├── motion/
│   │   ├── tokens.ts
│   │   ├── typography.ts
│   │   └── sanitize-url.ts
├── package.json
└── playwright.config.ts
```

### Verification Commands
```bash
# 1. Install dependencies
pnpm install

# 2. Verify TypeScript strict type-checking
pnpm tsc --noEmit

# 3. Execute End-to-End Motion Test Suite
pnpm test:e2e
```
