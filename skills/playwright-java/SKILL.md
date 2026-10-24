---
name: playwright-java
description: "Scaffold, write, debug, and enhance enterprise-grade Playwright E2E tests in Java using Page Object Model, JUnit 5, Allure reporting, and parallel execution."
category: test-automation
risk: critical
source: community
date_added: "2025-03-08"
author: amalsam18
tags: [playwright, java, e2e-testing, junit5, page-object-model, allure, selenium-alternative]
tools: [claude, cursor,antigravity]
---
## Supporting material

The bundled files are [configuration](config.md), [page objects](page-objects.md), [assertions](assertions.md), [fixtures](fixtures.md), [BaseTest.java](BaseTest.java) and [BasePage.java](BasePage.java). Copy/adapt them into the target project with their dependencies; `src/test/resources/junit-platform.properties` below is a project file to create, not a bundled file.

# Playwright Java – Advanced Test Automation

## Overview

This skill supplies Playwright Java test patterns requiring project-specific compilation and execution.
It enforces the Page Object Model (POM), strict locator strategies, per-thread Playwright ownership for parallel
execution, and full Allure reporting integration. Targets Java 17+ and Playwright 1.44+.

Supporting reference files are available for deeper topics:

| Topic | File |
|-------|------|
| Maven POM, ConfigReader, Docker/CI setup | `config.md` |
| Component pattern, dropdowns, uploads, waits | `page-objects.md` |
| Full assertion API, soft assertions, visual testing | `assertions.md` |
| Fixtures, test data factory, auth state, retry | `fixtures.md` |
| Drop-in base class templates | `BaseTest.java`, `BasePage.java` |

---

## When to Use This Skill

- Use when scaffolding a new Playwright Java project from scratch
- Use when writing Page Object classes or JUnit 5 test classes
- Use when the user asks about cross-browser testing, parallel execution, or Allure reports
- Use when fixing flaky tests or replacing `Thread.sleep()` with proper waits
- Use when setting up Playwright in CI/CD pipelines (GitHub Actions, Jenkins, Docker)
- Use when combining API calls and UI assertions in a single test (hybrid testing)
- Use when the user mentions "POM pattern", "BrowserContext", "Playwright fixtures", or "traces"

---

## How It Works

### Step 1: Decide the Approach

Use this matrix to pick the right pattern before writing any code:

| User Request | Approach |
|---|---|
| New project from scratch | Full scaffold — see `config.md` |
| Single feature test | POM page class + JUnit5 test class |
| API + UI hybrid | `APIRequestContext` alongside `Page` |
| Cross-browser | `@MethodSource` parameterized over browser names |
| Flaky test fix | Replace `sleep` with `waitFor` / `waitForResponse` |
| CI integration | `playwright install --with-deps` in pipeline |
| Parallel execution | `junit-platform.properties` + `ThreadLocal` |
| Rich reporting | Allure + Playwright trace + video recording |

---

### Step 2: Scaffold the Project Structure

Always use this layout when creating a new project:

```
src/
├── test/
│   ├── java/com/company/tests/
│   │   ├── base/
│   │   │   ├── BaseTest.java        ← BaseTest.java
│   │   │   └── BasePage.java        ← BasePage.java
│   │   ├── pages/
│   │   │   └── LoginPage.java
│   │   ├── tests/
│   │   │   └── LoginTest.java
│   │   ├── utils/
│   │   │   ├── TestDataFactory.java
│   │   │   └── WaitUtils.java
│   │   └── config/
│   │       └── ConfigReader.java
│   └── resources/
│       ├── test.properties
│       ├── junit-platform.properties
│       └── testdata/users.json
pom.xml
```

---

### Step 3: Set Up Thread-Safe BaseTest

Use the bundled `BaseTest.java`, with the matching `ConfigReader` from `config.md`; it registers resources before fallible tracing/page creation and removes thread-local values during teardown.

---

### Step 4: Build Page Object Classes

```java
public class LoginPage extends BasePage {

    // Declare ALL locators as fields — never inline in action methods
    private final Locator emailInput;
    private final Locator passwordInput;
    private final Locator loginButton;
    private final Locator errorMessage;

    public LoginPage(Page page) {
        super(page);
        emailInput    = page.getByLabel("Email address");
        passwordInput = page.getByLabel("Password");
        loginButton   = page.getByRole(AriaRole.BUTTON,
                            new Page.GetByRoleOptions().setName("Sign in"));
        errorMessage  = page.getByTestId("login-error");
    }

    @Override protected String getUrl() { return "/login"; }

    // Navigation methods return the next Page Object — enables fluent chaining
    public DashboardPage loginAs(String email, String password) {
        fill(emailInput, email);
        fill(passwordInput, password);
        clickAndWaitForNav(loginButton, "**/dashboard");
        return new DashboardPage(page);
    }

    public LoginPage loginExpectingError(String email, String password) {
        fill(emailInput, email);
        fill(passwordInput, password);
        loginButton.click();
        errorMessage.waitFor();
        return this;
    }

    public String getErrorMessage() { return errorMessage.textContent(); }
}
```

---

### Step 5: Write Tests with Allure Annotations

```java
class LoginTest extends BaseTest {

    private LoginPage loginPage;

    @BeforeEach
    void openLoginPage() {
        loginPage = new LoginPage(page());
        loginPage.navigate();
    }

    @Test
    @Severity(SeverityLevel.BLOCKER)
    @DisplayName("Valid credentials redirect to dashboard")
    void shouldLoginWithValidCredentials() {
        User user = TestDataFactory.getDefaultUser();
        DashboardPage dash = loginPage.loginAs(user.email(), user.password());

        assertThat(page()).hasURL(Pattern.compile(".*/dashboard"));
        assertThat(dash.getWelcomeBanner()).containsText("Welcome, " + user.firstName());
    }

    @Test
    void shouldShowErrorOnInvalidCredentials() {
        loginPage.loginExpectingError("bad@test.com", "wrongpass");

        SoftAssertions softly = new SoftAssertions();
        softly.assertThat(loginPage.getErrorMessage()).contains("Invalid email or password");
        assertThat(page()).hasURL(Pattern.compile(".*/login"));
        softly.assertAll();
    }

    @ParameterizedTest
    @MethodSource("provideInvalidCredentials")
    void shouldRejectInvalidCredentials(String email, String password, String expectedError) {
        loginPage.loginExpectingError(email, password);
        org.assertj.core.api.Assertions.assertThat(loginPage.getErrorMessage()).contains(expectedError);
    }

    static Stream<Arguments> provideInvalidCredentials() {
        return Stream.of(
            Arguments.of("", "password123", "Email is required"),
            Arguments.of("user@test.com", "", "Password is required"),
            Arguments.of("notanemail", "pass", "Invalid email format")
        );
    }
}
```

---

## Examples

### Example 1: API + UI Hybrid Test

```java
@Test
void shouldDisplayNewlyCreatedOrder() {
    // Arrange via API — faster than navigating through UI
    APIRequestContext api = page().context().request();
    APIResponse response = api.post("/api/orders",
        RequestOptions.create()
            .setHeader("Authorization", "Bearer " + authToken)
            .setData(Map.of("productId", "SKU-001", "quantity", 2)));
    assertThat(response).isOK();

    String orderId = new JsonParser().parse(response.text())
        .getAsJsonObject().get("id").getAsString();

    OrdersPage orders = new OrdersPage(page());
    orders.navigate();
    assertThat(orders.getOrderRowById(orderId)).isVisible();
}
```

### Example 2: Network Mocking

```java
@Test
void shouldHandleApiFailureGracefully() {
    page().route("**/api/products", route -> route.fulfill(
        new Route.FulfillOptions()
            .setStatus(503)
            .setBody("{\"error\":\"Service Unavailable\"}")
            .setContentType("application/json")));

    ProductsPage products = new ProductsPage(page());
    products.navigate();

    assertThat(products.getErrorBanner())
        .hasText("We're having trouble loading products. Please try again.");
}
```

### Example 3: Cross-Browser Execution

Run separate Maven processes/jobs with `-Dbrowser=chromium`, `firefox` and `webkit`. Do not set a process-global system property inside a parameterized test: setup already launched the browser and parallel tests race on that property. Give each job a unique artifact name.

### Example 4: Parallel Execution Config

```properties
# src/test/resources/junit-platform.properties
junit.jupiter.execution.parallel.enabled=true
junit.jupiter.execution.parallel.mode.default=concurrent
junit.jupiter.execution.parallel.config.strategy=fixed
junit.jupiter.execution.parallel.config.fixed.parallelism=4
```

### Example 5: GitHub Actions CI Pipeline

```yaml
- name: Install Playwright browsers
  run: mvn exec:java -e -Dexec.mainClass=com.microsoft.playwright.CLI -Dexec.args="install --with-deps"

- name: Run tests
  run: mvn test -Dbrowser=${{ matrix.browser }} -Dheadless=true

- name: Upload traces on failure
  uses: actions/upload-artifact@v4
  if: failure()
  with:
    name: playwright-traces-${{ matrix.browser }}
    path: target/traces/

- name: Upload Allure results
  uses: actions/upload-artifact@v4
  if: always()
  with:
    name: allure-results-${{ matrix.browser }}
    path: target/allure-results/
```

---

Use an authorized test origin and disposable test data/accounts. Order/API/UI actions can charge, send messages or delete records; block production integrations and clean up created records. Storage-state files contain credentials, and traces/screenshots/videos can contain secrets or personal data: restrict access, ignore in git, redact and bound retention before uploading. Pinned versions in the configuration are historical examples, not current recommendations; match Java dependency and browser/Docker versions.

## Best Practices

- ✅ Use `ThreadLocal<Page>` for every parallel-safe test suite
- ✅ Declare all `Locator` fields at the top of the Page Object class
- ✅ Return the next Page Object from navigation methods (fluent chaining)
- ✅ Use `assertThat(locator)` — it auto-retries until timeout
- ✅ Use `getByRole`, `getByLabel`, `getByTestId` as first-choice locators
- ✅ Start tracing in `@BeforeEach` and stop with a file path in `@AfterEach`
- ✅ Use `SoftAssertions` when validating multiple fields on a single page
- ✅ Set up saved auth state (`storageState`) to skip login across test classes
- ❌ Never use `Thread.sleep()` — replace with `waitFor()` or `waitForResponse()`
- ❌ Never hardcode base URLs — always use `ConfigReader.getBaseUrl()`
- ❌ Never create a `Playwright` instance inside a Page Object
- ❌ Never use XPath for dynamic or frequently changing elements

---

## Common Pitfalls

- **Problem:** Tests fail randomly in parallel mode
  **Solution:** Ensure every test creates its own `Playwright → Browser → BrowserContext → Page` chain via `ThreadLocal`. Never share a `Page` across threads.

- **Problem:** `assertThat(locator).isVisible()` times out even when the element appears
  **Solution:** Inspect readiness/locator first; set the assertion-specific options timeout if justified. Assertions have a separate default (5 seconds); context action timeout does not change it.

- **Problem:** `Thread.sleep(2000)` was added but tests are still flaky
  **Solution:** Replace with `page.waitForResponse("**/api/endpoint", () -> action())` or `assertThat(locator).hasText("Done")` which polls automatically.

- **Problem:** Playwright trace zip is empty or missing
  **Solution:** Ensure `tracing().start()` is called before test actions and `tracing().stop()` is in `@AfterEach` — not `@AfterAll`.

- **Problem:** Allure report is blank or missing steps
  **Solution:** Add the AspectJ agent to `maven-surefire-plugin` `<argLine>` in `pom.xml` — see `config.md` for the exact snippet.

- **Problem:** `storageState` auth file is stale and tests redirect to login
  **Solution:** Re-run `AuthSetup` to regenerate `target/auth/user-state.json` before the suite, or add a `@BeforeAll` that conditionally refreshes it.

---

## Related Skills

- `@rest-assured-java` — Use for pure API test suites without any UI interaction
- `@selenium-java` — Legacy alternative; prefer Playwright for all new projects
- `@allure-reporting` — Deep-dive into Allure annotations, categories, and history trends
- `@testcontainers-java` — Use alongside this skill when tests need a live database or service
- `@github-actions-ci` — For building complete multi-browser matrix CI pipelines

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
