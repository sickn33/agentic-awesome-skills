---
name: modern-java-guidance
description: "Guides agents to write Java 17/21+ and Spring Boot 3.x+ code with version detection and the mjg CLI scanner instead of Java 8 and Boot 2.x patterns."
category: development
risk: safe
source: self
source_type: self
date_added: "2026-11-18"
author: wkd09
tags: [java, spring-boot, java-21, spring-security, cli]
---

# Modern Java Guidance

## Overview

Prevents AI coding agents from defaulting to Java 8 and Spring Boot 2.x legacy patterns (`javax.*`, `WebSecurityConfigurerAdapter`, `RestTemplate`, `@Autowired` field injection, `Executors.newFixedThreadPool()`, `list.get(list.size() - 1)`). Unlike general persona skills such as `java-pro`, this skill pairs lightweight instructions with version-gated CLI scanning (`mjg detect`, `mjg check`, `mjg search`, `mjg retrieve`) and respects older Java 8/11 and Spring Boot 2.x codebases without forcing upgrades.

## When to Use

- Writing, refactoring, or reviewing Java 17/21/25+ or Spring Boot 3.x+ application code.
- Auditing an existing Java or Spring Boot codebase for deprecated Boot 2.x or Java 8 idioms.
- Prefer `java-pro` for broader JVM/GraalVM tuning topics not covered by this skill's rules.

## Prerequisites

- Local workspace containing a Java or Spring Boot project (`pom.xml`, `build.gradle`, `build.gradle.kts`, or `.java-version`).
- Optional: Python 3.11+ with the `mjg` CLI (`https://github.com/wkd09/modern-java-guidance`) for automated version detection and scanning. Everything runs 100% offline with zero external network calls or credentials.

## How It Works

### 1. Establish the inputs

Inspect `pom.xml`, `build.gradle(.kts)`, `gradle/libs.versions.toml`, or `.java-version` (or run `mjg detect .` if installed).

- **Java <= 11 or Spring Boot 2.x**: Preserve existing language/framework idioms; do not emit Java 17/21 syntax or `jakarta.*` unless explicitly asked to migrate.
- **Java 17+ / Spring Boot 3.0–3.1**: Apply modern replacements (`record`, `sealed interface`, `SecurityFilterChain` Lambda DSL with CSRF enabled by default, `jakarta.*`, constructor injection, `java.time`). Keep `WebClient` or `RestTemplate` (`RestClient` requires Boot 3.2+).
- **Spring Boot 3.2+**: Prefer `RestClient` / `@HttpExchange` over `RestTemplate`.
- **Java 21+**: Prefer Pattern Matching for `switch`, `SequencedCollection.getLast()`, and `Executors.newVirtualThreadPerTaskExecutor()` for blocking I/O.

### 2. Perform the task

Use [references/java-21-25-core.md](./references/java-21-25-core.md) and [references/spring-boot-3x.md](./references/spring-boot-3x.md) (or `mjg search` / `mjg retrieve`) when writing or updating Java classes. Preserve public/legacy APIs and keep bounded thread pools for CPU-bound tasks.

### 3. Verify the result

Run `mjg check src/` (if installed) and the project's build/test command (`./mvnw test` or `./gradlew test`). Report any remaining warnings or unexecuted build checks explicitly.

## Examples

```text
User request: Add a Spring Security configuration for a Spring Boot 3.3 + Java 21 REST API.
Inputs: pom.xml specifying spring-boot-starter-parent 3.3.4 and java.version 21.
Expected result: Generates a @Bean SecurityFilterChain using Lambda DSL (authorizeHttpRequests, requestMatchers) with CSRF protection preserved by default, without WebSecurityConfigurerAdapter or antMatchers(), and passes `mjg check` with 0 findings.
```

## Limitations

- Pattern matching in `mjg` relies on static source scanning rather than full javac AST resolution; always run the project's compiler and test suite (`./mvnw test` / `./gradlew test`).
- Do not use Java `record` types for JPA `@Entity` classes, which require mutable state and no-arg constructors.

## Safety and side effects

- Read-only code guidance and local static scanning (`risk: safe`).
- `mjg detect` and `mjg check` perform read-only local filesystem reads and never transmit source code over the network.

## Sources and related skills

- Source repository: https://github.com/wkd09/modern-java-guidance (MIT License)
- Related skill: `java-pro`
