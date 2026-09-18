# People Data Tool Reference

MCP server: `/mcp/people-data`

Successful calls return the business result in `data`.

REST uses `POST /v1/tools/{tool_id}/call`.

| Tool ID | MCP Tool | Required input | Purpose |
|---|---|---|---|
| `linkedin.email_lookup` | `linkedin_email_lookup` | `profileUrl` (URI) | Look up an email address from a LinkedIn profile URL |
| `linkedin.phone_lookup` | `linkedin_phone_lookup` | `profileUrl` (URI) | Look up a phone number from a LinkedIn profile URL |
| `linkedin.person_profile` | `linkedin_person_profile` | `linkedin_url` (URI) | Retrieve one professional profile |
| `linkedin.people_search` | `linkedin_people_search` | None | Search people with explicit filters |
| `youtube.email_finder` | `youtube_email_finder` | `channels` | Find public business emails for channels |

## People search fields

`linkedin_people_search` accepts these optional fields:

- Strings: `name`, `companyFilter`, `keyword`, `nextPageToken`.
- String arrays: `jobTitle`, `excludeJobTitles`, `seniority`, `jobFunction`, `skills`, `yearsOfExperience`, `yearsInCurrentRole`, `education`, `company`, `domain`, `excludeCompanies`, `location`, `industry`, `companySize`.
- Booleans: `currentTitlesOnly`, `includeRelatedJobTitles`.

`companyFilter` must be `current`, `past`, or `all`. Pass a returned `nextPageToken` unchanged to continue a search.

## YouTube email input

```json
{
  "channels": ["https://www.youtube.com/@example"],
  "scrape_fresh_emails": false
}
```

`channels` must contain 1-1000 non-empty strings. The result contains a `channels` array; preserve per-channel found/not-found state instead of inventing missing addresses.
