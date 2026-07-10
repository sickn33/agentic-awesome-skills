# Telegram Skill

An AI agent skill for sending Telegram messages, files, and alerts via the Bot API - send updates, ask-and-wait for approval with inline buttons, and read replies. Works with Claude Code, Gemini CLI, Cursor, OpenAI Codex, Goose, and other AI clients supporting the [Agent Skills Standard](https://agentskills.io).

## Features

- **Send** - Plain text, MarkdownV2, or HTML messages (auto-splits over 4096 chars, auto-falls back to plain text if formatting is rejected)
- **File** - Send documents; images (png/jpg/jpeg/gif/webp) are automatically sent as photos
- **Ask** - Ask a question with inline buttons and wait for a tap or free-text reply (approve-from-phone)
- **Read** - Print new incoming messages since the last read
- **Multi-bot** - Register additional named bots alongside the default
- **Multi-target** - Route messages to named chats, groups, or channels
- **Hook integration** - Wire into Claude Code hooks, cron jobs, or CI for notifications

Pure bash + curl + jq — no install beyond a bot token.

## Requirements

- `bash`
- `curl`
- `jq` (`brew install jq` on macOS, `apt install jq` on Debian/Ubuntu)

macOS ships bash and curl out of the box; only `jq` typically needs installing.

## Quick Start

### 1. Create a bot

1. Open [@BotFather](https://t.me/BotFather) in Telegram
2. Send `/newbot` and follow the prompts (display name, then a username ending in "bot")
3. BotFather replies with an HTTP API token

### 2. Run setup

```bash
scripts/telegram.sh setup
```

This walks you through pasting the token, validates it via `getMe`, and asks you to send a message to your new bot so it can discover your chat ID. Config is written to `~/.config/telegram/config` (mode 600), and a confirmation message is sent to confirm everything works.

### 3. Add more bots (optional)

```bash
scripts/telegram.sh setup --bot alerts
```

Repeat with a different `--bot NAME` for each additional bot. Named bots share the default chat ID unless you configure a different target for them.

### 4. Find group/channel IDs (optional)

To send to a group or channel instead of your personal chat:

1. Add your bot to the group/channel
2. Send any message in that group/channel
3. Run `scripts/telegram.sh read --all` to see the chat ID printed alongside the message
4. Add `TARGET_<NAME>=<chat_id>` to `~/.config/telegram/config`, then use `--to <name>`

## Usage Examples

### Send Messages

```bash
# Basic alert
scripts/telegram.sh send "Deploy finished ✅"

# No notification sound
scripts/telegram.sh send "low priority update" --silent

# MarkdownV2 formatting (falls back to plain text if rejected)
scripts/telegram.sh send "*bold* alert" --format md

# HTML formatting
scripts/telegram.sh send "<b>bold</b> alert" --format html

# Named target and named bot
scripts/telegram.sh send "hi" --to alerts --bot work
```

### Send Files

```bash
# Send a document
scripts/telegram.sh file report.pdf "Q3 report"

# Images are auto-detected and sent as photos
scripts/telegram.sh file screenshot.png "Build output"

# To a named target, silently
scripts/telegram.sh file backup.zip --to alerts --silent
```

### Ask and Wait for an Answer

```bash
# Default Yes/No options, 5-minute timeout
ANSWER=$(scripts/telegram.sh ask "Deploy to prod?" --options "Yes,No" --timeout 300)
echo "$ANSWER"

# Custom options
scripts/telegram.sh ask "Which environment?" --options "Staging,Prod,Cancel"
```

Exit code `0` means answered (the answer is printed to stdout); exit code `2` means the timeout was reached with no reply.

### Read Incoming Messages

```bash
# New messages since the last read (advances the offset)
scripts/telegram.sh read

# Limit the number of messages
scripts/telegram.sh read --limit 5

# Ignore the saved offset and show everything available
scripts/telegram.sh read --all
```

Note: `ask` and `read` share the same per-bot cursor, so an `ask` consumes incoming messages that a later `read` would otherwise show.

## Command Reference

| Command | Description | Arguments | Exit codes |
|---------|-------------|-----------|------------|
| `setup` | Guided bot registration + chat-ID discovery | `--bot NAME` | 0 success, 1 error |
| `send MESSAGE` | Send a text message | `--to TARGET`, `--bot NAME`, `--silent`, `--format md\|html` | 0 success, 1 error |
| `file PATH [CAPTION]` | Send a document (or photo for images) | `--to TARGET`, `--bot NAME`, `--silent` | 0 success, 1 error |
| `ask QUESTION` | Ask with inline buttons, wait for reply | `--options "Yes,No"`, `--timeout SECS`, `--to TARGET`, `--bot NAME` | 0 answered, 2 timeout, 1 error |
| `read` | Print new incoming messages since last read | `--limit N`, `--bot NAME`, `--all` | 0 success, 1 error |

## Config Reference

Environment variables take precedence; anything not set in the environment falls back to `~/.config/telegram/config` (created with mode 600):

```
TELEGRAM_BOT_TOKEN=123:ABC...     # default bot token
TELEGRAM_CHAT_ID=987654321        # default chat/target
BOT_ALERTS_TOKEN=456:DEF...       # named bot: --bot alerts (add via: setup --bot alerts)
TARGET_FAMILY=-100987...          # named target: --to family (any chat/group/channel id)
```

- `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` — default bot token and default send target.
- `BOT_<NAME>_TOKEN` — a named bot's token, selected with `--bot <name>` (uppercased key, e.g. `--bot alerts` → `BOT_ALERTS_TOKEN`).
- `TARGET_<NAME>=<chat_id>` — a named send target, selected with `--to <name>` (uppercased key, e.g. `--to family` → `TARGET_FAMILY`). A numeric `--to` value is used directly as a chat ID without a lookup.
- `TELEGRAM_CONFIG_DIR` — overrides the config directory (default `~/.config/telegram`).

## Claude Code hooks (settings.json)

Ping your phone when Claude needs input, and when it finishes:

```json
{
  "hooks": {
    "Notification": [{"hooks": [{"type": "command",
      "command": "~/.claude/skills/telegram/scripts/telegram.sh send \"🔔 Claude needs input in $(basename \\\"$PWD\\\")\""}]}],
    "Stop": [{"hooks": [{"type": "command",
      "command": "~/.claude/skills/telegram/scripts/telegram.sh send \"✅ Claude finished in $(basename \\\"$PWD\\\")\" --silent"}]}]
  }
}
```

Approval gate in any script/automation:

```bash
if [ "$(scripts/telegram.sh ask 'Deploy to prod?' --options 'Yes,No')" = "Yes" ]; then
  ./deploy.sh
fi
```

## Security Notes

- The bot token grants full control of the bot — anyone with it can send/receive as your bot. Treat it like a password.
- `~/.config/telegram/config` is created with mode 600 (owner read/write only).
- Replies and answers to `ask` are only honored from configured chat IDs — messages from strangers who find a public bot are ignored.
- By default, bots in group chats only see messages that mention them or are replies to them. To read all group messages, either make the bot an admin or disable privacy mode for it via @BotFather (`/setprivacy`).

## License

Apache 2.0
