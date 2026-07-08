---
adapter:
  language: rust
  display_name: "Rust"
  version: "1.0"

  detection:
    files: [Cargo.toml, Cargo.lock]
    content_patterns:
      - file: "Cargo.toml"
        pattern: '\\[package\\]'
    confidence: 0.95

  commands:
    build: "cargo build"
    test: "cargo test"
    lint: "cargo clippy -- -D warnings"
    lint_arch: null  # Rust module system enforces architecture naturally
    format: "cargo fmt"
    start: "cargo run"
    dev: "cargo watch -x run"

  package_manager:
    detection: []  # Cargo is built-in
    default: "cargo"
    install_command: "cargo build"

  route_detection:
    server_indicators:
      - pattern: 'use actix_web|actix_web::'
        description: "Actix-web framework"
        frameworks: ["actix-web"]
      - pattern: 'use axum|axum::'
        description: "Axum web framework"
        frameworks: ["axum"]
      - pattern: 'use rocket|#\[rocket::main\]'
        description: "Rocket web framework"
        frameworks: ["rocket"]
      - pattern: 'use warp|warp::'
        description: "Warp web framework"
        frameworks: ["warp"]
      - pattern: 'use hyper|hyper::'
        description: "Hyper HTTP library"
        frameworks: ["hyper"]
      - pattern: 'use tide|tide::'
        description: "Tide web framework"
        frameworks: ["tide"]

    cli_indicators:
      - pattern: 'use clap|clap::'
        description: "Clap CLI framework"
        frameworks: ["clap"]
      - pattern: 'use structopt|structopt::'
        description: "StructOpt CLI (legacy clap)"
        frameworks: ["structopt"]
      - pattern: 'std::env::args'
        description: "Standard library args parsing"
        frameworks: ["stdlib"]

    frontend_indicators:
      - pattern: 'use leptos|leptos::'
        description: "Leptos WASM framework"
        frameworks: ["leptos"]
      - pattern: 'use yew|yew::'
        description: "Yew WASM framework"
        frameworks: ["yew"]
      - pattern: 'use dioxus|dioxus::'
        description: "Dioxus UI framework"
        frameworks: ["dioxus"]

    patterns:
      # Actix-web
      - type: route
        regex: '#\[(?:web::)?(get|post|put|delete|patch)\s*\(\s*"([^"]+)"'
        groups: [method, path]
        frameworks: ["actix-web"]
      # Axum
      - type: route
        regex: '\.(get|post|put|delete|patch)\s*\(\s*"([^"]+)"'
        groups: [method, path]
        frameworks: ["axum"]
      # Rocket
      - type: route
        regex: '#\[(get|post|put|delete|patch)\s*\(\s*"([^"]+)"'
        groups: [method, path]
        frameworks: ["rocket"]
      # Clap derive
      - type: command
        regex: '#\[command\s*\(.*name\s*=\s*"([^"]+)"'
        groups: [command_name]
        frameworks: ["clap"]
      # Clap builder
      - type: command
        regex: 'Command::new\s*\(\s*"([^"]+)"'
        groups: [command_name]
        frameworks: ["clap"]

  import_analysis:
    list_packages: "cargo metadata --format-version 1"
    import_pattern: "use\\s+([\\w:]+)"
    source_extensions: [".rs"]
    module_root_file: "Cargo.toml"

  layer_conventions:
    patterns:
      - layer: 0
        paths: ["src/models", "src/types", "src/domain"]
        description: "Domain types and models"
      - layer: 1
        paths: ["src/utils", "src/common", "src/lib.rs"]
        description: "Shared utilities"
      - layer: 2
        paths: ["src/services", "src/core", "src/repository"]
        description: "Business logic"
      - layer: 3
        paths: ["src/handlers", "src/routes", "src/api"]
        description: "HTTP/API handlers"
      - layer: 4
        paths: ["src/main.rs", "src/bin"]
        description: "Entry points"

  dependency_detection:
    manifest_file: "Cargo.toml"
    databases:
      - pattern: 'sqlx.*postgres|tokio-postgres|diesel.*postgres'
        type: "postgres"
        default_port: 5432
      - pattern: 'sqlx.*mysql|diesel.*mysql'
        type: "mysql"
        default_port: 3306
      - pattern: 'mongodb'
        type: "mongodb"
        default_port: 27017
      - pattern: 'redis|deadpool-redis'
        type: "redis"
        default_port: 6379
      - pattern: 'rusqlite|sqlx.*sqlite'
        type: "sqlite"
        default_port: 0
    services:
      - pattern: 'rdkafka|kafka'
        type: "kafka"
        default_port: 9092
      - pattern: 'lapin|amqp'
        type: "rabbitmq"
        default_port: 5672
      - pattern: 'elasticsearch'
        type: "elasticsearch"
        default_port: 9200
    env_var_patterns:
      - pattern: 'std::env::var\(\s*"([^"]+)"'
      - pattern: 'env::var\(\s*"([^"]+)"'
      - pattern: 'dotenv::var\(\s*"([^"]+)"'

  linter:
    template_section: "rust-linter"
    script_extension: ".rs"
    run_command: "cargo clippy"

  naming:
    file_pattern: "^[a-z][a-z0-9_]*\\.rs$"
    test_pattern: "^[a-z][a-z0-9_]*\\.rs$"  # Tests are inline in Rust
    directory_style: "snake_case"

  ci:
    github_actions:
      image: null
      setup_steps:
        - "uses: dtolnay/rust-toolchain@stable\n  with:\n    components: clippy, rustfmt"
      cache_paths: ["~/.cargo/registry", "~/.cargo/git", "target"]
---

# Rust Adapter

## Architecture Note

Rust's module system (`mod`, `pub`, `pub(crate)`) naturally enforces encapsulation.
The `lint_arch` command is `null` because Rust's compiler already prevents many
dependency violations at compile time. However, a custom architectural linter can
still be valuable for enforcing higher-level layer boundaries.

## Server Start Command Inference

1. Existing `harness/config/environment.json` startup command, if present
2. `Cargo.toml` has `[[bin]]` section → `cargo run --bin <name>`
3. Default → `cargo run`

For release builds: `cargo build --release && ./target/release/<name>`

## Framework-Specific Notes

### Axum
- Router-based: `Router::new().route("/path", get(handler))`
- Extractors for request parsing: `Json<T>`, `Path<T>`, `Query<T>`
- State sharing via `Extension` or `State`
- Default: runs on `0.0.0.0:3000`

### Actix-web
- Attribute macros: `#[get("/path")]`, `#[post("/path")]`
- App factory pattern: `App::new().service(handler)`
- Default: `HttpServer::new(...).bind("127.0.0.1:8080")`

### Rocket
- Attribute macros: `#[get("/path")]`, `#[post("/path")]`
- Fairings for middleware
- Config via `Rocket.toml`

## Testing Patterns

- Unit tests: inline `#[cfg(test)] mod tests { ... }` in same file
- Integration tests: `tests/` directory at crate root
- `cargo test` runs both
- Useful flags: `cargo test -- --nocapture` (show println output)

## Workspace Support

If `[workspace]` in root `Cargo.toml`:
- Each member crate may have its own layer conventions
- Build: `cargo build --workspace`
- Test: `cargo test --workspace`
