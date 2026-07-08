---
name: cucumber-skill
description: 'Generates Cucumber BDD tests with Gherkin feature files and step definitions in Java, JavaScript, or Ruby. Use when user mentions "Cucumber", "Gherkin", "Feature/Scenario", "Given/When/Then", "BDD". Triggers on: "Cucumber", "Gherkin", "BDD", "Feature file", "Given/When/Then", "step...'
risk: unknown
source: https://github.com/LambdaTest/agent-skills/tree/main/cucumber-skill
source_repo: LambdaTest/agent-skills
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/LambdaTest/agent-skills/blob/main/LICENSE
---

# Cucumber BDD Skill
## When to Use

Use this skill when you need generates Cucumber BDD tests with Gherkin feature files and step definitions in Java, JavaScript, or Ruby. Use when user mentions "Cucumber", "Gherkin", "Feature/Scenario", "Given/When/Then", "BDD". Triggers on: "Cucumber", "Gherkin", "BDD", "Feature file", "Given/When/Then", "step...


## Core Patterns

### Feature File (Gherkin)

```gherkin
Feature: User Login
  As a registered user
  I want to log into the application
  So that I can access my dashboard

  Background:
    Given I am on the login page

  Scenario: Successful login
    When I enter "user@test.com" in the email field
    And I enter "password123" in the password field
    And I click the login button
    Then I should be redirected to the dashboard
    And I should see "Welcome" on the page

  Scenario: Invalid credentials
    When I enter "wrong@test.com" in the email field
    And I enter "wrongpass" in the password field
    And I click the login button
    Then I should see an error message "Invalid credentials"

  Scenario Outline: Login with various users
    When I enter "<email>" in the email field
    And I enter "<password>" in the password field
    And I click the login button
    Then I should see "<result>"

    Examples:
      | email           | password    | result     |
      | admin@test.com  | admin123    | Dashboard  |
      | user@test.com   | password    | Dashboard  |
      | bad@test.com    | wrong       | Error      |
```

### Step Definitions — Java

```java
import io.cucumber.java.en.*;
import static org.junit.jupiter.api.Assertions.*;

public class LoginSteps {
    private LoginPage loginPage;
    private DashboardPage dashboardPage;

    @Given("I am on the login page")
    public void iAmOnTheLoginPage() {
        loginPage = new LoginPage(driver);
        loginPage.navigate();
    }

    @When("I enter {string} in the email field")
    public void iEnterEmail(String email) {
        loginPage.enterEmail(email);
    }

    @When("I enter {string} in the password field")
    public void iEnterPassword(String password) {
        loginPage.enterPassword(password);
    }

    @When("I click the login button")
    public void iClickLogin() {
        dashboardPage = loginPage.clickLogin();
    }

    @Then("I should be redirected to the dashboard")
    public void iShouldBeOnDashboard() {
        assertTrue(driver.getCurrentUrl().contains("/dashboard"));
    }

    @Then("I should see {string} on the page")
    public void iShouldSeeText(String text) {
        assertTrue(dashboardPage.getPageSource().contains(text));
    }
}
```

### Step Definitions — JavaScript

```javascript
const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('chai');

Given('I am on the login page', async function() {
  await this.page.goto('/login');
});

When('I enter {string} in the email field', async function(email) {
  await this.page.fill('#email', email);
});

When('I click the login button', async function() {
  await this.page.click('button[type="submit"]');
});

Then('I should see {string} on the page', async function(text) {
  const content = await this.page.textContent('body');
  expect(content).to.include(text);
});
```

### Hooks

```java
import io.cucumber.java.*;

public class Hooks {
    @Before
    public void setUp(Scenario scenario) {
        driver = new ChromeDriver();
    }

    @After
    public void tearDown(Scenario scenario) {
        if (scenario.isFailed()) {
            byte[] screenshot = ((TakesScreenshot) driver).getScreenshotAs(OutputType.BYTES);
            scenario.attach(screenshot, "image/png", "failure-screenshot");
        }
        driver.quit();
    }
}
```

### Tags

```gherkin
@smoke
Feature: Login
  @critical @fast
  Scenario: Quick login
    ...

  @slow @regression
  Scenario: Full login flow
    ...
```

```bash
# Run by tag
mvn test -Dcucumber.filter.tags="@smoke"
mvn test -Dcucumber.filter.tags="@smoke and not @slow"
```

### Anti-Patterns

| Bad | Good | Why |
|-----|------|-----|
| UI details in Gherkin | Business language | Readability |
| One step per line of code | Meaningful business steps | Abstraction |
| No Background for shared steps | Use Background | DRY |
| Imperative steps | Declarative steps | Maintainable |


### Cloud Execution on TestMu AI

Set environment variables: `LT_USERNAME`, `LT_ACCESS_KEY`

**Java:**
```java
// CucumberHooks.java
ChromeOptions browserOptions = new ChromeOptions();
HashMap<String, Object> ltOptions = new HashMap<>();
ltOptions.put("user", System.getenv("LT_USERNAME"));
ltOptions.put("accessKey", System.getenv("LT_ACCESS_KEY"));
ltOptions.put("build", "Cucumber Build");
ltOptions.put("name", scenario.getName());
ltOptions.put("platformName", "Windows 11");
ltOptions.put("video", true);
browserOptions.setCapability("LT:Options", ltOptions);
driver = new RemoteWebDriver(new URL("https://hub.lambdatest.com/wd/hub"), browserOptions);
```

**JavaScript:**
```javascript
const driver = new Builder()
  .usingServer(`https://${process.env.LT_USERNAME}:${process.env.LT_ACCESS_KEY}@hub.lambdatest.com/wd/hub`)
  .withCapabilities({ browserName: 'chrome', 'LT:Options': {
    user: process.env.LT_USERNAME, accessKey: process.env.LT_ACCESS_KEY,
    build: 'Cucumber Build', platformName: 'Windows 11', video: true
  }}).build();
```
## Quick Reference

| Task | Command |
|------|---------|
| Run all (Java) | `mvn test` with cucumber-junit-platform-engine |
| Run all (JS) | `npx cucumber-js` |
| Run tagged | `--tags "@smoke"` |
| Dry run | `--dry-run` |
| Generate snippets | Run undefined steps |

## Deep Patterns → `reference/playbook.md`

| § | Section | Lines |
|---|---------|-------|
| 1 | Project Setup & Configuration | Maven, runner, rerun |
| 2 | Feature Writing Patterns | Background, outlines, DataTable |
| 3 | Step Definitions | Typed steps, DI injection |
| 4 | Dependency Injection & Shared State | PicoContainer, ScenarioContext |
| 5 | Hooks (Lifecycle Management) | Before/After ordering, screenshots |
| 6 | Custom Parameter Types | Transformers, DocString |
| 7 | Parallel Execution | Thread-safe, TestNG parallel |
| 8 | Reporting | Allure, masterthought, JSON |
| 9 | CI/CD Integration | GitHub Actions, tag matrix |
| 10 | Debugging Quick-Reference | 10 common problems |
| 11 | Best Practices Checklist | 13 items |

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
