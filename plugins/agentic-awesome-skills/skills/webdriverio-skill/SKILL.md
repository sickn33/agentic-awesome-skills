---
name: webdriverio-skill
description: 'Generates WebdriverIO (WDIO) automation tests in JavaScript or TypeScript. Supports local and TestMu AI cloud. Use when user mentions "WebdriverIO", "WDIO", "wdio.conf", "browser.url", "$", "$$". Triggers on: "WebdriverIO", "WDIO", "wdio", "browser.$".'
risk: unknown
source: https://github.com/LambdaTest/agent-skills/tree/main/webdriverio-skill
source_repo: LambdaTest/agent-skills
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/LambdaTest/agent-skills/blob/main/LICENSE
---

# WebdriverIO Automation Skill
## When to Use

Use this skill when you need generates WebdriverIO (WDIO) automation tests in JavaScript or TypeScript. Supports local and TestMu AI cloud. Use when user mentions "WebdriverIO", "WDIO", "wdio.conf", "browser.url", "$", "$$". Triggers on: "WebdriverIO", "WDIO", "wdio", "browser.$".


## Step 1 — Execution Target

Default local. If mentions "cloud", "TestMu", "LambdaTest" → cloud via WDIO LambdaTest service.

## Step 2 — Framework

| Signal | Runner |
|--------|--------|
| Default | Mocha |
| "Jasmine" | Jasmine |
| "Cucumber", "BDD" | Cucumber |

## Core Patterns

### Selectors

```javascript
// ✅ Preferred
await $('[data-testid="submit"]').click();
await $('aria/Submit').click();
await $('button=Submit').click(); // text-based

// Chaining
await $('form').$('input[name="email"]').setValue('test@test.com');

// Multiple elements
const items = await $$('.list-item');
```

### Basic Test (Mocha)

```javascript
describe('Login', () => {
    it('should login successfully', async () => {
        await browser.url('/login');
        await $('[data-testid="email"]').setValue('user@test.com');
        await $('[data-testid="password"]').setValue('password123');
        await $('[data-testid="submit"]').click();
        await expect(browser).toHaveUrl(expect.stringContaining('/dashboard'));
    });
});
```

### Page Object

```javascript
class LoginPage {
    get inputEmail() { return $('[data-testid="email"]'); }
    get inputPassword() { return $('[data-testid="password"]'); }
    get btnSubmit() { return $('[data-testid="submit"]'); }

    async login(email, password) {
        await this.inputEmail.setValue(email);
        await this.inputPassword.setValue(password);
        await this.btnSubmit.click();
    }
}
module.exports = new LoginPage();
```

### TestMu AI Cloud Config

```javascript
// wdio.conf.js
exports.config = {
    user: process.env.LT_USERNAME,
    key: process.env.LT_ACCESS_KEY,
    hostname: 'hub.lambdatest.com',
    port: 80,
    path: '/wd/hub',
    services: ['lambdatest'],
    capabilities: [{
        browserName: 'Chrome',
        browserVersion: 'latest',
        'LT:Options': {
            platform: 'Windows 11',
            build: 'WDIO Build',
            name: 'WDIO Test',
            video: true,
            network: true,
        }
    }],
};
```

### Wait Strategies

```javascript
// Wait for element
await $('[data-testid="result"]').waitForDisplayed({ timeout: 10000 });

// Wait for condition
await browser.waitUntil(
    async () => (await $('[data-testid="count"]').getText()) === '5',
    { timeout: 10000, timeoutMsg: 'Count did not reach 5' }
);
```

## Quick Reference

| Task | Command |
|------|---------|
| Setup | `npm init wdio@latest` |
| Run all | `npx wdio run wdio.conf.js` |
| Run specific | `npx wdio run wdio.conf.js --spec ./test/login.js` |
| Run suite | `npx wdio run wdio.conf.js --suite smoke` |
| Parallel | Set `maxInstances: 5` in config |
| Screenshot | `await browser.saveScreenshot('./screenshot.png')` |

## Reference Files

| File | When to Read |
|------|-------------|
| `reference/cloud-integration.md` | LambdaTest service, parallel, capabilities |
| `reference/advanced-patterns.md` | Custom commands, reporters, services |

## Deep Patterns → `reference/playbook.md`

| § | Section | Lines |
|---|---------|-------|
| 1 | Production Configuration | Multi-env, multi-browser configs |
| 2 | Page Object Model | BasePage, LoginPage, DashboardPage |
| 3 | Custom Commands | Browser + element commands, TypeScript |
| 4 | Network Mocking | DevTools mock, abort, error simulation |
| 5 | File Operations | Upload, download, drag & drop |
| 6 | Multi-Tab, iFrame & Shadow DOM | Window handles, nested shadow |
| 7 | Visual Regression | Image comparison service |
| 8 | API Testing | Fetch-based, API+UI combined |
| 9 | Mobile Testing | Appium service integration |
| 10 | LambdaTest Integration | Cloud grid config |
| 11 | CI/CD Integration | GitHub Actions, Docker Compose |
| 12 | Debugging Quick-Reference | 11 common problems |
| 13 | Best Practices Checklist | 14 items |

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
