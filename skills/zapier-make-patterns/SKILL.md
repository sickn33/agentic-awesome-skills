---
name: zapier-make-patterns
description: No-code automation democratizes workflow building. Zapier and Make
  (formerly Integromat) let non-developers automate business processes without
  writing code. But no-code doesn't mean no-complexity - these platforms have
  their own patterns, pitfalls, and breaking points.
risk: unknown
source: vibeship-spawner-skills (Apache 2.0)
date_added: 2026-02-27
---

# Zapier & Make Patterns

No-code automation democratizes workflow building. Zapier and Make (formerly
Integromat) let non-developers automate business processes without writing
code. But no-code doesn't mean no-complexity - these platforms have their
own patterns, pitfalls, and breaking points.

This skill covers when to use which platform, how to build reliable
automations, and when to graduate to code-based solutions. Key insight:
Zapier optimizes for simplicity and integrations (7000+ apps), Make
optimizes for power and cost-efficiency (visual branching, operations-based
pricing).

Critical distinction: No-code works until it doesn't. Know the limits.

## Principles

- Start simple, add complexity only when needed
- Test with real data before going live
- Document every automation with clear naming
- Monitor errors - 95% error rate auto-disables Zaps
- Know when to graduate to code-based solutions
- Operations/tasks cost money - design efficiently

## Capabilities

- zapier
- make
- integromat
- no-code-automation
- zaps
- scenarios
- workflow-builders
- business-process-automation

## Scope

- code-based-workflows → workflow-automation
- browser-automation → browser-automation
- custom-integrations → backend
- api-development → api-designer

## Tooling

### Platforms

- Zapier - When: Simple automations, maximum app coverage, beginners Note: 7000+ integrations, linear workflows, task-based pricing
- Make - When: Complex workflows, visual branching, budget-conscious Note: Visual scenarios, operations pricing, powerful data handling
- n8n - When: Self-hosted, code-friendly, unlimited operations Note: Open-source, can add custom code, technical users

### Ai_features

- Zapier Agents - When: AI-powered autonomous automation Note: Natural language instructions, 7000+ app access
- Zapier Copilot - When: Building Zaps with AI assistance Note: Describes workflow, AI builds it
- Zapier MCP - When: LLM tools accessing Zapier actions Note: 30,000+ actions available to AI models

## Patterns

### Basic Trigger-Action Pattern

Single trigger leads to one or more actions

**When to use**: Simple notifications, data sync, basic workflows

# BASIC TRIGGER-ACTION:

"""
[Trigger] → [Action]
  e.g., New Email → Create Task
"""

## Zapier Example
"""
Zap Name: "Gmail New Email → Todoist Task"

TRIGGER: Gmail - New Email
  - From: specific-sender@example.com
  - Has attachment: yes

ACTION: Todoist - Create Task
  - Project: Inbox
  - Content: {{Email Subject}}
  - Description: From: {{Email From}}
  - Due date: Tomorrow
"""

## Make Example
"""
Scenario: "Gmail to Todoist"

[Gmail: Watch Emails] → [Todoist: Create a Task]

Gmail Module:
  - Folder: INBOX
  - From: specific-sender@example.com

Todoist Module:
  - Project ID: (select from dropdown)
  - Content: {{1.subject}}
  - Due String: tomorrow
"""

### Best Practices:
- Use descriptive Zap/Scenario names
- Test with real sample data
- Use filters to prevent unwanted runs

### Multi-Step Sequential Pattern

Chain of actions executed in order

**When to use**: Multi-app workflows, data enrichment pipelines

# MULTI-STEP SEQUENTIAL:

"""
[Trigger] → [Action 1] → [Action 2] → [Action 3]
Each step's output available to subsequent steps
"""

## Zapier Multi-Step Zap
"""
Zap: "New Lead → CRM → Slack → Email"

1. TRIGGER: Typeform - New Entry
   - Form: Lead Capture Form

2. ACTION: HubSpot - Create Contact
   - Email: {{Typeform Email}}
   - First Name: {{Typeform First Name}}
   - Lead Source: "Website Form"

3. ACTION: Slack - Send Channel Message
   - Channel: #sales-leads
   - Message: "New lead: {{Typeform Name}} from {{Typeform Company}}"

4. ACTION: Gmail - Send Email
   - To: {{Typeform Email}}
   - Subject: "Thanks for reaching out!"
   - Body: (template with personalization)
"""

## Make Scenario
"""
[Typeform] → [HubSpot] → [Slack] → [Gmail]

- Each module passes data to the next
- Use {{N.field}} to reference module N's output
- Add error handlers between critical steps
"""

### Conditional Branching Pattern

Different actions based on conditions

**When to use**: Different handling for different data types

# CONDITIONAL BRANCHING:

"""
              ┌→ [Action A] (condition met)
[Trigger] ───┤
              └→ [Action B] (condition not met)
"""

## Zapier Paths (Pro+ required)
"""
Zap: "Route Support Tickets"

1. TRIGGER: Zendesk - New Ticket

2. PATH A: If priority = "urgent"
   - Slack: Post to #urgent-support
   - PagerDuty: Create incident

3. PATH B: If priority = "normal"
   - Slack: Post to #support
   - Asana: Create task

4. PATH C: Otherwise (catch-all)
   - Slack: Post to #support-overflow
"""

## Make Router
"""
[Zendesk: Watch Tickets]
      ↓
[Router]
   ├── Route 1: priority = urgent
   │     └→ [Slack] → [PagerDuty]
   │
   ├── Route 2: priority = normal
   │     └→ [Slack] → [Asana]
   │
   └── Fallback route
         └→ [Slack: overflow]

# Make's visual router makes complex branching clear
"""

### Best Practices:
- Always have a fallback/else path
- Test each path independently
- Document which conditions trigger which path

### Data Transformation Pattern

Clean, format, and transform data between apps

**When to use**: Apps expect different data formats

# DATA TRANSFORMATION:

## Zapier Formatter
"""
Common transformations:

1. Text manipulation:
   - Split text: "John Doe" → First: "John", Last: "Doe"
   - Capitalize: "john" → "John"
   - Replace: Remove special characters

2. Date formatting:
   - Convert: "2024-01-15" → "January 15, 2024"
   - Adjust: Add 7 days to date

3. Numbers:
   - Format currency: 1000 → "$1,000.00"
   - Spreadsheet formula: =SUM(A1:A10)

4. Lookup tables:
   - Map status codes: "1" → "Active", "2" → "Pending"
"""

## Make Data Functions
"""
Make has powerful built-in functions:

Text:
  {{lower(1.email)}}           # Lowercase
  {{substring(1.name; 0; 10)}} # First 10 chars
  {{replace(1.text; "-"; "")}} # Remove dashes

Arrays:
  {{first(1.items)}}           # First item
  {{length(1.items)}}          # Count items
  {{map(1.items; "id")}}       # Extract field

Dates:
  {{formatDate(1.date; "YYYY-MM-DD")}}
  {{addDays(now; 7)}}

Math:
  {{round(1.price * 0.8; 2)}}  # 20% discount, 2 decimals
"""

### Best Practices:
- Transform early in the workflow
- Use filters to skip invalid data
- Log transformations for debugging

### Error Handling Pattern

Graceful handling of failures

**When to use**: Any production automation

# ERROR HANDLING:

## Zapier Error Handling
"""
1. Built-in retry (automatic):
   - Zapier retries failed actions automatically
   - Exponential backoff for temporary failures

2. Error handling step:
   Zap:
     1. [Trigger]
     2. [Action that might fail]
     3. [Error Handler]
        - If error → [Slack: Alert team]
        - If error → [Email: Send report]

3. Path-based handling:
   [Action] → Path A: Success → [Continue]
            → Path B: Error → [Alert + Log]
"""

## Make Error Handlers
"""
Make has visual error handling:

[Module] ──┬── Success → [Next Module]
           │
           └── Error → [Error Handler]

Error handler types:
1. Break: Stop scenario, send notification
2. Rollback: Undo completed operations
3. Commit: Save partial results, continue
4. Ignore: Skip error, continue with next item

Example:
[API Call] → Error Handler (Ignore)
           → [Log to Airtable: "Failed: {{error.message}}"]
           → Continue scenario
"""

### Best Practices:
- Always add error handlers for external APIs
- Log errors to a spreadsheet/database
- Set up Slack/email alerts for critical failures
- Test failure scenarios, not just success

### Batch Processing Pattern

Process multiple items efficiently

**When to use**: Importing data, bulk operations

# BATCH PROCESSING:

## Zapier Looping
"""
Zap: "Process Order Items"

1. TRIGGER: Shopify - New Order
   - Returns: order with line_items array

2. LOOPING: For each item in line_items
   - Create inventory adjustment
   - Update product count
   - Log to spreadsheet

Note: Each loop iteration counts as tasks!
10 items = 10 tasks consumed
"""

## Make Iterator
"""
[Webhook: Receive Order]
      ↓
[Iterator: line_items]
      ↓ (processes each item)
[Inventory: Adjust Stock]
      ↓
[Aggregator: Collect Results]
      ↓
[Slack: Summary Message]

Iterator creates one bundle per item.
Aggregator combines results back together.
Use Array Aggregator for collecting processed items.
"""

### Best Practices:
- Use aggregators to combine results
- Consider batch limits (some APIs limit to 100)
- Watch operation/task counts for cost
- Add delays for rate-limited APIs

### Scheduled Automation Pattern

Time-based triggers instead of events

**When to use**: Daily reports, periodic syncs, batch jobs

# SCHEDULED AUTOMATION:

## Zapier Schedule Trigger
"""
Zap: "Daily Sales Report"

TRIGGER: Schedule by Zapier
  - Every: Day
  - Time: 8:00 AM
  - Timezone: America/New_York

ACTIONS:
  1. Google Sheets: Get rows (yesterday's sales)
  2. Formatter: Calculate totals
  3. Gmail: Send report to team
"""

## Make Scheduled Scenarios
"""
Scenario Schedule Options:
  - Run once (manual)
  - At regular intervals (every X minutes)
  - Advanced: Cron expression (0 8 * * *)

[Scheduled Trigger: Every day at 8 AM]
      ↓
[Google Sheets: Search Rows]
      ↓
[Iterator: Process each row]
      ↓
[Aggregator: Sum totals]
      ↓
[Gmail: Send Report]
"""

### Best Practices:
- Consider timezone differences
- Add buffer time for long-running jobs
- Log execution times for monitoring
- Don't schedule at exactly midnight (busy period)

## Sharp Edges

### Using Text Instead of IDs in Dropdown Fields

Severity: CRITICAL

Situation: Configuring actions with dropdown selections

Symptoms:
"Bad Request" errors. "Invalid value" messages. Action fails
despite correct-looking input. Works when you select from dropdown,
fails with dynamic values.

Why this breaks:
Dropdown menus display human-readable text but send IDs to APIs.
When you type "Marketing Team" instead of selecting it, Zapier
tries to send that text as the ID, which the API doesn't recognize.

Recommended fix:

# ALWAYS use dropdowns to select, don't type

# If you need dynamic values:

### Zapier approach:
1. Add a "Find" or "Search" action first
   - HubSpot: Find Contact → returns contact_id
   - Slack: Find User by Email → returns user_id

2. Use the returned ID in subsequent actions
   - Dropdown: Use Custom Value
   - Select the ID from the search step

### Make approach:
1. Add a Search module first
   - Search Contacts: filter by email
   - Returns: contact_id

2. Map the ID to subsequent modules
   - Contact ID: {{2.id}} (from search module)

# Common ID fields that trip people up:
- User/Member IDs in Slack, Teams
- Contact/Company IDs in CRMs
- Project/Folder IDs in project tools
- Category/Tag IDs in content systems

### Zap Auto-Disabled at 95% Error Rate

Severity: CRITICAL

Situation: Running a Zap with frequent errors

Symptoms:
Zap suddenly stops running. Email notification about auto-disable.
"This Zap was automatically turned off" message. Data stops syncing.

Why this breaks:
Zapier automatically disables Zaps that have 95% or higher error
rate over 7 days. This prevents runaway automation failures from
consuming your task quota and creating data problems.

Recommended fix:

# Prevention:

1. Add error handling steps:
   - Use Path: If error → [Log + Alert]
   - Add fallback actions for failures

2. Use filters to prevent bad data:
   - Only continue if email exists
   - Only continue if amount > 0
   - Filter out test/invalid entries

3. Monitor task history regularly:
   - Check for recurring errors
   - Fix issues before 95% threshold

# Recovery:

1. Check Task History for error patterns
2. Fix the root cause (auth, bad data, API changes)
3. Test with sample data
4. Re-enable the Zap manually
5. Monitor closely for next 24 hours

# Common causes:
- Expired authentication tokens
- API rate limits
- Changed field names in connected apps
- Invalid data formats

### Loops Consuming Unexpected Task Counts

Severity: HIGH

Situation: Processing arrays or multiple items

Symptoms:
Task quota depleted unexpectedly. One Zap run shows as 100+ tasks.
Monthly limit reached in days. "You've used X of Y tasks" surprise.

Why this breaks:
In Zapier, each iteration of a loop counts as separate tasks.
If a webhook delivers an order with 50 line items and you loop
through each, that's 50+ tasks for one order.

Recommended fix:

# Understand the math:

Order with 10 items, 5 actions per item:
= 1 trigger + (10 items × 5 actions) = 51 tasks

# Strategies to reduce task usage:

1. Batch operations when possible:
   - Use "Create Many Rows" instead of loop + create
   - Use bulk API endpoints

2. Aggregate before sending:
   - Collect all items
   - Send one summary message, not one per item

3. Filter before looping:
   - Only process items that need action
   - Skip unchanged/duplicate items

4. Consider Make for high-volume:
   - Make uses operations, not tasks per action
   - More cost-effective for loops

# Make approach:
[Iterator] → [Actions] → [Aggregator]
- Pay for operations (module executions)
- Not per-action like Zapier

### App Updates Breaking Existing Zaps

Severity: HIGH

Situation: App you're connected to releases updates

Symptoms:
Working Zap suddenly fails. "Field not found" errors. Different
data format in outputs. Actions that worked yesterday fail today.

Why this breaks:
When connected apps update their APIs, field names can change,
new required fields appear, or data formats shift. Zapier/Make
integrations may not immediately update to match.

Recommended fix:

# When a Zap breaks after app update:

1. Check the Task History for specific errors
2. Open the Zap editor to see field mapping issues
3. Re-select the trigger/action to refresh schema
4. Re-map any fields that show as "unknown"
5. Test with new sample data

# Prevention:

1. Subscribe to changelog for critical apps
2. Keep connection authorizations fresh
3. Test Zaps after major app updates
4. Document your field mappings
5. Use test/duplicate Zaps for experiments

# If integration is outdated:
- Check Zapier/Make status pages
- Report issue to support
- Consider webhook alternative temporarily

# Common offenders:
- CRM field restructures
- API version upgrades
- OAuth scope changes
- New required permissions

### Authentication Tokens Expiring

Severity: HIGH

Situation: Using OAuth connections to apps

Symptoms:
"Authentication failed" errors. "Please reconnect" messages.
Zaps fail after weeks of working. Multiple apps fail simultaneously.

Why this breaks:
OAuth tokens expire. Some apps require re-authentication every
60-90 days. If the user who connected the app leaves the company,
their connection may stop working.

Recommended fix:

# Immediate fix:
1. Go to Settings → Apps
2. Find the app with issues
3. Reconnect (re-authorize)
4. Test affected Zaps

# Prevention:

1. Use service accounts for connections
   - Don't connect with personal accounts
   - Use shared team email/account

2. Monitor connection health
   - Check Apps page regularly
   - Set calendar reminders for known expiration

3. Document who connected what
   - Track in spreadsheet
   - Handoff process when people leave

4. Prefer connections that don't expire
   - API keys over OAuth when available
   - Long-lived tokens

# Zapier Enterprise:
- Admin controls for managing connections
- SSO integration
- Centralized connection management

### Webhooks Missing or Duplicating Events

Severity: MEDIUM

Situation: Using webhooks as triggers

Symptoms:
Some events never trigger the Zap. Same event triggers multiple
times. Inconsistent automation behavior. "Works sometimes."

Why this breaks:
Webhooks are fire-and-forget. If Zapier's receiving endpoint is
slow or unavailable, the webhook may fail. Some systems retry
webhooks, causing duplicates. Network issues lose events.

Recommended fix:

# Handle duplicates:

1. Add deduplication logic:
   - Filter: Only continue if ID not in Airtable
   - First action: Check if already processed

2. Use idempotency:
   - Store processed IDs
   - Skip if ID exists

### Zapier example:
[Webhook Trigger]
   ↓
[Airtable: Find Records] - search by event_id
   ↓
[Filter: Only continue if not found]
   ↓
[Process Event]
   ↓
[Airtable: Create Record] - store event_id

# Handle missed events:

1. Use polling triggers for critical data
   - Less real-time but more reliable
   - Catches events during downtime

2. Implement reconciliation:
   - Scheduled Zap to check for gaps
   - Compare source data to processed data

3. Check source system retry settings:
   - Some systems retry on failure
   - Configure retry count/timing

### Make Operations Consumed by Error Retries

Severity: MEDIUM

Situation: Scenarios with failing modules

Symptoms:
Operations quota depleted quickly. Scenario runs "succeeded" but
used many operations. Same scenario running more than expected.

Why this breaks:
Make counts operations per module execution, including failed
attempts and retries. Error handler modules consume operations.
Scenarios that fail and retry can use 3-5x expected operations.

Recommended fix:

# Understand operation counting:

Successful run: Each module = 1 operation
Failed + retry (3x): 3 operations for that module
Error handler: Additional operation per handler module

# Reduce operation waste:

1. Add error handlers that break early:
   [Module] → Error → [Break] (1 additional op)
   vs
   [Module] → Error → [Log] → [Alert] → [Update] (3+ ops)

2. Use ignore instead of retry when appropriate:
   - If failure is expected (record exists)
   - If retrying won't help (bad data)

3. Pre-validate before expensive operations:
   [Check Data] → Filter → [API Call]
   - Fail fast before consuming operations

4. Optimize scenario scheduling:
   - Don't run every minute if hourly is enough
   - Use webhooks for real-time when possible

# Monitor usage:
- Check Operations dashboard
- Set up usage alerts
- Review high-consumption scenarios

### Timezone Mismatches in Scheduled Triggers

Severity: MEDIUM

Situation: Setting up scheduled automations

Symptoms:
Zap runs at wrong time. "9 AM" trigger fires at 2 PM. Different
behavior on different days. DST causes hour shifts.

Why this breaks:
Zapier shows times in your local timezone but may store in UTC.
If you change timezones or DST occurs, scheduled times shift.
Team members in different zones see different times.

Recommended fix:

# Best practices:

1. Explicitly set timezone in schedule:
   - Don't rely on browser detection
   - Use business timezone, not personal

2. Document in Zap name:
   - "Daily Report 9AM EST"
   - Include timezone in description

3. Test around DST transitions:
   - Schedule changes at DST boundaries
   - Verify times before/after change

4. For global teams:
   - Use UTC as standard
   - Convert to local in descriptions

5. Consider buffer times:
   - Don't schedule at exactly midnight
   - Avoid on-the-hour (busy periods)

### Make timezone handling:
- Scenarios use account timezone setting
- formatDate() function respects timezone
- Use parseDate() with explicit timezone

## Collaboration

### Delegation Triggers

- automation requires custom code -> workflow-automation (Code-based solutions like Inngest, Temporal)
- need browser automation in workflow -> browser-automation (Playwright/Puppeteer integration)
- building custom API integration -> api-designer (API design and implementation)
- automation needs AI capabilities -> agent-tool-builder (AI agent tools and Zapier MCP)
- high-volume data processing -> backend (Custom backend processing)
- need self-hosted automation -> devops (n8n or custom workflow deployment)

## Related Skills

Works well with: `workflow-automation`, `agent-tool-builder`, `backend`, `api-designer`

## When to Use
- User mentions or implies: zapier
- User mentions or implies: make
- User mentions or implies: integromat
- User mentions or implies: zap
- User mentions or implies: scenario
- User mentions or implies: no-code automation
- User mentions or implies: trigger action
- User mentions or implies: workflow automation
- User mentions or implies: connect apps
- User mentions or implies: automate

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
