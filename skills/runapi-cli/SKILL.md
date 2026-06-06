---
name: runapi-cli
description: Run RunAPI model jobs from agents using the RunAPI CLI.
category: development
risk: safe
source: official
source_repo: runapi-ai/cli-skill
source_type: official
date_added: "2026-06-07"
author: runapi-ai
tags: [runapi, cli, models, automation, codex, claude, gemini]
tools: [claude, codex, gemini, cursor, antigravity]
license: "Apache-2.0"
license_source: "https://github.com/runapi-ai/cli-skill/blob/main/LICENSE"
---

# RunAPI CLI

## Overview

The `runapi` CLI is the execution layer for RunAPI model tasks. Use it when an agent needs to run a one-off model job, pass a JSON request body, wait for an async task, or script RunAPI from a terminal, server, or CI job.

Source repository: [github.com/runapi-ai/cli-skill](https://github.com/runapi-ai/cli-skill) (Apache-2.0)

## When to Use This Skill

- Use when the user asks to run a RunAPI model from an agent.
- Use when the user needs to inspect RunAPI CLI auth or account status.
- Use when the user wants to pass JSON request bodies to RunAPI services.
- Use when the user wants to submit async RunAPI tasks and wait for completion.
- Use when the user wants to install the RunAPI CLI on a local machine, server, or CI runner.

## Install

### macOS / Linux

```shell
brew install runapi-ai/tap/runapi
```

### Server / CI

Download the installer, inspect it, then run it locally.

```shell
curl -fsSL https://runapi.ai/cli/install.sh -o runapi-install.sh
less runapi-install.sh
sh runapi-install.sh
```

To pin a specific version:

```shell
sh runapi-install.sh --version v0.1.0
```

The installer detects OS and architecture, verifies the SHA-256 checksum from `https://runapi.ai/cli/latest.json`, and refuses to write the binary if verification fails.

## Authentication

Check the current state first:

```shell
runapi auth status
```

| Source | How |
|---|---|
| Environment | Read `RUNAPI_API_KEY` from the environment |
| Saved config | `printf '%s' "$RUNAPI_API_KEY" \| runapi auth import-token --token -` |
| Browser login | `runapi login` only when the user explicitly wants browser auth |

`RUNAPI_BASE_URL` overrides the default base URL.

Avoid passing secrets directly in command arguments. Prefer `RUNAPI_API_KEY` or stdin token import with `--token -`.

## Discover Services, Commands, and Fields

The CLI is JSON-first. Every service exposes typed commands, and each command documents its request fields through `--help`. Inspect command help before composing a request.

```shell
runapi --help
runapi suno --help
runapi suno text-to-music --help
```

## Run a Model

Pass the request body as JSON through `--input-file`, `--input`, or stdin. The default flow is synchronous and polls until the task completes.

```shell
runapi suno text-to-music --input-file request.json

runapi suno text-to-music --async --input-file request.json
runapi wait <task-id> --service suno --action text-to-music

runapi get <task-id> --service suno --action text-to-music
```

JSON responses go to stdout; progress lines go to stderr. Pipe to `jq` for downstream parsing.

## Account

```shell
runapi account info
runapi account balance
```

## Install the Skill Into Another Agent Runtime

```shell
runapi agent install-skill --target claude
runapi agent install-skill --target codex
runapi agent install-skill --target gemini
runapi agent install-skill --target openclaw
runapi agent list-targets
runapi agent install-skill --target-dir <path>
```

## Limitations

- RunAPI model calls require a valid RunAPI account or API key.
- Some model tasks are long-running and should use `--async` plus `runapi wait`.
- Browser login is interactive and should not be the default path for agents.
- This skill does not replace model-specific parameter validation; inspect command help before building request JSON.

## Security & Safety Notes

- Never paste API keys into example commands or PR text.
- Prefer `RUNAPI_API_KEY` or stdin token import instead of command-line secrets.
- Do not run interactive `runapi login` by default from an agent.
- Check the CLI exit code before assuming a task succeeded.

## References

- RunAPI CLI skill: https://github.com/runapi-ai/cli-skill
- RunAPI CLI repository: https://github.com/runapi-ai/cli
- RunAPI model catalog: https://runapi.ai/models.md
