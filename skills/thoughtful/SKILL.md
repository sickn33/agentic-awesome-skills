---
name: thoughtful
description: Your thoughtful companion for WhatsApp - remembers what matters, helps you stay present in your relationships.
metadata: {"openclaw":{"emoji":"💭","requires":{"bins":["wacli-readonly"]}}}
risk: safe
source: community
---

# thoughtful

**Your thoughtful companion for WhatsApp.**

Goes beyond simple message summaries - helps you maintain relationships, catch what's slipping through the cracks, and communicate with intention instead of just reacting.

## What It Does

### 📊 Smart Tracking
- **Pending tasks** - action items from any conversation, tracked until complete
- **Waiting on** - things you asked about, waiting for responses
- **Commitments** - promises you made, deadlines you mentioned
- **Relationship dynamics** - sentiment shifts, response patterns, quiet conversations
- **Important dates** - birthdays, events, deadlines mentioned in chat
- **Decisions** - choices you made that you might need to remember

### 🧠 Communication Coaching
Acts as your emotionally intelligent assistant to help you:
- Catch things left hanging that need reply or closure
- Notice when tone/sentiment shifts in relationships
- Find good moments to check in or express appreciation
- Re-engage quiet conversations without awkwardness
- Stay intentional, not reactive

### 📝 Daily Summaries
Warm, conversational catch-ups that feel like a friend briefing you, not a robot checklist.

**Includes:**
- What's new (last 24h)
- What's still pending (from days/weeks ago)
- Relationship insights
- Suggested conversation starters
- Communication nudges

## Storage

All data stored in: `${WORKDIR}/thoughtful-data/` (defaults to `~/clawd/thoughtful-data/`)

```
thoughtful-data/
├── config.json          # Your preferences
├── state.json           # Processing state
├── tasks.json           # Pending items, commitments, waiting-on
├── people.json          # Relationship tracking per contact
├── summaries/           # Historical summaries
└── context/             # Conversation context per chat
```

## Configuration

**Interactive Setup (Recommended):**
When first using the skill, the agent will guide you through setup via chat:
- Which WhatsApp groups to track (shows list, you select)
- Priority contacts to always highlight
- Summary timing preferences
- Tracking features to enable/disable

All configuration happens through conversation - no manual file editing needed.

**Manual Configuration (Advanced):**
Edit `${WORKDIR}/thoughtful-data/config.json` to:
- Add/remove groups from whitelist
- Mark priority contacts
- Adjust tracking preferences
- Set summary timing

## Communication Coach Prompting

The skill uses this framework (inspired by littlebird):

> **Act as a thoughtful communication coach with a practical, emotionally intelligent lens.**
>
> Help improve communication in relationships with peers, colleagues, and friends by:
>
> 1. **Reflecting on interactions** - Have I left anything hanging? Has tone shifted?
> 2. **Suggesting check-ins** - Good moments to reach out or show appreciation
> 3. **Providing conversation starters** - Thoughtful prompts to start/restart conversations
> 4. **Re-engagement guidance** - How to re-open quiet conversations without awkwardness
>
> **Tone:** Clear, warm, and direct. No fluff, not robotic. Practically useful.

## How It Works

### Data Collection
1. Fetches messages from wacli-readonly (last 24h + older pending items)
2. Processes DMs + whitelisted groups only
3. Extracts action items, sentiment, commitments, dates
4. Updates tracking files

### Analysis & Insights
Uses LLM to:
- Understand conversation context and tone
- Identify what needs attention vs what can wait
- Detect relationship patterns (someone getting frustrated, conversations going quiet)
- Suggest thoughtful responses and check-ins

### Summary Generation
Creates warm, human summary with:
- **What's new** - fresh messages and action items
- **Still pending** - older tasks not yet complete
- **Relationship insights** - "Alice has asked 3 times, might be frustrated"
- **Suggested actions** - "Good time to check in with Bob"
- **Conversation starters** - Specific prompts you can send

### Interactive Task Management
Summary includes buttons to:
- ✅ Mark tasks done
- ⏭️ Still pending
- ❌ Won't do
- 💬 Draft reply

## Example Summary

```
Morning, Neil! ☀️

Here's your WhatsApp catch-up:

🆕 WHAT'S NEW (last 24h):

**Alice is waiting on you** (3 messages)
She's asked about Tuesday's meeting twice now and sent a restaurant link. 
Feels time-sensitive - she mentioned "need to know by tonight."

**Bob's getting urgent** (2 messages)
Those design files he asked for? Now needs them "before EOD." 
This has been pending for 2 days.

**House party group** (12 messages)
Weekend plans firming up. They're organizing who brings what.
Not urgent, but you might want to check in before Saturday.

⏰ STILL PENDING:

- Confirm Tuesday meeting - Alice (**5 days old**, asked 3x)
- Send design files - Bob (urgent, 2 days old)
- Review contract - Lawyer (low priority, 1 week old)

💡 COMMUNICATION INSIGHTS:

**Relationships that need attention:**
- Alice: Tone shifted from casual to "please let me know" - 
  she might be frustrated you haven't confirmed yet
- Bob: This is the second follow-up - shows it's important to him

**Quiet conversations worth reviving:**
- Haven't heard from Priya in 2 weeks (you asked about her project)
- Charlie went quiet after you said you'd think about his idea

📝 SUGGESTED ACTIONS:

**For Alice:**
"Hey! Sorry for the delay - yes, Tuesday works. That restaurant 
looks perfect, let's do 7pm?"

**For Bob:**
"On it - will have files to you by 3pm today. Thanks for the patience!"

**For Priya (re-engage):**
"Hey Priya! Been thinking about that project you mentioned - 
how's it going?"

Did you complete: "Confirm Tuesday meeting with Alice"?
[✅ Done] [⏭️ Still pending] [❌ Won't do] [💬 Draft reply]
```

## First-Time Setup

When a user first installs the skill, guide them through interactive setup:

1. **Authenticate wacli-readonly**
   - Run `wacli-readonly auth --qr-file /tmp/whatsapp-qr.png` (in sandbox)
   - Send QR code image to user
   - Wait for authentication confirmation

2. **List available groups**
   - Run `wacli-readonly groups list` (in sandbox)
   - Show user their WhatsApp groups
   - Ask which groups to include in summaries

3. **Configure preferences**
   - Ask about priority contacts
   - Confirm summary timing (default: 1pm daily)
   - Confirm tracking features (sentiment, commitments, etc.)

4. **Create cron job**
   - Set up daily summary cron (isolated session)
   - Confirm it's scheduled correctly

5. **Test run**
   - Generate first summary to verify setup
   - Deliver via Telegram

## Usage

**IMPORTANT: All thoughtful operations run in sandbox.**

When generating summaries:

1. Use the `thoughtful` skill
2. Run scripts in sandbox: `exec("~/clawd/skills/thoughtful/scripts/generate-summary.sh", {host: "sandbox"})`
3. Read generated prompt from `thoughtful-data/context/last-prompt.txt`
4. Use OpenClaw's LLM for summary generation
5. Deliver via current channel

The skill will:
- Fetch messages from wacli-readonly (sandbox)
- Process and analyze conversations
- Generate thoughtful summary using OpenClaw LLM
- Track tasks and relationship insights
- Deliver warm, conversational summary

## Cron Setup

**IMPORTANT:** 
- **Always use `sessionTarget: "isolated"`** - runs independently
- **Never use `sessionTarget: "main"`** - will not deliver properly
- All operations run in sandbox

Daily summary at 1 PM (default):
```json
{
  "name": "thoughtful-daily",
  "schedule": {"kind": "cron", "expr": "0 13 * * *", "tz": "Asia/Calcutta"},
  "sessionTarget": "isolated",
  "payload": {
    "kind": "agentTurn",
    "message": "1. Run wacli-readonly sync in sandbox (wait for finish).\n2. Run ~/clawd/skills/thoughtful/scripts/generate-summary.sh in sandbox.\n3. Read generated prompt and create thoughtful summary via Telegram.",
    "deliver": true,
    "channel": "telegram"
  }
}
```

**Note:** The agent will set this up automatically during first-time configuration. Users can adjust the time preference during setup.

## Privacy & Security

- All data stored locally in `~/clawd/whatsapp/`
- wacli-readonly database in `~/.wacli` (read-only, no sending)
- No external services except OpenClaw LLM for summaries
- All operations run in sandbox for isolation

## Tracking Features Explained

### Sentiment Trends
Detects if someone's tone is shifting:
- "Getting frustrated" (multiple follow-ups, shorter messages)
- "Going quiet" (reduced frequency, shorter replies)
- "More engaged" (longer messages, asking questions)

### Response Time Patterns
Tracks how long you typically take to reply per person:
- Helps identify if you're slower than usual with someone
- Flags when your delay might be noticed

### Recurring Topics
Notices patterns like:
- "Bob always asks about project updates on Fridays"
- "Alice sends restaurant links before dinner plans"

### Commitment Tracking
Extracts promises you made:
- "I'll send that by Tuesday"
- "Let me think about it and get back to you"
- "I'll check and let you know"

Flags if you haven't followed through.

### Important Dates
Catches mentions of:
- Birthdays, anniversaries
- Deadlines, launch dates
- Meetings, events
- "Next week," "end of month," etc.

### Decision Tracking
Remembers choices you made:
- "Let's go with Option A"
- "I decided not to attend"
- "We agreed on 7pm"

Helps you stay consistent and avoid contradicting yourself later.

## Tips for Best Results

1. **Whitelist carefully** - Only add groups you actively care about
2. **Mark priority contacts** - VIPs always show in summary
3. **Review summaries daily** - Interactive task completion keeps tracking accurate
4. **Use conversation starters** - They're tailored to your actual context
5. **Act on relationship insights** - Small check-ins prevent bigger issues

## Philosophy

This isn't about productivity hacks or inbox zero. It's about staying human in your digital communication:

- **Remember what matters** to people
- **Show up consistently** in relationships
- **Communicate with intention**, not just reaction
- **Catch small things** before they become big things

Your relationships deserve better than "sorry, forgot to reply." This helps you be the communicator you want to be.
