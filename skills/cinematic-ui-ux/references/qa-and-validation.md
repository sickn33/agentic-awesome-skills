# Quality Assurance, Acceptance Criteria & Illustrative Automated Testing

Measurable criteria, an application fixture outline, and illustrative Playwright checks for navigation and focus.

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

  test('Archive navigation clears the curtain and focuses the destination', async ({ page }) => {
    await page.goto('/');

    const curtain = page.locator('[data-transition-curtain="true"].transition-curtain');
    await expect(curtain).toHaveCSS('pointer-events', 'none');

    const navLink = page.getByRole('link', { name: 'Archive', exact: true });
    await expect(navLink).toBeVisible();
    await navLink.click();

    await expect(page).toHaveURL(/\/archive(?:[?#].*)?$/);
    await expect(curtain).toHaveAttribute('aria-hidden', 'true', { timeout: 6000 });
    await expect(page.locator('#app-root')).not.toHaveAttribute('inert');
    await expect(page.getByRole('main')).toBeFocused();
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

    // Verify wrap-around at both boundaries.
    await page.keyboard.press('Shift+Tab');
    await expect(nav.locator('a').last()).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(firstLink).toBeFocused();

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

## 2. Application Fixture Outline

Assemble this fixture in a project before running the tests. The reference
bundle contains illustrative snippets. It does not include a configured Next.js
application, Playwright runner, or working asset set.

Render a link with accessible name "Archive" on the home page and a `main`
landmark on the archive page. Keep the transition curtain and `#app-root`
behavior aligned with the documented providers.

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

### Verification Commands for the Assembled Fixture
```bash
# 1. Install dependencies
pnpm install

# 2. Verify TypeScript strict type-checking
pnpm tsc --noEmit

# 3. Execute End-to-End Motion Test Suite
pnpm test:e2e
```
