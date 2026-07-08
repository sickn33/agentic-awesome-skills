# Playwright Java – Assertions Reference

## Import Statement

```java
import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;
import org.assertj.core.api.SoftAssertions;
```

---

## Locator Assertions (Auto-Retry)

Playwright's `assertThat(locator)` polls automatically (up to `defaultTimeout`).
**Always prefer these over `locator.isVisible()` + `assertTrue`.**

```java
// Visibility
assertThat(locator).isVisible();
assertThat(locator).isHidden();

// Enabled / Disabled
assertThat(locator).isEnabled();
assertThat(locator).isDisabled();

// Text content (exact or partial)
assertThat(locator).hasText("Exact text");
assertThat(locator).containsText("partial");
assertThat(locator).hasText(Pattern.compile("Order #\\d+"));

// Multiple elements
assertThat(locator).hasCount(5);
assertThat(locator).hasText(new String[]{"Item A", "Item B", "Item C"});

// Attribute
assertThat(locator).hasAttribute("aria-expanded", "true");
assertThat(locator).hasAttribute("href", Pattern.compile(".*\\/dashboard"));

// CSS class
assertThat(locator).hasClass("active");
assertThat(locator).hasClass(Pattern.compile("btn-.*"));

// Input value
assertThat(locator).hasValue("expected input value");
assertThat(locator).hasValue(Pattern.compile("\\d{4}-\\d{2}-\\d{2}")); // date pattern

// Checked state (checkbox/radio)
assertThat(locator).isChecked();
assertThat(locator).not().isChecked();

// Focused
assertThat(locator).isFocused();

// Editable
assertThat(locator).isEditable();
```

---

## Page Assertions

```java
// URL
assertThat(page).hasURL("https://example.com/dashboard");
assertThat(page).hasURL(Pattern.compile(".*/dashboard"));

// Title
assertThat(page).hasTitle("Dashboard – MyApp");
assertThat(page).hasTitle(Pattern.compile(".*Dashboard.*"));
```

---

## Negation

```java
// Add .not() for inverse
assertThat(locator).not().isVisible();
assertThat(locator).not().hasText("Error");
assertThat(page).not().hasURL(Pattern.compile(".*/login"));
```

---

## Custom Timeout on Assertion

```java
assertThat(locator)
    .hasText("Loaded", new LocatorAssertions.HasTextOptions().setTimeout(10_000));
```

---

## Soft Assertions (AssertJ)

Collect all failures before reporting — critical for form validation tests:

```java
@Test
void shouldDisplayAllProfileFields() {
    ProfilePage profile = new ProfilePage(page());
    profile.navigate();

    SoftAssertions soft = new SoftAssertions();
    soft.assertThat(profile.getNameField().inputValue()).isEqualTo("Amal");
    soft.assertThat(profile.getEmailField().inputValue()).contains("@");
    soft.assertThat(profile.getRoleLabel().textContent()).isEqualTo("Engineer");
    soft.assertAll(); // throws at end with ALL failures listed
}
```

---

## Response Assertions

```java
APIResponse response = page().context().request().get("/api/health");
assertThat(response).isOK();                         // status 200-299
assertThat(response).hasStatus(201);
assertThat(response).hasHeader("content-type", "application/json");
assertThat(response).hasJSON("{\"status\":\"UP\"}"); // exact JSON match
```

---

## Screenshot Comparison (Visual Testing)

```java
// Full page screenshot
assertThat(page).hasScreenshot(new PageAssertions.HasScreenshotOptions()
    .setName("dashboard.png")
    .setFullPage(true)
    .setThreshold(0.2));

// Locator screenshot
assertThat(page.locator(".chart-container"))
    .hasScreenshot(new LocatorAssertions.HasScreenshotOptions()
        .setName("revenue-chart.png"));
```

Update golden files: run with `PLAYWRIGHT_UPDATE_SNAPSHOTS=true mvn test`

---

## Common Anti-Patterns to Avoid

```java
// ❌ WRONG — no auto-retry, brittle
assertTrue(page.locator(".spinner").isHidden());
Thread.sleep(2000);

// ✅ CORRECT — auto-retry until timeout
assertThat(page.locator(".spinner")).isHidden();

// ❌ WRONG — getText() can return stale value
String text = locator.textContent();
assertEquals("Done", text);

// ✅ CORRECT — assertion retries until text matches
assertThat(locator).hasText("Done");

// ❌ WRONG — count check without waiting
assertEquals(5, page.locator("li").count());

// ✅ CORRECT — waits until count stabilizes
assertThat(page.locator("li")).hasCount(5);
```
