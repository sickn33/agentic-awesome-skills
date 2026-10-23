# Testing SST v4 infra

A plain `import` of an infra module under bare `vitest` fails — `new
sst.aws.Bucket(...)` expects a Pulumi engine that isn't running. You have two
ways to test infra, and they catch different things:

1. **Source-level assertions** (the house-style default below) — load the
   module's source *text* and assert on structural invariants (resource names,
   index shapes, IAM scoping, SSM paths, runtime pins). A lightweight regression
   net that catches "someone changed the GSI projection" or "someone dropped the
   stage from the SSM prefix" at `vitest` time, long before a deploy.
2. **Pulumi runtime mocks** (`@pulumi/pulumi/runtime` `setMocks`) — actually
   construct the resources under a mock engine and assert on the resulting graph
   (resolved property values, dependency edges). Heavier to set up, but it tests
   *behavior*, not just text — use it when a module has real branching logic.

Source assertions are the common case because most infra modules are
declarative; reach for Pulumi mocks when the *logic* (not just the declaration)
is what you need to pin. This is a testing-strategy choice, not an SST
limitation.

## Setup

`infra/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
export default defineConfig({
  test: { include: ["tests/**/*.test.ts"], environment: "node" },
});
```

Tests live in `infra/tests/<module>.test.ts`. Run with `npx vitest run` (or the
repo's `test` script — check `package.json`; the infra suite may be a separate
workspace from the application tests).

## The source-assertion pattern

Read the module source once, then assert with `toContain` / `toMatch`:

```ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const src = readFileSync(path.resolve(__dirname, "../storage.ts"), "utf-8");

describe("infra/storage.ts — resource surface", () => {
  it("uses sst.aws.Dynamo (not raw Pulumi) for the items table", () => {
    expect(src).toContain('new sst.aws.Dynamo("Items"');
  });

  it("declares the by-status GSI sparse with keys-only projection", () => {
    const block = src.slice(src.indexOf('"by-status"'));
    expect(block).toMatch(/hashKey:\s*"status"/);
    expect(block).toMatch(/projection:\s*"keys-only"/);
  });

  it("never opts a bucket into public read", () => {
    // SST defaults to block-public; this guards against a stray { public: true }.
    expect(src).not.toMatch(/public:\s*true/);
  });

  it("builds the SSM prefix from $app.stage (no hardcoded stage)", () => {
    expect(src).toContain("/my-app/${stage}/storage");
    expect(src).toContain("$app.stage");
  });
});
```

Tips that make these tests pull their weight:

- **Scope a `src.slice(...)` to the relevant block** before asserting, so a match
  can't accidentally pass against a *different* resource elsewhere in the file
  (e.g. slice from the `EpisodesV2` declaration to the next one before asserting
  its GSIs).
- **Count occurrences** to pin cardinality — e.g.
  `expect(src.match(/^ssmParam\(/gm)?.length).toBe(9)` catches a dropped or
  duplicated export. Use `^`-anchored multiline regex so the helper *definition*
  isn't counted as a call.
- **Write regression guards as negative assertions** — `expect(src).not.toMatch(
  /new sst\.aws\.Dynamo\("Items"[^V]/)` proves the pre-migration table is gone.
- **Put pure tunables in a separate side-effect-free module, rather than importing resource-declaration modules for a `__test__` object.** When a module
  has knobs (memory, timeout, model id), export them and assert both the constant
  *and* its presence in the source, so a value change can't silently drift from
  the test contract:

  ```ts
  // infra/query.ts
  export const __test__ = { LAMBDA_MEMORY_MB: 2048, LAMBDA_TIMEOUT: "2 minutes" };
  // infra/tests/query.test.ts
  import { __test__ } from "../query-config"; // separate pure module
  it("pins 2 GB memory", () => {
    expect(__test__.LAMBDA_MEMORY_MB).toBe(2048);
    expect(src).toContain(`${__test__.LAMBDA_MEMORY_MB} MB`);
  });
  ```

## What's worth a test

Prioritize invariants where a silent change is expensive:

- **IAM scoping** — that a permission is scoped to an ARN, not `*`; that
  `$interpolate` (not a plain template literal) wraps an Output in an ARN.
- **Security defaults** — no `public: true` on buckets; no `$LATEST` invocation on
  a durable Lambda (a grep guard, often run in CI rather than vitest).
- **Schema shape** — DynamoDB key/GSI/projection/stream choices; these encode
  access-pattern decisions that are costly to change post-deploy.
- **Cross-module contracts** — SSM parameter paths and count (other tools depend
  on the exact path), and that the stage is always derived, never hardcoded.
- **Runtime/bundle invariants** — that the Node runtime is pinned and (if the
  banner-strip applies) that no bundle ships the colliding `__filename` const.
  The bundle check naturally runs as a CI shell gate over
  `.sst/artifacts/*-src/bundle.mjs` after a build, complementing the source tests.

## What not to test this way

- **Whether the deploy actually works** — that's an integration concern. Use a
  PR-preview stage + a post-deploy smoke test (invoke the Lambda, assert a 200)
  rather than trying to simulate AWS in a unit test.
- **AWS-side behavior** (does the GSI return the right items, does the IAM policy
  actually allow the call) — verify against a real preview deploy.

Source assertions are brittle heuristics: comments, dead code and formatting can fool them. Graph/preview and deployed behavioral tests provide different bounded evidence, not a blanket correctness proof. Source greps must not be sole IAM/public-access security gates. You want both; they catch different
failures.
