# Backend Patterns (NestJS)

## Module Architecture (Screaming Architecture)

Each business module is a directory with its own module, controller, and service:

```text
src/{feature}/
  {feature}.module.ts       # NestJS module
  {feature}.controller.ts   # REST routes
  {feature}-crud.service.ts # Business logic
  constants.ts              # Module constants
  __tests__/                # Unit tests
```

## Rules

- DTOs decorated with validation, validated via global pipe (ZodValidationPipe or class-validator).
- Dynamic/unmodelable body: receive as `unknown` in controller, cast to narrowest concrete interface in service — never `any`.
- When splitting a god service, each new service injects only its own dependencies.
- Services inject the database service from the shared package, not the generated client directly.
- Role-checking: use enum values directly from the shared package.
- Use `@nestjs/swagger` decorators for exposed endpoint documentation.

## Error Handling

- Global exception filter catches all unhandled exceptions.
- Handle database errors: unique constraint, not found, foreign key, relation violation.
- Typed business errors with code + consistent message.
- Standard HTTP exceptions for common cases.
- Auto-log errors >=500 with stack trace.

## Generation Rules

This template is only used when `@nestjs/core` is detected in dependencies. Adapt all paths and module names based on the actual project structure found in `src/`.
