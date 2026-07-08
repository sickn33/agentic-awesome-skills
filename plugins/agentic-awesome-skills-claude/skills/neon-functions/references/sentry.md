# Integrations and observability

A Neon Function is a **long-lived Node.js 24 process running a web-standard request/response handler** — not an edge worker or a short-lived lambda. That means any integration SDK that works in an ordinary Node process works here unchanged: you initialize it once at module load, before your handler starts serving requests, and it stays instrumented for the life of the isolate.

This reference walks through wiring up Sentry for error and performance monitoring; the same shape (init module imported first, gated on an env var, secret passed at deploy time) applies to other Node SDKs (OpenTelemetry, logging, analytics).

## Sentry (error & performance monitoring)

Because the runtime is a normal Node process, use the Node SDK `@sentry/node` — not an edge/serverless wrapper. It bundles cleanly through `neon deploy`'s esbuild with no extra build config.

There are three layers worth instrumenting, and errors from all of them flow into a single Sentry project:

1. The HTTP framework (unhandled route errors).
2. The Node function runtime (uncaught exceptions / unhandled rejections, captured by the SDK).
3. The application's own caught failures — e.g. an agent that retries and falls back instead of throwing.

### 1. Initialize before anything else

Put `Sentry.init` in its own module and import it as the very first import of your entry file, so the process is instrumented before any other code (your handler, the DB pool, the agent) loads.

```typescript
// src/instrument.ts
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: Boolean(process.env.SENTRY_DSN),
  tracesSampleRate: 1.0,
  // NEON_BRANCH (the branch name) is injected on EVERY branch, including the default — so it
  // can't be used as a truthy "is this a branch?" flag. Treat the project's default branch as
  // "production" (its name passed in via neon.ts env) and tag every other branch by its name.
  environment:
    process.env.NEON_BRANCH && process.env.NEON_BRANCH !== process.env.PRODUCTION_BRANCH
      ? process.env.NEON_BRANCH
      : "production",
});

export { Sentry };
```

```typescript
// src/index.ts
import "./instrument"; // MUST be the first import, before the framework/agent
import { Sentry } from "./instrument";
import { Hono } from "hono";
// ... rest of the function
```

- **Gate `enabled` on the DSN.** Local dev (`neon dev`) and any branch where you haven't configured the secret then become a no-op — no init, no noise — without changing code.
- **Tag the environment off the injected branch name.** Each Neon branch runs its own copy of the function and the runtime injects `NEON_BRANCH` (the branch **name**, e.g. `main` or `preview/add-auth`) into every one of them — including the default branch. The same value is written into local dev by `neon env pull` / `neon-env run` / `neon dev`, so local and deployed runs agree. Because it's always present, don't use it as a boolean flag (that tags every branch the same). Instead compare it against your default branch name (pass it in as e.g. `PRODUCTION_BRANCH` via `neon.ts` `env`) so the default branch reads as `production` and feature/preview branches are tagged by name — keeping them separable in the Sentry dashboard.

### 2. Provide the DSN as a deploy-time secret

The DSN is your own secret, so set it per-deployment (see "Environment variables" in `SKILL.md`). Either pass it on deploy:

```bash
neon functions deploy <slug> --src src/index.ts \
  --env "SENTRY_DSN=https://…@…ingest.us.sentry.io/…"
```

or declare it under the function's `env` in `neon.ts` (read from `process.env` to avoid hardcoding):

```typescript
functions: {
  <slug>: {
    name: "…",
    source: "src/index.ts",
    env: { SENTRY_DSN: process.env.SENTRY_DSN! },
  },
}
```

### 3. Catch unhandled route errors

Wire a top-level error handler in your HTTP framework so any error thrown in a route is reported. With Hono, `onError` covers this. Watch out for one gotcha: framework middleware such as `cors()` usually does **not** decorate error responses, so re-add any headers you need on the 500 yourself.

```typescript
app.onError((err, c) => {
  Sentry.captureException(err);
  c.header("access-control-allow-origin", "*"); // cors() doesn't run on error responses
  return c.json({ error: "internal_error" }, 500);
});
```

### 4. Report agent (and other swallowed) failures explicitly

Long-running agent workloads — the case Neon Functions are built for — typically **catch their own errors and fall back** (retry a different model, return a degraded result) rather than throwing. Those failures never reach the route error handler, so report them explicitly with the same `Sentry` instance, and tag them so you can filter and group in the dashboard.

A representative agent that parses a page across several models reports three distinct cases:

```typescript
// Recoverable: one model attempt failed, the agent will try the next model.
Sentry.captureException(err, {
  level: "warning",
  tags: { component: "agent", phase: "parse-attempt", model },
  extra: { url, source },
});

// Terminal: every model failed.
Sentry.captureException(err, {
  level: "error",
  tags: { component: "agent", phase: "parse-all-failed" },
  extra: { url, source },
});

// Non-exception failure: the agent couldn't fetch the input page at all.
Sentry.captureMessage("agent could not fetch page", {
  level: "warning",
  tags: { component: "agent", phase: "fetch" },
  extra: { url, source },
});
```

- Use `level` to separate recoverable (`warning`) from terminal (`error`) failures.
- Use `tags` for the dimensions you'll filter/group by — `component`, `phase`, `model`.
- Use `extra` for per-event context — the URL being processed, the content source.

### Verifying the wiring

- Temporarily add a route that throws (`app.get("/debug-sentry", () => { throw new Error("sentry test"); })`), hit it, confirm the 500 surfaces in Sentry, then remove the route.
- Trigger a real downstream failure (e.g. point a fetch at `https://httpstat.us/500`) to confirm the explicit agent-level captures fire.

## Other Node integrations

The same pattern generalizes to any Node integration (OpenTelemetry, structured logging, product analytics):

1. Initialize once at module scope in a dedicated init module, imported before your handler.
2. Gate it on an env var so local dev and unconfigured branches are a no-op.
3. Pass secrets via `--env KEY=VALUE` on deploy or the function's `env` in `neon.ts`.

Standard Node SDKs bundle through `neon deploy`'s esbuild without changes.
