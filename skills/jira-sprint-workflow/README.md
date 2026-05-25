# Jira Sprint Workflow Skill

Comprehensive automation for managing Jira tickets from sprint planning markdown documents.

## Quick Start

### 1. Setup

```bash
# Install dependencies
npm install

# Create .env file in project root
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your-api-token
```

### 2. Configuration

Edit `JIRA_WORKFLOW_CONFIG.md` with your:

- Project Key
- Cloud ID  
- Team mappings

### 3. Usage

**Create tickets from sprint plan:**

```bash
node scripts/robust_parse_sprint.js "path/to/sprint-plan.md"
# Then use MCP tools to create Epic + Stories
```

**Compare tickets with sprint plan:**

```bash
node scripts/compare_tickets.js --epic MAT-XXXX --sprint-plan "path/to/sprint-plan.md"
```

**Create issue links:**

```bash
node scripts/create_issue_links.js
```

## Scripts

| Script | Purpose |
| :--- | :--- |
| `robust_parse_sprint.js` | Parse markdown → JSON (Robust) |
| `generate_sprint_links.js` | Map tasks to Jira keys & generate link config |
| `create_issue_links.js` | Create dependency links in Jira |
| `compare_tickets.js` | Verify tickets match plan |
| `map_story_points.js` | Extract SP mappings |
| `update_descriptions.js` | Generate description updates |

## Documentation

See [SKILL.md](SKILL.md) for complete documentation including:

- Three operation modes (Create, Update, Verify)
- Detailed workflows
- Examples
- Error handling

## Dependencies

- `dotenv` - Environment variable management

## Files

```text
.agent/skills/jira-sprint-workflow/
├── SKILL.md                    # Main documentation
├── JIRA_WORKFLOW_CONFIG.md     # Configuration
├── package.json                # Dependencies
├── README.md                   # This file
└── scripts/
    ├── robust_parse_sprint.js
    ├── map_story_points.js
    ├── update_descriptions.js
    ├── create_issue_links.js
    ├── generate_sprint_links.js
    └── compare_tickets.js
```
