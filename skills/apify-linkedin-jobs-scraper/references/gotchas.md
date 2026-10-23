# Gotchas — harshmaur/linkedin-jobs-scraper

## Filters that are exact and filters that are not

The author reports these filter behaviors; verify the current Actor schema and returned rows. They are not platform guarantees.

| Filter | How exact |
|---|---|
| `datePosted` (`f_TPR` in a URL) | Exact |
| Company (`f_C` in a URL) | Exact |
| Easy Apply (`f_AL` in a URL) | Exact |
| Under 10 applicants (`f_EA` in a URL) | Exact |
| `workplaceType`, `jobType`, `experienceLevel` | Approximate. Check the returned rows for an exact match. |
| `sortBy: "recent"` | No effect. Use `datePosted` for fresh jobs. |

When the user needs an exact match on job type or level, filter the rows on `employmentType` and `seniorityLevel` after the run, and say how many rows you removed.

## Limits

- `maxItems` is one budget for the whole run. Two pasted URLs and a keyword search share it.
- One search returns at most about 1,000 jobs. `splitByLocation` gets past this for the 13 listed countries.
- `applicants` is capped near 200.
- `scrapeDetails: false` gives about 10 fields per job. Salary, description and recruiter need details on.

## Historical cost examples (verify live pricing before use)

| Run | Jobs | Cost |
|---|---|---|
| One city, last 7 days | 50 | $0.05 |
| One country, last 30 days | 1,000 | $1.00 |
| US split by location | 5,000 | $5.00 |
| Daily alert, 50 new jobs | 1,500 per month | $1.50 per month |

Paid plans pay $0.40 to $0.47 per 1,000. A search that finds nothing costs nothing.

## MCP connector delivery

Set these only when the user asks to send jobs to an app:

| Field | Meaning |
|---|---|
| `mcpConnector` | The connector ID that the user created in Apify Console (Slack, Notion, Google Sheets and others). |
| `mcpTarget` | Channel, page or sheet to write to. |
| `mcpMode` | `perPost` (one message per job, default) or `summary` (one message for the run). |
| `mcpMessage` | Template with `{{field}}` placeholders, for example `*{{title}}* — {{company}}\n{{url}}`. |
| `mcpMaxItems` | Most jobs to send. Default 50. |

Check scrape and delivery status separately; a successful dataset does not prove delivery succeeded.

## Errors

| Message | Cause | Fix |
|---|---|---|
| "Provide a Job title/keywords..." | No search target | Set `keywords`, `location` or `startUrls` |
| "datePosted must be one of..." | Bad enum | Use `"1"`, `"7"` or `"30"` |
| "maxItems must be a non-negative integer" | Text or a decimal | Send a whole number |
| "Actor startup failed due to a server-side configuration issue" | Problem on the Actor side | Do not retry in a loop. Report it on the Actor's Issues tab |
