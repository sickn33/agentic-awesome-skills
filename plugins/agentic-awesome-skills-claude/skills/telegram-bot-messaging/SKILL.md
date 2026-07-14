---
name: telegram-bot-messaging
description: "Send Telegram messages, files, and alerts via bot API; ask questions with inline buttons and wait for the answer. Supports multiple bots, named chat targets, and CI/cron/hook notifications."
category: productivity
risk: critical
source: https://github.com/sanjay3290/ai-skills/tree/main/skills/telegram
source_repo: sanjay3290/ai-skills
source_type: community
date_added: "2026-07-09"
author: sanjay3290
tags: [telegram, notifications, bots, approvals]
tools: [claude, cursor, gemini]
license: "Apache-2.0"
license_source: "https://github.com/sanjay3290/ai-skills/blob/main/LICENSE"
---

# Telegram

## When to Use

- Use when you need to send a Telegram message, file, or alert from a workflow, hook, cron job, or CI pipeline
- Use when a long-running task should notify you or ask for approval on your phone (inline-button questions that wait for the answer)
- Use when wiring "notify me when done" or "ask me before proceeding" behavior into automated sessions

Send updates, alerts, and files to Telegram; read replies; run ask-and-wait
approval flows. Pure bash + curl + jq — no install beyond a bot token.

First run: `scripts/telegram.sh setup` (guided BotFather walkthrough).

## Safety Gate

Before setup, sending a message or file, reading replies, or enabling a hook, obtain the
user's explicit approval for the target chat, bot account, and exact content or file. Never
send workspace, customer, credential, or secret data automatically. Treat a token as a secret:
do not echo it, commit it, or place it in shell history.

## Commands

```bash
scripts/telegram.sh send "Deploy finished ✅"                    # basic alert
scripts/telegram.sh send "low priority" --silent                # no notification sound
scripts/telegram.sh send "*bold* alert" --format md             # MarkdownV2 (falls back to plain)
scripts/telegram.sh send "hi" --to alerts --bot work            # named target + named bot
scripts/telegram.sh file report.pdf "Q3 report"                 # document (photos auto-detected)
scripts/telegram.sh read                                        # new incoming messages since last read
ANSWER=$(scripts/telegram.sh ask "Deploy to prod?" --options "Yes,No" --timeout 300)
# exit 0 = answered (stdout = answer), 2 = timeout
```

## Config

Env vars win, then `~/.config/telegram/config` (mode 600):

```
TELEGRAM_BOT_TOKEN=123:ABC...     # default bot
TELEGRAM_CHAT_ID=987654321        # default target
BOT_ALERTS_TOKEN=456:DEF...       # --bot alerts   (add via: setup --bot alerts)
TARGET_FAMILY=-100987...          # --to family    (any chat/group/channel id)
TELEGRAM_APPROVER_IDS=123456789   # default group approver user IDs (comma-separated)
APPROVERS_FAMILY=123456789,987654321 # approvers for --to family (overrides default)
```

Replies and answers are only accepted from configured chat IDs. Private chats preserve the
direct-chat behavior (the sender user ID must equal the chat ID). Because a group chat ID is
shared by every member, `ask` fails closed for groups unless `TELEGRAM_APPROVER_IDS` or the
target-specific `APPROVERS_<NAME>` explicitly lists the Telegram user IDs allowed to answer.

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

## Limitations

- Telegram is a third-party service: message and file contents leave the local machine and may
  be retained under Telegram's policies.
- This skill cannot verify that a chat ID belongs to the intended recipient; confirm the target
  before every new destination or automation.
- Bot tokens grant control of the bot. Store them only in a protected local secret store or
  mode-600 configuration file. The script supplies token-bearing API URLs to curl through
  stdin rather than process arguments; rotate a token if exposure is suspected.
- Do not use the examples to create unattended notifications or approval flows without the
  user's explicit, current authorization.
