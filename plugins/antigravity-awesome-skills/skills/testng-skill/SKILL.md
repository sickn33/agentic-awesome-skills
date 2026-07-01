---
name: testng-skill
description: 'Generates TestNG tests in Java with groups, data providers, parallel execution, XML suite configuration, and listeners. Use when user mentions "TestNG", "@DataProvider", "testng.xml", "groups". Triggers on: "TestNG", "@DataProvider", "testng.xml", "TestNG suite", "parallel tests Java".'
risk: unknown
source: https://github.com/LambdaTest/agent-skills/tree/main/testng-skill
source_repo: LambdaTest/agent-skills
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/LambdaTest/agent-skills/blob/main/LICENSE
---

# TestNG Testing Skill
## When to Use

Use this skill when you need generates TestNG tests in Java with groups, data providers, parallel execution, XML suite configuration, and listeners. Use when user mentions "TestNG", "@DataProvider", "testng.xml", "groups". Triggers on: "TestNG", "@DataProvider", "testng.xml", "TestNG suite", "parallel tests Java".


## Core Patterns

### Basic Test with Groups

```java
import org.testng.annotations.*;
import org.testng.Assert;

public class LoginTest {
    @BeforeMethod
    public void setUp() { /* setup */ }

    @Test(groups = "smoke")
    public void testLoginSuccess() {
        Assert.assertTrue(loginService.login("user@test.com", "password123"));
    }

    @Test(groups = "regression", dependsOnMethods = "testLoginSuccess")
    public void testAccessDashboard() {
        Assert.assertNotNull(dashboard.getContent());
    }

    @Test(expectedExceptions = AuthenticationException.class)
    public void testLoginInvalidPassword() {
        loginService.login("user@test.com", "wrong");
    }

    @AfterMethod
    public void tearDown() { /* cleanup */ }
}
```

### Data Providers

```java
@DataProvider(name = "loginData")
public Object[][] loginData() {
    return new Object[][] {
        {"admin@test.com", "admin123", true},
        {"user@test.com", "password", true},
        {"invalid@test.com", "wrong", false},
    };
}

@Test(dataProvider = "loginData")
public void testLogin(String email, String password, boolean expected) {
    Assert.assertEquals(loginService.login(email, password), expected);
}
```

### TestNG XML Suite

```xml
<!DOCTYPE suite SYSTEM "https://testng.org/testng-1.0.dtd">
<suite name="Regression" parallel="tests" thread-count="5">
  <test name="Smoke">
    <groups><run><include name="smoke"/></run></groups>
    <classes><class name="tests.LoginTest"/></classes>
  </test>
  <test name="Full">
    <groups><run><include name="regression"/><exclude name="flaky"/></run></groups>
    <packages><package name="tests.*"/></packages>
  </test>
</suite>
```

### Parallel Execution

```xml
<suite parallel="methods" thread-count="5">   <!-- Method level -->
<suite parallel="classes" thread-count="5">    <!-- Class level -->
<suite parallel="tests" thread-count="5">      <!-- Test level -->
```

### Soft Assertions

```java
SoftAssert soft = new SoftAssert();
soft.assertEquals(user.getName(), "Alice");
soft.assertEquals(user.getAge(), 25);
soft.assertTrue(user.isActive());
soft.assertAll();  // Reports all failures at once
```

### Listeners

```java
public class TestListener implements ITestListener {
    @Override public void onTestFailure(ITestResult result) {
        System.out.println("Failed: " + result.getName());
        // Take screenshot, log, etc.
    }
}

@Listeners(TestListener.class)
public class LoginTest { /* ... */ }
```

### Lifecycle Annotations

```
@BeforeSuite → @BeforeTest → @BeforeClass → @BeforeMethod → @Test → @AfterMethod → @AfterClass → @AfterTest → @AfterSuite
```

### Anti-Patterns

| Bad | Good | Why |
|-----|------|-----|
| `dependsOnMethods` everywhere | Independent tests | Cascading failures |
| No groups | `@Test(groups = "smoke")` | Can't run subsets |
| Hard-coded test data | `@DataProvider` | Reusable |
| Priority ordering | Independent tests | Fragile |

## Quick Reference

| Task | Command |
|------|---------|
| Run suite | `mvn test -DsuiteXmlFile=testng.xml` |
| Run group | `mvn test -Dgroups=smoke` |
| Run class | `mvn test -Dtest=LoginTest` |
| Reports | `test-output/index.html` |

## Deep Patterns → `reference/playbook.md`

| § | Section | Lines |
|---|---------|-------|
| 1 | Project Setup & Configuration | Maven + Surefire config |
| 2 | Suite XML Configuration | Multi-env, parallel, groups |
| 3 | BaseTest & Thread-Safe Driver | ThreadLocal, ConfigReader |
| 4 | Data Providers (Advanced) | Excel, JSON, CSV, parallel, cross-class |
| 5 | Factory Pattern | Cross-browser matrix |
| 6 | Listeners (Production Suite) | Retry, screenshot, timing |
| 7 | Soft Assertions & Dependencies | Groups, method deps |
| 8 | Page Object Integration | PageFactory, fluent POs |
| 9 | Parallel Execution Strategies | Method/class/test/mixed |
| 10 | Reporting Integration | Allure, ExtentReports |
| 11 | CI/CD Integration | GitHub Actions, Jenkins |
| 12 | Debugging Quick-Reference | 12 common problems |
| 13 | Best Practices Checklist | 14 items |

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
