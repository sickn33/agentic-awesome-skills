---
name: jira-sprint-workflow
description: Comprehensive workflow for managing Jira tickets from sprint planning documents. Supports creating, updating, verifying, and syncing tickets with sprint plans across all initiatives.
risk: safe
source: community
---

# Jira Sprint Workflow

## Purpose

A reusable skill for managing the complete lifecycle of Jira tickets from sprint planning markdown documents. This skill automates ticket creation, keeps existing tickets in sync with planning documents, and verifies accuracy.

## When to Use

**Trigger phrases:**

- "Create Jira tickets from sprint plan"
- "Update tickets to match sprint plan"
- "Verify Jira tickets against sprint plan"
- "Compare tickets with sprint planning"
- "Sync Jira with sprint document"

## Prerequisites

### 1. Environment Setup

Create a `.env` file in the project root with:

```
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your-api-token
```

Get API token from: <https://id.atlassian.com/manage-profile/security/api-tokens>

### 2. Configuration File

The `JIRA_WORKFLOW_CONFIG.md` file in the skill directory contains:

- Project Key (e.g., `MAT`)
- Cloud ID
- Team ID mappings
- Custom field IDs

### 3. Dependencies

Install Node.js dependencies:

```bash
cd .agent/skills/jira-sprint-workflow
npm install
```

---

## Three Operation Modes

### Mode 1: CREATE - Generate New Tickets

**When to use:** Starting a new sprint, creating tickets for a new initiative

**Workflow:**

1. **Parse Sprint Plan**

   ```bash
   node scripts/robust_parse_sprint.js "path/to/sprint-plan.md"
   ```

   - Outputs: `_tasks.json` (e.g., `sprint-plan_tasks.json`)

2. **Create Epic**
   - Use `mcp_atlassian-mcp-server_createJiraIssue`
   - Issue Type: `Epic`
   - Summary: `[Sprint Title] Initiative Name`
   - Store the Epic Key (e.g., `MAT-3540`)

3. **Create Story Tickets**
   - Iterate through the parsed JSON
   - For each task, use `mcp_atlassian-mcp-server_createJiraIssue`:
     - Issue Type: `Story`
     - Summary: From parsed data
     - Description: From parsed data
     - Parent: Epic Key
     - Team: `customfield_10001` (from config)
     - Story Points: `customfield_10031`

4. **Generate & Create Issue Links**

   a. **Generate Links Config:**

   ```bash
   node scripts/generate_sprint_links.js "path/to/parsed_tasks.json" "path/to/jira_export.json"
   ```

   b. **Create Links in Jira:**

   ```bash
   node scripts/create_issue_links.js --config issue_links_sprint_dependency.json
   ```

   - Creates dependency links between tickets (Blocks / Relates)

**Output:** Epic Key + range of Story Keys (e.g., MAT-3541 through MAT-3565)

---

### Mode 2: UPDATE - Sync Existing Tickets

**When to use:** Sprint plan changed, need to update story points or descriptions

**Workflow:**

1. **Identify Tickets**
   - Get Epic Key from user
   - Or use JQL to find tickets

2. **Extract Updates from Sprint Plan**

   ```bash
   node scripts/map_story_points.js --jira-data jira_search.json --input parsed_sprint_tasks.json
   ```

   - Outputs: `sp_updates.json`

3. **Update Story Points**
   - Use `mcp_atlassian-mcp-server_editJiraIssue`
   - Update `customfield_10031` for each ticket

4. **Update Descriptions**

   ```bash
   node scripts/update_descriptions.js --jira-data jira_search.json --input parsed_sprint_tasks.json
   ```

   - Parse sprint plan for task details
   - Update `description` field for each ticket using `mcp_atlassian-mcp-server_editJiraIssue`
   - Uses Atlassian Wiki Markup format (converted from markdown automatically)

   > [!IMPORTANT]
   > **MCP Description Formatting**
   > When using Jira MCP to edit descriptions, use **Markdown format** for best results:
   > - ✅ `### Heading` - Works (creates heading)
   > - ✅ `* Bullet item` - Works (creates bullet list)
   > - ✅ ` ```json ` code blocks - Works (creates code block)
   > - ✅ `[Link Text](url)` - Works
   > - ✅ `` `inline code` `` - Works
   >
   > The `update_descriptions.js` script preserves Markdown format.

5. **Update Issue Links**

   ```bash
   node scripts/generate_sprint_links.js "parsed_tasks.json" "jira.json"
   node scripts/create_issue_links.js --config issue_links_sprint_dependency.json
   ```

   - Creates any missing links
   - Skips existing links automatically

**Output:** Summary of updated tickets and fields

---

### Mode 3: VERIFY - Compare and Report

**When to use:** Validating tickets match sprint plan, quality assurance

**Workflow:**

1. **Run Comparison**

   ```bash
   node scripts/compare_tickets.js --epic MAT-3540 --sprint-plan "path/to/sprint-plan.md"
   ```

   Or with JQL:

   ```bash
   node scripts/compare_tickets.js --jql "project=MAT AND sprint='Sprint 1'" --sprint-plan "path/to/file.md"
   ```

2. **Review Results**
   - Console output shows summary
   - `comparison_results.json` contains detailed diff

3. **Report Discrepancies**
   - Story point mismatches
   - Missing tickets
   - Extra tickets not in sprint plan
   - Description differences (future enhancement)

**Output:** Comparison report with actionable discrepancies

---

## Script Reference

All scripts are located in `.agent/skills/jira-sprint-workflow/scripts/`

### Recommended Sprint Plan Format

For best results with the description conversion, use this format in sprint plan markdown:

```markdown
1. [Task Title]
   1. SP: 2
   2. Context: Description of context...
   3. Todo:
      1. Task item 1
      2. Request:
         {
           "key": "value"
         }
      3. Response:
         {
           "key": "value"
         }
   4. AC:
      1. Criteria 1
   5. Deps:
      1. Dependency 1
```

The script parses these specific sections (Context, Todo, AC, Deps) and formats them as H2 headers in Jira. It also automatically detects `Request:` and `Response:` sections and wraps the following JSON content in code blocks.

The script preserves Markdown format which renders correctly in Jira:

- `### Heading` or `## Heading` → Renders as heading
- `1. Item` → Renders as numbered list
- `[text](url)` → Renders as link
- ` ```json ` → Renders as code block

---

### Core Scripts

#### robust_parse_sprint.js

Parses sprint planning markdown into structured JSON format. Handles indentation robustly to identify main tasks.

**Usage:**

```bash
node scripts/robust_parse_sprint.js "Initiatives/Sprint/planning.md"
```

**Output:** `planning_tasks.json` with epic title and array of tasks

---

#### generate_sprint_links.js

Maps parsed tasks to Jira tickets and generates dependency link configuration. Uses exact, manual, and fuzzy matching.

**Usage:**

```bash
node scripts/generate_sprint_links.js "parsed_sprint_tasks.json" "jira_search.json"
```

**Output:** `issue_links_sprint_dependency.json` containing `inward` (blocked by) and `outward` (blocks) keys.

---

#### map_story_points.js

Extracts story point mappings from sprint plan and matches with Jira tickets.

**Usage:**

```bash
node scripts/map_story_points.js --jira-data jira_search.json
node scripts/map_story_points.js --jira-data jira_search.json --output sp_updates.json
```

**Options:**

- `--jira-data` - Path to Jira search results JSON (required)
- `--output` - Output file path (default: `sp_updates.json`)

**Output:** `sp_updates.json` with ticket-to-SP mapping

---

#### update_descriptions.js

Generates description updates from sprint plan.

**Usage:**

```bash
node scripts/update_descriptions.js --jira-data jira_search.json
node scripts/update_descriptions.js --jira-data jira_search.json --output description_updates.json
```

**Options:**

- `--jira-data` - Path to Jira search results JSON (required)
- `--output` - Output file path (default: `description_updates.json`)

**Output:** `description_updates.json`

---

#### create_issue_links.js

Creates dependency links between Jira tickets.

**Usage:**

```bash
node scripts/create_issue_links.js --config issue_links_sprint1.json
node scripts/create_issue_links.js --links '[{"inward":"MAT-1","outward":"MAT-2","type":"Relates"}]'
```

**Options:**

- `--config` - Path to issue links configuration JSON file
- `--links` - JSON string of links array (inline)

**Configuration File Format:**

```json
{
  "links": [
    {
      "inward": "MAT-3545",
      "outward": "MAT-3544",
      "type": "Relates",
      "comment": "FUSION endpoint depends on RELAY endpoint"
    }
  ]
}
```

**Link Types:**

- `Blocks` / `is blocked by` - for dependencies
- `Relates` / `relates to` - for related items

**Output:** Console summary + links created in Jira

---

#### compare_tickets.js

Compares Jira tickets with sprint planning document.

**Usage:**

```bash
node scripts/compare_tickets.js --epic MAT-XXXX --sprint-plan "path/to/file.md"
node scripts/compare_tickets.js --jql "custom query" --sprint-plan "path/to/file.md"
```

**Options:**

- `--epic` - Epic key to fetch child tickets
- `--jql` - Custom JQL query to fetch tickets
- `--sprint-plan` - Path to sprint planning markdown (required)

**Output:** Console summary + `comparison_results.json`

---

### Utility Scripts

#### update_tickets.js

Prepares Jira ticket updates from parsed sprint plan data.

**Usage:**

```bash
node scripts/update_tickets.js --epic MAT-3567 --first-ticket MAT-3569
node scripts/update_tickets.js --epic MAT-3567 --first-ticket MAT-3569 --input parsed_tickets.json
```

**Options:**

- `--epic` - Epic key (required)
- `--first-ticket` - First ticket key in range (required)
- `--input` - Input file path (default: `parse_sprint_output.json`)
- `--output` - Output file path (default: `ticket_updates.json`)

**Output:** `ticket_updates.json` with update mappings

---

#### extract_task_titles.js

Extracts task titles from sprint planning markdown.

**Usage:**

```bash
node scripts/extract_task_titles.js "path/to/sprint-plan.md"
```

**Output:** `task_titles.json` in the same directory as the input file

---

#### compare_tasks.js

Compares extracted task titles with existing Jira tickets.

**Usage:**

```bash
node scripts/compare_tasks.js task_titles.json jira_tickets.txt
```

**Output:** Console comparison report

---

#### parse_main_tasks.js

Parses only the main numbered tasks from sprint planning document.

**Usage:**

```bash
node scripts/parse_main_tasks.js "path/to/sprint-plan.md"
```

**Output:** Parsed tasks with context, todo, AC, and dependencies

---

#### prepare_jira_updates.js

Prepares update commands for Jira tickets from parsed tasks.

**Usage:**

```bash
node scripts/prepare_jira_updates.js --input parsed_tasks.json --output jira_update_plan.json
node scripts/prepare_jira_updates.js --epic MAT-3567 --first-ticket MAT-3569
```

**Options:**

- `--input` - Input file path (parsed tasks JSON)
- `--output` - Output file path (default: `jira_update_plan.json`)
- `--epic` - Epic key for the sprint
- `--first-ticket` - First ticket key in the range

**Output:** `jira_update_plan.json` with update commands

---

#### generate_description_updates.js

Generates description updates from sprint planning document with proper formatting.

**Usage:**

```bash
node scripts/generate_description_updates.js "path/to/sprint-plan.md"
node scripts/generate_description_updates.js "path/to/sprint-plan.md" "output.json"
```

**Options:**

- Input file path (required) - Path to sprint planning markdown
- Output file path (optional) - Default: `description_updates.json` in scripts folder

**Output Format:**

- "Context", "Todo", "AC", "Deps" as markdown heading 2 "##"
- Following text as numbered lists
- Code blocks (JSON, Request, Response) wrapped in markdown formatting

**Example Output:**

```markdown
## Context
need to evaluate available WhatsApp Business API providers...

## Todo
1. research available WAB providers
2. compare based on:
         1. SLA and uptime guarantees
         2. reliability and message delivery
...
```

---

## Configuration Files

### JIRA_WORKFLOW_CONFIG.md

Contains company-wide Jira configuration:

```markdown
# Jira Workflow Configuration

## Atlassian Configuration
- **Cloud ID:** `baa647e2-8cd8-468b-99ba-afc8198f5f62`
- **Project Key:** `MAT`
- **Jira Site:** `matchmade-io.atlassian.net`

## Field IDs
| Field Name | ID | Description |
|------------|----|----|
| **Team** | `customfield_10001` | Team assignment field |
| **Story Points** | `customfield_10031` | Story point estimate |

## Team Mappings
| Team Name | Team ID |
|-----------|---------|
| **Team Brock** | `2e718a72-e69a-432d-bb09-6ec20981f67e` |
| **Team Misty** | `d83984d8-51c1-40f3-90b2-fa49e0a1c281` |
| **Team Rocket** | `7ea1bc85-47b0-4909-9d4c-78707caa5c3b` |
```

### issue_links_template.json

Template for creating issue link configurations:

```json
{
  "links": [
    {
      "inward": "MAT-XXXX",
      "outward": "MAT-YYYY",
      "type": "Relates",
      "comment": "Description of the relationship"
    }
  ]
}
```

Copy this template to `issue_links_<sprint_name>.json` and fill in the links.

---

## Examples

### Example 1: Create Tickets for New Sprint

```
User: "Create Jira tickets from the Email Crawler Revamp sprint plan"

Agent:
1. Which team should these tickets be assigned to?
2. [After user responds] Running parse_sprint_plan.js...
3. Creating Epic MAT-3540
4. Creating 25 Story tickets (MAT-3541 through MAT-3565)
5. Created tickets successfully!
```

### Example 2: Update Existing Tickets

```
User: "Update story points for MAT-3540 to match the latest sprint plan"

Agent:
1. Running map_story_points.js...
2. Fetching current tickets from MAT-3540...
3. Comparing values...
4. All 25 tickets already match! No updates needed.
```

### Example 3: Verify Accuracy

```
User: "Verify that MAT-3540 tickets match the sprint planning document"

Agent:
1. Running compare_tickets.js...
2. Fetched 25 tickets from Jira
3. Parsed 25 tasks from sprint plan
4. ✅ All tickets match! No discrepancies found.
```

### Example 4: Create Issue Links

```
User: "Create dependency links for the sprint tickets"

Agent:
1. Create issue_links.json with the dependencies
2. Running create_issue_links.js --config issue_links.json...
3. Created 15 new links
4. 5 links already existed
```

---

## Error Handling

### Parse Errors

If `parse_sprint_plan.js` fails:

- Check markdown format matches expected structure
- Ensure task numbers are sequential
- Verify SP (Story Points) format: `SP: X`

### API Errors

If MCP calls fail:

- Verify `atlassian-mcp-server` is authenticated
- Check Cloud ID in config
- Retry once, then notify user

### Missing Dependencies

If scripts fail to run:

- Ensure `npm install` was run in skill directory
- Verify `.env` file exists with valid credentials

### Missing Input Files

If scripts report missing input files:

- Run prerequisite scripts first (e.g., `parse_sprint_plan.js` before `map_story_points.js`)
- Check file paths are correct
- Use `--jira-data` option to specify Jira search results

---

## Future Enhancements

- [ ] Auto-detect dependencies from sprint plan
- [ ] Compare and update descriptions automatically
- [ ] Support for sub-tasks
- [ ] Batch operations for multiple sprints
- [ ] Integration with sprint board automation
- [ ] Auto-generate issue_links.json from sprint plan dependencies
