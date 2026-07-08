---
name: puppeteer-skill
description: 'Generates Puppeteer scripts for browser automation, scraping, and PDF generation. Triggers on: "Puppeteer", "headless Chrome", "page.goto", "scrape", "PDF generation".'
risk: unknown
source: https://github.com/LambdaTest/agent-skills/tree/main/puppeteer-skill
source_repo: LambdaTest/agent-skills
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/LambdaTest/agent-skills/blob/main/LICENSE
---

# Puppeteer Automation Skill
## When to Use

Use this skill when you need generates Puppeteer scripts for browser automation, scraping, and PDF generation. Triggers on: "Puppeteer", "headless Chrome", "page.goto", "scrape", "PDF generation".


## Core Patterns

### Basic Script

```javascript
const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    await page.goto('https://example.com', { waitUntil: 'networkidle0' });
    await page.type('#username', 'user@test.com');
    await page.type('#password', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0' });

    const title = await page.title();
    console.log('Title:', title);

    await browser.close();
})();
```

### Wait Strategies

```javascript
// Wait for selector
await page.waitForSelector('.result', { visible: true, timeout: 10000 });

// Wait for navigation
await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle0' }),
    page.click('a.nav-link'),
]);

// Wait for function
await page.waitForFunction('document.querySelector(".count").innerText === "5"');

// Wait for network request
const response = await page.waitForResponse(resp =>
    resp.url().includes('/api/data') && resp.status() === 200
);
```

### Screenshot & PDF

```javascript
await page.screenshot({ path: 'screenshot.png', fullPage: true });
await page.pdf({ path: 'page.pdf', format: 'A4', printBackground: true });
```

### Network Interception

```javascript
await page.setRequestInterception(true);
page.on('request', request => {
    if (request.resourceType() === 'image') request.abort();
    else request.continue();
});

// Mock API
page.on('request', request => {
    if (request.url().includes('/api/data')) {
        request.respond({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ items: [] }),
        });
    } else request.continue();
});
```

### TestMu AI Cloud

For full setup, capabilities, and shared capability reference, see [reference/cloud-integration.md](https://github.com/LambdaTest/agent-skills/tree/main/puppeteer-skill/reference/cloud-integration.md).

```javascript
const capabilities = {
    browserName: 'Chrome', browserVersion: 'latest',
    'LT:Options': {
        platform: 'Windows 11', build: 'Puppeteer Build',
        user: process.env.LT_USERNAME, accessKey: process.env.LT_ACCESS_KEY,
    },
};

const browser = await puppeteer.connect({
    browserWSEndpoint: `wss://cdp.lambdatest.com/puppeteer?capabilities=${encodeURIComponent(JSON.stringify(capabilities))}`,
});
```

## Quick Reference

| Task | Code |
|------|------|
| Launch headed | `puppeteer.launch({ headless: false })` |
| Evaluate JS | `await page.evaluate(() => document.title)` |
| Extract text | `await page.$eval('.el', el => el.textContent)` |
| Extract all | `await page.$$eval('.items', els => els.map(e => e.textContent))` |
| Set cookie | `await page.setCookie({ name: 'token', value: 'abc' })` |
| Emulate device | `await page.emulate(puppeteer.devices['iPhone 12'])` |

## Deep Patterns → `reference/playbook.md`

| § | Section | Lines |
|---|---------|-------|
| 1 | Production Setup & Configuration | Launch options, Jest integration |
| 2 | Page Object Pattern | BasePage, LoginPage, DashboardPage |
| 3 | Network Interception & Mocking | Request mock, response capture |
| 4 | Wait Strategies | DOM, network, custom conditions |
| 5 | Screenshots, PDF & Media | Full page, clip, PDF, video |
| 6 | Authentication & Cookies | API login, session save/restore |
| 7 | iFrame, Dialog & File Operations | Upload, download, dialogs |
| 8 | Performance & Metrics | Web Vitals, Lighthouse, coverage |
| 9 | Accessibility Testing | axe-core integration |
| 10 | CI/CD Integration | GitHub Actions, Docker |
| 11 | Debugging Quick-Reference | 11 common problems |
| 12 | Best Practices Checklist | 13 items |

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
