# Deploying and operating SST v4 stacks

The deploy/operate half of the lifecycle: running deploys safely, recovering from
failures, migrating resources, and the operational contracts (durable aliases,
observability) that keep a deployed stack healthy. Read `authoring.md` for how to
*write* the resources; this is about getting them live and keeping them live.

## Table of contents

- [The deploy commands](#the-deploy-commands)
- [Before every deploy](#before-every-deploy)
- [Resource-type migrations: never single-PR](#resource-type-migrations-never-single-pr)
- [Renaming a physical name within the same type](#renaming-a-physical-name-within-the-same-type)
- [Pulumi state hygiene after a failed deploy](#pulumi-state-hygiene-after-a-failed-deploy)
- [Durable Lambda alias contract](#durable-lambda-alias-contract)
- [Observability as a merge gate](#observability-as-a-merge-gate)
- [CI trigger gotcha](#ci-trigger-gotcha)

## The deploy commands

All via the project's package manager (`npx`, `pnpm exec`, or an npm script —
check `package.json`). From the project root unless the SST app lives in a
subdir:

| Command | What it does |
|---------|--------------|
| `npx sst dev` | Live-reload dev mode; Lambdas run locally against real AWS resources. |
| `npx sst diff --stage <stage>` | Preview the plan (create/update/delete) without applying. Run this before any real deploy. |
| `npx sst deploy --stage <stage>` | Apply the plan to AWS. |
| `npx sst remove --stage <stage>` | Tear down the stack (blocked on `protect: true` stages). |
| `npx sst state ...` | Inspect/repair Pulumi state — see hygiene below. |

`--stage` controls the deployment target. `prod` is special (retain/protect);
ephemeral `pr-<n>` stages back PR previews and must work from a cold start.

## Before every deploy

1. **Confirm the target account.** `aws sts get-caller-identity` — a deploy goes
   wherever your credentials point. No PreToolUse hook is bundled with this skill; verify the selected role/profile, region and stage directly.
2. **Run `npx sst diff`** and read the plan. Look for unexpected **replacements**
   (Pulumi printing `+-` / "replace") — a replacement on a stateful resource
   (bucket, table) means data loss or a name rotation. If you see one you didn't
   intend, stop and find out why (usually a changed logical name or an immutable
   field).
3. **Type-check and test** — `tsc --noEmit` and the infra Vitest suite
   (`testing.md`). The `Output<T>` interpolation bug type-checks clean but fails
   at deploy, so green types are necessary, not sufficient.
4. **Flag irreversibility to the user** for prod deploys, `sst remove`, and any
   migration. State the account and stage.

## Resource-type and physical-name migrations

Do not default to teardown/recreate for a type or name change, especially databases, buckets and queues. First inventory the deployed physical resource, URN, data, policies, references, protection and retention settings; inspect the actual preview. Evaluate the installed provider's import/alias/state-adoption support and validate identity preservation in an isolated stage. An alias is not guaranteed to bridge incompatible types.

If adoption is unsupported, choose a parallel resource/data-copy/cutover plan with integrity checks and rollback, or explicitly approved destructive recreate with backups/restoration and downtime. Splitting a destructive operation into two PRs does not make it reversible or preserve data. Retain/protect settings and deletion latency may also prevent name reuse. Record consumer updates and verify them after cutover; SSM consumers do not necessarily self-heal automatically.

## Pulumi state hygiene after a failed deploy

When a deploy fails mid-flight, inspect state before re-running:

```bash
# (use the repo's package manager; -C infra if the app is in a subdir)
umask 077
STATE_DIR=$(mktemp -d)
npx sst state export --stage <stage> > "$STATE_DIR/state.json"
jq '.latest.resources | map(.urn)' "$STATE_DIR/state.json" | grep <relevant-name>
```

- A failed **Create** may leave partial cloud resources or pending state. Reconcile both service inventory and state before retrying; do not assume rollback completed.
- A failed **Delete** may leave the entry in state while the AWS resource is
  already gone. Verify physical absence and exact URN first, save a private recovery checkpoint, then use the installed version's supported state repair with explicit approval. Removing state does not delete or restore a cloud resource.
- **Do not** edit the exported state file and re-import. Use `sst state remove` /
  `pulumi import` for state surgery — manual edits corrupt the checkpoint.

**Always delete the exported state file when done** — it contains account IDs and
identifiers that must not linger:

```bash
rm -f "$STATE_DIR/state.json"
```

## Durable Lambda alias contract

(Applies only to projects using durable/long-running Lambdas — `durable: true`.)

**Version the execution target deliberately.** Use the current durable-Lambda service contract and inspect actual execution/version behavior; this reference does not establish that every configuration update silently orphans executions. Publish a numbered version, record the returned version, and point the alias to that version. Check the current alias/version constraints for the selected function configuration; do not assume a fresh version is always `1` or that a placeholder version identifies the intended published code.

Choose one owner for alias rotation (IaC or a reviewed deploy step). If external rotation uses ignoreChanges, document drift/rollback and verify the alias revision before updates. Exercise in-flight executions, retries, compatibility and rollback in a safe stage; do not derive correctness from an alias existing alone.

## Observability as a merge gate

These projects require every new Lambda / queue / schedule to ship with
monitoring *before* merge — cheap insurance against a silent prod regression.
Whether you enforce it is per-project, but the checklist is sound:

- **New Lambda?** Add it to an error-alarm segment in `infra/observability.ts`
  (keep the segment map `as const` so a typo fails at typecheck, not at the pager).
- **Structured logging.** Use Powertools `Logger` (set `POWERTOOLS_SERVICE_NAME`);
  emit `service` + `errorType` on error paths. Avoid bare `console.error` in
  Lambda code — it bypasses the JSON formatter your metric filters match on.
- **Custom metrics carry a `stage` dimension** and alarms filter on the literal
  `stage: "prod"`. Without this, a `pr-<n>` preview Lambda writes into the same
  metric slot as prod and trips a prod alarm on preview traffic. Set the `stage`
  dimension as a Powertools *default dimension* (read once from `process.env.STAGE`)
  so "forgot to tag stage" is structurally impossible; bind each alarm to the intended stage and separately gate notification actions. A preview alarm hardcoded to prod reads production metrics and can duplicate pages.
- **DLQs / Step Functions / schedules** each get a failure alarm, ideally rolled
  into a composite pipeline-health alarm.
- **Choose missing-data behavior per metric.** notBreaching may suit sparse error counts but can hide failed telemetry/heartbeat streams; test alarm transitions and notification delivery.

## CI trigger gotcha

A common GitHub Actions deploy workflow declares
`on: pull_request: types: [opened, synchronize, reopened, closed]` — note there's
no `edited`. So `gh pr edit <num> --base main` (re-basing a stacked PR onto main)
does **not** re-trigger the deploy workflow. Prefer an authorized workflow_dispatch/rerun or add a reviewed relevant trigger; do not rewrite a branch or create meaningless commits solely to trigger deployment. This bites
when you stack infra PRs for a two-PR migration.
