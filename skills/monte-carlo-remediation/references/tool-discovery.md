<!-- Modified by AAS: clarified authorization, evidence and runtime boundaries. -->

# Tool Discovery at Runtime

This reference explains how to discover what remediation tools are available to you at runtime. You have three categories of tools to check: MCP servers, CLI tools (via shell access), and APIs (via `curl` or language-specific clients). Check all three before deciding what's possible.

No integration is bundled here. Confirm actual tool/account schemas; CLI presence alone does not establish authenticated access or authorization. Never bypass tool restrictions by changing transport.

## Category 1: MCP servers

In Claude Code and other MCP-capable editors, MCP tools follow the naming convention:

```
mcp__<server_name>__<tool_name>
```

For example:
- `mcp__airflow__trigger_dag_run` — an Airflow MCP tool
- `mcp__dbt_cloud__trigger_run` — a dbt Cloud MCP tool
- `mcp__github__create_pull_request` — a GitHub MCP tool

Monte Carlo's own tools are bundled by this plugin and namespaced under the plugin server — see the **Monte Carlo tool routing** block at the top of the skill. Examples:
- `mcp__plugin_mc-agent-toolkit_monte-carlo-mcp__get_alerts`
- `mcp__plugin_mc-agent-toolkit_monte-carlo-mcp__search`

Scan your tool list for any `mcp__*__*` patterns and group by server name.

## Category 2: CLI tools

You have shell access. Many remediation actions can be done via CLI tools that may already be installed:

| CLI Tool | Capability | Example Commands |
| -------- | ---------- | ---------------- |
| `gh` | GitHub operations | `gh pr create`, `gh issue create`, `gh api` |
| `git` | Code changes | `git checkout -b fix/...`, `git commit`, `git push` |
| `dbt` | dbt operations | `dbt run --select <model>`, `dbt test`, `dbt retry` |
| `airflow` | Airflow operations | `airflow dags trigger <dag_id>`, `airflow tasks run` |
| `montecarlo` | Monte Carlo CLI | `montecarlo monitors apply`, `montecarlo collectors test-connection` |
| `curl` | Any HTTP API | Call REST APIs directly for any service with an API |
| `snowsql` / `bq` / `databricks` | Warehouse CLIs | Execute SQL queries, check table state |

**Check availability** by running `which <tool>` or `<tool> --version` before using a CLI tool.

## Category 3: APIs (via curl or HTTP)

If neither an MCP server nor a CLI tool is available for a service, you can often call its REST API directly using `curl`. This is the most flexible option — any service with an API is reachable.

Examples:
```
# Trigger an Airflow DAG via REST API
curl -X POST "https://airflow.example.com/api/v1/dags/<dag_id>/dagRuns" \
  -H "Authorization: Bearer $AIRFLOW_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"conf": {}}'

# Trigger a dbt Cloud job via REST API
curl -X POST "https://cloud.getdbt.com/api/v2/accounts/<account_id>/jobs/<job_id>/run/" \
  -H "Authorization: Token $DBT_CLOUD_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"cause": "Triggered by remediation skill"}'
```

**Note:** API calls require credentials. If you don't have the right tokens or environment variables, ask the user to configure secure credentials locally — never request tokens in chat.

## Discovery procedure

### Step 1: Check MCP servers

Scan your tool list for `mcp__*__*` patterns. Common MCP servers relevant to remediation:

| Server Name Pattern | Capability |
| ------------------- | ---------- |
| `*airflow*` | Pipeline orchestration — trigger DAG runs, retry failed tasks |
| `*dagster*` | Pipeline orchestration — launch runs, check status |
| `*prefect*` | Pipeline orchestration — create flow runs, check status |
| `*dbt*` | dbt operations — trigger job runs, get status, list jobs |
| `*github*` | Code changes — create PRs, issues, branches |
| `*gitlab*` | Code changes — create merge requests, issues |
| `*snowflake*` | Warehouse access — execute queries, get table info |
| `*bigquery*` | Warehouse access — execute queries, get table info |
| `*databricks*` | Warehouse access + orchestration — queries, trigger jobs |
| `*fivetran*` | Ingestion — trigger connector sync, check status |
| `*jira*` | Issue tracking — create issues, update status |

### Step 2: Check CLI tools

For any capability not covered by MCP, check if a relevant CLI tool is available. The most common:

- `gh` — covers GitHub operations (PRs, issues, API calls) without needing a GitHub MCP
- `dbt` — covers dbt operations (run, test, retry) without needing a dbt Cloud MCP
- `git` — check availability for code changes
- `curl` — check availability for calling any REST API

### Step 3: Assess coverage

For the current remediation task, determine:

1. **Can I investigate?** — Monte Carlo MCP is always needed. If it's not connected, you cannot proceed.
2. **Can I execute the fix?** — Check MCP servers first, then CLI tools, then API access.

### Step 4: Report capabilities

Present what you found to the user before proceeding:

> "For this remediation, I can:
> - ✅ Investigate the issue (Monte Carlo MCP)
> - ✅ Restart the Airflow DAG (Airflow MCP connected)
> - ✅ Create a code fix (`gh` CLI available — no GitHub MCP needed)
> - ❌ Rerun the dbt job (no dbt Cloud MCP or `dbt` CLI found)"

## Graceful degradation

When no tool (MCP, CLI, or API) is available for a needed action:

### Priority 1: Provide actionable instructions

Give the user the exact commands or steps to execute themselves:

```
# If no Airflow tool is available but you identified the DAG:
"The DAG `etl_orders_daily` needs to be triggered. Run:
  airflow dags trigger etl_orders_daily
Or via the Airflow UI: navigate to DAGs → etl_orders_daily → Trigger DAG"

# If no dbt tool is available:
"dbt model `stg_orders` needs to be rebuilt. Run:
  dbt run --select stg_orders+
Or via dbt Cloud UI: Jobs → Daily Transform → Run Now"

# If no GitHub tool is available:
"File `models/staging/stg_orders.sql` needs line 14 changed from
  `user_id` to `customer_id`. Create a branch and PR with this change."
```

### Priority 2: Present findings and ask for next steps

Tell the user what you found, what the fix is, and ask how they'd like to proceed. They may run the commands themselves, notify their team, or take a different approach.

### Priority 3: Document on the alert

Always, regardless of what other tools are available:

```
createOrUpdateAlertComment(
  alert_id="<alert_uuid>",
  comment="## Remediation Plan\n\n**Root cause:** [summary]\n**Required action:** [specific fix]\n**Manual steps:**\n1. [step]\n2. [step]\n\n**Investigated by:** AI agent via remediation skill"
)
```

## Tool-specific notes

### Airflow

**MCP tools:** `trigger_dag_run`, `get_dag_runs`, `get_task_instances`, `clear_task_instances`
**CLI:** `airflow dags trigger <dag_id>`, `airflow tasks run <dag_id> <task_id> <execution_date>`
**API:** `POST /api/v1/dags/<dag_id>/dagRuns`

**Caution:** `trigger_dag_run` starts a NEW run. If the issue was a failed task in an existing run, `clear_task_instances` (retry) may be more appropriate than starting fresh.

### dbt

**MCP tools:** `trigger_run` / `trigger_job`, `get_run`, `list_jobs`, `cancel_run`
**CLI:** `dbt run --select <model>`, `dbt retry`, `dbt test --select <model>`
**API:** `POST /api/v2/accounts/<id>/jobs/<id>/run/`

**Note:** dbt Cloud jobs often include multiple models. Triggering a job reruns ALL models in that job, not just the failed one. The `dbt` CLI with `--select` gives more granular control.

### GitHub

**MCP tools:** `create_pull_request`, `create_issue`, `create_or_update_file`, `create_branch`
**CLI:** `gh pr create`, `gh issue create`, `gh api`
**Git:** `git checkout -b`, `git commit`, `git push`

The `gh` CLI is often the most practical option — it doesn't require a GitHub MCP server and supports the full GitHub API via `gh api`.

**Best practice:** For code fixes, create a branch → make the change → open a PR. Don't push directly to main.
