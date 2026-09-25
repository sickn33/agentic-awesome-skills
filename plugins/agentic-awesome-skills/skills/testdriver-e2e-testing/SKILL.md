---
name: testdriver-e2e-testing
description: "Build E2E tests with TestDriver.ai, the AI code reviewer that runs every pull request in a real desktop sandbox, finds bugs, and builds regression tests"
category: testing
risk: safe
source: community
source_repo: testdriverai/testdriverai
source_type: official
date_added: "2026-09-24"
author: testdriverai
tags: [testing, e2e, qa, automation, computer-use]
tools: [claude, cursor, gemini]
license: "Apache-2.0"
license_source: "https://github.com/testdriverai/testdriverai/blob/main/LICENSE"
---

# TestDriver End-to-End Testing

## Overview

[TestDriver](https://testdriver.ai) is an AI code reviewer that actually runs your app. It automatically runs every pull request in a real desktop sandbox, finds bugs, and builds regression tests. Tests control browsers and native applications using natural language element descriptions and AI vision, and run as Vitest suites. This skill teaches an agent how to author, run, and debug TestDriver tests.

## When to Use This Skill

- Use when you need to write an end-to-end test for a web or desktop application
- Use when automating a UI workflow that has no stable selectors (canvas, Electron, native apps)
- Use when the user asks to verify that a page or flow works ("check if the login page works")
- Use when debugging a failing TestDriver test

## How It Works

### Step 1: Set up the project

```bash
npx testdriverai init
```

This scaffolds `package.json`, example tests, `vitest.config.mjs`, and a GitHub Actions workflow. The user must set `TD_API_KEY` in `.env` (get a key at https://console.testdriver.ai/team).

### Step 2: Write a test

Tests are Vitest suites using the TestDriver hooks:

```javascript
import { describe, expect, it } from "vitest";
import { TestDriver } from "testdriverai/vitest/hooks";

describe("Login", () => {
  it("signs in successfully", async (context) => {
    const testdriver = TestDriver(context);
    await testdriver.provision.chrome({ url: "https://example.com/login" });

    const email = await testdriver.find("email input field");
    await email.click();
    await testdriver.type("user@example.com");

    const submit = await testdriver.find("Sign In button");
    await submit.click();

    const result = await testdriver.assert("the dashboard is visible");
    expect(result).toBeTruthy();
  });
});
```

### Step 3: Run and iterate

```bash
vitest run tests/login.test.mjs
```

Screenshots are captured automatically before and after every command and saved to `.testdriver/screenshots/`, named with the source line number for easy debugging.

## Examples

### Example 1: Testing a desktop (Electron) app

```javascript
await testdriver.provision.electron({ appPath: "./dist/my-app" });
const menu = await testdriver.find("File menu in the menu bar");
await menu.click();
```

### Example 2: Waiting for slow elements

```javascript
const done = await testdriver.find("Loading complete indicator", { timeout: 30000 });
await done.click();
```

## Best Practices

- ✅ Use specific element descriptions ("blue Sign In button in the header", not "button")
- ✅ Set both `testTimeout` and `hookTimeout` to 900000 in `vitest.config.mjs`
- ✅ Add `assert()` calls for verifiable pass/fail conditions
- ✅ Always `await` every TestDriver call
- ❌ Do not use `npx vitest`; run `vitest run` directly
- ❌ Do not rely on CSS selectors; TestDriver locates elements visually

## Limitations

- Requires a TestDriver API key (`TD_API_KEY`) and network access to provision sandboxes.
- Only works with Vitest as the test runner.
- This skill does not replace environment-specific validation, testing, or expert review.

## Security & Safety Notes

- `npx testdriverai init` writes project files to the current directory; run it only in a project you intend to modify.
- The `TD_API_KEY` credential belongs in `.env` (gitignored by the scaffold). Never commit it.
- Tests execute inside an isolated remote sandbox, not on the local machine.

## Common Pitfalls

- **Problem:** Cleanup hooks fail with a 10s timeout.
  **Solution:** Set `hookTimeout: 900000` in `vitest.config.mjs`; sandbox teardown and recording uploads take longer than Vitest's default.
- **Problem:** Scrolling does nothing.
  **Solution:** An input field has focus. Press Escape or click the page background first, then scroll.

## Related Skills

- `@webapp-testing` - Playwright-based alternative for local web apps with stable DOM selectors
