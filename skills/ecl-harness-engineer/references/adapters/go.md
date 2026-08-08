---
adapter:
  language: go
  display_name: "Go"
  version: "1.0"

  detection:
    files: [go.mod, go.sum]
    confidence: 0.95

  commands:
    build: "go build ./..."
    test: "go test ./..."
    lint: "golangci-lint run"
    lint_arch: "make lint-arch"
    format: "gofmt -w ."
    start: null   # Inferred from cmd/ structure or main.go
    dev: null      # Often uses "air" but not assumed

  package_manager:
    detection: []  # Go modules are built-in
    default: "go"
    install_command: "go mod download"

  route_detection:
    server_indicators:
      - pattern: 'http\.ListenAndServe|http\.Server\{|\.Listen\('
        description: "Standard library HTTP server"
        frameworks: ["net/http"]
      - pattern: 'gin\.Default|gin\.New'
        description: "Gin web framework"
        frameworks: ["gin"]
      - pattern: 'chi\.NewRouter|chi\.NewMux'
        description: "Chi router"
        frameworks: ["chi"]
      - pattern: 'echo\.New\(\)'
        description: "Echo web framework"
        frameworks: ["echo"]
      - pattern: 'mux\.NewRouter'
        description: "Gorilla Mux router"
        frameworks: ["gorilla/mux"]
      - pattern: 'fiber\.New\(\)'
        description: "Fiber web framework"
        frameworks: ["fiber"]

    cli_indicators:
      - pattern: 'github\.com/spf13/cobra'
        description: "Cobra CLI framework"
        frameworks: ["cobra"]
      - pattern: 'github\.com/urfave/cli'
        description: "urfave/cli framework"
        frameworks: ["urfave/cli"]
      - pattern: 'flag\.Parse\(\)|flag\.String\('
        description: "Standard library flags"
        frameworks: ["flag"]

    frontend_indicators: []  # Go is not typically used for frontend

    patterns:
      # Chi router
      - type: route
        regex: 'r\.(Get|Post|Put|Delete|Patch|Head|Options)\s*\(\s*["\x27]([^"\x27]+)["\x27]'
        groups: [method, path]
        frameworks: ["chi"]
      # Gin
      - type: route
        regex: '\.(GET|POST|PUT|DELETE|PATCH)\s*\(\s*["\x27]([^"\x27]+)["\x27]'
        groups: [method, path]
        frameworks: ["gin"]
      # Echo
      - type: route
        regex: 'e\.(GET|POST|PUT|DELETE|PATCH)\s*\(\s*["\x27]([^"\x27]+)["\x27]'
        groups: [method, path]
        frameworks: ["echo"]
      # Gorilla Mux
      - type: route
        regex: '\.HandleFunc\s*\(\s*["\x27]([^"\x27]+)["\x27].*\)\.(Methods)\s*\(\s*["\x27]([^"\x27]+)["\x27]\)'
        groups: [path, _, method]
        frameworks: ["gorilla/mux"]
      # net/http
      - type: route
        regex: 'http\.HandleFunc\s*\(\s*["\x27]([^"\x27]+)["\x27]'
        groups: [path]
        frameworks: ["net/http"]
      # Cobra CLI
      - type: command
        regex: '&cobra\.Command\s*\{\s*Use:\s*["\x27]([^"\x27\s]+)'
        groups: [command_name]
        frameworks: ["cobra"]

  import_analysis:
    list_packages: "go list -json ./..."
    import_pattern: '"([^"]+)"'
    source_extensions: [".go"]
    module_root_file: "go.mod"

  layer_conventions:
    patterns:
      - layer: 0
        paths: ["internal/types", "types", "domain", "model", "entity"]
        description: "Pure types, zero internal imports"
      - layer: 1
        paths: ["internal/utils", "utils", "pkg/utils", "lib"]
        description: "Utilities, depend only on types"
      - layer: 2
        paths: ["internal/core", "core", "internal/service", "service"]
        description: "Business logic, depend on types + utils"
      - layer: 3
        paths: ["internal/handler", "handler", "api", "internal/api"]
        description: "HTTP/gRPC handlers, depend on core"
      - layer: 4
        paths: ["cmd"]
        description: "Entry points, depend on everything"

  dependency_detection:
    manifest_file: "go.mod"
    databases:
      - pattern: "github.com/jackc/pgx|github.com/lib/pq"
        type: "postgres"
        default_port: 5432
      - pattern: "github.com/go-sql-driver/mysql"
        type: "mysql"
        default_port: 3306
      - pattern: "go.mongodb.org/mongo-driver"
        type: "mongodb"
        default_port: 27017
      - pattern: "github.com/go-redis/redis|github.com/redis/go-redis"
        type: "redis"
        default_port: 6379
      - pattern: "github.com/mattn/go-sqlite3|modernc.org/sqlite"
        type: "sqlite"
        default_port: 0
    services:
      - pattern: "github.com/segmentio/kafka-go|github.com/IBM/sarama"
        type: "kafka"
        default_port: 9092
      - pattern: "github.com/rabbitmq/amqp091-go|github.com/streadway/amqp"
        type: "rabbitmq"
        default_port: 5672
      - pattern: "github.com/nats-io/nats.go"
        type: "nats"
        default_port: 4222
      - pattern: "github.com/elastic/go-elasticsearch"
        type: "elasticsearch"
        default_port: 9200
    env_var_patterns:
      - pattern: 'os\.Getenv\("([^"]+)"\)'
      - pattern: 'os\.LookupEnv\("([^"]+)"\)'
      - pattern: 'viper\.\w+\("([^"]+)"\)'

  linter:
    template_section: "go-linter"
    script_extension: ".go"
    run_command: "go run scripts/lint-deps.go"

  naming:
    file_pattern: "^[a-z][a-z0-9_]*\\.go$"
    test_pattern: "^[a-z][a-z0-9_]*_test\\.go$"
    directory_style: "snake_case"

  ci:
    github_actions:
      image: "golang:1.22"
      setup_steps:
        - "uses: actions/setup-go@v5\n  with:\n    go-version: '1.22'"
      cache_paths: ["~/go/pkg/mod", "~/.cache/go-build"]
---

# Go Adapter

## Server Start Command Inference

Priority order for detecting the server start command:

1. Existing `harness/config/environment.json` startup command, if present
2. `cmd/server/main.go` exists → `go run cmd/server/main.go`
3. `cmd/api/main.go` exists → `go run cmd/api/main.go`
4. `main.go` at root with `http` import → `go run main.go`
5. Fail with actionable error

## CLI Binary Inference

1. `cmd/cli/main.go` exists → `go build -o bin/cli cmd/cli/main.go`
2. `cmd/<name>/main.go` exists → `go build -o bin/<name> cmd/<name>/main.go`
3. `main.go` at root with `cobra`/`flag` import → `go build -o bin/app .`

## Testing Patterns

- Unit tests: `*_test.go` files alongside source
- Integration tests: `//go:build integration` build tag → `go test -tags=integration ./...`
- Table-driven tests are idiomatic

## Common Frameworks

| Framework | Detection Pattern | Route Style |
|-----------|------------------|-------------|
| chi | `github.com/go-chi/chi` | `r.Get("/path", handler)` |
| gin | `github.com/gin-gonic/gin` | `r.GET("/path", handler)` |
| echo | `github.com/labstack/echo` | `e.GET("/path", handler)` |
| fiber | `github.com/gofiber/fiber` | `app.Get("/path", handler)` |
| gorilla/mux | `github.com/gorilla/mux` | `r.HandleFunc("/path", handler).Methods("GET")` |
| net/http | stdlib | `http.HandleFunc("/path", handler)` |

## Structured Logging

Go projects should use structured loggers. Common patterns to detect:
- `go.uber.org/zap` → `zap.String()`, `zap.Int()`
- `log/slog` (stdlib) → `slog.Info()`, `slog.With()`
- `github.com/rs/zerolog` → `log.Info().Str().Msg()`
- `github.com/sirupsen/logrus` → `logrus.WithFields()`

Unstructured patterns to flag: `log.Printf`, `log.Println`, `log.Fatalf`, `fmt.Printf` (in non-CLI code)
