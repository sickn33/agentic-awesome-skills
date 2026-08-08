---
name: people-data
description: "Research LinkedIn professional profiles and public business-contact data, including email/phone lookup, people search, and YouTube channel business-email discovery."
category: research
risk: safe
source: https://github.com/agentbody/skills/blob/main/skills/people-data/SKILL.md
source_repo: agentbody/skills
source_type: community
date_added: "2026-08-07"
author: agentbody
tags: [linkedin, youtube, people-search, business-contacts, research]
tools: [claude, cursor, gemini]
license: "MIT"
license_source: "https://github.com/agentbody/skills/blob/main/LICENSE"
---

# People Data

## Overview

Perform authorized professional-profile and public business-contact research through the Agent Body MCP server at `/mcp/people-data`. It covers LinkedIn profile retrieval, email and phone lookup, filtered people search, and YouTube channel business-email discovery.

Read [references/tool-reference.md](references/tool-reference.md) for exact tool names and input fields.

## When to Use This Skill

- Use when the user asks to look up, enrich, or verify a LinkedIn professional profile.
- Use when the user needs a business email or phone number for a LinkedIn profile they are authorized to contact.
- Use when the user wants to find people by role, company, location, seniority, or other LinkedIn filters.
- Use when the user wants to find public business contact emails for YouTube channels.
- Use when the user asks to validate or deduplicate people-search results before outreach.

## How It Works

### Step 1: Choose one operation

- `linkedin_person_profile` with `linkedin_url` retrieves one professional profile.
- `linkedin_email_lookup` with `profileUrl` looks up one profile email address.
- `linkedin_phone_lookup` with `profileUrl` looks up one profile phone number.
- `linkedin_people_search` accepts optional filters and returns a `nextPageToken` for continuation.
- `youtube_email_finder` takes `channels` (1-1000 channel URLs) and optional `scrape_fresh_emails` to find public business emails.

### Step 2: Prefer canonical URLs and explicit filters

Use canonical profile or channel URLs when available. For name-only searches, add explicit role, company, location, or keyword filters. `companyFilter` must be `current`, `past`, or `all`.

### Step 3: Verify and present only returned data

Confirm that returned identities match the request, deduplicate search results by canonical profile identity, and never construct or guess an email address or phone number. Preserve per-channel found/not-found state from YouTube results.

## Examples

### Example 1: Look up one LinkedIn profile

Call `linkedin_person_profile` with:

```json
{
  "linkedin_url": "https://www.linkedin.com/in/example-person"
}
```

### Example 2: Find public business emails for YouTube channels

Call `youtube_email_finder` with:

```json
{
  "channels": ["https://www.youtube.com/@example"],
  "scrape_fresh_emails": false
}
```

## Best Practices

- ✅ Use canonical profile or channel URLs instead of guessing handles.
- ✅ Confirm the returned identity matches the person or channel before presenting it.
- ✅ Use only public, authorized, or explicitly permitted business data.
- ✅ Keep `nextPageToken` unchanged when continuing a `linkedin_people_search`.
- ❌ Do not fabricate, guess, or infer email addresses or phone numbers.
- ❌ Do not bypass access controls or collect private profiles without authorization.

## Limitations

- Requires an Agent Body API key and access to the `/mcp/people-data` MCP server; results depend on the live tool schema.
- Email and phone lookup may return no result for profiles without public contact data; a missing result is not evidence that a person has no contact information.
- Search filters are optional, but unfiltered name-only searches can return ambiguous matches that need manual verification.
- `youtube_email_finder` only finds public business emails and may report channels where no email is found.

## Security & Safety Notes

- Never print, log, or commit API keys or other credentials.
- Use contact information only for authorized business purposes and respect privacy, anti-harassment, and outreach rules.
- Do not use this skill to build contact lists without a lawful basis or to contact people who have opted out.
- This skill is read-only: it queries business data and does not modify files or systems.

## Common Pitfalls

- **Problem:** Using the wrong input key for profile versus email/phone lookups.
  **Solution:** Profile lookup uses `linkedin_url`; email and phone lookup use `profileUrl`.
- **Problem:** Guessing an email when lookup returns nothing.
  **Solution:** Report the missing result and stop; never invent contact data.
- **Problem:** Repeating the same people-search page.
  **Solution:** Pass the returned `nextPageToken` unchanged to continue instead of replaying the initial query.
