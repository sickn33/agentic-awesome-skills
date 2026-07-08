---
adapter:
  language: java
  display_name: "Java / Kotlin"
  version: "1.0"

  detection:
    files: [pom.xml, build.gradle, build.gradle.kts, settings.gradle, settings.gradle.kts]
    content_patterns:
      - file: "pom.xml"
        pattern: "<groupId>"
      - file: "build.gradle.kts"
        pattern: "plugins|dependencies"
    confidence: 0.90

  commands:
    build: null   # Detected from build tool
    test: null    # Detected from build tool
    lint: null    # Often spotbugs, checkstyle, or ktlint
    lint_arch: null
    format: null
    start: null
    dev: null

  package_manager:
    detection:
      - lockfile: "pom.xml"
        manager: "maven"
      - lockfile: "build.gradle"
        manager: "gradle"
      - lockfile: "build.gradle.kts"
        manager: "gradle"
    default: "maven"
    install_command: null  # Dependencies resolved during build

  route_detection:
    server_indicators:
      - pattern: '@RestController|@Controller|@RequestMapping'
        description: "Spring MVC/Boot controller"
        frameworks: ["spring"]
      - pattern: 'import io\.micronaut'
        description: "Micronaut framework"
        frameworks: ["micronaut"]
      - pattern: 'import io\.quarkus'
        description: "Quarkus framework"
        frameworks: ["quarkus"]
      - pattern: 'import io\.vertx'
        description: "Vert.x framework"
        frameworks: ["vertx"]
      - pattern: 'import io\.ktor'
        description: "Ktor framework (Kotlin)"
        frameworks: ["ktor"]
      - pattern: 'import io\.javalin'
        description: "Javalin web framework"
        frameworks: ["javalin"]

    cli_indicators:
      - pattern: 'import picocli|@CommandLine'
        description: "picocli CLI framework"
        frameworks: ["picocli"]
      - pattern: 'public static void main\(String'
        description: "Java main method (potential CLI)"
        frameworks: ["stdlib"]

    frontend_indicators: []

    patterns:
      # Spring MVC annotations
      - type: route
        regex: '@(GetMapping|PostMapping|PutMapping|DeleteMapping|PatchMapping)\s*\(\s*(?:value\s*=\s*)?["\x27]([^"\x27]*)["\x27]'
        groups: [method, path]
        frameworks: ["spring"]
      # Spring RequestMapping
      - type: route
        regex: '@RequestMapping\s*\(.*(?:value|path)\s*=\s*["\x27]([^"\x27]+)["\x27].*method\s*=\s*RequestMethod\.(\w+)'
        groups: [path, method]
        frameworks: ["spring"]
      # Ktor (Kotlin)
      - type: route
        regex: '(get|post|put|delete|patch)\s*\(\s*["\x27]([^"\x27]+)["\x27]'
        groups: [method, path]
        frameworks: ["ktor"]
      # Javalin
      - type: route
        regex: 'app\.(get|post|put|delete|patch)\s*\(\s*["\x27]([^"\x27]+)["\x27]'
        groups: [method, path]
        frameworks: ["javalin"]

  import_analysis:
    list_packages: null
    import_pattern: "^import\\s+([\\w.]+)"
    source_extensions: [".java", ".kt"]
    module_root_file: "pom.xml"

  layer_conventions:
    patterns:
      - layer: 0
        paths: ["src/main/java/**/model", "src/main/java/**/entity", "src/main/java/**/dto"]
        description: "Domain models, entities, DTOs"
      - layer: 1
        paths: ["src/main/java/**/util", "src/main/java/**/common", "src/main/java/**/config"]
        description: "Utilities and configuration"
      - layer: 2
        paths: ["src/main/java/**/service", "src/main/java/**/repository", "src/main/java/**/dao"]
        description: "Service and data access layer"
      - layer: 3
        paths: ["src/main/java/**/controller", "src/main/java/**/api", "src/main/java/**/resource"]
        description: "REST controllers, API endpoints"
      - layer: 4
        paths: ["src/main/java/**/Application.java", "src/main/java/**/Main.java"]
        description: "Application entry point"

  dependency_detection:
    manifest_file: "pom.xml"
    databases:
      - pattern: "postgresql|postgres"
        type: "postgres"
        default_port: 5432
      - pattern: "mysql-connector"
        type: "mysql"
        default_port: 3306
      - pattern: "mongodb-driver|mongo-java-driver"
        type: "mongodb"
        default_port: 27017
      - pattern: "jedis|lettuce-core|spring-data-redis"
        type: "redis"
        default_port: 6379
      - pattern: "h2|sqlite-jdbc"
        type: "sqlite"
        default_port: 0
    services:
      - pattern: "kafka-clients|spring-kafka"
        type: "kafka"
        default_port: 9092
      - pattern: "amqp-client|spring-amqp|spring-rabbit"
        type: "rabbitmq"
        default_port: 5672
      - pattern: "elasticsearch-rest-client|spring-data-elasticsearch"
        type: "elasticsearch"
        default_port: 9200
    env_var_patterns:
      - pattern: 'System\.getenv\(\s*["\x27]([^"\x27]+)["\x27]\)'
      - pattern: '\\$\\{([A-Z_][A-Z0-9_]*)\\}'

  linter:
    template_section: "java-linter"
    script_extension: ".java"
    run_command: null  # Typically integrated into build tool (spotbugs, checkstyle)

  naming:
    file_pattern: "^[A-Z][a-zA-Z0-9]*\\.java$"
    test_pattern: "^[A-Z][a-zA-Z0-9]*Test\\.java$"
    directory_style: "lowercase"

  ci:
    github_actions:
      image: null  # Uses setup-java action
      setup_steps:
        - "uses: actions/setup-java@v4\n  with:\n    distribution: 'temurin'\n    java-version: '21'"
      cache_paths: ["~/.m2/repository", "~/.gradle/caches"]
---

# Java / Kotlin Adapter

## Build Tool Detection

| File | Build Tool | Build Command | Test Command |
|------|-----------|---------------|--------------|
| `pom.xml` | Maven | `mvn package -DskipTests` | `mvn test` |
| `build.gradle` | Gradle (Groovy) | `./gradlew build -x test` | `./gradlew test` |
| `build.gradle.kts` | Gradle (Kotlin DSL) | `./gradlew build -x test` | `./gradlew test` |

If `mvnw` or `gradlew` wrapper exists, prefer the wrapper over system-installed tool.

## Server Start Command Inference

1. Existing `harness/config/environment.json` startup command, if present
2. Spring Boot → `./gradlew bootRun` or `mvn spring-boot:run`
3. Fat JAR exists → `java -jar target/*.jar` or `java -jar build/libs/*.jar`
4. Main class annotated with `@SpringBootApplication` → infer from pom.xml/build.gradle

## Framework-Specific Notes

### Spring Boot
- Routes via annotations: `@GetMapping("/path")`, `@PostMapping("/path")`
- Controller prefix: `@RequestMapping("/api/v1")` on class
- Auto-configuration: `application.properties` or `application.yml`
- Default port: 8080 (configurable via `server.port`)
- Actuator health: `/actuator/health`

### Micronaut
- Similar annotation style to Spring: `@Get("/path")`, `@Post("/path")`
- Compile-time DI (no reflection)
- Default port: 8080

### Ktor (Kotlin)
- DSL-based routing: `routing { get("/path") { ... } }`
- Configuration via `application.conf` (HOCON) or `application.yaml`

## Testing Patterns

- JUnit 5 is standard: `@Test`, `@ParameterizedTest`
- Kotlin: same JUnit 5 + kotest as alternative
- Integration tests often use `@SpringBootTest` + Testcontainers
- Test directory: `src/test/java/` or `src/test/kotlin/`
