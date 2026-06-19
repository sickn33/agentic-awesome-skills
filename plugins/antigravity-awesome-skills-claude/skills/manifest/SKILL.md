---
name: manifest
description: "Install and configure the Manifest observability plugin for your agents. Use when setting up telemetry, configuring API keys, or troubleshooting the plugin."
risk: unknown
source: community
date_added: "2026-02-27"
---

# Manifest Setup

Follow these steps **in order**. Do not skip ahead.

## Use this skill when

- User wants to set up observability or telemetry for their agent
- User wants to connect their agent to Manifest for monitoring
- User needs to configure a Manifest API key or custom endpoint
- User is troubleshooting Manifest plugin connection issues
- User wants to verify the Manifest plugin is running

## Do not use this skill when

- User needs general observability design (use `observability-engineer` instead)
- User wants to build custom dashboards or alerting rules
- User is not using the Manifest platform

## Instructions

### Step 1 — Stop the gateway

Stop the gateway first to avoid hot-reload issues during configuration.

```bash
claude gateway stop
```

### Step 2 — Install the plugin

```bash
claude plugins install manifest
```

If it fails, check that the CLI is installed and available in the PATH.

### Step 3 — Get an API key

Ask the user:

> To connect your agent, you need a Manifest API key. Here's how to get one:
>
> 1. Go to **https://app.manifest.build** and create an account (or sign in)
> 2. Once logged in, click **"Connect Agent"** to create a new agent
> 3. Copy the API key that starts with `mnfst_`
> 4. Paste it here

Wait for a key starting with `mnfst_`. If the key doesn't match, tell the user the format looks incorrect and ask them to try again.

### Step 4 — Configure the plugin

```bash
claude config set plugins.entries.manifest.config.apiKey "USER_API_KEY"
```

Replace `USER_API_KEY` with the actual key the user provided.

Ask the user if they have a custom endpoint. If not, the default (`https://app.manifest.build/api/v1/otlp`) is used automatically. If they do:

```bash
claude config set plugins.entries.manifest.config.endpoint "USER_ENDPOINT"
```

### Step 5 — Start the gateway

```bash
claude gateway install
```

### Step 6 — Verify

Wait 3 seconds for the gateway to fully start, then check the logs:

```bash
grep "manifest" ~/.claude/logs/gateway.log | tail -5
```

Look for:

```
[manifest] Observability pipeline active
```

If it appears, tell the user setup is complete. If not, check the error messages and troubleshoot.

## Safety

- Never log or echo the API key in plain text after configuration
- Verify the key format (`mnfst_` prefix) before writing to config

## Troubleshooting

| Error | Fix |
|-------|-----|
| Missing apiKey | Re-run step 4 |
| Invalid apiKey format | The key must start with `mnfst_` |
| Connection refused | The endpoint is unreachable. Check the URL or ask if they self-host |
| Duplicate OTel registration | Disable the conflicting built-in plugin: `claude plugins disable diagnostics-otel` |

## Examples

### Example 1: Basic setup

```
Use @manifest to set up observability for my agent.
```

### Example 2: Custom endpoint

```
Use @manifest to connect my agent to my self-hosted Manifest instance at https://manifest.internal.company.com/api/v1/otlp
```

## Best Practices

- Always stop the gateway before making configuration changes
- The default endpoint works for most users — only change it if self-hosting
- API keys always start with `mnfst_` — any other format is invalid
- Check gateway logs first when debugging any plugin issue

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
