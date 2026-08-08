# Playwright Java – Project Configuration

## Maven POM (`pom.xml`)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
         http://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>

  <groupId>com.company</groupId>
  <artifactId>playwright-tests</artifactId>
  <version>1.0-SNAPSHOT</version>

  <properties>
    <java.version>17</java.version>
    <maven.compiler.source>17</maven.compiler.source>
    <maven.compiler.target>17</maven.compiler.target>
    <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
    <playwright.version>1.44.0</playwright.version>
    <junit.version>5.10.2</junit.version>
    <allure.version>2.27.0</allure.version>
    <aspectj.version>1.9.22</aspectj.version>
  </properties>

  <dependencies>
    <!-- Playwright -->
    <dependency>
      <groupId>com.microsoft.playwright</groupId>
      <artifactId>playwright</artifactId>
      <version>${playwright.version}</version>
    </dependency>

    <!-- JUnit 5 -->
    <dependency>
      <groupId>org.junit.jupiter</groupId>
      <artifactId>junit-jupiter</artifactId>
      <version>${junit.version}</version>
      <scope>test</scope>
    </dependency>
    <dependency>
      <groupId>org.junit.jupiter</groupId>
      <artifactId>junit-jupiter-params</artifactId>
      <version>${junit.version}</version>
      <scope>test</scope>
    </dependency>

    <!-- Allure JUnit5 -->
    <dependency>
      <groupId>io.qameta.allure</groupId>
      <artifactId>allure-junit5</artifactId>
      <version>${allure.version}</version>
      <scope>test</scope>
    </dependency>

    <!-- AssertJ (for SoftAssertions) -->
    <dependency>
      <groupId>org.assertj</groupId>
      <artifactId>assertj-core</artifactId>
      <version>3.25.3</version>
      <scope>test</scope>
    </dependency>

    <!-- Jackson for JSON test data -->
    <dependency>
      <groupId>com.fasterxml.jackson.core</groupId>
      <artifactId>jackson-databind</artifactId>
      <version>2.17.1</version>
    </dependency>

    <!-- Faker for dynamic test data -->
    <dependency>
      <groupId>net.datafaker</groupId>
      <artifactId>datafaker</artifactId>
      <version>2.2.2</version>
    </dependency>

    <!-- SLF4J + Logback -->
    <dependency>
      <groupId>ch.qos.logback</groupId>
      <artifactId>logback-classic</artifactId>
      <version>1.5.6</version>
    </dependency>
  </dependencies>

  <build>
    <plugins>
      <!-- Surefire with Allure agent + parallel support -->
      <plugin>
        <groupId>org.apache.maven.plugins</groupId>
        <artifactId>maven-surefire-plugin</artifactId>
        <version>3.2.5</version>
        <configuration>
          <argLine>
            -javaagent:"${settings.localRepository}/org/aspectj/aspectjweaver/${aspectj.version}/aspectjweaver-${aspectj.version}.jar"
          </argLine>
          <systemPropertyVariables>
            <browser>${browser}</browser>
            <headless>${headless}</headless>
            <baseUrl>${baseUrl}</baseUrl>
            <allure.results.directory>${project.build.directory}/allure-results</allure.results.directory>
          </systemPropertyVariables>
          <properties>
            <configurationParameters>
              junit.jupiter.execution.parallel.enabled=true
              junit.jupiter.execution.parallel.mode.default=concurrent
              junit.jupiter.execution.parallel.config.strategy=fixed
              junit.jupiter.execution.parallel.config.fixed.parallelism=4
            </configurationParameters>
          </properties>
        </configuration>
        <dependencies>
          <dependency>
            <groupId>org.aspectj</groupId>
            <artifactId>aspectjweaver</artifactId>
            <version>${aspectj.version}</version>
          </dependency>
        </dependencies>
      </plugin>

      <!-- Allure Maven plugin -->
      <plugin>
        <groupId>io.qameta.allure</groupId>
        <artifactId>allure-maven</artifactId>
        <version>2.12.0</version>
        <configuration>
          <reportVersion>${allure.version}</reportVersion>
        </configuration>
      </plugin>
    </plugins>
  </build>
</project>
```

---

## `test.properties`

```properties
# src/test/resources/test.properties
baseUrl=https://your-app.com
apiBaseUrl=https://api.your-app.com
browser=chromium
headless=true
slowMo=0
defaultTimeout=30000
navigationTimeout=60000
```

---

## `ConfigReader.java`

```java
package com.company.tests.config;

import java.io.IOException;
import java.io.InputStream;
import java.util.Properties;

public final class ConfigReader {
    private static final Properties props = new Properties();

    static {
        try (InputStream in = ConfigReader.class
                .getClassLoader()
                .getResourceAsStream("test.properties")) {
            if (in != null) props.load(in);
        } catch (IOException e) {
            throw new RuntimeException("Cannot load test.properties", e);
        }
    }

    public static String getBaseUrl() {
        return System.getProperty("baseUrl", props.getProperty("baseUrl", "http://localhost:3000"));
    }

    public static int getDefaultTimeout() {
        String val = System.getProperty("defaultTimeout", props.getProperty("defaultTimeout", "30000"));
        return Integer.parseInt(val);
    }

    public static boolean isHeadless() {
        return Boolean.parseBoolean(System.getProperty("headless", props.getProperty("headless", "true")));
    }
}
```

---

## Browser Installation (First-Time Setup)

```bash
# Install browsers for current OS
mvn exec:java -e -Dexec.mainClass=com.microsoft.playwright.CLI -Dexec.args="install"

# Install with system dependencies (needed in CI/Docker)
mvn exec:java -e -Dexec.mainClass=com.microsoft.playwright.CLI -Dexec.args="install --with-deps"

# Install specific browser only
mvn exec:java -e -Dexec.mainClass=com.microsoft.playwright.CLI -Dexec.args="install chromium"
```

---

## Running Tests

```bash
# All tests, headless Chromium
mvn test

# Specific browser
mvn test -Dbrowser=firefox

# Headed mode (debug)
mvn test -Dheadless=false -DslowMo=500

# Single test class
mvn test -Dtest=LoginTest

# Generate Allure report
mvn allure:serve

# Export report to directory
mvn allure:report
```

---

## Docker / CI Environment

```dockerfile
FROM mcr.microsoft.com/playwright/java:v1.44.0-jammy
WORKDIR /app
COPY . .
RUN mvn dependency:resolve
CMD ["mvn", "test", "-Dheadless=true"]
```
