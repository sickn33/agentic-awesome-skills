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

Source of truth: `library/infrastructure.md` (read it for the latest — IPs/expirations change).

## Servers (Hostinger VPS) — 3 total

| Hostname | IP | OS | Purpose | Expires |
|---|---|---|---|---|
| openclaw-server | <IP> | Ubuntu 24.04 (Dokploy) | OpenClaw — personal instance | <expiry> |
| n8n-server | <IP> | Ubuntu 24.04 (n8n) | All n8n workflow automations (primary) | <expiry> |
| hermes-server | <IP> | Ubuntu 24.04 | Hermes Agent — Discord gateway (Vilnius, LT) | <expiry> |

The server table is an upstream example, not the current user’s inventory; `library/infrastructure.md` and `library/hermes/` are not bundled here. Resolve the authorized host from the actual workspace inventory, verify its SSH host key, and use a named least-privileged account; elevate only for the operation that requires it.

## Access levels (never share higher than needed)

1. **App login** — e.g. `app.example.hstgr.cloud`. Build/edit workflows, no server access. Safest to share.
2. **VPS SSH** — `root@<IP>`. Docker, files, system config. Trusted technical people only.
3. **Hostinger hPanel** — `hpanel.hostinger.com`. Billing, reboot, OS reinstall. Exposes SSH creds + browser terminal, so it grants server access too. The user only.

## Managing a VPS via an agent

Start with read-only service status and scoped redacted logs. For multi-step work, use an existing authorized remote session or a scoped on-host agent with normal approval controls. Before an update or restart, identify the affected service, backup/rollback path and expected interruption; verify service health afterward. Do not disable agent safeguards merely to simplify SSH operations.

When checking on a remote/on-box agent, send the user one concise status line each time: what it is doing and whether it is on track.

Claude Code cmux note: after Claude finishes, it may prefill a predicted next user message; that draft is Claude, not the user speaking.

## Agents on servers

- **OpenClaw** → openclaw-server (managed via Dokploy).
- **Hermes** → hermes-server (Discord gateway). Setup/config docs in `library/hermes/`.
- **n8n** → n8n-server.

## Hermes ops (on hermes-server)

```bash
hermes --version            # shows version + commits behind
hermes update               # auto-snapshots, updates deps, rebuilds web UI, restarts gateway itself
hermes gateway status|restart
journalctl --user -u hermes-gateway --since '5 min ago' --no-pager   # gateway logs (systemd USER service)
```

- **Default model** lives in `~/.hermes/config.yaml` under `model.provider` + `model.default` — NOT in `.env`. Change via `hermes model` (interactive) or edit the yaml directly, then `hermes gateway restart` to propagate to gateways.
- Treat `EBADENGINE` as evidence to check supported runtime ranges. Do not assume an unsupported runtime is safe because installation completed; plan a compatible dependency/runtime change and verify the gateway before declaring the update healthy.
- Deeper docs (Discord/Slack/WhatsApp setup, file structure, vision config): `library/hermes/`.

## Limitations

- Adapted from `davidondrej/skills`; verify local paths, tools, credentials, and agent features before acting.
- For commands, remote access, scheduling, browser automation, or file-changing workflows, get explicit user approval and confirm the target environment first.
