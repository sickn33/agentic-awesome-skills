# Generate Validation Notebook Skill

Automatically generate SQL validation notebooks for dbt model changes. Given a GitHub PR or local dbt repository, this skill identifies modified models and produces a Monte Carlo SQL Notebook with targeted validation queries comparing baseline and development data.

## What it does

1. Identifies changed dbt models from a PR diff or local branch
2. Analyzes each model's schema, config, segmentation fields, and time axis
3. Generates SQL validation queries (row counts, distribution checks, NULL rates, before/after comparisons, uniqueness checks)
4. Packages everything into a Monte Carlo SQL Notebook with parameterized database references
5. Outputs an import URL that opens the notebook directly in Monte Carlo's notebook interface

## Prerequisites

- Claude Code or any MCP-capable editor
- [GitHub CLI](https://cli.github.com/) (`gh`) — required for PR mode, must be authenticated
- Python 3 with `pyyaml` installed (`pip install pyyaml`)
- [MC Bridge](https://docs.getmontecarlo.com/docs/mc-bridge) running and connected to your warehouse

## Setup

### Via the mc-agent-toolkit plugin (recommended)

Install the plugin for your editor — see the [main README](../../README.md) for instructions. The skill is bundled automatically.

### Standalone

Copy the skill to your local skills directory:

```bash
cp -r skills/generate-validation-notebook ~/.claude/skills/generate-validation-notebook
```

## Usage

### PR mode

```
/mc-generate-validation-notebook https://github.com/your-org/dbt/pull/123
```

Fetches the PR diff from GitHub, identifies changed models, and generates validation queries.

### Local mode

```
/mc-generate-validation-notebook .
```

Uses `git diff` against the base branch to find changed models in the current repository.

### Options

- `--mc-base-url <URL>` — Monte Carlo base URL (defaults to `https://getmontecarlo.com`)
- `--models <model1,model2,...>` — only generate for specific models (by filename, without `.sql`)

## What gets generated

The notebook includes:

- **Parameter cells** — `prod_db` and `dev_db` for selecting databases
- **Markdown summary** — PR metadata, changed models, usage instructions
- **SQL validation queries** organized by pattern:
  - Row counts (single and comparison)
  - Segmentation distribution
  - Changed field distribution
  - NULL rate checks
  - Uniqueness checks
  - Time-axis continuity
  - Before/after comparisons
  - Sample data previews

Up to 10 changed models are processed per invocation.

## Supported warehouses

Generated SQL uses ANSI-compatible syntax that works across Snowflake, BigQuery, Redshift, and Athena. Minor adjustments may be needed for specific warehouse quirks.
