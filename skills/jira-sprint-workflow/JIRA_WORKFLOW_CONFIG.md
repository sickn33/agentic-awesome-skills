# Jira Workflow Configuration

## Atlassian Configuration

- **Cloud ID:** `baa647e2-8cd8-468b-99ba-afc8198f5f62`
- **Project Key:** `MAT`
- **Jira Site:** `matchmade-io.atlassian.net`

## Field IDs

| Field Name | ID | Description |
| :--- | :--- | :--- |
| **Team** | `customfield_10001` | Team assignment field. |
| **Story Points** | `customfield_10031` | Story point estimate. |

## Team Mappings

| Team Name | Team ID (`customfield_10001`) |
| :--- | :--- |
| **Team Brock** | `2e718a72-e69a-432d-bb09-6ec20981f67e` |
| **Team Misty** | `d83984d8-51c1-40f3-90b2-fa49e0a1c281` |
| **Team Rocket** | `7ea1bc85-47b0-4909-9d4c-78707caa5c3b` |

## Workflow Steps

1. **Parse:** Use `parse_sprint_plan.js` to extract tickets from Markdown.
2. **Review:** Check `parsed_tickets.json`.
3. **Execute:** Create Epic, then create Stories linked to Epic.
