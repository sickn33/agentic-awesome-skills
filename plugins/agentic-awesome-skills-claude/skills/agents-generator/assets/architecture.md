# Architecture Rules

## {{PROJECT_TYPE_TITLE}}

{{PROJECT_TYPE_DESCRIPTION}}

```text
{{ARCHITECTURE_DIAGRAM}}
```

## Stack

| Layer           | Technology | Version |
| --------------- | ---------- | ------- |
| {{STACK_TABLE}} |

## {{ROUTING_SECTION_TITLE}}

{{ROUTING_TABLE}}

## Data Flow

```
{{DATA_FLOW}}
```

{{SERVER_ACTION_VS_API_SECTION}}

{{RATE_LIMIT_SECTION}}

{{LANGUAGE_SECTION}}

## Generation Rules

- **PROJECT_TYPE_TITLE**: "Single App Structure" if not monorepo, "Monorepo Structure" if monorepo.
- **ARCHITECTURE_DIAGRAM**: ASCII art of the main directory layout. For monorepos, show apps + shared packages + their relationships. For single apps, show app/ → components/ + lib/ + external service connections.
- **STACK_TABLE**: Extract from package.json + config files. Each row: layer, technology, exact version.
- **ROUTING_SECTION_TITLE**: "Routes" for Next.js App Router, "Endpoints" for NestJS/Express, "Routes" generic.
- **ROUTING_TABLE**: List every route with type (server/client/API) and description. Read from app/ or src/app/.
- **DATA_FLOW**: ASCII diagram of the main data flow (user action → frontend → backend → database/external → response). Use real function names.
- **SERVER_ACTION_VS_API_SECTION**: If both server actions and API routes exist, explain which is primary and their differences. If only one, skip the comparison.
- **RATE_LIMIT_SECTION**: If rate-limit.ts or rate limiting middleware exists, document it with limits and expiry.
- **LANGUAGE_SECTION**: If the project uses i18n or has UI in a language other than English, document it.
