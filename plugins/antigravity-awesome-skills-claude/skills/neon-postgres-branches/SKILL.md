---
name: neon-postgres-branches
description: Choose and create the right Neon branch type for testing and development. Use when users ask about Neon branching, migration testing with real data, isolated test environments, schema-only branch workflows for sensitive data, or branch creation via Neon CLI or Neon MCP. Triggers...
risk: unknown
source: https://github.com/neondatabase/agent-skills/tree/main/skills/neon-postgres-branches
source_repo: neondatabase/agent-skills
source_type: official
date_added: 2026-07-01
license: Apache-2.0
license_source: https://github.com/neondatabase/agent-skills/blob/main/LICENSE
---

# Neon Postgres Branching
## When to Use

Use this skill when you need choose and create the right Neon branch type for testing and development. Use when users ask about Neon branching, migration testing with real data, isolated test environments, schema-only branch workflows for sensitive data, or branch creation via Neon CLI or Neon MCP. Triggers...


The outcome of this skill should be a created Neon branch (or a clear, actionable next step if creation cannot proceed).
Choose the correct branch type, then execute branch creation via MCP or CLI.

- **Normal branch** for realistic migration and query testing with real data.
- **Schema-only branch (Beta)** for sensitive data workflows where structure is needed without copying rows.

## Branch Type Decision

Use this decision rule first:

1. If the user wants to test complex migrations, performance, or behavior against production-like data, choose a **normal branch**.
2. If the user needs to avoid copying sensitive data, choose a **schema-only branch**.

If the request is ambiguous, ask one clarifying question:
"Do you need realistic data for testing, or only schema structure because the data is sensitive?"

## Tool Selection: CLI or MCP

Always support both Neon CLI and Neon MCP server. Prefer the tool the user already has installed and authenticated.

MCP link: https://neon.com/docs/ai/neon-mcp-server.md
CLI link: https://neon.com/docs/reference/cli-quickstart

### Selection order

1. Check MCP first in MCP-enabled environments:
   - If Neon MCP tools are available and authenticated (for example, listing projects works), use MCP.
2. If MCP is unavailable or not authenticated, check CLI:
   - Run `neon --version` to confirm CLI is installed.
   - Run `neon projects list` to confirm auth/context.
3. If CLI is missing, direct installation via quickstart.
4. If CLI is installed but not authenticated, guide the user through `neon auth` (or API key auth), then continue.
5. If both MCP and CLI paths are unsuccessful, use the Neon REST API:
   - https://neon.com/docs/guides/branching-neon-api.md

### MCP branch flow

1. Choose normal vs schema-only based on data sensitivity and migration-testing goals.
2. Use branch tools (for example, `create_branch`) to create the branch.
3. Validate with read tools (for example, `describe_branch`).
4. For migration workflows, prefer branch-based migration flows before applying to main.

## Create a Normal Branch (Preferred for Real-Data Migration Testing)

Use this when the user needs realistic testing conditions.
Real production-like data can expose edge cases your seed or data migration scripts miss, which helps catch migration issues before going live.

Link: https://neon.com/docs/introduction/branching.md

### Steps

1. Use MCP if already available/authenticated; otherwise verify CLI with `neon --version`.
2. Ensure project context is set (`neon set-context --project-id <your-project-id>`) or include `--project-id` on commands.
3. Create branch:

```bash
neon branches create \
  --name <branch-name> \
  --parent <parent-branch-id-or-name> \
  --expires-at 2026-12-15T18:02:16Z
```

4. Optionally fetch a connection string for the new branch:

```bash
neon connection-string <branch-name>
```

## Create a Schema-Only Branch (Beta, Sensitive Data)

Use this when users must not copy production rows into the test branch.

Link: https://neon.com/docs/guides/branching-schema-only.md

### Steps

1. Use MCP if already available/authenticated; otherwise verify CLI with `neon --version`.
2. Create schema-only branch:

```bash
neon branches create \
  --name <schema-only-branch-name> \
  --parent <parent-branch-id-or-name> \
  --schema-only \
  --expires-at 2026-12-15T18:02:16Z
```

If multiple projects exist, include:

```bash
neon branches create \
  --name <schema-only-branch-name> \
  --parent <parent-branch-id-or-name> \
  --schema-only \
  --project-id <your-project-id> \
  --expires-at 2026-12-15T18:02:16Z
```

### Beta Support Guidance (Mandatory)

Schema-only branching is in Beta. If users report unexpected behavior, errors, or missing capabilities:

1. Ask them to share feedback in the Neon Console:
   - https://console.neon.tech/app/projects?modal=feedback
2. Recommend opening a support conversation in the Neon Discord:
   - https://discord.gg/92vNTzKDGp

## Reset from parent

Use this when a child branch has drifted and the user wants a clean refresh from the parent branch's latest schema and data.

Link: https://neon.com/docs/guides/reset-from-parent.md

### What it does

- Fully replaces the child branch schema and data with the parent's latest state.
- Does not merge; local changes on the child branch are lost.
- Keeps the same connection details, but active connections are briefly interrupted during reset.

### When to recommend it

- Development or staging branch is too far behind production.
- User wants to start a new feature from a clean parent-aligned state.
- Team wants to refresh staging from production for consistent testing baselines.

### Hard constraints and blockers

- Only child branches can be reset (root branches and schema-only root branches cannot be reset from parent).
- If the target branch has children, reset is blocked until those child branches are removed.
- After a parent branch is restored from snapshot, reset-from-parent may be unavailable for up to 24 hours.
- Reset-from-parent always uses the current parent state; use Instant restore for point-in-time recovery needs.

### CLI usage

```bash
neon branches reset <id|name> --parent --preserve-under-name <backup-branch-name>
```

If project context is not already set, include project ID:

```bash
neon branches reset <id|name> --parent --preserve-under-name <backup-branch-name> --project-id <project-id>
```

`--preserve-under-name` keeps the pre-reset state as a backup branch for rollback, but adds one extra branch to clean up later.

Optional context setup to avoid repeating `--project-id`:

```bash
neon set-context --project-id <project-id>
```

### Console and API usage

- **Console:** Open the target child branch, then select **Reset from parent** from **Actions**.
- **API:** Use the restore endpoint for the branch and set `source_branch_id` to the parent branch ID.

## Notes and Caveats

- Schema-only branches are for structure-only cloning and sensitive/compliant data controls.
- Schema-only branches are independent root branches (no parent branch and no shared history), so reset-from-parent does not apply.
- For migration testing that depends on real-world row shapes, volumes, and edge cases, prefer normal branches.
- Root branch allowances and per-branch storage limits can cap how many schema-only branches users can create.
- If a user is unsure, default recommendation is:
  - **Normal branch** for migration validation.
  - **Schema-only branch** for compliance and privacy constraints.

## Useful Workflow Patterns

If the user asks for process recommendations (not just a single command), suggest these:

- **One branch per PR:** Create branch when PR opens, delete when merged/closed, keep migration tests isolated.
- **One branch per test run:** Create branch at pipeline start, run migrations/tests, delete at end for deterministic CI.
- **One branch per developer:** Isolated dev environments with production-like shape; avoid team collisions on shared test data.
- **PII-aware branching:** If production has sensitive data, derive dev/PR branches from an anonymized branch or use schema-only branches.
- **Ephemeral lifecycle hygiene:** Set branch expiration and automate cleanup so old branches do not accumulate avoidable storage/history cost.

### Post-creation environment update prompt

After branch creation, ask whether the user wants to update local environment credentials to point at the new branch.

- Ask: "Do you want me to update your `.env` `DATABASE_URL` to this new branch connection string?"
- If yes, write the new branch connection string to the requested env file/key.
- If no, leave credentials unchanged and share the connection string for manual use.
- Never overwrite an existing env key without explicit confirmation.

## Neon Infrastructure as Code (`neon.ts`)

Beyond creating branches imperatively (CLI / MCP / API above), you can **program what configuration new branches receive** declaratively in `neon.ts` — Neon's infrastructure-as-code file (see the `neon` skill for the full reference). The `branch` property is a function of the branch being evaluated that returns its settings, so every branch born from your project gets a consistent lifecycle and compute profile without per-branch flags.

```bash
npm i @neon/config
```

```typescript
// neon.ts
import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  branch: (branch) => {
    if (branch.exists) return {}; // never reconcile existing branches
    if (branch.isDefault) return { protected: true };
    if (branch.name.startsWith("preview/") || branch.name.startsWith("dev")) {
      return {
        parent: "main",
        ttl: "7d", // ephemeral: auto-expire 7 days after creation (max 30d)
        postgres: {
          computeSettings: {
            autoscalingLimitMinCu: 0.25, // scale to zero
            autoscalingLimitMaxCu: 1, // keep throwaway branches cheap
            suspendTimeout: "5m",
          },
        },
      };
    }
    return {};
  },
});
```

The closure receives a read-only descriptor of the target branch — `name`, `exists`, `isDefault`, `parentId`, and more — and returns the tuning to apply: `parent`, `ttl` (auto-expiry), `protected`, and `postgres.computeSettings`. This is the declarative complement to the **Ephemeral lifecycle hygiene** and per-PR / per-test patterns above: instead of remembering `--expires-at` on every `neon branches create`, the TTL and compute profile live in version control and apply to every matching branch.

Because `neon checkout` applies this policy when it **creates** a branch, a fresh `preview/*` or `dev-*` branch comes up already expiring and scaled-to-zero. Checking out an _existing_ branch doesn't reconcile it — run `neon deploy` (alias for `neon config apply`) to apply changes to a branch that already exists.

## Branching in CI/CD

Common CI/CD use cases for Neon branches:

- **Per-PR preview deployments:** Branch on PR open, deploy the preview against it, delete on close. Each PR gets an isolated database branch. Injecting the branch's `DATABASE_URL` into the deployed app is hosting-provider-specific — see [preview-branches-with-cloudflare](https://github.com/neondatabase/preview-branches-with-cloudflare), [preview-branches-with-vercel](https://github.com/neondatabase/preview-branches-with-vercel), or [preview-branches-with-fly](https://github.com/neondatabase/preview-branches-with-fly) for tested patterns.
- **Migration testing in CI:** Run risky schema changes against a branch with production-like data before merge.
- **Schema diff visibility:** Use the [schema-diff GitHub Action](https://github.com/marketplace/actions/neon-schema-diff-github-action) to auto-comment a DB-layer diff on the PR.

## Examples

### Example 1: Migration testing with realistic data

**User input:** "I need to test a risky migration against production-like data."

**Agent output shape:**

1. Recommend a normal branch and explain why.
2. Share docs link: https://neon.com/docs/introduction/branching
3. Check the available/authenticated tool path first (MCP, otherwise CLI with `neon --version`).
4. Provide commands:
   - `neon branches create --name migration-test --parent main --expires-at 2026-12-15T18:02:16Z`
   - `neon connection-string migration-test`

### Example 2: Sensitive data development workflow

**User input:** "We cannot copy production data because of compliance."

**Agent output shape:**

1. Recommend schema-only branch and explain why.
2. Share docs link: https://neon.com/docs/guides/branching-schema-only
3. Check the available/authenticated tool path first (MCP, otherwise CLI with `neon --version`).
4. Provide command:
   - `neon branches create --name compliance-dev --parent main --schema-only --project-id <your-project-id> --expires-at 2026-12-15T18:02:16Z`
5. Mention Beta support path:
   - https://console.neon.tech/app/projects?modal=feedback
   - https://discord.gg/92vNTzKDGp

## Further reading

- https://neon.com/docs/guides/branch-expiration.md
- https://neon.com/docs/guides/neon-github-integration.md
- https://neon.com/docs/ai/neon-mcp-server.md
- https://neon.com/branching

## Limitations

- Use this skill only when the task clearly matches its upstream product or API scope.
- Verify commands, API behavior, pricing, quotas, credentials, and deployment effects against current official documentation before making changes.
- Do not treat generated examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
