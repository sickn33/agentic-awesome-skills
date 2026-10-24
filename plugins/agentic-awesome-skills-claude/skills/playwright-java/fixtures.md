# Playwright Java – Fixtures, Hooks & Test Data

## JUnit 5 Extension for Playwright (Custom Fixture)

Encapsulate browser lifecycle in a reusable JUnit 5 extension:

```java
package com.company.tests.base;

import com.microsoft.playwright.*;
import org.junit.jupiter.api.extension.*;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class PlaywrightExtension
        implements BeforeEachCallback, AfterEachCallback, ParameterResolver {

    private static final Map<String, Page> pageMap = new ConcurrentHashMap<>();

    @Override
    public void beforeEach(ExtensionContext ctx) {
        Playwright pw = Playwright.create();
        ctx.getStore(ExtensionContext.Namespace.create(PlaywrightExtension.class, ctx.getUniqueId())).put("playwright", pw);
        Browser browser = pw.chromium().launch(new BrowserType.LaunchOptions().setHeadless(true));
        ctx.getStore(ExtensionContext.Namespace.create(PlaywrightExtension.class, ctx.getUniqueId())).put("browser", browser);
        BrowserContext context = browser.newContext();
        ctx.getStore(ExtensionContext.Namespace.create(PlaywrightExtension.class, ctx.getUniqueId())).put("context", context);
        Page page = context.newPage();
        pageMap.put(ctx.getUniqueId(), page);

        ctx.getStore(ExtensionContext.Namespace.create(PlaywrightExtension.class, ctx.getUniqueId())).put("playwright", pw);
        ctx.getStore(ExtensionContext.Namespace.create(PlaywrightExtension.class, ctx.getUniqueId())).put("browser", browser);
        ctx.getStore(ExtensionContext.Namespace.create(PlaywrightExtension.class, ctx.getUniqueId())).put("context", context);
    }

    @Override
    public void afterEach(ExtensionContext ctx) {
        pageMap.remove(ctx.getUniqueId());
        closeIfNotNull(ctx.getStore(ExtensionContext.Namespace.create(PlaywrightExtension.class, ctx.getUniqueId())).remove("context", BrowserContext.class));
        closeIfNotNull(ctx.getStore(ExtensionContext.Namespace.create(PlaywrightExtension.class, ctx.getUniqueId())).remove("browser", Browser.class));
        closeIfNotNull(ctx.getStore(ExtensionContext.Namespace.create(PlaywrightExtension.class, ctx.getUniqueId())).remove("playwright", Playwright.class));
    }

    @Override
    public boolean supportsParameter(ParameterContext param, ExtensionContext ext) {
        return param.getParameter().getType() == Page.class;
    }

    @Override
    public Object resolveParameter(ParameterContext param, ExtensionContext ext) {
        return pageMap.get(ext.getUniqueId());
    }

    private void closeIfNotNull(AutoCloseable obj) {
        if (obj != null) try { obj.close(); } catch (Exception ignored) {}
    }
}

// Usage:
@ExtendWith(PlaywrightExtension.class)
class CheckoutTest {
    @Test
    void shouldCompleteCheckout(Page page) {
        // Page is injected automatically
        LoginPage login = new LoginPage(page);
        login.navigate();
        login.loginAs("user@example.test", "fixture-only-password");
    }
}
```

---

## Test Data Factory

```java
package com.company.tests.utils;

import com.fasterxml.jackson.databind.ObjectMapper;
import net.datafaker.Faker;

import java.io.InputStream;
import java.util.List;

public final class TestDataFactory {
    private static final Faker faker = new Faker();
    private static final ObjectMapper mapper = new ObjectMapper();

    // --- Static test data from JSON ---
    public static User getDefaultUser() {
        return loadUsers().stream()
                .filter(u -> u.role().equals("default"))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("No default user in testdata/users.json"));
    }

    public static User getAdminUser() {
        return loadUsers().stream()
                .filter(u -> u.role().equals("admin"))
                .findFirst()
                .orElseThrow();
    }

    @SuppressWarnings("unchecked")
    private static List<User> loadUsers() {
        try (InputStream in = TestDataFactory.class
                .getClassLoader().getResourceAsStream("testdata/users.json")) {
            return mapper.readValue(in, mapper.getTypeFactory()
                    .constructCollectionType(List.class, User.class));
        } catch (Exception e) {
            throw new RuntimeException("Failed to load users.json", e);
        }
    }

    // --- Dynamic data generation ---
    public static User generateRandomUser() {
        return new User(
            faker.internet().emailAddress(),
            faker.internet().password(12, 20, true, true, true),
            faker.name().firstName(),
            faker.name().lastName(),
            "default"
        );
    }

    public static String randomPhone() {
        return faker.phoneNumber().cellPhone();
    }

    public static String randomPostalCode() {
        return faker.address().zipCode();
    }
}
```

---

## `testdata/users.json`

```json
[
  {
    "email": "admin@company.com",
    "password": "Admin@1234",
    "firstName": "Admin",
    "lastName": "User",
    "role": "admin"
  },
  {
    "email": "user@company.com",
    "password": "User@1234",
    "firstName": "Test",
    "lastName": "User",
    "role": "default"
  }
]
```

---

## Pre-Authenticated Context (Reuse Auth State)

Save login state once, reuse across tests — massive speed improvement:

```java
// Run once before test suite (e.g., in @BeforeAll or a setup class)
public class AuthSetup {
    public static void saveAuthState() {
        try (Playwright pw = Playwright.create()) {
            Browser browser = pw.chromium().launch();
            BrowserContext context = browser.newContext();
            Page page = context.newPage();

            page.navigate(ConfigReader.getBaseUrl() + "/login");
            page.getByLabel("Email").fill(TestDataFactory.getDefaultUser().email());
            page.getByLabel("Password").fill(TestDataFactory.getDefaultUser().password());
            page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName("Sign in")).click();
            page.waitForURL("**/dashboard");

            // Save storage state (cookies + localStorage)
            context.storageState(new BrowserContext.StorageStateOptions()
                .setPath(Paths.get("target/auth/user-state.json")));
        }
    }
}

// In BaseTest, load saved state:
BrowserContext context = browser.newContext(new Browser.NewContextOptions()
    .setStorageStatePath(Paths.get("target/auth/user-state.json")));
```

---

## Screenshot on Test Failure (Allure Attachment)

```java
// Add this to @AfterEach in BaseTest
@AfterEach
void captureOnFailure(TestInfo info) {
    // TestInfo does not expose success/failure. This captures every completion;
    // use a TestWatcher/extension with correct resource ordering for failures only.
    byte[] screenshot = page().screenshot(new Page.ScreenshotOptions().setFullPage(true));
    Allure.addAttachment("Completion screenshot", "image/png",
        new ByteArrayInputStream(screenshot), "png");
}
```

---

## WaitUtils Helper

```java
package com.company.tests.utils;

import com.microsoft.playwright.Page;

public final class WaitUtils {

    public static void waitForSpinnerToDisappear(Page page) {
        page.locator(".loading-spinner").waitFor(
            new Locator.WaitForOptions()
                .setState(WaitForSelectorState.HIDDEN)
                .setTimeout(15_000));
    }

    public static void waitForToastMessage(Page page, String message) {
        page.getByRole(AriaRole.ALERT)
            .filter(new Locator.FilterOptions().setHasText(message))
            .waitFor(new Locator.WaitForOptions()
                .setState(WaitForSelectorState.VISIBLE)
                .setTimeout(5_000));
    }

    public static void waitForApiResponse(Page page, String urlPattern, Runnable action) {
        page.waitForResponse(resp ->
            resp.url().contains(urlPattern) && resp.status() < 400,
            action
        );
    }
}
```

---

## Repetition and retries

`@RepeatedTest(value = 3, failureThreshold = 1)` repeats a test and stops after a failure; it is not retry-until-pass. JUnit Jupiter does not provide the custom `@RetryTest`/`RetryExtension` implementation here. If you add a retry library, pin it, retain first-failure artifacts and report flaky outcomes; never make retries hide a defect. Reinitialize resources/data per attempt.
