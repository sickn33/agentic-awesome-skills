---
name: sendblue-cli
description: "Send iMessage and SMS from the shell via the @sendblue/cli npm package — outbound sends, contact management, and account setup with no API client or webhook server required."
category: api-integration
risk: critical
source: community
source_repo: sendblue-api/sendblue-cli
source_type: official
date_added: "2026-05-22"
author: AnthonyFirth
tags: [sendblue, imessage, sms, cli, messaging, notifications]
tools: [claude, cursor, gemini]
license: "MIT"
license_source: "https://github.com/sendblue-api/sendblue-cli/blob/main/LICENSE"
plugin:
  targets:
    codex: blocked
    claude: blocked
---

# Sendblue CLI

## Overview

`@sendblue/cli` is a Node CLI that creates a Sendblue account, provisions an iMessage-enabled number, and sends messages. It is the fastest way to text from a shell, script, or Claude Code hook — no API client, no webhook server, no credentials in env vars. Credentials live at `~/.sendblue/credentials.json` (mode `600`) and Node.js 18+ is required.

## When to Use This Skill

- Use when the user wants to text a phone number from a script, shell, hook, or agent turn (e.g. "text me when X finishes", "ping my phone", "notify on completion").
- Use when the user mentions `sendblue` as a CLI/binary or asks to set up the `@sendblue/cli` package.
- Prefer this skill over [[sendblue-api]] when the work happens in a shell context, one-shot script, cron job, or agent hook.
- Reach for [[sendblue-api]] instead when writing application code that integrates Sendblue, receiving inbound webhooks, or needing features the CLI does not expose (send styles, reactions, group messages, status callbacks, media uploads).

## How It Works

### Step 1: Install

```bash
npm install -g @sendblue/cli       # global, exposes `sendblue`
# or one-shot:
npx @sendblue/cli <command>
```

### Step 2: Set up an account

`sendblue setup` runs interactively by default. For CI/scripts, run it in two phases — the first call sends an 8-digit verification code by email, the second consumes it.

```bash
sendblue setup --email you@example.com                                       # sends code
sendblue setup --email you@example.com --code 12345678 \
               --company my-co --contact +15551234567                        # completes setup
```

| Flag | Notes |
|---|---|
| `--email` | Email address |
| `--code` | 8-digit verification code (from the email) |
| `--company` | Lowercase, hyphens/underscores, 3–64 chars |
| `--contact` | First contact, E.164 |

### Step 3: Send messages

```bash
sendblue send +15551234567 'Hello from Sendblue!'
sendblue messages --inbound --limit 20
```

Phone numbers must be E.164 (`+` + country code + digits, no spaces or dashes).

### Step 4: Manage contacts and plan

On the free plan, **a contact must text your Sendblue number once before outbound sends to that contact will work**. After `sendblue setup ... --contact +15551234567`, have that contact send any text to the printed Sendblue number, then run `sendblue contacts` to confirm verification.

## Command Reference

| Command | Purpose |
|---|---|
| `sendblue setup` | Create account, verify email, set company name, add first contact |
| `sendblue login` | Log in to an existing account |
| `sendblue send <number> <message>` | Send an iMessage |
| `sendblue messages [--inbound\|--outbound] [-n <number>] [-l <count>]` | List recent messages |
| `sendblue add-contact <number>` | Register a contact |
| `sendblue contacts` | List contacts and their verification status |
| `sendblue status` | Account/plan info |
| `sendblue whoami` | Show current credentials and verify validity |

## Examples

### Example 1: Notify when a long task finishes

```bash
long_running_thing && sendblue send +15551234567 "✅ done: $(date)"
```

### Example 2: Read recent inbound for a specific contact

```bash
sendblue messages -n +15551234567 --inbound --limit 50
```

### Example 3: Verify creds are good before a batch send

```bash
sendblue whoami || sendblue login
```

### Example 4: Wire to a Claude Code `Stop` hook

To text yourself at the end of every agent turn, register a `Stop` hook in `settings.json` that shells out to `sendblue send`. Defer the actual hook wiring to [[update-config]] and the trigger logic to [[sendblue-notify]] — this skill only owns the CLI invocation.

## Best Practices

- ✅ **Use E.164 numbers everywhere.** `+15551234567`, never `5551234567` or `(555) 123-4567`.
- ✅ **Run `sendblue whoami` before unattended batches** to fail fast on stale or missing creds.
- ✅ **Re-run `setup` as the same OS user** that owns `~/.sendblue/credentials.json`.
- ❌ **Don't `sudo`** — it writes creds to root's home and the next non-sudo run won't see them.
- ❌ **Don't embed creds in env vars** when the CLI already reads them from the per-user credentials file.

## Limitations

- Outbound-first: there is no built-in webhook server for inbound. Use [[sendblue-api]] webhooks for full inbound handling.
- The CLI does not expose send styles/effects, reactions, group messages, status callbacks, media uploads, or the contacts API beyond basic CRUD. Reach for the HTTP API for those.
- Free-plan accounts require recipient verification before outbound sends succeed.

## Security & Safety Notes

- Credentials are written to `~/.sendblue/credentials.json` with mode `600`. Treat that file like an API key — do not commit it, do not copy it across machines without the same posture.
- Treat every outbound send, contact setup, login, or account setup action as state-changing. Preview the recipient, message body, and account/email target, then wait for explicit user confirmation before running it.
- Run the CLI as the OS user that owns the credentials file. `sudo` writes a separate copy under root's home and silently desyncs.
- Outbound messages to phone numbers are not free of consequence — wire `sendblue send` into hooks or loops only after gating on duration or success conditions to avoid spamming the recipient.
- Verification codes arrive by email; treat the address you registered with as a recovery factor for the account.

## Common Pitfalls

- **E.164 only.** `5551234567` or `(555) 123-4567` will fail — always `+15551234567`.
- **Free-plan unverified contacts.** Outbound to a contact that hasn't texted in first returns an error — have them text your Sendblue number once, then confirm with `sendblue contacts`.
- **Two-step setup in non-interactive mode.** `--email` alone only sends the code; you must run a second invocation with `--code` and the rest of the flags to finish.
- **Credentials are per-user.** `~/.sendblue/credentials.json` is owner-only (`600`). Don't `sudo` and pollute root's home — re-running as the same user that ran `setup` is what works.

## Related Skills

- `@sendblue-api` — HTTP/JSON alternative for application code, webhooks, and features the CLI does not expose.
- `@sendblue-notify` — Patterns and copy rules for "text me when X is done" workflows that sit on top of this CLI.
- `@update-config` — Wires `sendblue send` into Claude Code hooks (`Stop`, `Notification`) without owning the message logic.

## Links

- README & full flag reference: <https://github.com/sendblue-api/sendblue-cli>
- Sendblue: <https://sendblue.com>
- API docs (deeper protocol details): <https://docs.sendblue.com>
