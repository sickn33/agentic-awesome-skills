# Data Monitor Creation Procedure

Modified 2026-10-23: this is an upstream procedure snapshot. The per-type references it names are not bundled, and this catalog includes no MCP server. Verify current connected-tool schemas and account identity; stop parameter construction where the missing documentation cannot be resolved. No runtime capability or monitor deployment was tested by this review.

This is the data monitor creation procedure for Monte Carlo warehouse tables. Use this reference when a user wants to create monitors for their data warehouse tables -- it walks through the full workflow from understanding the request through generating monitors-as-code (MaC) YAML and (optionally) deploying the monitor.

All five `create_or_update_*_monitor` tools follow a **two-call preview-then-confirm pattern**:

1. **First call -- preview.** Invoke with `dry_run=True` (this is the default -- you can omit the argument). The tool returns rendered MaC YAML in `result.yaml` and a DRY RUN notice in `result.instructions`. Show the YAML to the user and confirm.
2. **Second call -- live create/update.** After the user confirms, invoke the same tool again with `dry_run=False` and the same other parameters. The tool actually creates or updates the monitor and returns `result.monitor_uuid` plus a `result.instructions` string containing a deep link `<webapp_url>/monitors/<monitor_uuid>` to the live monitor. `result.yaml` is intentionally `None` on this call -- the monitor is already deployed.

To **update an existing monitor** instead of creating a new one, pass its `monitor_uuid`. This works on both the preview and live calls. **Important:** `create_or_update_*_monitor` with `monitor_uuid` has **PUT semantics** -- the call fully replaces the monitor's configuration. Fields you omit revert to the tool's defaults; they are NOT left untouched. See Step 7 ("Updating an existing monitor") for the safe-edit workflow. To save the monitor as a draft (not active), pass `is_draft=True`.

The user may also choose to skip the live call and take the preview YAML themselves and apply it via the Monte Carlo CLI or CI/CD. Always present the YAML on the preview call regardless.

---

## Validation Phase (Steps 1-3)

**CRITICAL: Do not call creation tools before the validation phase is complete.** The number one error pattern is agents skipping validation and calling a creation tool with guessed or incomplete parameters. Every field in the creation call must be grounded in data retrieved during this phase.

### Step 1: Understand the request

Ask yourself:
- What does the user want to monitor? (a specific table, a metric, a data quality rule, cross-table consistency, freshness/volume at schema level)
- Which monitor type fits? Use the monitor type selection table below.
- Does the user have all the details, or do they need guidance?

If the user's intent is unclear, ask a focused question before proceeding.

### Step 2: Identify the table(s) and columns

If you don't have the table MCON:
1. Use `search` with the table name and `include_fields: ["field_names"]` to find the MCON and get column names.
2. If the user provided a full table ID like `database:schema.table`, search for it.
3. Once you have the MCON, call `get_table` with `include_fields: true` and `include_table_capabilities: true` to verify capabilities and get domain info.

If you already have the MCON:
1. Call `get_table` with the MCON, `include_fields: true`, and `include_table_capabilities: true`.

**If `search` returns zero results, or `get_table` shows the table is not ingested:** STOP. The table must already exist in Monte Carlo before a monitor can be created against it. Ask the user to confirm the correct table name, or to ingest the table first — do not call the creation tool with an unverified table.

**CRITICAL: You need the actual column names from `get_table` results. NEVER guess or hallucinate column names.** This is the most common source of monitor creation failures.

**Pre-call column-verification gate (run this immediately before calling any creation tool):**

1. List every column name you plan to put in the tool arguments, in every slot the per-type reference describes (see the Tier-3 file for the authoritative list of column-bearing parameters).
2. For each name, confirm it appears verbatim in the `get_table.fields` list you fetched in this step. Names are case-sensitive on most warehouses (Snowflake often returns uppercase column names — match exactly).
3. If any name is missing, STOP. Do not call the creation tool. Ask the user to confirm the correct column name, or suggest the closest matches from the actual column list — do NOT substitute a similar-sounding name on your own.

If you reached this step without calling `get_table` (or equivalent) for the target table, go back — you cannot skip the fetch.

For monitor types that require a timestamp column (metric monitors), review the column names and identify likely timestamp candidates. Present them to the user if ambiguous.

**CRITICAL: The `warehouse` parameter on creation tools is a UUID, not a name.** Extract it from the `get_table` response (the resource / warehouse UUID). If you only have a warehouse name and no MCON, call `get_warehouses` to resolve it -- NEVER pass a warehouse name string like `databricks-aws-agent` or `snowflake-prod`, the backend will reject with `Warehouse not found`.

### Step 3: Handle domain assignment

**ALWAYS resolve a `domain_uuids` value BEFORE calling any creation tool.** Missing or empty domain assignment is one of the top failure modes — the backend will reject the monitor with `Domain assignment is required for this monitor. Please provide one and only one valid domain UUID.`

The tool field is `domain_uuids` (a list). For data monitors, provide exactly one UUID.

Use the `domains` list on the `get_table` response (each entry has `uuid` and `name`):

1. If the table's `domains` has exactly one entry: default `domain_uuids` to `[<that uuid>]`.
2. If the table's `domains` has multiple entries: present only those domains and ask the user to pick.
3. If the table's `domains` is empty: call `get_domains` to see the account's domains. If the account has one or more, ask the user to pick one (do not invent a selection) -- note that domains that don't contain the table may still be rejected on apply. If `get_domains` returns zero domains, only then may `domain_uuids` be omitted.

Do NOT present all account domains as options when the table already has domains listed -- prefer domains that contain the table.

**Agent-onboarding context.** If this create is part of an agent-onboarding flow (the table is a customer agent's upstream/golden table and an agent is in scope — e.g. you arrived here from the Context pillar of `agent-monitor-creation.md`), every monitor you create must carry that agent's footprint tag `tags=[{"name": "agent", "value": "<AGENT_NAME>"}]` (display name from the onboarding flow, verbatim) and reuse the same `audiences` and `domain_uuids` the agent's monitors use — this keeps the agent's whole footprint retrievable with a single tag filter (`get_monitors(monitor_tags=["agent:<AGENT_NAME>"])`). Outside an agent-onboarding flow, do NOT add an `agent` tag.

### Step 3b: Ground thresholds and predicates in real data (profiling)

Verified column names are not enough. Schema alone does not tell you whether a column is mostly-null, whether a status code is truly a closed set, or whether a numeric range is stable enough to alert on. Profiling once up front is the difference between a useful monitor and a noisy one the user mutes the next day.

| Monitor / config | Profiling | How to ground it |
| --- | --- | --- |
| Metric monitor, **auto / ML threshold** | **Not required** | The backend learns the baseline from history -- you don't pick a number. |
| Metric monitor, **manual `min`/`max`** | **Required** (unless the user pre-opts-out) | Sample the metric over a recent window and pick a threshold outside normal variation but tight enough to catch regressions. |
| **Validation** monitor (any predicate) | **Required** | Membership predicates (`in_set`/`not_in_set`/equality): sample distinct values. Range/regex/cross-field: sample the actual distribution. |
| **Custom SQL** monitor | **Required** | Run the proposed SQL once first -- confirm it parses, returns the expected shape, and produces values consistent with the threshold. |

How to profile depends on the environment: use `get_table` field stats where they suffice, or an optional database MCP (`snowflake_query`, `bigquery_query`, etc.) for distributions and distinct values. **If you cannot profile** (no query access, permission denied, user declines): do NOT invent values. Fall back to **auto / ML thresholds** where the monitor supports them, propose a metadata-only sketch for the user to refine, or pause -- and say which. A user instruction like "use my number directly", "skip profiling", or "just give me the dry-run" is a valid pre-opt-out; honor it without re-prompting.

### Step 3c: Field monitors require a live table monitor (prerequisite)

A metric or validation monitor on a table only runs if that table has an active **user-deployed table monitor** -- not the auto-applied out-of-the-box freshness/volume. A field monitor on an OOTB-only table is silently inert. Before proposing a metric/validation monitor, check the table's monitors (`get_monitors` for the MCON); if there is no user table monitor, tell the user the field monitor would not actually run, and offer to create a table monitor first. (Custom SQL monitors are exempt.)

---

## Creation Phase (Steps 4-8)

Only enter this phase after the validation phase is complete with real data from MCP tools.

### Step 4: Load the per-type reference

Based on the monitor type, read the detailed reference for parameter guidance:

| Type           | Reference file               |
| -------------- | ---------------------------- |
| **Metric**     | `data-metric-monitor.md`     |
| **Validation** | `data-validation-monitor.md` |
| **Custom SQL** | `data-custom-sql-monitor.md` |
| **Comparison** | `data-comparison-monitor.md` |
| **Table**      | `data-table-monitor.md`      |

These per-type reference files are not included in this catalog tree. Resolve an inspected upstream version or authoritative schema before continuing.

**CRITICAL: Every enum value comes from the per-type reference.** `metric`, `operator`, predicate `name`, `schedule.type`, `aggregate_by`, and any other enum-shaped parameter must match the exact strings documented in the Tier-3 file for this monitor type. Never invent values by analogy or adjust casing — the backend rejects anything outside the documented set. Subsets apply per threshold type (e.g. custom_sql Absolute Threshold allows fewer operators than the full list); the per-type file spells those out too. If you're unsure, ask the user rather than guessing.

### Step 5: Ask about scheduling

**Skip this step for table monitors.** Table monitors do not support the `schedule` field in MaC YAML -- adding it will cause a validation error on `montecarlo monitors apply`. Table monitor scheduling is managed automatically by Monte Carlo.

For all other monitor types, the creation tools default to a fixed schedule running every 60 minutes. Present these options:

1. **Fixed interval** -- a supported positive interval for `interval_minutes` (30, 60, 90, 120, 360, 720, 1440, etc.)
2. **Dynamic** -- MC auto-determines when to run based on table update patterns.
3. **Manual** -- runs only on demand.

Pass the user's choice to the creation tool as `schedule_type` and (for fixed schedules) `interval_minutes`. **Both the preview (`dry_run=True`) and the live (`dry_run=False`) call must use the same schedule arguments** -- the tool re-renders the schedule from these parameters when it deploys, so editing the `schedule` section of the preview YAML by hand does NOT change what the live call creates. Without explicit arguments the backend falls back to fixed/60 regardless of what the YAML displayed to the user.

Valid arguments:

- Fixed: `schedule_type="fixed"`, `interval_minutes=<N>` (validate type-specific minimum and alignment in the current tool schema)
- Dynamic: `schedule_type="dynamic"` (omit `interval_minutes`)
- Manual: `schedule_type="manual"` (omit `interval_minutes`)

**Views require a fixed schedule.** A view has no independent "last update" timestamp, so dynamic scheduling never triggers correctly. When the target is a view, always use a fixed schedule and surface that in the preview so the user sees the correct config.

### Step 6: Confirm with the user

**NEVER skip the confirmation step.**

Before calling the creation tool, present the monitor configuration in plain language:
- Monitor type
- Target table (and columns if applicable)
- What it checks / what triggers an alert
- Domain assignment
- Schedule
- Whether this is a new monitor or an in-place update (i.e. is `monitor_uuid` set?)
- Whether to save as draft (`is_draft=True`) or active

Ask: "Does this look correct? I'll generate the monitor configuration."

Also ask how the user wants to deploy it:

> **Deployment preference:** Deploy live now (via MCP), or save as a Monitors-as-Code YAML file to apply through your repo?
>
> - **Live (MCP):** I'll call the creation tool and the monitor will be active immediately.
> - **MaC YAML:** I'll generate the YAML definition so you can commit it to your repo and apply it with `montecarlo monitors apply`. Use `/monte-carlo-manage-mac` if you want to validate or edit the file first.

If the user chooses MaC YAML: generate the preview YAML (dry_run=True) as usual, present it wrapped in the standard MaC structure (see MaC YAML Format), and stop -- do not call with `dry_run=False`. The user takes the YAML from there.

Generate a concrete dry-run preview within the authorized scope. A missing deployment preference is not consent to live creation; require explicit confirmation of the preview before `dry_run=False`.

### Step 7: Create the monitor

This step is a **two-call sequence**. Do NOT skip the preview call.

1. **Preview call.** Call the appropriate creation tool with the parameters built in previous steps. Omit `dry_run` (it defaults to `True`) or pass `dry_run=True` explicitly. Always pass an MCON when possible. If only a table name is available, also pass `warehouse`. The tool returns rendered YAML in `result.yaml` and a DRY RUN notice in `result.instructions`. Present the YAML per Step 8 and ask the user to confirm before proceeding.
2. **Live call.** After the user confirms and explicitly opts in to deploying directly, call the same tool again with **the same parameters** plus `dry_run=False`. The tool actually creates (or updates) the monitor; the response carries the new `monitor_uuid` and a deep link in `result.instructions`. On this call `result.yaml` is `None` by design -- the monitor is already deployed.

**Updating an existing monitor.** If the user wants to edit a monitor they (or a previous call) already created, pass `monitor_uuid=<uuid>` on both the preview and live calls. The tool will update that monitor in place rather than creating a new one. Use a previously returned `monitor_uuid`, or look one up via `get_monitors`. If the underlying monitor was deleted between read and write, the tool will raise a clear error instructing you to retry without `monitor_uuid` (turning the intent from "update" into "create").

**PUT semantics -- do not skip this step.** `create_or_update_*_monitor` with `monitor_uuid` replaces the monitor configuration in full. Every parameter you omit reverts to the tool's default (e.g. schedule resets to fixed/60 minutes); it is NOT left untouched. To edit safely:

1. **Read the current config first.** Call `get_monitors(monitor_ids=[<uuid>], include_fields=["config"])` to get the full monitor configuration. `config` is excluded by default for performance -- you must request it explicitly.
2. **Carry over every value you want to keep**, in addition to the ones you're changing. Do not pass only the changed fields -- anything you leave out is overwritten with the tool default.
3. **Preview with `dry_run=True` and diff** the rendered YAML against the original config. If anything you meant to preserve is missing or changed, fix the call before running `dry_run=False`.

**Drafts.** Pass `is_draft=True` to save the monitor in draft state (not active). Omit it to create the monitor as active.

### Step 8: Present results

Handle both response shapes.

**Preview response (`dry_run=True`)** -- `result.yaml` is set; `result.monitor_uuid` is `None`; `result.instructions` includes a DRY RUN notice. You MUST include the YAML in your reply -- the user needs copy-pasteable YAML in the **same** message where you ask for confirmation. Do NOT refer back to "the YAML I showed you" or give deployment instructions without the actual YAML.

1. The YAML comes verbatim from `result.yaml` -- the tool has already rendered the schedule from the `schedule_type` / `interval_minutes` you passed in. Do NOT post-edit the `schedule` section to change values; if the schedule is wrong, re-call the preview with corrected arguments.
2. ALWAYS present the full YAML in a ```yaml code block. Present ALL YAML values exactly as returned by the tool. Do NOT reformat, convert, or "humanize" any values -- especially dates, timestamps, UUIDs, and identifiers.
3. Wrap the YAML in the standard MaC structure before presenting it (see MaC YAML Format below).
4. ALWAYS use ISO 8601 format for any datetime values you author (e.g. `start_time: '2026-03-25T09:00:00+00:00'`).
5. **NEVER reformat YAML values returned by creation tools.**
6. Explain the user's two options once they confirm: (a) let you re-call the tool with `dry_run=False` to deploy it directly in Monte Carlo, or (b) take the YAML and apply it themselves via Monte Carlo CLI or CI/CD.

**Live response (`dry_run=False`)** -- `result.yaml` is `None`; `result.monitor_uuid` is the new (or updated) monitor's UUID; `result.instructions` contains a deep link of the form `<webapp_url>/monitors/<monitor_uuid>`.

1. Confirm to the user that the monitor was created (or updated) and surface the deep link from `result.instructions` so they can click through to it in the Monte Carlo web app.
2. Do NOT try to re-render or invent YAML -- it is intentionally not returned for live calls.

---

## Monitor Type Selection

| Type           | Creation tool                         | Use when                                                                                                                               |
| -------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Metric**     | `create_or_update_metric_monitor`     | Track statistical metrics on fields (null rates, unique counts, numeric stats) or row count changes over time. Requires a timestamp field for aggregation. |
| **Validation** | `create_or_update_validation_monitor` | Row-level data quality checks with conditions (e.g. "field X is never null", "status is in allowed set"). Alerts on INVALID data.      |
| **Custom SQL** | `create_or_update_sql_monitor`        | Run arbitrary SQL returning a single number and alert on thresholds. Most flexible; use when other types don't fit.                    |
| **Comparison** | `create_or_update_comparison_monitor` | Compare metrics between two tables (e.g. dev vs prod, source vs target).                                                              |
| **Table**      | `create_or_update_table_monitor`      | Monitor groups of tables for freshness, schema changes, and volume. Uses asset selection at database/schema level.                     |

Per-type reference files with detailed parameter guidance, constraints, and examples:
- `data-metric-monitor.md`
- `data-validation-monitor.md`
- `data-custom-sql-monitor.md`
- `data-comparison-monitor.md`
- `data-table-monitor.md`

---

## MaC YAML Format

The YAML returned on the preview call (`dry_run=True`) is the monitor definition. It must be wrapped in the standard MaC structure to be applied:

```yaml
montecarlo:
  <monitor_type>:
    - <returned yaml>
```

For example, a metric monitor would look like:

```yaml
montecarlo:
  metric:
    - <yaml returned by create_or_update_metric_monitor>
```

**Important:** `montecarlo.yml` (without a directory path) is a separate Monte Carlo project configuration file -- it is NOT the same as a monitor definition file. Monitor definitions go in their own `.yml` files, typically in a `monitors/` directory or alongside dbt model schema files.

If the user prefers to deploy via CLI/CI rather than the live tool call:
- Save the YAML to a `.yml` file (e.g. `monitors/<table_name>.yml` or in their dbt schema)
- Apply via the Monte Carlo CLI: `montecarlo monitors apply --namespace <namespace>`
- Or integrate into CI/CD for automatic deployment on merge

---

## Schema Validation

Always add the following comment as the **first line** of any MaC YAML file you create or edit:

```yaml
# yaml-language-server: $schema=https://clidocs.getmontecarlo.com/mac/schema.json
```

The published schema is available at `https://clidocs.getmontecarlo.com/mac/schema.json`. Use an available read-only web/file tool to inspect it if you're uncertain whether a field name or value is valid for a given monitor type.

Generated YAML must not include fields that don't appear in the schema for that monitor type. Unknown fields are silently ignored by the CLI but indicate a misconfiguration and may break future validation.

**Schema scope:** The schema validates field names, types, and enum values only. Cross-field semantic constraints (e.g. required field combinations, mutually exclusive options, conditional required fields) are NOT checked by the schema — they are enforced by the Monte Carlo backend at apply time. A file that passes schema validation may still fail on `montecarlo monitors apply`.

---

## Available MCP Tools

All tools are available via the `monte-carlo-mcp` MCP server.

| Tool                            | Purpose                                                      |
| ------------------------------- | ------------------------------------------------------------ |
| `test_connection`               | Verify auth and connectivity before starting                 |
| `search`                        | Find tables/assets by name; use `include_fields` for columns |
| `get_table`                     | Schema, stats, metadata, domain membership, capabilities     |
| `get_validation_predicates`     | List available validation rule types for a warehouse         |
| `get_domains`                   | List MC domains (only needed if table has no domain info)    |
| `get_warehouses`                          | Resolve warehouse UUIDs from names; needed when a name is the only identifier |
| `get_monitors`                            | Look up an existing monitor's UUID for in-place updates via `monitor_uuid` |
| `create_or_update_metric_monitor`         | Create or update a metric monitor (preview on `dry_run=True`, deploy on `dry_run=False`) |
| `create_or_update_validation_monitor`     | Create or update a validation monitor (preview on `dry_run=True`, deploy on `dry_run=False`) |
| `create_or_update_comparison_monitor`     | Create or update a comparison monitor (preview on `dry_run=True`, deploy on `dry_run=False`) |
| `create_or_update_sql_monitor`            | Create or update a custom SQL monitor (preview on `dry_run=True`, deploy on `dry_run=False`) |
| `create_or_update_table_monitor`          | Create or update a table monitor (preview on `dry_run=True`, deploy on `dry_run=False`) |
