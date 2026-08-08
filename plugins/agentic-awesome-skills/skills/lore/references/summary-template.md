# SUMMARY.md template

`compress` generates/refreshes `SUMMARY.md` from existing entries. This file holds the schema and worked example.

## Skeleton

```markdown
# .lore SUMMARY

> Last compressed: <YYYY-MM-DD>
> Total entries: <N> across <M> scopes

## Global (`_global/`)

### Architecture
- <bullet> — [_global/ARCHITECTURE.md#<ID>]
- ...

### Decisions
- ...

### Conventions
- ...

## Scope: <name>

### Architecture
- ...

### Decisions
- ...

### Conventions
- ...

## Scope: <name2>
...
```

## Selection rule (3–5 entries per scope per layer)

For each (scope, layer) tuple, pick entries by this priority:

1. Most recent `#verified` date wins
2. Tiebreaker: most recent `#added` date
3. Tiebreaker: entries that contain "primary" / "main" / "core" / "use <X>" — these are typically the anchor facts

If a (scope, layer) has fewer than 3 entries, include all of them.

If a (scope, layer) is empty, omit the subsection entirely.

## Worked example

```markdown
# .lore SUMMARY

> Last compressed: 2026-07-09
> Total entries: 247 across 3 scopes

## Global (`_global/`)

### Architecture
- Monorepo with pnpm workspaces + Turborepo — [_global/ARCHITECTURE.md#ARCH-2026-01-15-d7a3]
- Node.js 20 baseline — [_global/ARCHITECTURE.md#ARCH-2026-02-01-9b1c]

### Decisions
- Rejected Nx → chose Turborepo (faster builds, simpler config) — [_global/DECISIONS.md#DEC-2026-02-03-7c19]

### Conventions
- All packages use TypeScript strict mode — [_global/CONVENTIONS.md#CONV-2026-01-20-b1e8]

## Scope: frontend

### Architecture
- Next.js 14 App Router — [scopes/frontend/ARCHITECTURE.md#ARCH-2026-03-10-a1b2]
- TanStack Query for server state — [scopes/frontend/ARCHITECTURE.md#ARCH-2026-03-15-e5f6]

### Decisions
- Zustand over Redux (60% less boilerplate) — [scopes/frontend/DECISIONS.md#DEC-2026-02-03-7c19]

### Conventions
- No default exports — [scopes/frontend/CONVENTIONS.md#CONV-2026-04-12-c3d4]

## Scope: backend

### Architecture
- Node.js + Fastify + PostgreSQL — [scopes/backend/ARCHITECTURE.md#ARCH-2026-01-15-e5f6]

### Decisions
- Fastify over Express (3x throughput in our benchmarks) — [scopes/backend/DECISIONS.md#DEC-2026-02-10-a8c9]

### Conventions
- All DB queries go through repository pattern — [scopes/backend/CONVENTIONS.md#CONV-2026-03-01-b1d2]
```

## Idempotency

Running `compress` twice without intervening `sync`s produces identical content (modulo the `Last compressed:` date). This is intentional — compress is a pure projection of the underlying entries.