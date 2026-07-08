---
name: aws-sst-development
description: SST v4 (Ion) expert for managing AWS resources as code with the Pulumi-backed framework. Use when writing or editing sst.config.ts, building infra/ modules (sst.aws.Function/Bucket/Dynamo/Cron/Service/Router, sst.Secret, sst.Linkable, raw aws.* Pulumi resources), wiring resource links,...
risk: unknown
source: https://github.com/zxkane/aws-skills/tree/main/plugins/aws-iac/skills/aws-sst-development
source_repo: zxkane/aws-skills
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/zxkane/aws-skills/blob/main/LICENSE
---

# SST v4 for AWS
## When to Use

Use this skill when you need sST v4 (Ion) expert for managing AWS resources as code with the Pulumi-backed framework. Use when writing or editing sst.config.ts, building infra/ modules (sst.aws.Function/Bucket/Dynamo/Cron/Service/Router, sst.Secret, sst.Linkable, raw aws.* Pulumi resources), wiring resource links,...


SST v4 (the "Ion" engine) is a Pulumi-backed IaC framework: you describe AWS
resources in TypeScript and SST/Pulumi reconciles them into your account. It
gives you high-level `sst.aws.*` components (Function, Bucket, Dynamo, Cron,
Service, …) that expand into many underlying resources, plus an escape hatch to
*any* raw Pulumi `aws.*` resource for the long tail. This skill encodes a
production-proven way to author, link, test, deploy, and troubleshoot SST
stacks on AWS — distilled from real multi-stack projects that have paid for
each lesson with a prod incident.

**SST and Pulumi are third-party — verify current syntax with Context7**
(`resolve-library-id` → `query-docs` for `sst` or `pulumi-aws`) when you're
unsure about a component's options. Verify AWS-side facts (service limits,
model IDs, IAM action names, region availability) with the AWS docs MCP, never
from memory. The patterns here are the *how*; the docs are the *what*.

## When you're invoked

Figure out which mode you're in and jump to the right reference:

| Situation | Go to |
|-----------|-------|
| New project, or adding a resource/module to an existing SST app | **Author** → `references/authoring.md` |
| Wiring one module's output into another (links, SSM, IAM scope) | **Author** → `references/authoring.md` § Sharing |
| Writing tests for infra so changes don't silently break | **Test** → `references/testing.md` |
| Running a deploy, or a deploy just failed | **Deploy/Operate** → `references/deploy-and-troubleshoot.md` |
| Migrating a resource between Pulumi types, renaming a physical name | **Deploy/Operate** → `references/deploy-and-troubleshoot.md` § Migrations |

Always read the relevant reference before editing — they carry the *why* behind
each rule, which matters more than the rule itself.

## Orientation: read the repo before you touch it

SST projects are conventional but not identical. Before editing, build a quick
map so your change matches the house style instead of fighting it:

1. **`sst.config.ts`** — the app name, `home`, providers/region, `defaultTags`,
   any global `$transform` (Node runtime pin, bundle fixups), and the order in
   which `run()` imports `infra/` modules. The import order *is* the dependency
   order; respect it.
2. **`infra/`** — one file per domain (storage, functions, api, observability…).
   This is where resources are declared. Check for an `infra/CLAUDE.md` — these
   projects keep IaC-specific rules there, and it's the single most valuable
   file to read first.
3. **`infra/tests/`** — source-level Vitest assertions that pin resource
   invariants. If they exist, your change must keep them green and probably
   needs a new assertion.
4. **`package.json` / `.nvmrc`** — package manager (npm vs pnpm), Node version,
   and the `sst`/`pulumi` versions actually installed.

Run `npx sst version` to confirm you're on v4/Ion (the `$config` + `.sst/platform/`
signature). v2/v3 ("SST Classic", CDK-based) is a different framework — these
patterns don't apply there.

## The conventions, and which are universal vs tunable

The projects this skill is built from share a deliberate house style. Some of it
is **universal** (true for any SST v4 + AWS project — apply it everywhere); some
is **project-specific** (a sensible default these projects chose — adopt it for
consistency, but recognize a project may differ).

**Universal — these principles hold for any SST v4 + AWS project:**

- **Control the Node runtime deliberately, in one place.** Don't leave it to
  whatever the installed SST happens to default to. The idiom is a single global
  `$transform(sst.aws.Function, (args) => { args.runtime ??= "nodejs24.x" })` in
  `run()` — `??=` is correct here (the transform runs before the component
  applies its own default, so it fills in only when the user didn't set one).
  Recent SST already defaults to a current Node runtime, so check the installed
  default first (Context7); the transform is then version-independence insurance
  so a future SST downgrade can't silently move your fleet. See
  `references/authoring.md`.
- **Never interpolate a Pulumi `Output<T>` into a plain JS template literal.**
  Use `$interpolate` (or `pulumi.interpolate`). A bare top-level
  `` `${bucket.arn}/*` `` stringifies the `Output` to a `[Output<T>]` placeholder
  and produces a broken ARN that only fails at deploy time (it type-checks and
  `sst dev` runs fine). The fix is `$interpolate`​`` `${bucket.arn}/*` ``. This
  has caused prod deploy outages. See `references/authoring.md` § Outputs.
- **Migrating a resource between Pulumi *types* should default to two PRs** —
  Pulumi creates-before-destroys, so for a uniqueness-constrained AWS name
  (bucket, IAM role, gateway) the old resource still owns it and the create
  fails with `ConflictException`. Two sequential deploys (teardown, then
  recreate) is the conservative default; `aliases:` / `pulumi import` / state
  surgery can bridge identity in some cases but only with a reviewed plan. See
  `references/deploy-and-troubleshoot.md` § Migrations.
- **Prefer typed `sst.aws.*` / `aws.*` resources over the
  `aws.cloudcontrol.Resource` escape hatch.** CloudControl outputs are
  stringly-typed and `oneOf` fields don't patch cleanly. Use it only when no
  typed resource exists yet, and migrate off it when one ships.

**Project-specific defaults — adopt for consistency, but confirm per repo:**

- **Region `ap-northeast-1`**, `home: "aws"`, and `defaultTags` carrying
  `Project` / `Stage` / `ManagedBy: "sst"`.
- **Stage-gated lifecycle**: `removal: stage === "prod" ? "retain" : "remove"`
  and `protect: stage === "prod"` so prod resources survive a stack tear-down
  and non-prod previews clean up.
- **SSM Parameter Store as the out-of-graph contract** under a
  `/{app}/{stage}/{domain}/...` prefix — for consumers that aren't in the
  Pulumi graph (CI scripts, sibling apps, operators). For *same-app* Lambdas,
  prefer SST `link:` (it wires a real dependency edge and grants IAM); don't
  route same-app sharing through SSM. See `references/authoring.md` § Sharing.
- **Lazy `await import("./infra/<module>")` inside `run()`** so `sst dev`
  hot-reload stays light. (For testing, a module export still runs its top-level
  `new sst.aws.*` unless it's wrapped in a factory function — see
  `references/testing.md` for how to test infra.)
- **Source-level Vitest tests** on every infra module — a lightweight,
  house-style regression net asserting on the *source text* (resource names,
  index shapes, IAM scopes). It's a deliberate choice, not an SST limit: Pulumi
  *does* support runtime mocks (`@pulumi/pulumi/runtime`) for behavioral graph
  tests when a module has real logic. Source assertions don't replace a
  preview-deploy + smoke test. See `references/testing.md`.
- **An observability gate**: every new Lambda/queue/schedule gets an alarm and
  structured logging before merge. Whether you enforce this depends on the
  project, but it's cheap insurance. See `references/deploy-and-troubleshoot.md`
  § Observability.

When you introduce a convention, say which bucket it's in ("this is universal"
vs "matching this repo's house style") so the user can override the
project-specific ones deliberately.

## Working rhythm

1. **Orient** (above) — map config, modules, tests, tooling.
2. **Verify syntax** with Context7 / AWS docs MCP if anything is non-obvious.
   Don't guess at a component's option name.
3. **Author** the resource/module following `references/authoring.md`. Match the
   surrounding file's commenting density and naming — these projects comment the
   *why* heavily, and a terse one-liner in a heavily-annotated file reads as a
   regression.
4. **Test** — add or update source-level assertions (`references/testing.md`) and
   run `npx vitest` (or the repo's `test` script). Run `npx sst diff` and/or
   `tsc --noEmit` to catch type and plan errors before deploying.
5. **Deploy/operate** per `references/deploy-and-troubleshoot.md`. Confirm the
   target account with `aws sts get-caller-identity` before any `sst deploy`.
6. **Clean up** any exported state files — they contain account IDs and ARNs and
   must not linger in `/tmp` or chat history.

## What good looks like

- The change is the smallest diff that satisfies the requirement, in the right
  `infra/` module, wired into `run()` in dependency order.
- Every Lambda gets the right runtime via the global transform (you didn't
  hand-set `runtime` unless intentionally diverging — e.g. a Python function).
- Cross-resource references use `link:` (in-graph) and/or `$interpolate`-scoped
  IAM; outputs other tools consume are published to SSM under the stage prefix.
- New infra has a matching source-level test, and the existing suite stays green.
- You confirmed AWS-side facts via the docs MCP and SST/Pulumi syntax via
  Context7 rather than relying on recall.
- Anything irreversible (deploy, `sst remove`, a resource-type migration) was
  flagged to the user with the account it targets, and migrations were planned
  as two PRs, not one.

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
