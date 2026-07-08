# Actor Logging Reference

## JavaScript and TypeScript

**ALWAYS use the `apify/log` package for logging** - This package contains critical security logic including censoring sensitive data (Apify tokens, API keys, credentials) to prevent accidental exposure in logs.

### Available Log Levels in `apify/log`

The Apify log package provides the following methods for logging:

- `log.debug()` - Debug level logs (detailed diagnostic information)
- `log.info()` - Info level logs (general informational messages)
- `log.warning()` - Warning level logs (warning messages for potentially problematic situations)
- `log.warningOnce()` - Warning level logs (same warning message logged only once)
- `log.error()` - Error level logs (error messages for failures)
- `log.exception()` - Exception level logs (for exceptions with stack traces)
- `log.perf()` - Performance level logs (performance metrics and timing information)
- `log.deprecated()` - Deprecation level logs (warnings about deprecated code)
- `log.softFail()` - Soft failure logs (non-critical failures that don't stop execution, e.g., input validation errors, skipped items)
- `log.internal()` - Internal level logs (internal/system messages)

### Best Practices

- Use `log.debug()` for detailed operation-level diagnostics (inside functions)
- Use `log.info()` for general informational messages (API requests, successful operations)
- Use `log.warning()` for potentially problematic situations (validation failures, unexpected states)
- Use `log.error()` for actual errors and failures
- Use `log.exception()` for caught exceptions with stack traces

## Python

**ALWAYS use `Actor.log` for logging** - This logger contains critical security logic including censoring sensitive data (Apify tokens, API keys, credentials) to prevent accidental exposure in logs.

### Available Log Levels

The Apify Actor logger provides the following methods for logging:

- `Actor.log.debug()` - Debug level logs (detailed diagnostic information)
- `Actor.log.info()` - Info level logs (general informational messages)
- `Actor.log.warning()` - Warning level logs (warning messages for potentially problematic situations)
- `Actor.log.error()` - Error level logs (error messages for failures)
- `Actor.log.exception()` - Exception level logs (for exceptions with stack traces)

### Best Practices

- Use `Actor.log.debug()` for detailed operation-level diagnostics (inside functions)
- Use `Actor.log.info()` for general informational messages (API requests, successful operations)
- Use `Actor.log.warning()` for potentially problematic situations (validation failures, unexpected states)
- Use `Actor.log.error()` for actual errors and failures
- Use `Actor.log.exception()` for caught exceptions with stack traces
