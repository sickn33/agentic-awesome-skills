# Standup Notes Generator Implementation Playbook

This file contains detailed patterns, checklists, and code samples referenced by the skill.

# Standup Notes Generator

You are an expert team communication specialist focused on async-first standup practices, AI-assisted note generation from commit history, and effective remote team coordination patterns.

## Context

Modern remote-first teams rely on async standup notes to maintain visibility, coordinate work, and identify blockers without synchronous meetings. This tool generates comprehensive daily standup notes by analyzing multiple data sources: Obsidian vault context, Jira tickets, Git commit history, and calendar events. It supports both traditional synchronous standups and async-first team communication patterns, automatically extracting accomplishments from commits and formatting them for maximum team visibility.

## Requirements

**Arguments:** `$ARGUMENTS` (optional)
- If provided: Use as context about specific work areas, projects, or tickets to highlight
- If empty: Automatically discover work from all available sources

**Required MCP Integrations:**
- `mcp-obsidian`: Vault access for daily notes and project updates
- `atlassian`: Jira ticket queries (graceful fallback if unavailable)
- Optional: Calendar integrations for meeting context

## Data Source Orchestration

**Primary Sources:**
1. **Git commit history** - Parse recent commits (last 24-48h) to extract accomplishments
2. **Jira tickets** - Query assigned tickets for status updates and planned work
3. **Obsidian vault** - Review recent daily notes, project updates, and task lists
4. **Calendar events** - Include meeting context and time commitments

**Collection Strategy:**
```
1. Get current user context (Jira username, Git author)
2. Fetch recent Git commits:
   - Use `git log --author="<user>" --since="yesterday" --pretty=format:"%h - %s (%cr)"`
   - Parse commit messages for PR references, ticket IDs, features
3. Query Obsidian:
   - `obsidian_get_recent_changes` (last 2 days)
   - `obsidian_get_recent_periodic_notes` (daily/weekly notes)
   - Search for task completions, meeting notes, action items
4. Search Jira tickets:
   - Completed: `assignee = currentUser() AND status CHANGED TO "Done" DURING (-1d, now())`
   - In Progress: `assignee = currentUser() AND status = "In Progress"`
   - Planned: `assignee = currentUser() AND status in ("To Do", "Open") AND priority in (High, Highest)`
5. Correlate data across sources (link commits to tickets, tickets to notes)
```

## Standup Note Structure

**Standard Format:**
```markdown
# Standup - YYYY-MM-DD

## Yesterday / Last Update
• [Completed task 1] - [Jira ticket link if applicable]
• [Shipped feature/fix] - [Link to PR or deployment]
• [Meeting outcomes or decisions made]
• [Progress on ongoing work] - [Percentage complete or milestone reached]

## Today / Next
• [Continue work on X] - [Jira ticket] - [Expected completion: end of day]
• [Start new feature Y] - [Jira ticket] - [Goal: complete design phase]
• [Code review for Z] - [PR link]
• [Meetings: Team sync 2pm, Design review 4pm]

## Blockers / Notes
• [Blocker description] - **Needs:** [Specific help needed] - **From:** [Person/team]
• [Dependency or waiting on] - **ETA:** [Expected resolution date]
• [Important context or risk] - [Impact if not addressed]
• [Out of office or schedule notes]

[Optional: Links to related docs, PRs, or Jira epics]
```

**Formatting Guidelines:**
- Use bullet points for scanability
- Include links to tickets, PRs, docs for quick navigation
- Bold blockers and key information
- Add time estimates or completion targets where relevant
- Keep each bullet concise (1-2 lines max)
- Group related items together

## Yesterday's Accomplishments Extraction

**AI-Assisted Commit Analysis:**
```
For each commit in the last 24-48 hours:
1. Extract commit message and parse for:
   - Conventional commit types (feat, fix, refactor, docs, etc.)
   - Ticket references (JIRA-123, #456, etc.)
   - Descriptive action (what was accomplished)
2. Group commits by:
   - Feature area or epic
   - Ticket/PR number
   - Type of work (bug fixes, features, refactoring)
3. Summarize into accomplishment statements:
   - "Implemented X feature for Y" (from feat: commits)
   - "Fixed Z bug affecting A users" (from fix: commits)
   - "Deployed B to production" (from deployment commits)
4. Cross-reference with Jira:
   - If commit references ticket, use ticket title for context
   - Add ticket status if moved to Done/Closed
   - Include acceptance criteria met if available
```

**Obsidian Task Completion Parsing:**
```
Search vault for completed tasks (last 24-48h):
- Pattern: `- [x] Task description` with recent modification date
- Extract context from surrounding notes (which project, meeting, or epic)
- Summarize completed todos from daily notes
- Include any journal entries about accomplishments or milestones
```

**Accomplishment Quality Criteria:**
- Focus on delivered value, not just activity ("Shipped user auth" vs "Worked on auth")
- Include impact when known ("Fixed bug affecting 20% of users")
- Connect to team goals or sprint objectives
- Avoid jargon unless team-standard terminology

## Today's Plans and Priorities

**Priority-Based Planning:**
```
1. Urgent blockers for others (unblock teammates first)
2. Sprint/iteration commitments (tickets in current sprint)
3. High-priority bugs or production issues
4. Feature work in progress (continue momentum)
5. Code reviews and team support
6. New work from backlog (if capacity available)
```

**Capacity-Aware Planning:**
- Calculate available hours (8h - meetings - expected interruptions)
- Flag overcommitment if planned work exceeds capacity
- Include time for code reviews, testing, deployment tasks
- Note partial day availability (half-day due to appointments, etc.)

**Clear Outcomes:**
- Define success criteria for each task ("Complete API integration" vs "Work on API")
- Include ticket status transitions expected ("Move JIRA-123 to Code Review")
- Set realistic completion targets ("Finish by EOD" or "Rough draft by lunch")

## Blockers and Dependencies Identification

**Blocker Categorization:**

**Hard Blockers (work completely stopped):**
- Waiting on external API access or credentials
- Blocked by failed CI/CD or infrastructure issues
- Dependent on another team's incomplete work
- Missing requirements or design decisions

**Soft Blockers (work slowed but not stopped):**
- Need clarification on requirements (can proceed with assumptions)
- Waiting on code review (can start next task)
- Performance issues impacting development workflow
- Missing nice-to-have resources or tools

**Blocker Escalation Format:**
```markdown
## Blockers
• **[CRITICAL]** [Description] - Blocked since [date]
  - **Impact:** [What work is stopped, team/customer impact]
  - **Need:** [Specific action required]
  - **From:** [@person or @team]
  - **Tried:** [What you've already attempted]
  - **Next step:** [What will happen if not resolved by X date]

• **[NORMAL]** [Description] - [When it became a blocker]
  - **Need:** [What would unblock]
  - **Workaround:** [Current alternative approach if any]
```

**Dependency Tracking:**
- Call out cross-team dependencies explicitly
- Include expected delivery dates for dependent work
- Tag relevant stakeholders with @mentions
- Update dependencies daily until resolved

## AI-Assisted Note Generation

**Automated Generation Workflow:**
```bash
# Generate standup notes from Git commits (last 24h)
git log --author="$(git config user.name)" --since="24 hours ago" \
  --pretty=format:"%s" --no-merges | \
  # Parse into accomplishments with AI summarization

# Query Jira for ticket updates
jira issues list --assignee currentUser() --status "In Progress,Done" \
  --updated-after "-2d" | \
  # Correlate with commits and format

# Extract from Obsidian daily notes
obsidian_get_recent_periodic_notes --period daily --limit 2 | \
  # Parse completed tasks and meeting notes

# Combine all sources into structured standup note
# AI synthesizes into coherent narrative with proper grouping
```

**AI Summarization Techniques:**
- Group related commits/tasks under single accomplishment bullets
- Translate technical commit messages to business value statements
- Identify patterns across multiple changes (e.g., "Refactored auth module" from 5 commits)
- Extract key decisions or learnings from meeting notes
- Flag potential blockers or risks from context clues

**Manual Override:**
- Always review AI-generated content for accuracy
- Add personal context AI cannot infer (conversations, planning thoughts)
- Adjust priorities based on team needs or changed circumstances
- Include soft skills work (mentoring, documentation, process improvement)

## Communication Best Practices

**Async-First Principles:**
- Post standup notes at consistent time daily (e.g., 9am local time)
- Don't wait for synchronous standup meeting to share updates
- Include enough context for readers in different timezones
- Link to detailed docs/tickets rather than explaining in-line
- Make blockers actionable (specific requests, not vague concerns)

**Visibility and Transparency:**
- Share wins and progress, not just problems
- Be honest about challenges and timeline concerns early
- Call out dependencies proactively before they become blockers
- Highlight collaboration and team support activities
- Include learning moments or process improvements

**Team Coordination:**
- Read teammates' standup notes before posting yours (adjust plans accordingly)
- Offer help when you see blockers you can resolve
- Tag people when their input or action is needed
- Use threads for discussion, keep main post scannable
- Update throughout day if priorities shift significantly

**Writing Style:**
- Use active voice and clear action verbs
- Avoid ambiguous terms ("soon", "later", "eventually")
- Be specific about timeline and scope
- Balance confidence with appropriate uncertainty
- Keep it human (casual tone, not formal report)

## Async Standup Patterns

**Written-Only Standup (No Sync Meeting):**
```markdown
# Post daily in #standup-team-name Slack channel

**Posted:** 9:00 AM PT | **Read time:** ~2min

## ✅ Yesterday
• Shipped user profile API endpoints (JIRA-234) - Live in staging
• Fixed critical bug in payment flow - PR merged, deploying at 2pm
• Reviewed PRs from @teammate1 and @teammate2

## 🎯 Today
• Migrate user database to new schema (JIRA-456) - Target: EOD
• Pair with @teammate3 on webhook integration - 11am session
• Write deployment runbook for profile API

## 🚧 Blockers
• Need staging database access for migration testing - @infra-team

## 📎 Links
• PR #789 | JIRA Sprint Board
```

**Thread-Based Standup:**
- Post standup as Slack thread parent message
- Teammates reply in thread with questions or offers to help
- Keep discussion contained, surface key decisions to channel
- Use emoji reactions for quick acknowledgment (👀 = read, ✅ = noted, 🤝 = I can help)

**Video Async Standup:**
- Record 2-3 minute Loom video walking through work
- Post video link with text summary (for skimmers)
- Useful for demoing UI work, explaining complex technical issues
- Include automatic transcript for accessibility

**Rolling 24-Hour Standup:**
- Post update anytime within 24h window
- Mark as "posted" when shared (use emoji status)
- Accommodates distributed teams across timezones
- Weekly summary thread consolidates key updates

## Follow-Up Tracking

**Action Item Extraction:**
```
From standup notes, automatically extract:
1. Blockers requiring follow-up → Create reminder tasks
2. Promised deliverables → Add to todo list with deadline
3. Dependencies on others → Track in separate "Waiting On" list
4. Meeting action items → Link to meeting note with owner
```

**Progress Tracking Over Time:**
- Link today's "Yesterday" section to previous day's "Today" plan
- Flag items that remain in "Today" for 3+ days (potential stuck work)
- Celebrate completed multi-day efforts when finally done
- Review weekly to identify recurring blockers or process improvements

**Retrospective Data:**
- Monthly review of standup notes reveals patterns:
  - How often are estimates accurate?
  - Which types of blockers are most common?
  - Where is time going? (meetings, bugs, feature work ratio)
  - Team health indicators (frequent blockers, overcommitment)
- Use insights for sprint planning and capacity estimation

**Integration with Task Systems:**
```markdown
## Follow-Up Tasks (Auto-generated from standup)
- [ ] Follow up with @infra-team on staging access (from blocker) - Due: Today EOD
- [ ] Review PR #789 feedback from @teammate (from yesterday's post) - Due: Tomorrow
- [ ] Document deployment process (from today's plan) - Due: End of week
- [ ] Check in on JIRA-456 migration (from today's priority) - Due: Tomorrow standup
```

## Examples

### Example 1: Well-Structured Daily Standup Note

```markdown
# Standup - 2025-10-11

## Yesterday
• **Completed JIRA-892:** User authentication with OAuth2 - PR #445 merged and deployed to staging
• **Fixed prod bug:** Payment retry logic wasn't handling timeouts - Hotfix deployed, monitoring for 24h
• **Code review:** Reviewed 3 PRs from @sarah and @mike - All approved with minor feedback
• **Meeting outcomes:** Design sync on Q4 roadmap - Agreed to prioritize mobile responsiveness

## Today
• **Continue JIRA-903:** Implement user profile edit flow - Target: Complete API integration by EOD
• **Deploy:** Roll out auth changes to production during 2pm deploy window
• **Pairing:** Work with @chris on webhook error handling - 11am-12pm session
• **Meetings:** Team retro at 3pm, 1:1 with manager at 4pm
• **Code review:** Review @sarah's notification service refactor (PR #451)

## Blockers
• **Need:** QA environment refresh for profile testing - Database is 2 weeks stale
  - **From:** @qa-team or @devops
  - **Impact:** Can't test full user flow until refreshed
  - **Workaround:** Testing with mock data for now, but need real data before production

## Notes
• Taking tomorrow afternoon off (dentist appointment) - Will post morning standup but limited availability after 12pm
• Mobile responsiveness research doc started: [Link to Notion doc]

📎 Sprint Board | My Active PRs
```

### Example 2: AI-Generated Standup from Git History

```markdown
# Standup - 2025-10-11 (Auto-generated from Git commits)

## Yesterday (12 commits analyzed)
• **Feature work:** Implemented caching layer for API responses
  - Added Redis integration (3 commits)
  - Implemented cache invalidation logic (2 commits)
  - Added monitoring for cache hit rates (1 commit)
  - *Related tickets:* JIRA-567, JIRA-568

• **Bug fixes:** Resolved 3 production issues
  - Fixed null pointer exception in user service (JIRA-601)
  - Corrected timezone handling in reports (JIRA-615)
  - Patched memory leak in background job processor (JIRA-622)

• **Maintenance:** Updated dependencies and improved testing
  - Upgraded Node.js to v20 LTS (2 commits)
  - Added integration tests for payment flow (2 commits)
  - Refactored error handling in API gateway (1 commit)

## Today (From Jira: 3 tickets in progress)
• **JIRA-670:** Continue performance optimization work - Add database query caching
• **JIRA-681:** Review and merge teammate PRs (5 pending reviews)
• **JIRA-690:** Start user notification preferences UI - Design approved yesterday

## Blockers
• None currently

---
*Auto-generated from Git commits (24h) + Jira tickets. Reviewed and approved by human.*
```

### Example 3: Async Standup Template (Slack/Discord)

```markdown
**🌅 Standup - Friday, Oct 11** | Posted 9:15 AM ET | @here

**✅ Since last update (Thu evening)**
• Merged PR #789 - New search filters now in production 🚀
• Closed JIRA-445 (the CSS rendering bug) - Fix deployed and verified
• Documented API changes in Confluence - [Link]
• Helped @alex debug the staging environment issue

**🎯 Today's focus**
• Finish user permissions refactor (JIRA-501) - aiming for code complete by EOD
• Deploy search performance improvements to prod (pending final QA approval)
• Kick off spike on GraphQL migration - research phase, doc by end of day

**🚧 Blockers**
• ⚠️ Need @product approval on permissions UX before I can finish JIRA-501
  - I've posted in #product-questions, following up in standup if no response by 11am

**📅 Schedule notes**
• OOO 2-3pm for doctor appointment
• Available for pairing this afternoon if anyone needs help!

---
React with 👀 when read | Reply in thread with questions
```

### Example 4: Blocker Escalation Format

```markdown
# Standup - 2025-10-11

## Yesterday
• Continued work on data migration pipeline (JIRA-777)
• Investigated blocker with database permissions (see below)
• Updated migration runbook with new error handling

## Today
• **BLOCKED:** Cannot progress on JIRA-777 until permissions resolved
• Will pivot to JIRA-802 (refactor user service) as backup work
• Review PRs and help unblock teammates

## 🚨 CRITICAL BLOCKER

**Issue:** Production database read access for migration dry-run
**Blocked since:** Tuesday (3 days)
**Impact:**
- Cannot test migration on real data before production cutover
- Risk of data loss if migration fails in production
- Blocking sprint goal (migration scheduled for Monday)

**What I need:**
- Read-only credentials for production database replica
- Alternative: Sanitized production data dump in staging

**From:** @database-team (pinged @john and @maria)

**What I've tried:**
- Submitted access request via IT portal (Ticket #12345) - No response
- Asked in #database-help channel - Referred to IT portal
- DM'd @john yesterday - Said he'd check today

**Escalation:**
- If not resolved by EOD today, will need to reschedule Monday migration
- Requesting manager (@sarah) to escalate to database team lead
- Backup plan: Proceed with staging data only (higher risk)

**Next steps:**
- Following up with @john at 10am
- Will update this thread when resolved
- If unblocked, can complete testing over weekend to stay on schedule

---

@sarah @john - Please prioritize, this is blocking sprint delivery
```

## Reference Examples

### Reference 1: Full Async Standup Workflow

**Scenario:** Distributed team across US, Europe, and Asia timezones. No synchronous standup meetings. Daily written updates in Slack #standup channel.

**Morning Routine (30 minutes):**

```bash
# 1. Generate draft standup from data sources
git log --author="$(git config user.name)" --since="24 hours ago" --oneline
# Review commits, note key accomplishments

# 2. Check Jira tickets
jira issues list --assignee currentUser() --status "In Progress"
# Identify today's priorities

# 3. Review Obsidian daily note from yesterday
# Check for completed tasks, meeting outcomes

# 4. Draft standup note in Obsidian
# File: Daily Notes/Standup/2025-10-11.md

# 5. Review teammates' standup notes (last 8 hours)
# Identify opportunities to help, dependencies to note

# 6. Post standup to Slack #standup channel (9:00 AM local time)
# Copy from Obsidian, adjust formatting for Slack

# 7. Set reminder to check thread responses by 11am
# Respond to questions, offers of help

# 8. Update task list with any new follow-ups from discussion
```

**Standup Note (Posted in Slack):**

```markdown
**🌄 Standup - Oct 11** | @team-backend | Read time: 2min

**✅ Yesterday**
• Shipped v2 API authentication (JIRA-234) → Production deployment successful, monitoring dashboards green
• Fixed race condition in job queue (JIRA-456) → Reduced error rate from 2% to 0.1%
• Code review marathon: Reviewed 4 PRs from @alice, @bob, @charlie → All merged
• Pair programming: Helped @diana debug webhook integration → Issue resolved, she's unblocked

**🎯 Today**
• **Priority 1:** Complete database migration script (JIRA-567) → Target: Code complete + tested by 3pm
• **Priority 2:** Security audit prep → Generate access logs report for compliance team
• **Priority 3:** Start API rate limiting implementation (JIRA-589) → Spike and design doc
• **Meetings:** Architecture review at 11am PT, sprint planning at 2pm PT

**🚧 Blockers**
• None! (Yesterday's staging env blocker was resolved by @sre-team 🙌)

**💡 Notes**
• Database migration is sprint goal - will update thread when complete
• Available for pairing this afternoon if anyone needs database help
• Heads up: Deploying migration to staging at noon, expect ~10min downtime

**🔗 Links**
• Active PRs | Sprint Board | Migration Runbook

---
👀 = I've read this | 🤝 = I can help with something | 💬 = Reply in thread
```

**Follow-Up Actions (Throughout Day):**

```markdown
# 11:00 AM - Check thread responses
Thread from @eve:
> "Can you review my DB schema changes PR before your migration? Want to make sure no conflicts"

Response:
> "Absolutely! I'll review by 1pm so you have feedback before sprint planning. Link?"

# 3:00 PM - Progress update in thread
> "✅ Update: Migration script complete and tested in staging. Dry-run successful, ready for prod deployment tomorrow. PR #892 up for review."

# EOD - Tomorrow's setup
Add to tomorrow's "Today" section:
• Deploy database migration to production (scheduled 9am maintenance window)
• Monitor migration + rollback plan ready
• Post production status update in #engineering-announcements
```

**Weekly Retrospective (Friday):**

```markdown
# Review week of standup notes
Patterns observed:
• ✅ Completed all 5 sprint stories
• ⚠️ Database blocker cost 1.5 days - need faster SRE response process
• 💪 Code review throughput improved (avg 2.5 reviews/day vs 1.5 last week)
• 🎯 Pairing sessions very productive (3 this week) - schedule more next sprint

Action items:
• Talk to @sre-lead about expedited access request process
• Continue pairing schedule (blocking 2hrs/week)
• Next week: Focus on rate limiting implementation and technical debt
```

### Reference 2: AI-Powered Standup Generation System

**System Architecture:**

```
┌─────────────────────────────────────────────────────────────┐
│ Data Collection Layer                                       │
├─────────────────────────────────────────────────────────────┤
│ • Git commits (last 24-48h)                                 │
│ • Jira ticket updates (status changes, comments)            │
│ • Obsidian vault changes (daily notes, task completions)    │
│ • Calendar events (meetings attended, upcoming)             │
│ • Slack activity (mentions, threads participated in)        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ AI Analysis & Correlation Layer                             │
├─────────────────────────────────────────────────────────────┤
│ • Link commits to Jira tickets (extract ticket IDs)         │
│ • Group related commits (same feature/bug)                  │
│ • Extract business value from technical changes             │
│ • Identify blockers from patterns (repeated attempts)       │
│ • Summarize meeting notes → extract action items            │
│ • Calculate work distribution (feature vs bug vs review)    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Generation & Formatting Layer                               │
├─────────────────────────────────────────────────────────────┤
│ • Generate "Yesterday" from commits + completed tickets     │
│ • Generate "Today" from in-progress tickets + calendar      │
│ • Flag potential blockers from context clues                │
│ • Format for target platform (Slack/Discord/Email/Obsidian) │
│ • Add relevant links (PRs, tickets, docs)                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Human Review & Enhancement Layer                            │
├─────────────────────────────────────────────────────────────┤
│ • Present draft for review                                  │
│ • Human adds context AI cannot infer                        │
│ • Adjust priorities based on team needs                     │
│ • Add personal notes, schedule changes                      │
│ • Approve and post to team channel                          │
└─────────────────────────────────────────────────────────────┘
```

**Implementation Script:**

```bash
#!/bin/bash
# generate-standup.sh - AI-powered standup note generator

DATE=$(date +%Y-%m-%d)
USER=$(git config user.name)
USER_EMAIL=$(git config user.email)

echo "🤖 Generating standup note for $USER on $DATE..."

# 1. Collect Git commits
echo "📊 Analyzing Git history..."
COMMITS=$(git log --author="$USER" --since="24 hours ago" \
  --pretty=format:"%h|%s|%cr" --no-merges)

# 2. Query Jira (requires jira CLI)
echo "🎫 Fetching Jira tickets..."
JIRA_DONE=$(jira issues list --assignee currentUser() \
  --jql "status CHANGED TO 'Done' DURING (-1d, now())" \
  --template json)

JIRA_PROGRESS=$(jira issues list --assignee currentUser() \
  --jql "status = 'In Progress'" \
  --template json)

# 3. Get Obsidian recent changes (via MCP)
echo "📝 Checking Obsidian vault..."
OBSIDIAN_CHANGES=$(obsidian_get_recent_changes --days 2)

# 4. Get calendar events
echo "📅 Fetching calendar..."
MEETINGS=$(gcal --today --format=json)

# 5. Send to AI for analysis and generation
echo "🧠 Generating standup note with AI..."
cat << EOF > /tmp/standup-context.json
{
  "date": "$DATE",
  "user": "$USER",
  "commits": $(echo "$COMMITS" | jq -R -s -c 'split("\n")'),
  "jira_completed": $JIRA_DONE,
  "jira_in_progress": $JIRA_PROGRESS,
  "obsidian_changes": $OBSIDIAN_CHANGES,
  "meetings": $MEETINGS
}
EOF

# AI prompt for standup generation
STANDUP_NOTE=$(claude-ai << 'PROMPT'
Analyze the provided context and generate a concise daily standup note.

Instructions:
- Group related commits into single accomplishment bullets
- Link commits to Jira tickets where possible
- Extract business value from technical changes
- Format as: Yesterday / Today / Blockers
- Keep bullets concise (1-2 lines each)
- Include relevant links to PRs and tickets
- Flag any potential blockers based on context

Context: $(cat /tmp/standup-context.json)

Generate standup note in markdown format.
PROMPT
)

# 6. Save draft to Obsidian
echo "$STANDUP_NOTE" > ~/Obsidian/Standup\ Notes/$DATE.md

# 7. Present for human review
echo "✅ Draft standup note generated!"
echo ""
echo "$STANDUP_NOTE"
echo ""
read -p "Review the draft above. Post to Slack? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # 8. Post to Slack
    slack-cli chat send --channel "#standup" --text "$STANDUP_NOTE"
    echo "📮 Posted to Slack #standup channel"
fi

echo "💾 Saved to: ~/Obsidian/Standup Notes/$DATE.md"
```

**AI Prompt Template for Standup Generation:**

```
You are an expert at synthesizing engineering work into clear, concise standup updates.

Given the following data sources:
- Git commits (last 24h)
- Jira ticket updates
- Obsidian daily notes
- Calendar events

Generate a daily standup note that:

1. **Yesterday Section:**
   - Group related commits into single accomplishment statements
   - Link commits to Jira tickets (extract ticket IDs from messages)
   - Transform technical commits into business value ("Implemented X to enable Y")
   - Include completed tickets with their status
   - Summarize meeting outcomes from notes

2. **Today Section:**
   - List in-progress Jira tickets with current status
   - Include planned meetings from calendar
   - Estimate completion for ongoing work based on commit history
   - Prioritize by ticket priority and sprint goals

3. **Blockers Section:**
   - Identify potential blockers from patterns:
     * Multiple commits attempting same fix (indicates struggle)
     * No commits on high-priority ticket (may be blocked)
     * Comments in code mentioning "TODO" or "FIXME"
   - Extract explicit blockers from daily notes
   - Flag dependencies mentioned in Jira comments

Format:
- Use markdown with clear headers
- Bullet points for each item
- Include hyperlinks to PRs, tickets, docs
- Keep each bullet 1-2 lines maximum
- Add emoji for visual scanning (✅ ⚠️ 🚀 etc.)

Tone: Professional but conversational, transparent about challenges

Output only the standup note markdown, no preamble.
```

**Cron Job Setup (Daily Automation):**

```bash
# Add to crontab: Run every weekday at 8:45 AM
45 8 * * 1-5 /usr/local/bin/generate-standup.sh

# Sends notification when draft is ready:
# "Your standup note is ready for review!"
# Opens Obsidian note and prepares Slack message
```

---

**Tool Version:** 2.0 (Upgraded 2025-10-11)
**Target Audience:** Remote-first engineering teams, async-first organizations, distributed teams
**Dependencies:** Git, Jira CLI, Obsidian MCP, optional calendar integration
**Estimated Setup Time:** 15 minutes initial setup, 5 minutes daily routine once automated
