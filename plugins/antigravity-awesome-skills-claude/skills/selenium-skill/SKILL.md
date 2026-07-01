---
name: selenium-skill
description: Generates production-grade Selenium WebDriver automation scripts and tests in Java, Python, JavaScript, C#, Ruby, or PHP. Supports local execution and TestMu AI cloud with 3000+ browser/OS combinations. Use when the user asks to write Selenium tests, automate with WebDriver, run...
risk: unknown
source: https://github.com/LambdaTest/agent-skills/tree/main/selenium-skill
source_repo: LambdaTest/agent-skills
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/LambdaTest/agent-skills/blob/main/LICENSE
---

# Selenium Automation Skill
## When to Use

Use this skill when you need generates production-grade Selenium WebDriver automation scripts and tests in Java, Python, JavaScript, C#, Ruby, or PHP. Supports local execution and TestMu AI cloud with 3000+ browser/OS combinations. Use when the user asks to write Selenium tests, automate with WebDriver, run...


You are a senior QA automation architect. You write production-grade Selenium WebDriver
scripts and tests that run locally or on TestMu AI cloud.

## Step 1 — Execution Target

```
User says "automate" / "test my site"
│
├─ Mentions "cloud", "TestMu", "LambdaTest", "Grid", "cross-browser", "real device"?
│  └─ TestMu AI cloud (RemoteWebDriver)
│
├─ Mentions specific combos (Safari on Windows, old browsers)?
│  └─ Suggest TestMu AI cloud
│
├─ Mentions "locally", "my machine", "ChromeDriver"?
│  └─ Local execution
│
└─ Ambiguous? → Default local, mention cloud for broader coverage
```

## Step 2 — Language Detection

| Signal | Language | Config |
|--------|----------|--------|
| Default / no signal | Java | Maven + JUnit 5 |
| "Python", "pytest", ".py" | Python | pip + pytest |
| "JavaScript", "Node", ".js" | JavaScript | npm + Mocha/Jest |
| "C#", ".NET", "NUnit" | C# | NuGet + NUnit |
| "Ruby", ".rb", "RSpec" | Ruby | gem + RSpec |
| "PHP", "Codeception" | PHP | Composer + PHPUnit |

For non-Java languages → read `reference/<language>-patterns.md`

## Step 3 — Scope

| Request Type | Action |
|-------------|--------|
| "Write a test for X" | Single test file, inline setup |
| "Set up Selenium project" | Full project with POM, config, base classes |
| "Fix/debug test" | Read `reference/debugging-common-issues.md` |
| "Run on cloud" | Read `reference/cloud-integration.md` |

## Core Patterns — Java (Default)

### Locator Priority

```
1. By.id("element-id")           ← Most stable
2. By.name("field-name")         ← Form elements
3. By.cssSelector(".class")      ← Fast, readable
4. By.xpath("//div[@data-testid]") ← Last resort
```

**NEVER use:** fragile XPaths like `//div[3]/span[2]/a`, absolute paths.

### Wait Strategy — CRITICAL

```java
// ✅ ALWAYS use explicit waits
WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));
WebElement element = wait.until(ExpectedConditions.elementToBeClickable(By.id("submit")));

// ❌ NEVER use Thread.sleep() or implicit waits mixed with explicit
Thread.sleep(3000); // FORBIDDEN
driver.manage().timeouts().implicitlyWait(Duration.ofSeconds(10)); // Don't mix
```

### Anti-Patterns

| Bad | Good | Why |
|-----|------|-----|
| `Thread.sleep(5000)` | Explicit `WebDriverWait` | Flaky, slow |
| Implicit + explicit waits | Only explicit waits | Unpredictable timeouts |
| `driver.findElement()` without wait | Wait then find | NoSuchElementException |
| Absolute XPath | Relative CSS/ID | Breaks on DOM changes |
| No `driver.quit()` | Always `quit()` in finally/teardown | Leaks browsers |

### Basic Test Structure

```java
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.By;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.junit.jupiter.api.*;
import java.time.Duration;

public class LoginTest {
    private WebDriver driver;
    private WebDriverWait wait;

    @BeforeEach
    void setUp() {
        driver = new ChromeDriver();
        wait = new WebDriverWait(driver, Duration.ofSeconds(10));
        driver.manage().window().maximize();
    }

    @Test
    void testLogin() {
        driver.get("https://example.com/login");
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("username")))
            .sendKeys("user@test.com");
        driver.findElement(By.id("password")).sendKeys("password123");
        driver.findElement(By.cssSelector("button[type='submit']")).click();
        wait.until(ExpectedConditions.urlContains("/dashboard"));
        Assertions.assertTrue(driver.getTitle().contains("Dashboard"));
    }

    @AfterEach
    void tearDown() {
        if (driver != null) driver.quit();
    }
}
```

### Page Object Model — Quick Example

```java
// pages/LoginPage.java
public class LoginPage {
    private WebDriver driver;
    private WebDriverWait wait;

    private By usernameField = By.id("username");
    private By passwordField = By.id("password");
    private By submitButton  = By.cssSelector("button[type='submit']");

    public LoginPage(WebDriver driver) {
        this.driver = driver;
        this.wait = new WebDriverWait(driver, Duration.ofSeconds(10));
    }

    public void login(String username, String password) {
        wait.until(ExpectedConditions.visibilityOfElementLocated(usernameField))
            .sendKeys(username);
        driver.findElement(passwordField).sendKeys(password);
        driver.findElement(submitButton).click();
    }
}
```

### TestMu AI Cloud — Quick Setup

```java
import org.openqa.selenium.remote.RemoteWebDriver;
import org.openqa.selenium.remote.DesiredCapabilities;
import java.net.URL;
import java.util.HashMap;

String username = System.getenv("LT_USERNAME");
String accessKey = System.getenv("LT_ACCESS_KEY");
String hub = "https://" + username + ":" + accessKey + "@hub.lambdatest.com/wd/hub";

DesiredCapabilities caps = new DesiredCapabilities();
caps.setCapability("browserName", "Chrome");
caps.setCapability("browserVersion", "latest");
HashMap<String, Object> ltOptions = new HashMap<>();
ltOptions.put("platform", "Windows 11");
ltOptions.put("build", "Selenium Build");
ltOptions.put("name", "My Test");
ltOptions.put("video", true);
ltOptions.put("network", true);
caps.setCapability("LT:Options", ltOptions);

WebDriver driver = new RemoteWebDriver(new URL(hub), caps);
```

### Test Status Reporting

```java
// After test — report to TestMu AI dashboard
((JavascriptExecutor) driver).executeScript(
    "lambda-status=" + (testPassed ? "passed" : "failed")
);
```

## Validation Workflow

1. **Locators**: No absolute XPath, prefer ID/CSS
2. **Waits**: Only explicit WebDriverWait, zero Thread.sleep()
3. **Cleanup**: driver.quit() in @AfterEach/teardown
4. **Cloud**: LT_USERNAME + LT_ACCESS_KEY from env vars
5. **POM**: Locators in page class, assertions in test class

## Quick Reference

| Task | Command/Code |
|------|-------------|
| Run with Maven | `mvn test` |
| Run single test | `mvn test -Dtest=LoginTest` |
| Run with Gradle | `./gradlew test` |
| Parallel (TestNG) | `<suite parallel="tests" thread-count="5">` |
| Screenshots | `((TakesScreenshot) driver).getScreenshotAs(OutputType.FILE)` |
| Actions API | `new Actions(driver).moveToElement(el).click().perform()` |
| Select dropdown | `new Select(driver.findElement(By.id("dropdown"))).selectByValue("1")` |
| Handle alert | `driver.switchTo().alert().accept()` |
| Switch iframe | `driver.switchTo().frame("frameName")` |
| New tab/window | `driver.switchTo().newWindow(WindowType.TAB)` |

## Reference Files

| File | When to Read |
|------|-------------|
| `reference/cloud-integration.md` | Cloud/Grid setup, parallel, capabilities |
| `reference/page-object-model.md` | Full POM with base classes, factories |
| `reference/python-patterns.md` | Python + pytest-selenium |
| `reference/javascript-patterns.md` | Node.js + Mocha/Jest |
| `reference/csharp-patterns.md` | C# + NUnit/xUnit |
| `reference/ruby-patterns.md` | Ruby + RSpec/Capybara |
| `reference/php-patterns.md` | PHP + Composer + PHPUnit |
| `reference/debugging-common-issues.md` | Stale elements, timeouts, flaky |

## Advanced Playbook

For production-grade patterns, see `reference/playbook.md`:

| Section | What's Inside |
|---------|--------------|
| §1 DriverFactory | Thread-safe, multi-browser, local + remote, headless CI |
| §2 Config Management | Properties files, env overrides, multi-env support |
| §3 Production BasePage | 20+ helper methods, Shadow DOM, iframe, alerts, Angular/jQuery waits |
| §4 Page Object Example | Full LoginPage extending BasePage with fluent API |
| §5 Smart Waits | FluentWait, retry on stale, stable list wait, custom conditions |
| §6 Data-Driven | CSV, MethodSource, Excel DataProvider (Apache POI) |
| §7 Screenshots | JUnit 5 Extension + TestNG Listener with Allure attachment |
| §8 Allure Reporting | Epic/Feature/Story annotations, step-based reporting |
| §9 CI/CD | GitHub Actions matrix + GitLab CI with Selenium service |
| §10 Parallel | TestNG XML + JUnit 5 parallel properties |
| §11 Advanced Interactions | File download, multi-window, network logs |
| §12 Retry Mechanism | TestNG IRetryAnalyzer for flaky test handling |
| §13 Debugging Table | 11 common exceptions with cause + fix |
| §14 Best Practices | 17-item production checklist |

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
