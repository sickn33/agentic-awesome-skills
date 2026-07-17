---
name: vps-server-management
description: "Manage authorized VPS hosts and server-side agents through cautious SSH and operations workflows."
category: operations
risk: critical
source: community
source_repo: davidondrej/skills
source_type: community
date_added: "2026-07-07"
author: davidondrej
tags: [vps, ssh, server-management]
tools: [claude, codex]
license: "MIT"
license_source: "https://github.com/davidondrej/skills/blob/main/LICENSE"
---

# VPS Server Management

## When to Use

- Use when the user asks to operate an authorized VPS or agent running on a remote host.
- Use when SSH, deployment, restart, status, or log inspection is needed with explicit permission.

Obtain the current host inventory, environment, access method, and maintenance constraints from the user or the organization's approved inventory before connecting. Do not rely on remembered IPs, credentials, or expiration dates.

## Servers (Hostinger VPS) — 3 total

| Hostname | IP | OS | Purpose | Expires |
|---|---|---|---|---|
| openclaw-server | <IP> | Ubuntu 24.04 (Dokploy) | OpenClaw — personal instance | <expiry> |
| n8n-server | <IP> | Ubuntu 24.04 (n8n) | All n8n workflow automations (primary) | <expiry> |
| hermes-server | <IP> | Ubuntu 24.04 | Hermes Agent — Discord gateway (Vilnius, LT) | <expiry> |

Prefer a named, non-root account with key-based authentication and only the scoped `sudo` permissions needed for the approved task. Use direct root access only when no safer path exists and the user explicitly approves it for the named host and operation.

## Access levels (never share higher than needed)

1. **App login** — e.g. `app.example.hstgr.cloud`. Build/edit workflows, no server access. Safest to share.
2. **VPS SSH** — named non-root account with scoped `sudo`. Docker, files, and system configuration remain privileged operations. Trusted technical people only.
3. **Hostinger hPanel** — `hpanel.hostinger.com`. Billing, reboot, OS reinstall. Exposes SSH creds + browser terminal, so it grants server access too. The user only.

## Managing a VPS via an agent

For multi-step or exploratory work, prefer a supervised, least-privilege session with a clearly bounded working directory and commands that require confirmation before mutation. Do not launch an agent with approval bypasses or unrestricted root access. For short command sequences, use an existing supervised SSH session after confirming the exact host and command plan.

Before any file change, package update, deployment, service restart, or scheduling change:

1. Confirm the host identity, environment, current user, and authorization for the exact operation.
2. Inspect current state with read-only commands and identify dependencies and blast radius.
3. Capture the affected configuration or snapshot and document a tested rollback or restore path.
4. Present the exact mutation, expected impact, maintenance window, health checks, and rollback trigger; obtain explicit approval immediately before execution.
5. Apply the smallest change with scoped privileges, verify service health and logs, and roll back if the agreed checks fail.

When checking on a remote/on-box agent, send the user one concise status line each time: what it is doing and whether it is on track.

Claude Code cmux note: after Claude finishes, it may prefill a predicted next user message; that draft is Claude, not the user speaking.

## Agents on servers

- **OpenClaw** → openclaw-server (managed via Dokploy).
- **Hermes** → hermes-server (Discord gateway). Confirm the installed version and deployment-specific setup before changing it.
- **n8n** → n8n-server.

## Hermes ops (on hermes-server)

```bash
hermes --version            # shows version + commits behind
hermes update               # mutating: snapshots, updates deps, rebuilds UI, and restarts; approval required
hermes gateway status       # read-only status check
hermes gateway restart      # disruptive: explicit approval required
journalctl --user -u hermes-gateway --since '5 min ago' --no-pager   # gateway logs (systemd USER service)
```

- **Default model** lives in `~/.hermes/config.yaml` under `model.provider` + `model.default` — NOT in `.env`. Back up the file, show the exact change, and obtain approval before using `hermes model` or editing it. Restart the gateway only under the separate mutation gate above.
- npm `EBADENGINE` warnings during update (deps want Node >=24, box runs v22) are non-blocking — do not "fix" them.
- For deployment-specific Discord, Slack, WhatsApp, file-structure, or vision configuration, inspect the installed version's own documentation and current configuration; do not assume paths or settings.

## Limitations

- Adapted from `davidondrej/skills`; verify local paths, tools, credentials, and agent features before acting.
- For commands, remote access, scheduling, browser automation, or file-changing workflows, get explicit user approval and confirm the target environment first.
- Never bypass approval controls, expose credentials, or broaden privileges to make an operation easier.
