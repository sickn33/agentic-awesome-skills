# Host and Operational Checks

The root skill defines authorization and release selection. This reference replaces generic port3000, hand-built LaunchDaemon, exposed Ollama and automatic sudo-restart examples that were not tied to OpenClaw's supported interface.

## Networking

Inspect configured bind addresses and the documented Gateway authentication/pairing rules. Keep the listener on loopback unless remote access is explicitly authorized. If using Tailscale or a proxy, verify the release-specific trusted-proxy/header rules, TLS and identity policy; a tailnet is not an unrestricted trust domain. Never pass reusable auth keys in command arguments or publish a credential-bearing dashboard URL.

For a proxy, validate the full configuration before reload and preserve rollback. Rate-limit zones must be declared in the correct nginx context. Do not use a partial server block as a complete configuration. Test WebSockets and API routes with allowed and denied clients, and preserve authenticated upstream behavior. Avoid firewall “block all” changes during an unprotected remote session: retain a recovery path.

## Monitoring

Use the selected CLI's documented status/health/log interfaces. Record account, owner, version, timestamp and errors. An unavailable command or denied request is unknown, not healthy. Do not send raw prompts, logs or secrets to third-party monitoring. Use restricted logs (for example0600/0640), bounded retention and supported rotation; renaming an open output file may leave the process writing to the old inode.

Example host inventory, with private output kept local:

```bash
sw_vers
node --version
openclaw --version
openclaw gateway status
pmset -g
```

Before scheduling checks, verify the actual endpoint and authentication. Use bounded request timeouts and a private per-user state directory, never a predictable shared `/tmp` counter. Avoid concurrent counter writes; use a supported supervisor rather than a cron job that repeatedly invokes sudo restart. Alerts and outbound messages require an authorized destination.

## Validation Checklist

- Exactly one intended Gateway process/service owns the configured port.
- Authentication denies an unpaired/unauthorized client.
- Approved synthetic provider request succeeds; no unrelated tools/actions run.
- Sleep, logout, reboot and FileVault unlock behavior are tested under an approved maintenance window.
- Configuration, credentials and data are backed up with restricted permissions; a restore is verified.
- Logs are redacted/restricted and bounded; failed checks preserve useful evidence.
- Docker-backed deployments verify persistent volume identity and container-runtime startup.

Do not test persistence by deleting data, killing unrelated processes, pruning Docker storage or disabling encryption. Diagnose the exact process/resource and prepare a rollback before any authorized repair.
