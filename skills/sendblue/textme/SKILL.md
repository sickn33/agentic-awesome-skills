---
name: textme
description: "Text Claude from your phone — set up the njerschow/textme daemon so inbound iMessages drive a Claude Code session on your laptop, with voice notes, image input, code execution, and a phone-number whitelist."
category: automation
risk: critical
source: community
source_repo: njerschow/textme
source_type: community
date_added: "2026-05-26"
author: AnthonyFirth
tags: [textme, sendblue, imessage, sms, claude-code, daemon, remote-control, automation]
tools: [claude, cursor, gemini]
license: "MIT"
license_source: "https://github.com/njerschow/textme/blob/main/LICENSE"
plugin:
  targets:
    codex: blocked
    claude: blocked
---

# TextMe

## Overview

[`njerschow/textme`](https://github.com/njerschow/textme) is a local daemon that bridges inbound iMessages (via [Sendblue](https://sendblue.com)) to a Claude Code session on the user's machine. Whitelisted phone numbers can text, send voice notes, send images, and drive Claude through filesystem operations, code execution, and `cd`-based directory navigation — turning the user's phone into a remote control for Claude on their laptop. This is the **inbound** counterpart to outbound notification patterns ([[sendblue-notify]]): textme is phone → Claude; sendblue-notify is Claude → phone.

## When to Use This Skill

- Use when the user says "text Claude", "text my laptop", "drive Claude from my phone", "I want to send iMessages to Claude", or "let me code from my phone".
- Use when the user is heads-down away from their desk and wants to kick off, supervise, or interrupt a Claude session via SMS/iMessage.
- Use when setting up a long-running headless workstation that the user wants to remote-control while travelling or away from the keyboard.
- Pair with [[sendblue-notify]] for bidirectional flow — outbound completion pings + inbound commands on the same Sendblue account.
- Do **not** use for outbound-only "text me when X finishes" patterns. That is [[sendblue-notify]] and does not need a daemon.

## Prerequisites

- macOS or Linux host that stays online (the daemon polls Sendblue continuously).
- Node.js 18+.
- An active Sendblue account with API credentials and a provisioned iMessage number — set up via [[sendblue-cli]] (`sendblue setup`, then `sendblue show-keys` to surface API key/secret).
- Claude Code installed and authenticated on the host (`npm install -g @anthropic-ai/claude-code`).
- Optional: an OpenAI API key for Whisper voice-note transcription.

## How It Works

### Step 1: Install the daemon

```bash
git clone https://github.com/njerschow/textme.git
cd textme/daemon
npm install
npm run build
mkdir -p ~/.config/claude-imessage
```

### Step 2: Configure credentials and the whitelist

Create `~/.config/claude-imessage/config.json`:

```json
{
  "sendblue": {
    "apiKey": "YOUR_SENDBLUE_API_KEY",
    "apiSecret": "YOUR_SENDBLUE_API_SECRET",
    "phoneNumber": "+1SENDBLUE_NUMBER"
  },
  "whitelist": ["+1YOUR_PHONE"],
  "pollIntervalMs": 5000,
  "conversationWindowSize": 20
}
```

The `whitelist` is the **only** authorization gate between an inbound iMessage and code execution on the host. Treat it as a security boundary, not a UX preference. Add only phone numbers the user controls; never add a shared, work, or family number "just in case".

For voice transcription, optionally add to `.env` in the daemon directory:

```bash
OPENAI_API_KEY=sk-...
```

### Step 3: Run the daemon

For a quick test run:

```bash
cd textme/daemon
npm start
```

For persistent operation (recommended once the user has verified behavior):

```bash
pm2 start dist/index.js --name textme
pm2 save
pm2 startup
```

Or, on macOS, install the launchd service:

```bash
./scripts/install-launchd.sh
```

### Step 4: Drive Claude from iMessage

Once the daemon is running, an iMessage from a whitelisted number to the Sendblue phone number reaches Claude. Built-in commands:

| Command | Effect |
|---|---|
| `?` | List available commands |
| `status` | Show current daemon status and working directory |
| `queue` | Show messages queued for processing |
| `history` | Recent message history |
| `home` | `cd` back to home directory |
| `reset` | Return home and clear conversation history |
| `cd /path` | Change working directory |
| `stop` | Cancel the current Claude task |
| `yes` / `no` | Approve or reject the pending action |

Anything else is treated as a Claude prompt and routed to the active session.

### Step 5: Verify before relying on it

Before using textme in unattended workflows, the user must:

1. Send `status` from the whitelisted phone — should get a directory + state reply.
2. Send a benign command (`pwd`, `ls`) and confirm output arrives.
3. Send something from a **non-whitelisted** number and confirm it is **ignored**, not echoed.
4. Pull the plug: kill the daemon and confirm messages stop being processed (no zombie process).

If any of these fail, do not enable launchd / pm2 auto-start.

## Examples

### Example 1: Initial setup walk-through

```bash
# 1. Make sure sendblue CLI is set up and creds work
sendblue whoami

# 2. Grab Sendblue API key & secret (these are NOT the CLI's bearer token)
sendblue show-keys

# 3. Clone + build the daemon
git clone https://github.com/njerschow/textme.git
cd textme/daemon && npm install && npm run build

# 4. Fill in ~/.config/claude-imessage/config.json with the values from step 2
#    and YOUR personal phone number as the only whitelist entry

# 5. Start, send "?" from your phone, confirm response
npm start
```

### Example 2: Composing with `sendblue-notify`

Wire outbound completion pings via [[sendblue-notify]] *and* inbound control via textme — they share the same Sendblue account but solve opposite problems:

- Claude finishes a long task → texts user via [[sendblue-notify]] (`Stop` hook).
- User replies "look at the diff" → textme routes that into Claude → Claude responds back via Sendblue.

### Example 3: Tail the daemon log

```bash
# pm2
pm2 logs textme

# Standalone
tail -f ~/.local/log/claude-imessage.log
```

### Example 4: MCP-only alternative (no daemon)

If the user wants Sendblue messaging available to Claude Code as tools but does **not** want a polling daemon listening for inbound commands, they can register Sendblue as an MCP server instead:

```bash
claude mcp add sendblue_api \
  --env SENDBLUE_API_API_KEY=your-api-key \
  --env SENDBLUE_API_API_SECRET=your-api-secret \
  -- npx -y sendblue-api-mcp --client=claude-code --tools=all
```

This gives Claude outbound Sendblue tools inside a session but does **not** open the inbound phone-controls-Claude channel that textme provides. Pick textme when "text Claude from anywhere" is the goal; pick MCP when Claude only needs to send.

## Best Practices

- ✅ **Whitelist exactly one phone number to start.** The whitelist is the security boundary; expand it slowly and only to numbers the user controls.
- ✅ **Run the daemon as a regular user**, never as root or via `sudo`.
- ✅ **Start in a sandbox directory** for first tests (`cd ~/textme-sandbox`), not in `~` or a real repo.
- ✅ **Verify the non-whitelist ignore path** before enabling auto-start. A daemon that processes any sender is an open shell on the host.
- ✅ **Keep `pollIntervalMs` ≥ 5000** unless the user understands the Sendblue rate limits and cost implications.
- ❌ **Don't share the Sendblue number publicly.** Even with a whitelist, the host is doing per-message work; a flood from an unknown sender still costs polling cycles.
- ❌ **Don't store `config.json` in a repo, dotfiles backup, or cloud sync** — it contains API credentials and the user's phone number.
- ❌ **Don't run the daemon on a shared machine** without considering what every other user of that machine can now reach by sending an SMS.

## Limitations

- **Outbound-only flows do not need this skill.** For "text me when X finishes" use [[sendblue-notify]]; running a daemon is overkill.
- **Voice transcription requires a separate OpenAI API key.** Without it, voice notes are dropped or surfaced as un-transcribed audio depending on daemon version.
- **The daemon polls on an interval** — there is no push delivery. Expect single-digit-second latency between message receipt and Claude response.
- **One conversation, one machine.** This is a per-host daemon, not a multi-tenant service. Two daemons sharing one Sendblue number will both try to handle every inbound message.
- **Sendblue free-plan verification still applies.** The user's phone must have texted the Sendblue number once before outbound responses from Claude reach the user (see [[sendblue-cli]] limitations).

## Security & Safety Notes

textme is a **remote code execution surface gated only by a phone-number whitelist**. Treat it accordingly.

- **Whitelist is the security boundary.** Anyone who can spoof or hijack a whitelisted number can drive Claude on the host. Be deliberate about which numbers go on the list and remove them when they no longer need access. <!-- security-allowlist: documented remote-control daemon; required disclosure per quality-bar.md -->
- **Sendblue API credentials are sensitive.** `config.json` contains an API key, API secret, and the user's phone number. Mode it `600`, keep it out of dotfile repos, and never paste it into shared logs, gists, or screenshots.
- **The daemon inherits the user's privileges.** It can read, write, and execute anything the running user can. Do not run as root, do not run from a directory with secrets the user does not want exposed to inbound SMS, and prefer a dedicated host or VM if available.
- **Claude Code's permission model still applies inside the daemon-driven session** — destructive actions still surface confirmation prompts. textme exposes the `yes`/`no` reply path for those prompts, which means the *phone number* is making the approval. Make sure the whitelist matches the trust level of approving destructive operations remotely.
- **Inbound messages are untrusted input.** Treat textme prompts as user input from the open internet (with phone-number authentication). Do not pipe their contents into `eval`, shell substitution, or scripts that bypass Claude Code's review.
- **Lock-screen previews of replies leak.** When Claude responds to a message, the reply lands on the user's lock screen unredacted. Don't ask Claude over textme to surface secrets, tokens, or customer data via SMS — link to a local log or PR instead.
- **Daemon liveness is a footgun.** If pm2/launchd is auto-restarting the daemon, the user must remember to stop it before changing whitelist entries, rotating credentials, or rebooting into an untrusted state.

## Common Pitfalls

- **Whitelist drift.** A number added "for a demo" never gets removed. Audit `whitelist` whenever the host changes hands or scope.
- **`apiKey` / `apiSecret` confusion.** Sendblue's API credentials (from `sendblue show-keys`) are distinct from the CLI's local bearer token in `~/.sendblue/credentials.json`. textme needs the *API* credentials, not the CLI auth file.
- **Free-plan silent send failures.** If the user's phone never texted the Sendblue number first, outbound replies from Claude silently fail. Verify with `sendblue contacts` before relying on the loop.
- **Auto-start before verification.** Installing the launchd plist or `pm2 save`-ing the daemon before testing the non-whitelist ignore path will baseline a potentially open daemon at boot. Verify first, persist second.
- **Running the daemon in `~` or a repo with secrets.** The working directory at startup is exposed to anything textme is told to do (`ls`, `cat`, etc.). Start in a sandbox directory and `cd` deliberately.
- **Confusing textme with the Sendblue MCP.** They look similar but the MCP variant only gives Claude *outbound* Sendblue tools — it does not open an inbound channel. If the user wants "text Claude from my phone", they need textme; if they want "Claude can send a text mid-session", the MCP is lighter.

## Related Skills

- `@sendblue-notify` — Outbound counterpart (Claude → phone). Composes with textme to make the loop bidirectional.
- `@sendblue-cli` — Account setup, credential management, and the `show-keys` command that surfaces the API key/secret textme needs.
- `@sendblue-api` — HTTP API reference for users who want to build a custom inbound handler instead of using textme's daemon.
- `@update-config` — If wiring textme alongside Claude Code hooks (e.g. a `Stop` hook that pings the user), use this for the settings.json edits.

## Links

- Repository: <https://github.com/njerschow/textme>
- License: <https://github.com/njerschow/textme/blob/main/LICENSE> (MIT)
- Sendblue: <https://sendblue.com>
- Sendblue docs: <https://docs.sendblue.com>
