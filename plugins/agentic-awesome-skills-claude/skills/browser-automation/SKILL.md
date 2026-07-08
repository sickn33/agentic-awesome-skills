---
name: browser-automation
description: Browser automation powers web testing, scraping, and AI agent
  interactions. The difference between a flaky script and a reliable system
  comes down to understanding selectors, waiting strategies, and anti-detection
  patterns.
risk: unknown
source: vibeship-spawner-skills (Apache 2.0)
date_added: 2026-02-27
---

# Browser Automation

Browser automation powers web testing, scraping, and AI agent interactions.
The difference between a flaky script and a reliable system comes down to
understanding selectors, waiting strategies, and anti-detection patterns.

This skill covers Playwright (recommended) and Puppeteer, with patterns for
testing, scraping, and agentic browser control. Key insight: Playwright won
the framework war. Unless you need Puppeteer's stealth ecosystem or are
Chrome-only, Playwright is the better choice in 2025.

Critical distinction: Testing automation (predictable apps you control) vs
scraping/agent automation (unpredictable sites that fight back). Different
problems, different solutions.

## Principles

- Use user-facing locators (getByRole, getByText) over CSS/XPath
- Never add manual waits - Playwright's auto-wait handles it
- Each test/task should be fully isolated with fresh context
- Screenshots and traces are your debugging lifeline
- Headless for CI, headed for debugging
- Anti-detection is cat-and-mouse - stay current or get blocked

## Capabilities

- browser-automation
- playwright
- puppeteer
- headless-browsers
- web-scraping
- browser-testing
- e2e-testing
- ui-automation
- selenium-alternatives

## Scope

- api-testing → backend
- load-testing → performance-thinker
- accessibility-testing → accessibility-specialist
- visual-regression-testing → ui-design

## Tooling

### Frameworks

- Playwright - When: Default choice - cross-browser, auto-waiting, best DX Note: 96% success rate, 4.5s avg execution, Microsoft-backed
- Puppeteer - When: Chrome-only, need stealth plugins, existing codebase Note: 75% success rate at scale, but best stealth ecosystem
- Selenium - When: Legacy systems, specific language bindings Note: Slower, more verbose, but widest browser support

### Stealth_tools

- puppeteer-extra-plugin-stealth - When: Need to bypass bot detection with Puppeteer Note: Gold standard for anti-detection
- playwright-extra - When: Stealth plugins for Playwright Note: Port of puppeteer-extra ecosystem
- undetected-chromedriver - When: Selenium anti-detection Note: Dynamic bypass of detection

### Cloud_browsers

- Browserbase - When: Managed headless infrastructure Note: Built-in stealth mode, session management
- BrowserStack - When: Cross-browser testing at scale Note: Real devices, CI integration

## Patterns

### Test Isolation Pattern

Each test runs in complete isolation with fresh state

**When to use**: Testing, any automation that needs reproducibility

# TEST ISOLATION:

"""
Each test gets its own:
- Browser context (cookies, storage)
- Fresh page
- Clean state
"""

## Playwright Test Example
"""
import { test, expect } from '@playwright/test';

// Each test runs in isolated browser context
test('user can add item to cart', async ({ page }) => {
  // Fresh context - no cookies, no storage from other tests
  await page.goto('/products');
  await page.getByRole('button', { name: 'Add to Cart' }).click();
  await expect(page.getByTestId('cart-count')).toHaveText('1');
});

test('user can remove item from cart', async ({ page }) => {
  // Completely isolated - cart is empty
  await page.goto('/cart');
  await expect(page.getByText('Your cart is empty')).toBeVisible();
});
"""

## Shared Authentication Pattern
"""
// Save auth state once, reuse across tests
// setup.ts
import { test as setup } from '@playwright/test';

setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('user@example.com');
  await page.getByLabel('Password').fill('password');
  await page.getByRole('button', { name: 'Sign in' }).click();

  // Wait for auth to complete
  await page.waitForURL('/dashboard');

  // Save authentication state
  await page.context().storageState({
    path: './playwright/.auth/user.json'
  });
});

// playwright.config.ts
export default defineConfig({
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'tests',
      dependencies: ['setup'],
      use: {
        storageState: './playwright/.auth/user.json',
      },
    },
  ],
});
"""

### User-Facing Locator Pattern

Select elements the way users see them

**When to use**: Always - the default approach for selectors

# USER-FACING LOCATORS:

"""
Priority order:
1. getByRole  - Best: matches accessibility tree
2. getByText  - Good: matches visible content
3. getByLabel - Good: matches form labels
4. getByTestId - Fallback: explicit test contracts
5. CSS/XPath - Last resort: fragile, avoid
"""

## Good Examples (User-Facing)
"""
// By role - THE BEST CHOICE
await page.getByRole('button', { name: 'Submit' }).click();
await page.getByRole('link', { name: 'Sign up' }).click();
await page.getByRole('heading', { name: 'Dashboard' }).isVisible();
await page.getByRole('textbox', { name: 'Search' }).fill('query');

// By text content
await page.getByText('Welcome back').isVisible();
await page.getByText(/Order #\d+/).click();  // Regex supported

// By label (forms)
await page.getByLabel('Email address').fill('user@example.com');
await page.getByLabel('Password').fill('secret');

// By placeholder
await page.getByPlaceholder('Search...').fill('query');

// By test ID (when no user-facing option works)
await page.getByTestId('submit-button').click();
"""

## Bad Examples (Fragile)
"""
// DON'T - CSS selectors tied to structure
await page.locator('.btn-primary.submit-form').click();
await page.locator('#header > div > button:nth-child(2)').click();

// DON'T - XPath tied to structure
await page.locator('//div[@class="form"]/button[1]').click();

// DON'T - Auto-generated selectors
await page.locator('[data-v-12345]').click();
"""

## Filtering and Chaining
"""
// Filter by containing text
await page.getByRole('listitem')
  .filter({ hasText: 'Product A' })
  .getByRole('button', { name: 'Add to cart' })
  .click();

// Filter by NOT containing
await page.getByRole('listitem')
  .filter({ hasNotText: 'Sold out' })
  .first()
  .click();

// Chain locators
const row = page.getByRole('row', { name: 'John Doe' });
await row.getByRole('button', { name: 'Edit' }).click();
"""

### Auto-Wait Pattern

Let Playwright wait automatically, never add manual waits

**When to use**: Always with Playwright

# AUTO-WAIT PATTERN:

"""
Playwright waits automatically for:
- Element to be attached to DOM
- Element to be visible
- Element to be stable (not animating)
- Element to receive events
- Element to be enabled

NEVER add manual waits!
"""

## Wrong - Manual Waits
"""
// DON'T DO THIS
await page.goto('/dashboard');
await page.waitForTimeout(2000);  // NO! Arbitrary wait
await page.click('.submit-button');

// DON'T DO THIS
await page.waitForSelector('.loading-spinner', { state: 'hidden' });
await page.waitForTimeout(500);  // "Just to be safe" - NO!
"""

## Correct - Let Auto-Wait Work
"""
// Auto-waits for button to be clickable
await page.getByRole('button', { name: 'Submit' }).click();

// Auto-waits for text to appear
await expect(page.getByText('Success!')).toBeVisible();

// Auto-waits for navigation to complete
await page.goto('/dashboard');
// Page is ready - no manual wait needed
"""

## When You DO Need to Wait
"""
// Wait for specific network request
const responsePromise = page.waitForResponse(
  response => response.url().includes('/api/data')
);
await page.getByRole('button', { name: 'Load' }).click();
const response = await responsePromise;

// Wait for URL change
await Promise.all([
  page.waitForURL('**/dashboard'),
  page.getByRole('button', { name: 'Login' }).click(),
]);

// Wait for download
const downloadPromise = page.waitForEvent('download');
await page.getByText('Export CSV').click();
const download = await downloadPromise;
"""

### Stealth Browser Pattern

Avoid bot detection for scraping

**When to use**: Scraping sites with anti-bot protection

# STEALTH BROWSER PATTERN:

"""
Bot detection checks for:
- navigator.webdriver property
- Chrome DevTools protocol artifacts
- Browser fingerprint inconsistencies
- Behavioral patterns (perfect timing, no mouse movement)
- Headless indicators
"""

## Puppeteer Stealth (Best Anti-Detection)
"""
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const browser = await puppeteer.launch({
  headless: 'new',
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-blink-features=AutomationControlled',
  ],
});

const page = await browser.newPage();

// Set realistic viewport
await page.setViewport({ width: 1920, height: 1080 });

// Realistic user agent
await page.setUserAgent(
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
);

// Navigate with human-like behavior
await page.goto('https://target-site.com', {
  waitUntil: 'networkidle0',
});
"""

## Playwright Stealth
"""
import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';

chromium.use(stealth());

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  userAgent: 'Mozilla/5.0 ...',
  locale: 'en-US',
  timezoneId: 'America/New_York',
});
"""

## Human-Like Behavior
"""
// Random delays between actions
const randomDelay = (min: number, max: number) =>
  new Promise(r => setTimeout(r, Math.random() * (max - min) + min));

await page.goto(url);
await randomDelay(500, 1500);

// Mouse movement before click
const button = await page.$('button.submit');
const box = await button.boundingBox();
await page.mouse.move(
  box.x + box.width / 2,
  box.y + box.height / 2,
  { steps: 10 }  // Move in steps like a human
);
await randomDelay(100, 300);
await button.click();

// Scroll naturally
await page.evaluate(() => {
  window.scrollBy({
    top: 300 + Math.random() * 200,
    behavior: 'smooth'
  });
});
"""

### Error Recovery Pattern

Handle failures gracefully with screenshots and retries

**When to use**: Any production automation

# ERROR RECOVERY PATTERN:

## Automatic Screenshot on Failure
"""
// playwright.config.ts
export default defineConfig({
  use: {
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  retries: 2,  // Retry failed tests
});
"""

## Try-Catch with Debug Info
"""
async function scrapeProduct(page: Page, url: string) {
  try {
    await page.goto(url, { timeout: 30000 });

    const title = await page.getByRole('heading', { level: 1 }).textContent();
    const price = await page.getByTestId('price').textContent();

    return { title, price, success: true };

  } catch (error) {
    // Capture debug info
    const screenshot = await page.screenshot({
      path: `errors/${Date.now()}-error.png`,
      fullPage: true
    });

    const html = await page.content();
    await fs.writeFile(`errors/${Date.now()}-page.html`, html);

    console.error({
      url,
      error: error.message,
      currentUrl: page.url(),
    });

    return { success: false, error: error.message };
  }
}
"""

## Retry with Exponential Backoff
"""
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        const jitter = delay * 0.1 * Math.random();
        await new Promise(r => setTimeout(r, delay + jitter));
      }
    }
  }

  throw lastError;
}

// Usage
const result = await withRetry(
  () => scrapeProduct(page, url),
  3,
  2000
);
"""

### Parallel Execution Pattern

Run tests/tasks in parallel for speed

**When to use**: Multiple independent pages or tests

# PARALLEL EXECUTION:

## Playwright Test Parallelization
"""
// playwright.config.ts
export default defineConfig({
  fullyParallel: true,
  workers: process.env.CI ? 4 : undefined,  // CI: 4 workers, local: CPU-based

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
"""

## Browser Contexts for Parallel Scraping
"""
const browser = await chromium.launch();

const urls = ['url1', 'url2', 'url3', 'url4', 'url5'];

// Create multiple contexts - each is isolated
const results = await Promise.all(
  urls.map(async (url) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto(url);
      const data = await extractData(page);
      return { url, data, success: true };
    } catch (error) {
      return { url, error: error.message, success: false };
    } finally {
      await context.close();
    }
  })
);

await browser.close();
"""

## Rate-Limited Parallel Processing
"""
import pLimit from 'p-limit';

const limit = pLimit(5);  // Max 5 concurrent

const results = await Promise.all(
  urls.map(url => limit(async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Random delay between requests
    await new Promise(r => setTimeout(r, Math.random() * 2000));

    try {
      return await scrapePage(page, url);
    } finally {
      await context.close();
    }
  }))
);
"""

### Network Interception Pattern

Mock, block, or modify network requests

**When to use**: Testing, blocking ads/analytics, modifying responses

# NETWORK INTERCEPTION:

## Block Unnecessary Resources
"""
await page.route('**/*', (route) => {
  const url = route.request().url();
  const resourceType = route.request().resourceType();

  // Block images, fonts, analytics for faster scraping
  if (['image', 'font', 'media'].includes(resourceType)) {
    return route.abort();
  }

  // Block tracking/analytics
  if (url.includes('google-analytics') ||
      url.includes('facebook.com/tr')) {
    return route.abort();
  }

  return route.continue();
});
"""

## Mock API Responses (Testing)
"""
await page.route('**/api/products', async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([
      { id: 1, name: 'Mock Product', price: 99.99 },
    ]),
  });
});

// Now page will receive mocked data
await page.goto('/products');
"""

## Capture API Responses
"""
const apiResponses: any[] = [];

page.on('response', async (response) => {
  if (response.url().includes('/api/')) {
    const data = await response.json().catch(() => null);
    apiResponses.push({
      url: response.url(),
      status: response.status(),
      data,
    });
  }
});

await page.goto('/dashboard');
// apiResponses now contains all API calls
"""

## Sharp Edges

### Using waitForTimeout Instead of Proper Waits

Severity: CRITICAL

Situation: Waiting for elements or page state

Symptoms:
Tests pass locally, fail in CI. Pass 9 times, fail on the 10th.
"Element not found" errors that seem random. Tests take 30+ seconds
when they should take 3.

Why this breaks:
waitForTimeout is a fixed delay. If the page loads in 500ms, you wait
2000ms anyway. If the page takes 2100ms (CI is slower), you fail.
There's no correct value - it's always either too short or too long.

Recommended fix:

# REMOVE all waitForTimeout calls

# WRONG:
await page.goto('/dashboard');
await page.waitForTimeout(2000);  # Arbitrary!
await page.click('.submit');

# CORRECT - Auto-wait handles it:
await page.goto('/dashboard');
await page.getByRole('button', { name: 'Submit' }).click();

# If you need to wait for specific condition:
await expect(page.getByText('Dashboard')).toBeVisible();
await page.waitForURL('**/dashboard');
await page.waitForResponse(resp => resp.url().includes('/api/data'));

# For animations, wait for element to be stable:
await page.getByRole('button').click();  # Auto-waits for stable

# NEVER use setTimeout or waitForTimeout in production code

### CSS Selectors Tied to Styling Classes

Severity: HIGH

Situation: Selecting elements for interaction

Symptoms:
Tests break after CSS refactoring. Selectors like .btn-primary stop
working. Frontend redesign breaks all tests without changing behavior.

Why this breaks:
CSS class names are implementation details for styling, not semantic
meaning. When designers change from .btn-primary to .button--primary,
your tests break even though behavior is identical.

Recommended fix:

# Use user-facing locators instead:

# WRONG - Tied to CSS:
await page.locator('.btn-primary.submit-form').click();
await page.locator('#sidebar > div.menu > ul > li:nth-child(3)').click();

# CORRECT - User-facing:
await page.getByRole('button', { name: 'Submit' }).click();
await page.getByRole('menuitem', { name: 'Settings' }).click();

# If you must use CSS, use data-testid:
<button data-testid="submit-order">Submit</button>

await page.getByTestId('submit-order').click();

# Locator priority:
# 1. getByRole - matches accessibility
# 2. getByText - matches visible content
# 3. getByLabel - matches form labels
# 4. getByTestId - explicit test contract
# 5. CSS/XPath - last resort only

### navigator.webdriver Exposes Automation

Severity: HIGH

Situation: Scraping sites with bot detection

Symptoms:
Immediate 403 errors. CAPTCHA challenges. Empty pages. "Access Denied"
messages. Works for 1 request, then gets blocked.

Why this breaks:
By default, headless browsers set navigator.webdriver = true. This is
the first thing bot detection checks. It's a bright red flag that
says "I'm automated."

Recommended fix:

# Use stealth plugins:

### Puppeteer Stealth (best option):
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--disable-blink-features=AutomationControlled'],
});

### Playwright Stealth:
import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';

chromium.use(stealth());

### Manual (partial):
await page.evaluateOnNewDocument(() => {
  Object.defineProperty(navigator, 'webdriver', {
    get: () => undefined,
  });
});

# Note: This is cat-and-mouse. Detection evolves.
# For serious scraping, consider managed solutions like Browserbase.

### Tests Share State and Affect Each Other

Severity: HIGH

Situation: Running multiple tests in sequence

Symptoms:
Tests pass individually but fail when run together. Order matters -
test B fails if test A runs first. Random failures that "fix themselves"
on rerun.

Why this breaks:
Shared browser context means shared cookies, localStorage, and session
state. Test A logs in, test B expects logged-out state. Test A adds
item to cart, test B's cart count is wrong.

Recommended fix:

# Each test must be fully isolated:

### Playwright Test (automatic isolation):
test('first test', async ({ page }) => {
  // Fresh context, fresh page
});

test('second test', async ({ page }) => {
  // Completely isolated from first test
});

### Manual isolation:
const context = await browser.newContext();  // Fresh context
const page = await context.newPage();
// ... test code ...
await context.close();  // Clean up

## Shared authentication (the right way):
// 1. Save auth state to file
await context.storageState({ path: './auth.json' });

// 2. Reuse in other tests
const context = await browser.newContext({
  storageState: './auth.json'
});

# Never modify global state in tests
# Never rely on previous test's actions

### No Trace Capture for CI Failures

Severity: MEDIUM

Situation: Debugging test failures in CI

Symptoms:
"Test failed in CI" with no useful information. Can't reproduce
locally. Screenshot shows page but not what went wrong. Guessing
at root cause.

Why this breaks:
CI runs headless on different hardware. Timing is different. Network
is different. Without traces, you can't see what actually happened -
the sequence of actions, network requests, console logs.

Recommended fix:

# Enable traces for failures:

### playwright.config.ts:
export default defineConfig({
  use: {
    trace: 'retain-on-failure',    # Keep trace on failure
    screenshot: 'only-on-failure', # Screenshot on failure
    video: 'retain-on-failure',    # Video on failure
  },
  outputDir: './test-results',
});

### View trace locally:
npx playwright show-trace test-results/path/to/trace.zip

### In CI, upload test-results as artifact:
# GitHub Actions:
- uses: actions/upload-artifact@v3
  if: failure()
  with:
    name: playwright-traces
    path: test-results/

# Trace shows:
# - Timeline of actions
# - Screenshots at each step
# - Network requests and responses
# - Console logs
# - DOM snapshots

### Tests Pass Headed but Fail Headless

Severity: MEDIUM

Situation: Running tests in headless mode for CI

Symptoms:
Works perfectly when you watch it. Fails mysteriously in CI.
"Element not visible" in headless but visible in headed mode.

Why this breaks:
Headless browsers have no display, which affects some CSS (visibility
calculations), viewport sizing, and font rendering. Some animations
behave differently. Popup windows may not work.

Recommended fix:

# Set consistent viewport:
const browser = await chromium.launch({
  headless: true,
});

const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
});

# Or in config:
export default defineConfig({
  use: {
    viewport: { width: 1280, height: 720 },
  },
});

# Debug headless failures:
# 1. Run with headed mode locally
npx playwright test --headed

# 2. Slow down to watch
npx playwright test --headed --slowmo 100

# 3. Use trace viewer for CI failures
npx playwright show-trace trace.zip

# 4. For stubborn issues, screenshot at failure point:
await page.screenshot({ path: 'debug.png', fullPage: true });

### Getting Blocked by Rate Limiting

Severity: HIGH

Situation: Scraping multiple pages quickly

Symptoms:
Works for first 50 pages, then 429 errors. Suddenly all requests fail.
IP gets blocked. CAPTCHA starts appearing after successful requests.

Why this breaks:
Sites monitor request patterns. 100 requests per second from one IP
is obviously automated. Rate limits protect servers and catch scrapers.

Recommended fix:

# Add delays between requests:

const randomDelay = () =>
  new Promise(r => setTimeout(r, 1000 + Math.random() * 2000));

for (const url of urls) {
  await randomDelay();  // 1-3 second delay
  await page.goto(url);
  // ... scrape ...
}

# Use rotating proxies:
const proxies = ['http://proxy1:8080', 'http://proxy2:8080'];
let proxyIndex = 0;

const getNextProxy = () => proxies[proxyIndex++ % proxies.length];

const context = await browser.newContext({
  proxy: { server: getNextProxy() },
});

# Limit concurrent requests:
import pLimit from 'p-limit';
const limit = pLimit(3);  // Max 3 concurrent

await Promise.all(
  urls.map(url => limit(() => scrapePage(url)))
);

# Rotate user agents:
const userAgents = [
  'Mozilla/5.0 (Windows...',
  'Mozilla/5.0 (Macintosh...',
];

await page.setExtraHTTPHeaders({
  'User-Agent': userAgents[Math.floor(Math.random() * userAgents.length)]
});

### New Windows/Popups Not Handled

Severity: MEDIUM

Situation: Clicking links that open new windows

Symptoms:
Click button, nothing happens. Test hangs. "Window not found" errors.
Actions succeed but verification fails because you're on wrong page.

Why this breaks:
target="_blank" links open new windows. Your page reference still
points to the original page. The new window exists but you're not
listening for it.

Recommended fix:

# Wait for popup BEFORE triggering it:

### New window/tab:
const pagePromise = context.waitForEvent('page');
await page.getByRole('link', { name: 'Open in new tab' }).click();
const newPage = await pagePromise;
await newPage.waitForLoadState();

// Now interact with new page
await expect(newPage.getByRole('heading')).toBeVisible();

// Close when done
await newPage.close();

### Popup windows:
const popupPromise = page.waitForEvent('popup');
await page.getByRole('button', { name: 'Open popup' }).click();
const popup = await popupPromise;
await popup.waitForLoadState();

### Multiple windows:
const pages = context.pages();  // Get all open pages

### Can't Interact with Elements in iframes

Severity: MEDIUM

Situation: Page contains embedded iframes

Symptoms:
Element clearly visible but "not found". Selector works in DevTools
but not in Playwright. Parent page selectors work, iframe content
doesn't.

Why this breaks:
iframes are separate documents. page.locator only searches the main
frame. You need to explicitly get the iframe's frame to interact
with its contents.

Recommended fix:

# Get frame by name or selector:

### By frame name:
const frame = page.frame('payment-iframe');
await frame.getByRole('textbox', { name: 'Card number' }).fill('4242...');

## By selector:
const frame = page.frameLocator('iframe#payment');
await frame.getByRole('textbox', { name: 'Card number' }).fill('4242...');

### Nested iframes:
const outer = page.frameLocator('iframe#outer');
const inner = outer.frameLocator('iframe#inner');
await inner.getByRole('button').click();

### Wait for iframe to load:
await page.waitForSelector('iframe#payment');
const frame = page.frameLocator('iframe#payment');
await frame.getByText('Secure Payment').waitFor();

## Validation Checks

### Using waitForTimeout

Severity: ERROR

waitForTimeout causes flaky tests and slow execution

Message: Using waitForTimeout - remove it. Playwright auto-waits for elements. Use waitForResponse, waitForURL, or assertions instead.

### Using setTimeout in Test Code

Severity: WARNING

setTimeout is unreliable for timing in tests

Message: Using setTimeout instead of Playwright waits. Replace with await expect(...).toBeVisible() or page.waitFor*.

### Custom Sleep Function

Severity: WARNING

Sleep functions indicate improper waiting strategy

Message: Custom sleep function detected. Use Playwright's built-in waiting mechanisms instead.

### CSS Class Selector Used

Severity: WARNING

CSS class selectors are fragile

Message: Using CSS class selector. Prefer getByRole, getByText, getByLabel, or getByTestId for more stable selectors.

### nth-child CSS Selector

Severity: WARNING

Position-based selectors are very fragile

Message: Using position-based selector. These break when DOM order changes. Use user-facing locators instead.

### XPath Selector Used

Severity: INFO

XPath should be last resort

Message: Using XPath selector. Consider getByRole, getByText first. XPath should be last resort for complex DOM traversal.

### Auto-Generated Selector

Severity: WARNING

Framework-generated selectors are extremely fragile

Message: Using auto-generated selector. These change on every build. Use data-testid instead.

### Puppeteer Without Stealth Plugin

Severity: INFO

Scraping without stealth is easily detected

Message: Using Puppeteer without stealth plugin. Consider puppeteer-extra-plugin-stealth for anti-detection.

### navigator.webdriver Not Hidden

Severity: INFO

navigator.webdriver exposes automation

Message: Launching browser without hiding automation flags. For scraping, add stealth measures.

### Scraping Loop Without Error Handling

Severity: WARNING

One failure shouldn't crash entire scrape

Message: Scraping loop without try/catch. One page failure will crash the entire scrape. Add error handling.

## Collaboration

### Delegation Triggers

- user needs full desktop control beyond browser -> computer-use-agents (Desktop automation for non-browser apps)
- user needs API testing alongside browser tests -> backend (API integration and testing patterns)
- user needs testing strategy -> test-architect (Overall test architecture decisions)
- user needs visual regression testing -> ui-design (Visual comparison and design validation)
- user needs browser automation in workflows -> workflow-automation (Durable execution for browser tasks)
- user building browser tools for agents -> agent-tool-builder (Tool design patterns for LLM agents)

## Related Skills

Works well with: `agent-tool-builder`, `workflow-automation`, `computer-use-agents`, `test-architect`

## When to Use
- User mentions or implies: playwright
- User mentions or implies: puppeteer
- User mentions or implies: browser automation
- User mentions or implies: headless
- User mentions or implies: web scraping
- User mentions or implies: e2e test
- User mentions or implies: end-to-end
- User mentions or implies: selenium
- User mentions or implies: chromium
- User mentions or implies: browser test
- User mentions or implies: page.click
- User mentions or implies: locator

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
