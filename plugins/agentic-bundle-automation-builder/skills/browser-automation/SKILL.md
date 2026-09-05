---
name: browser-automation
description: Build reliable browser checks using observed UI state, semantic locators, bounded waits, isolated test data and explicit outcome verification.
metadata:
  aas-risk: critical
  aas-source: vibeship-spawner-skills (Apache 2.0)
  aas-date-added: '2026-02-27'
---

# Browser Automation

Use the browser tool already selected by the user or installed in the project. Playwright, Puppeteer and Selenium have different integrations; choose from actual requirements rather than unsupported success-rate claims. Modified by AAS maintainers on 2026-09-05: removed unverified comparisons and bypass defaults, clarified waiting and evidence limits.

Separate tests of applications you control from interaction with an existing authenticated browser. Do not replace the latter with a fresh unauthenticated session or extract credentials to make an automation test work.

## Detailed Guide

Read [the detailed guide](references/detailed-guide.md) before executing this skill. It retains the complete procedure and reference material. Treat its safety, prerequisites, and validation requirements as mandatory. For focused work, load the relevant sections; for end-to-end work, read the guide completely.

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

## Good Examples (User-Facing)
"""
// By role - THE BEST CHOICE
await page.getByRole('button', { name: 'Submit' }).click();
await page.getByRole('link', { name: 'Sign up' }).click();
await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
await page.getByRole('textbox', { name: 'Search' }).fill('query');

// By text content
await expect(page.getByText('Welcome back')).toBeVisible();
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

## When to Use

Use to verify a real browser workflow, diagnose a UI timing failure or collect explicitly authorized page data. Inspect the current page and available tool APIs before selecting locators or actions.

## Worked example and prerequisites

Input: exporting a reviewed JSON file from a local web app. Have the app running, the intended browser available and a synthetic form value. Observe the export control, register the download event before clicking, inspect the downloaded JSON and confirm that editing the input invalidates the old preview. Expected: one file containing the reviewed value, with no hidden project data or network submission.

Use explicit desktop/mobile viewports and inspect keyboard/focus behavior when the task includes usability. A locked desktop leaves interactive verification pending; unit tests and headless probes are separate evidence.

## Limitations

- Auto-waiting checks actionability, not business correctness or successful backend writes.
- Screenshots, HTML, traces and auth-state files may contain private information; capture only the authorized scope.
- Retrying a read can be safe; retrying checkout, deletion or sending a message may duplicate a side effect. Verify state before repeating it.
- Resource blocking and mocked responses change the environment and cannot establish unmodified production behavior.
- Examples require the project’s imports, runner and fixture routes; no browser, service or account is installed by this skill.
