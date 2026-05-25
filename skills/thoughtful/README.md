# Thoughtful - Skill Directory

This directory contains scripts and documentation for the thoughtful skill.

Data is stored separately in `${WORKDIR}/thoughtful-data/` (defaults to `~/clawd/thoughtful-data/`).

## Structure

**Skill directory:** `${WORKDIR}/skills/thoughtful/`
```
skills/thoughtful/
├── SKILL.md
├── README.md
└── scripts/
    ├── generate-summary.sh
    └── process-and-summarize.js
```

**Data directory:** `${WORKDIR}/thoughtful-data/`
```
thoughtful-data/
├── config.json          # Your preferences and settings
├── state.json           # Processing state (last run, counts)
├── tasks.json           # Pending tasks, commitments, waiting-on items
├── people.json          # Relationship tracking per contact
├── summaries/           # Historical summaries (one per day)
└── context/             # Temporary processing data
    ├── recent-messages.json
    ├── recent-chats.json
    └── last-prompt.txt
```

## Quick Start

### 1. Configure Whitelisted Groups

Edit `config.json` and add groups you want to track:

```json
{
  "whitelistGroups": [
    {
      "jid": "120363421500795949@g.us",
      "name": "House party",
      "priority": "medium"
    }
  ]
}
```

To find group JIDs:
```bash
wacli-readonly groups list --json | jq '.[] | {jid: .JID, name: .Name}'
```

### 2. Generate Summary Manually

```bash
cd ~/clawd/skills/thoughtful/scripts
./generate-summary.sh
```

This will:
1. Fetch messages from wacli-readonly
2. Process and filter based on config
3. Generate prompt for LLM
4. Save to `context/last-prompt.txt`

### 3. Review the Prompt

```bash
cat ~/clawd/thoughtful-data/context/last-prompt.txt
```

This is what will be sent to the LLM to generate your summary.

### 4. Set Up Daily Cron

Create a cron job in OpenClaw:

```json
{
  "name": "thoughtful-daily",
  "schedule": {
    "kind": "cron",
    "expr": "0 9 * * *",
    "tz": "Asia/Calcutta"
  },
  "sessionTarget": "isolated",
  "payload": {
    "kind": "agentTurn",
    "message": "Generate WhatsApp communication summary using the thoughtful skill",
    "deliver": true,
    "channel": "telegram"
  }
}
```

## Configuration Options

### Chat Filtering

```json
{
  "includeAllDMs": true,          // Include all direct messages
  "whitelistGroups": [...],       // Only these groups
  "blacklistGroups": [...],       // Never these groups (overrides whitelist)
  "priorityContacts": [...]       // Always highlight these people
}
```

### Tracking Features

```json
{
  "trackSentiment": true,         // Detect tone shifts
  "trackResponseTime": true,      // Your reply patterns
  "trackRecurringTopics": true,   // Conversation patterns
  "trackCommitments": true,       // Promises you made
  "trackImportantDates": true,    // Events, deadlines
  "trackDecisions": true          // Choices you made
}
```

### Summary Options

```json
{
  "defaultTimeRange": "24h",
  "includeWaitingOn": true,
  "includePendingTasks": true,
  "includeRelationshipInsights": true,
  "communicationCoachMode": true,
  "tone": "warm, direct, emotionally intelligent"
}
```

## Data Files Explained

### tasks.json

Tracks action items across conversations:

- **tasks**: Things you need to do
- **waitingOn**: Things you're waiting for others to do
- **scheduled**: Meetings/events mentioned
- **commitments**: Promises you made
- **decisions**: Choices you made

### people.json

Per-contact relationship tracking:

- Response time patterns
- Sentiment trends
- Conversation frequency
- Important notes

### state.json

Processing metadata:

- Last processed timestamp
- Total messages processed
- Chats tracked
- First run flag

## Manual Testing

### Test Summary Generation

```bash
# Generate and view prompt
~/clawd/skills/thoughtful/scripts/generate-summary.sh
cat ~/clawd/thoughtful-data/context/last-prompt.txt

# Test with different time ranges
~/clawd/skills/thoughtful/scripts/generate-summary.sh "3 days"
```

### View Recent Messages

```bash
wacli-readonly messages list --limit 50
```

### View Chats

```bash
wacli-readonly chats list --limit 20
```

### Search for Specific Keywords

```bash
wacli-readonly messages search "meeting" --limit 10
```

## Integration with OpenClaw

The skill is designed to work with OpenClaw's LLM capabilities. The processing script:

1. Fetches and filters messages
2. Builds structured data
3. Generates communication coach prompt
4. (Future) Calls OpenClaw LLM API
5. Delivers summary via Telegram

For now, the prompt is saved to `context/last-prompt.txt` for manual testing.

## Privacy & Security

- All data stored locally (no cloud sync)
- wacli-readonly is read-only (can't send messages)
- Scripts run in sandbox for isolation
- No external API calls except OpenClaw LLM

## Troubleshooting

### No messages found

- Check wacli-readonly is authenticated: `wacli-readonly auth status`
- Verify sync is working: `wacli-readonly chats list`

### Groups not showing

- Add JID to whitelistGroups in config.json
- Get JIDs: `wacli-readonly groups list --json`

### Script fails

- Check Node.js is installed: `node --version`
- Make scripts executable: `chmod +x ~/clawd/skills/thoughtful/scripts/*.sh`
- Run in sandbox: use proper exec call with host="sandbox"

## Next Steps

1. Test manual summary generation
2. Review and adjust config
3. Set up daily cron
4. Integrate LLM API call in process-and-summarize.js
5. Add interactive task completion (Telegram buttons)

## Philosophy

This isn't just a notification system - it's a communication partner that helps you:

- Remember what matters to people
- Show up consistently in relationships
- Communicate with intention, not just reaction
- Catch small things before they become big things

Your relationships deserve better than "sorry, forgot to reply."
