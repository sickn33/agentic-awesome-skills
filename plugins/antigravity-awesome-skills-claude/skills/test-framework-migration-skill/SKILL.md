---
name: test-framework-migration-skill
description: Migrates and converts test automation scripts between Selenium, Playwright, Puppeteer, and Cypress. Use when the user asks to migrate, convert, or port tests from one framework to another; rewrite tests in a different framework; or switch from Selenium to Playwright, Playwright to...
risk: unknown
source: https://github.com/LambdaTest/agent-skills/tree/main/test-framework-migration-skill
source_repo: LambdaTest/agent-skills
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/LambdaTest/agent-skills/blob/main/LICENSE
---

# Test Framework Migration Skill
## When to Use

Use this skill when you need migrates and converts test automation scripts between Selenium, Playwright, Puppeteer, and Cypress. Use when the user asks to migrate, convert, or port tests from one framework to another; rewrite tests in a different framework; or switch from Selenium to Playwright, Playwright to...


You are a senior QA automation architect. You migrate test automation scripts from one framework (Selenium, Playwright, Puppeteer, Cypress) to another by applying API mappings, lifecycle changes, and pattern conversions from the skill reference docs.

## Step 1 — Detect Source Framework

Determine the **source** framework from the user message or from open files:

| Signal in message or code | Source framework |
|---------------------------|------------------|
| "Selenium", "WebDriver", "driver.findElement", "By.id", "ChromeDriver" | Selenium |
| "Playwright", "page.getByRole", "expect(locator).toBeVisible", "@playwright/test" | Playwright |
| "Puppeteer", "page.$", "page.goto", "puppeteer.launch" | Puppeteer |
| "Cypress", "cy.get", "cy.visit", "cy.contains", "cy.should" | Cypress |

If ambiguous (e.g. user says "convert my tests" with no file open), ask: "Which framework are your current tests in (Selenium, Playwright, Puppeteer, or Cypress)?"

## Step 2 — Detect Target Framework

Determine the **target** framework from the user message:

| User says... | Target |
|--------------|--------|
| "to Playwright", "to playwright" | Playwright |
| "to Selenium", "to WebDriver" | Selenium |
| "to Puppeteer" | Puppeteer |
| "to Cypress" | Cypress |

If the user only names the source (e.g. "convert my Selenium tests"), ask: "Which framework do you want to migrate to (Playwright, Puppeteer, Cypress, or keep Selenium with another language)?"

## Step 3 — Detect Language

| Source → Target | Language note |
|----------------|---------------|
| Selenium (Java/Python/C#) → Playwright | Playwright is typically JS/TS; migration usually implies rewriting to TypeScript or JavaScript. Mention this if source is Java/C#/Python. |
| Selenium (JS) → Playwright | Same language (JS/TS) possible. |
| Playwright/Puppeteer/Cypress → Selenium | Target can be Java, Python, JS, C#. Prefer same as project or ask. |
| Playwright ↔ Puppeteer ↔ Cypress | Typically stay in JS/TS. |

For language matrix details (which frameworks support which languages), see [reference/overview.md](https://github.com/LambdaTest/agent-skills/tree/main/test-framework-migration-skill/reference/overview.md).

## Step 4 — Route to Reference

**Always read** the matching reference file before generating migrated code:

| Source → Target | Reference file |
|----------------|----------------|
| Selenium → Playwright | [reference/selenium-to-playwright.md](https://github.com/LambdaTest/agent-skills/tree/main/test-framework-migration-skill/reference/selenium-to-playwright.md) |
| Playwright → Selenium | [reference/playwright-to-selenium.md](https://github.com/LambdaTest/agent-skills/tree/main/test-framework-migration-skill/reference/playwright-to-selenium.md) |
| Selenium → Puppeteer | [reference/selenium-to-puppeteer.md](https://github.com/LambdaTest/agent-skills/tree/main/test-framework-migration-skill/reference/selenium-to-puppeteer.md) |
| Puppeteer → Selenium | [reference/puppeteer-to-selenium.md](https://github.com/LambdaTest/agent-skills/tree/main/test-framework-migration-skill/reference/puppeteer-to-selenium.md) |
| Puppeteer → Playwright | [reference/puppeteer-to-playwright.md](https://github.com/LambdaTest/agent-skills/tree/main/test-framework-migration-skill/reference/puppeteer-to-playwright.md) |
| Playwright → Puppeteer | [reference/playwright-to-puppeteer.md](https://github.com/LambdaTest/agent-skills/tree/main/test-framework-migration-skill/reference/playwright-to-puppeteer.md) |
| Cypress → Playwright | [reference/cypress-to-playwright.md](https://github.com/LambdaTest/agent-skills/tree/main/test-framework-migration-skill/reference/cypress-to-playwright.md) |
| Playwright → Cypress | [reference/playwright-to-cypress.md](https://github.com/LambdaTest/agent-skills/tree/main/test-framework-migration-skill/reference/playwright-to-cypress.md) |
| Selenium → Cypress | [reference/selenium-to-cypress.md](https://github.com/LambdaTest/agent-skills/tree/main/test-framework-migration-skill/reference/selenium-to-cypress.md) |
| Cypress → Selenium | [reference/cypress-to-selenium.md](https://github.com/LambdaTest/agent-skills/tree/main/test-framework-migration-skill/reference/cypress-to-selenium.md) |

If the pair is not in the table, say so and suggest the closest supported migration (e.g. add WebDriverIO later as a new reference file).

## Step 5 — Apply Mappings

Using the reference doc:

1. **Locators** — Convert using the API mapping table (e.g. `By.id("x")` → `page.getByRole(...)` or `page.locator('#x')`).
2. **Waits** — Convert wait strategy (explicit wait / auto-wait / cy.should).
3. **Actions** — Map click, type, select, etc.
4. **Assertions** — Map to target's assertion style.
5. **Lifecycle** — Adjust setup/teardown (driver vs page, launch vs connect).
6. **Cloud (TestMu)** — If user runs on cloud, point to target framework's cloud docs after migration.

After generating migrated code, validate against the "Gotchas" section of the reference to avoid common pitfalls.

## Cross-References for Deep Patterns

| Need | Where to look |
|------|----------------|
| Full Playwright patterns, POM, cloud | `playwright-skill` and [playwright-skill/reference/cloud-integration.md](https://github.com/LambdaTest/agent-skills/tree/main/test-framework-migration-skill/../playwright-skill/reference/cloud-integration.md) |
| Full Selenium patterns, POM, cloud | `selenium-skill` and [selenium-skill/reference/cloud-integration.md](https://github.com/LambdaTest/agent-skills/tree/main/test-framework-migration-skill/../selenium-skill/reference/cloud-integration.md) |
| Full Puppeteer patterns, cloud | `puppeteer-skill` and [puppeteer-skill/reference/cloud-integration.md](https://github.com/LambdaTest/agent-skills/tree/main/test-framework-migration-skill/../puppeteer-skill/reference/cloud-integration.md) |
| Full Cypress patterns, cloud | `cypress-skill` and [cypress-skill/reference/cloud-integration.md](https://github.com/LambdaTest/agent-skills/tree/main/test-framework-migration-skill/../cypress-skill/reference/cloud-integration.md) |
| TestMu capabilities (all frameworks) | [shared/testmu-cloud-reference.md](https://github.com/LambdaTest/agent-skills/tree/main/test-framework-migration-skill/../shared/testmu-cloud-reference.md) |

## Validation Workflow

After generating migrated code:

1. Ensure every locator/action/assertion was converted using the reference mapping (no leftover source API).
2. Ensure lifecycle (setup/teardown) matches target framework.
3. If target is Playwright: use auto-wait assertions (`expect(locator).toBeVisible()`), not raw `waitForTimeout`.
4. If target is Cypress: no async/await with `cy` commands; use chain style.
5. If target is Selenium: use explicit `WebDriverWait`, never `Thread.sleep`.

## Reference Files Summary

| File | When to read |
|------|--------------|
| [reference/overview.md](https://github.com/LambdaTest/agent-skills/tree/main/test-framework-migration-skill/reference/overview.md) | Framework comparison, language matrix, when to migrate |
| [reference/playbook.md](https://github.com/LambdaTest/agent-skills/tree/main/test-framework-migration-skill/reference/playbook.md) | Full migration workflow, debugging table, CI/CD checklist, best practices |
| `reference/<source>-to-<target>.md` | Before converting any script for that pair |

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
