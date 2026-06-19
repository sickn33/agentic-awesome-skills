---
name: claimable-postgres
description: Provision instant temporary Postgres databases via Claimable Postgres by Neon (pg.new). No login or credit card required. Use for quick Postgres environments and throwaway DATABASE_URL for prototyping.
risk: unknown
source: community
---

# Claimable Postgres

Instant Postgres databases for local development, demos, prototyping, and test environments. No account required. Databases expire after 72 hours unless claimed to a Neon account.

## Quick Start

```bash
curl -s -X POST "https://pg.new/api/v1/database" \
  -H "Content-Type: application/json" \
  -d '{"ref": "agent-skills"}'
```

Parse `connection_string` and `claim_url` from the JSON response. Write `connection_string` to the project's `.env` as `DATABASE_URL`.

For other methods (CLI, SDK, Vite plugin), see [Which Method?](#which-method) below.

## Which Method?

- **REST API**: Returns structured JSON. No runtime dependency beyond `curl`. Preferred when the agent needs predictable output and error handling.
- **CLI** (`npx get-db@latest --yes`): Provisions and writes `.env` in one command. Convenient when Node.js is available and the user wants a simple setup.
- **SDK** (`get-db/sdk`): Scripts or programmatic provisioning in Node.js.
- **Vite plugin** (`vite-plugin-db`): Auto-provisions on `vite dev` if `DATABASE_URL` is missing. Use when the user has a Vite project.
- **Browser**: User cannot run CLI or API. Direct to https://pg.new.

## REST API

**Base URL:** `https://pg.new/api/v1`

### Create a database

```bash
curl -s -X POST "https://pg.new/api/v1/database" \
  -H "Content-Type: application/json" \
  -d '{"ref": "agent-skills"}'
```

| Parameter | Required | Description |
|-----------|----------|-------------|
| `ref` | Yes | Tracking tag that identifies who provisioned the database. Use `"agent-skills"` when provisioning through this skill. |
| `enable_logical_replication` | No | Enable logical replication (default: false, cannot be disabled once enabled) |

The `connection_string` returned by the API is a pooled connection URL. For a direct (non-pooled) connection (e.g. Prisma migrations), remove `-pooler` from the hostname. The CLI writes both pooled and direct URLs automatically.

**Response:**

```json
{
  "id": "019beb39-37fb-709d-87ac-7ad6198b89f7",
  "status": "UNCLAIMED",
  "neon_project_id": "gentle-scene-06438508",
  "connection_string": "postgresql://...",
  "claim_url": "https://pg.new/claim/019beb39-...",
  "expires_at": "2026-01-26T14:19:14.580Z",
  "created_at": "2026-01-23T14:19:14.580Z",
  "updated_at": "2026-01-23T14:19:14.580Z"
}
```

### Check status

```bash
curl -s "https://pg.new/api/v1/database/{id}"
```

Returns the same response shape. Status transitions: `UNCLAIMED` -> `CLAIMING` -> `CLAIMED`. After the database is claimed, `connection_string` returns `null`.

### Error responses

| Condition | HTTP | Message |
|-----------|------|---------|
| Missing or empty `ref` | 400 | `Missing referrer` |
| Invalid database ID | 400 | `Database not found` |
| Invalid JSON body | 500 | `Failed to create the database.` |

## CLI

```bash
npx get-db@latest --yes
```

Provisions a database and writes the connection string to `.env` in one step. Always use `@latest` and `--yes` (skips interactive prompts that would stall the agent).

### Pre-run Check

Check if `DATABASE_URL` (or the chosen key) already exists in the target `.env`. The CLI exits without provisioning if it finds the key.

If the key exists, offer the user three options:

1. Remove or comment out the existing line, then rerun.
2. Use `--env` to write to a different file (e.g. `--env .env.local`).
3. Use `--key` to write under a different variable name.

Get confirmation before proceeding.

### Options

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--yes` | `-y` | Skip prompts, use defaults | `false` |
| `--env` | `-e` | .env file path | `./.env` |
| `--key` | `-k` | Connection string env var key | `DATABASE_URL` |
| `--prefix` | `-p` | Prefix for generated public env vars | `PUBLIC_` |
| `--seed` | `-s` | Path to seed SQL file | none |
| `--logical-replication` | `-L` | Enable logical replication | `false` |
| `--ref` | `-r` | Referrer id (use `agent-skills` when provisioning through this skill) | none |

Alternative package managers: `yarn dlx get-db@latest`, `pnpm dlx get-db@latest`, `bunx get-db@latest`, `deno run -A get-db@latest`.

### Output

The CLI writes to the target `.env`:

```
DATABASE_URL=postgresql://...              # pooled (use for application queries)
DATABASE_URL_DIRECT=postgresql://...       # direct (use for migrations, e.g. Prisma)
PUBLIC_POSTGRES_CLAIM_URL=https://pg.new/claim/...
```

## SDK

Use for scripts and programmatic provisioning flows.

```typescript
import { instantPostgres } from 'get-db';

const { databaseUrl, databaseUrlDirect, claimUrl, claimExpiresAt } = await instantPostgres({
  referrer: 'agent-skills',
  seed: { type: 'sql-script', path: './init.sql' },
});
```

Returns `databaseUrl` (pooled), `databaseUrlDirect` (direct, for migrations), `claimUrl`, and `claimExpiresAt` (Date object). The `referrer` parameter is required.

## Vite Plugin

For Vite projects, `vite-plugin-db` auto-provisions a database on `vite dev` if `DATABASE_URL` is missing. Install with `npm install -D vite-plugin-db`. See the [Claimable Postgres docs](https://neon.com/docs/reference/claimable-postgres#vite-plugin) for configuration.

## Agent Workflow

### API path

1. **Confirm intent:** If the request is ambiguous, confirm the user wants a temporary, no-signup database. Skip this if they explicitly asked for a quick or temporary database.
2. **Provision:** POST to `https://pg.new/api/v1/database` with `{"ref": "agent-skills"}`.
3. **Parse response:** Extract `connection_string`, `claim_url`, and `expires_at` from the JSON response.
4. **Write .env:** Write `DATABASE_URL=<connection_string>` to the project's `.env` (or the user's preferred file and key). Do not overwrite an existing key without confirmation.
5. **Seed (if needed):** If the user has a seed SQL file, run it against the new database:
   ```bash
   psql "$DATABASE_URL" -f seed.sql
   ```
6. **Report:** Tell the user where the connection string was written, which key was used, and share the claim URL. Remind them: the database works now; claim within 72 hours to keep it permanently.
7. **Optional:** Offer a quick connection test (e.g. `SELECT 1`).

### CLI path

1. **Check .env:** Check the target `.env` for an existing `DATABASE_URL` (or chosen key). If present, do not run. Offer remove, `--env`, or `--key` and get confirmation.
2. **Confirm intent:** If the request is ambiguous, confirm the user wants a temporary, no-signup database. Skip this if they explicitly asked for a quick or temporary database.
3. **Gather options:** Use defaults unless context suggests otherwise (e.g., user mentions a custom env file, seed SQL, or logical replication).
4. **Run:** Execute with `@latest --yes` plus the confirmed options. Always use `@latest` to avoid stale cached versions. `--yes` skips interactive prompts that would stall the agent.
   ```bash
   npx get-db@latest --yes --ref agent-skills --env .env.local --seed ./schema.sql
   ```
5. **Verify:** Confirm the connection string was written to the intended file.
6. **Report:** Tell the user where the connection string was written, which key was used, and that a claim URL is in the env file. Remind them: the database works now; claim within 72 hours to keep it permanently.
7. **Optional:** Offer a quick connection test (e.g. `SELECT 1`).

### Output Checklist

Always report:

- Where the connection string was written (e.g. `.env`)
- Which variable key was used (`DATABASE_URL` or custom key)
- The claim URL (from `.env` or API response)
- That unclaimed databases are temporary (72 hours)

## Claiming

Claiming is optional. The database works immediately without it. To optionally claim, the user opens the claim URL in a browser, where they sign in or create a Neon account to claim the database.

- **API/SDK:** Give the user the `claim_url` from the create response.
- **CLI:** `npx get-db@latest claim` reads the claim URL from `.env` and opens the browser automatically.

Users cannot claim into Vercel-linked orgs; they must choose another Neon org.

## Defaults and Limits

| Parameter | Value |
|-----------|-------|
| Provider | AWS |
| Region | us-east-2 |
| Postgres | 17 |

Region cannot be changed for claimable databases. Unclaimed databases have stricter quotas. Claiming resets limits to free plan defaults.

| | Unclaimed | Claimed (Free plan) |
|---|-----------|---------------------|
| Storage | 100 MB | 512 MB |
| Transfer | 1 GB | ~5 GB |
| Branches | No | Yes |
| Expiration | 72 hours | None |

## Auto-provisioning

If the agent needs a database to fulfill a task (e.g. "build me a todo app with a real database") and the user has not provided a connection string, provision one via the API and inform the user. Include the claim URL so they can keep it.

## Safety and UX Notes

- Do not overwrite existing env vars. Check first, then use `--env` or `--key` (CLI) or skip writing (API) to avoid conflicts.
- Ask before running destructive seed SQL (`DROP`, `TRUNCATE`, mass `DELETE`).
- For production workloads, recommend standard Neon provisioning instead of temporary claimable databases.
- If users need long-term persistence, instruct them to open the claim URL right away.
- After writing credentials to an .env file, check that it's covered by .gitignore. If not, warn the user. Do not modify `.gitignore` without confirmation.


## When to Use
Use this skill when tackling tasks related to its primary domain or functionality as described above.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
