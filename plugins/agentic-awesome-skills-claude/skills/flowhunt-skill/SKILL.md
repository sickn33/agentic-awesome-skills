---
name: flowhunt-skill
description: "Automation discovery audit skill. Walks through a 5-question workflow intake, then audits Gmail/Calendar/Slack/task trackers to identify automation opportunities. Use when a user wants to discover what processes in their business can be automated."
category: automation
risk: safe
source: community
source_repo: heyneuron/flowhunt-skill
source_type: community
date_added: "2026-05-23"
author: heyneuron
tags: [automation, discovery, audit, gmail, calendar, slack, productivity, workflow]
tools: [claude, codex, gemini, cursor]
license: "MIT"
license_source: "https://github.com/heyneuron/flowhunt-skill/blob/main/LICENSE"
---

# FlowHunt Skill — Automation Discovery Audit

## Overview

FlowHunt is an automation discovery audit skill. It guides agents through a structured 5-question intake to understand the user's business context, then systematically audits connected tools (Gmail, Google Calendar, Slack, task trackers, and more) to surface concrete automation opportunities ranked by impact and effort.

The skill is cross-agent: it works with Claude Code, Codex CLI, Gemini CLI, OpenCode, and any agent that accepts markdown skill files.

Install: `npx skills add heyneuron/flowhunt-skill`

## When to Use This Skill

- Use when the user asks "what can I automate in my business?"
- Use when the user wants a workflow audit across Gmail, Calendar, Slack, or task tools
- Use when starting an automation engagement and need structured discovery before recommending solutions
- Use when the user says "show me automation opportunities" or "FlowHunt"

## How It Works

### Step 1: Intake — 5-Question Workflow Questionnaire

Ask the user exactly these five questions, one at a time:

1. **Role & team size** — What is your role, and how many people are on your team?
2. **Top 3 repetitive tasks** — What are the three most repetitive tasks you or your team do every week?
3. **Connected tools** — Which tools do you actively use? (Gmail, Google Calendar, Slack, Notion, Jira, Asana, HubSpot, etc.)
4. **Pain point** — Which of those repetitive tasks costs you the most time or causes the most errors?
5. **Automation goal** — Are you looking to save time, reduce errors, or hand off tasks entirely?

Wait for answers before moving to the audit.

### Step 2: Audit — Scan Connected Tools

For each tool the user mentioned, surface automation patterns:

**Gmail**
- Auto-labeling and routing rules
- Draft generation for recurring email types
- Invoice / attachment extraction to Drive or Notion
- Follow-up reminders when no reply received

**Google Calendar**
- Meeting prep summaries (agenda + attendee context) sent automatically
- Booking link workflows with intake forms
- Post-meeting action item extraction

**Slack**
- Daily standup collection → summary to channel or doc
- Keyword alerts routed to the right person
- Approval workflows with emoji reactions

**Task trackers (Asana, Jira, Notion, Linear)**
- Auto-create tasks from emails or Slack messages
- Status update reminders
- Weekly digest of overdue or blocked items

**CRMs (HubSpot, Salesforce, Pipedrive)**
- Lead scoring and routing rules
- Follow-up sequences triggered by deal stage change
- Contact enrichment on new lead creation

### Step 3: Prioritization Matrix

Rank each identified opportunity on a 2x2:

| | Low effort | High effort |
|---|---|---|
| **High impact** | Do first (quick wins) | Plan carefully |
| **Low impact** | Nice to have | Skip for now |

Present the top 3 quick-win automations with:
- What it does
- Which tools it connects
- Estimated time saved per week
- Suggested implementation path (Zapier / Make / n8n / custom code)

### Step 4: Output

Deliver a structured Automation Opportunity Report in markdown:

```
# Automation Opportunity Report

## Business Context
[Summary from intake]

## Top 3 Quick Wins
1. [Name] — [What it does] — [Tools] — [~X hrs/week saved]
2. ...
3. ...

## Full Opportunity List
[All identified automations, ranked]

## Recommended Next Step
[Single clearest action the user can take today]
```

## Common Rationalizations to Reject

| Excuse | Why it's wrong |
|--------|----------------|
| "I'll skip the intake and guess their stack" | Intake prevents wasted recommendations on tools they don't use |
| "I'll list every possible automation" | Overwhelming output kills adoption — prioritize ruthlessly |
| "I'll recommend complex custom code first" | Start with no-code/low-code quick wins; earn the right to build |

## Red Flags

- User has no clear repetitive task → dig deeper, they always exist
- Recommending automations for tools the user didn't mention → stay scoped
- Skipping the prioritization matrix → every opportunity looks equal without it

## Limitations

- This skill identifies and prioritizes automation opportunities; it does not implement the automations for the user.
- Tool audits depend on the user's stated stack and any explicitly connected data sources; do not assume access to Gmail, Calendar, Slack, CRMs, or task trackers.
- Time-saved estimates are directional planning aids, not guaranteed outcomes.

## Verification

The skill is complete when the user has:
- [ ] Answered all 5 intake questions
- [ ] Received a ranked list of automation opportunities
- [ ] Identified at least one quick-win automation they can start this week
- [ ] A clear recommended next step
