---
name: sshepherd
description: "Zero-knowledge SSH ops CLI — server health checks, docker/systemd control, log tailing, Postgres introspection, and declarative deploys, without ever exposing credentials to the agent."
category: devops
risk: critical
source: community
source_repo: Antheurus/sshepherd
source_type: community
date_added: "2026-07-15"
author: Antheurus
tags: [ssh, devops, cli, server-ops, postgres, deploy, zero-knowledge]
tools: [claude, cursor, gemini, codex]
license: "MIT"
license_source: "https://github.com/Antheurus/sshepherd/blob/main/LICENSE"
---

# sshepherd

## Overview

`sshepherd` is a compiled Bun/TypeScript CLI that lets an agent operate a real remote server over SSH — health checks, docker/systemd service control, log tailing, config file edits, read-only Postgres introspection, and declarative deploys — without ever seeing a password, private key, hostname, username, or port. Every operation shells out to the system `ssh` binary through a single transport path and returns the same typed `Envelope<T>` (`ok`, `alias`, `data`, `error`), never a raw terminal dump. The agent passes only a *name* — an ssh alias, a Postgres target, or a deploy recipe — that resolves entirely outside the process.

## When to Use This Skill

- Use when you need to check a remote server's health (disk, memory, CPU, ports, OOM history) without handing the agent SSH credentials.
- Use when working with remote docker or systemd services — listing, inspecting, or restarting them — or tailing their logs.
- Use when the user asks to read or edit a remote config file, run a declarative deploy from a named recipe, introspect a remote Postgres database read-only, or audit SSH/security posture on a box.

## How It Works

### Step 1: Declare targets once, outside any prompt

Every connection detail is declared ahead of time and never appears on the command line: ssh aliases in `~/.ssh/config`, Postgres targets in `~/.config/sshepherd/targets.toml`, deploy recipes in recipe TOML files. OpenSSH resolves the real `HostName`/`User`/`Port`/`IdentityFile` internally.

### Step 2: Invoke a group + action by name

```
sshepherd <group> <action> [positionals...] [--flag value]
```

Nine command groups — `hosts`, `check`, `logs`, `services`, `deploy`, `config`, `db`, `files`, `security` — 52 ops total. Output is JSON to stdout by default; add `--pretty` for a human-readable table/key-value view. The response only ever echoes back the `alias` it was given — there is no host/user/port/ip field anywhere in the response type, structurally.

### Step 3: Discover the command surface

```bash
./dist/sshepherd --help                 # list groups
./dist/sshepherd check --help           # list actions + flags for one group
```

## Examples

### Example 1: Server health overview

```bash
./dist/sshepherd check overview lms-server
```

Returns a JSON envelope with disk, memory, CPU, listening ports, and OOM history for the host behind the `lms-server` alias — the agent never learns the host's address.

### Example 2: Restart a docker service and tail its logs

```bash
./dist/sshepherd services restart lms-server --name api
./dist/sshepherd logs tail lms-server --name api --lines 100
```

### Example 3: Read-only Postgres introspection

```bash
./dist/sshepherd db tables prod
```

`prod` is a pg-target name that resolves to *how* to reach `psql` on a host — never a database password. `psql` runs inside the target container, authenticated by peer/trust/`.pgpass` already on the remote.

## Best Practices

- ✅ Declare every alias/target/recipe ahead of time in `~/.ssh/config` / `targets.toml` / recipe TOML — never inline connection details.
- ✅ Pass only names (alias, pg-target, recipe) to the CLI; let OpenSSH own authentication.
- ✅ Use `--pretty` for human review and default JSON output for machine parsing.
- ❌ Don't try to inject a hostname, user, port, or password into a command — the CLI has no field for them.
- ❌ Don't reach for the `ssh2` npm library or hand-rolled SSH; the whole point is delegating to the trusted system `ssh` binary.

## Limitations

- This skill does not replace environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, or safety boundaries are missing.
- Requires the system OpenSSH client and pre-declared aliases/targets/recipes; it cannot connect to a host that has not been configured outside the agent.
- Postgres access is read-only introspection by design.

## Security & Safety Notes

- **Zero-knowledge credential model:** the agent never sees a password, private key, hostname, username, or port. It only ever passes an ssh alias, a pg-target name, or a recipe name; the real connection tuple is resolved by OpenSSH outside the process, and every response echoes back only the alias.
- **Never reads private key material.** Authentication happens entirely inside OpenSSH's own trusted code path.
- **Confirmation gate on mutations:** destructive/mutating actions (service restart, config write, deploy) require an explicit `--yes` confirm flag.
- **Human-only credential entry:** the separate `setup ssh-alias install` action opens a one-shot local browser form that only a human can type a password into — the agent can trigger and wait on it but never sees, logs, or relays the password.
- Environment expectation: run against hosts you are authorized to operate.

## Common Pitfalls

- **Problem:** Trying to pass a hostname or password directly to a command.
  **Solution:** Register the target first (`setup ssh-alias register` / `setup db-target`), then reference it only by name.
- **Problem:** A mutating action returns without doing anything.
  **Solution:** Add the `--yes` confirm flag — mutations are gated by design.

## Related Skills

- `@devops-automation` - When you need broader CI/CD or infrastructure-as-code automation beyond SSH ops.
