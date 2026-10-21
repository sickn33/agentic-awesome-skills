---
name: gh-review-requests
description: Fetch unread GitHub notifications for open PRs where review is requested from a specified team or opened by a team member. Use when asked to "find PRs I need to review", "show my review requests", "what needs my review", "fetch GitHub review requests", or "check team review queue".
allowed-tools: Bash
risk: safe
source: community
date_added: "2026-03-06"
---

# GitHub Review Requests

Fetch unread `review_requested` notifications for open (unmerged) PRs, filtered by a GitHub team.

**Requires**: GitHub CLI (`gh`) authenticated.

## When to Use
- You need to find unread GitHub PR review requests for a specific team.
- You want to check which open PRs currently need your review or a teammate's review.
- You need a filtered review queue instead of manually browsing GitHub notifications.

## Step 1: Identify the Team

If the user has not specified a team, ask:

> Which GitHub team should I filter by? (e.g. `streaming-platform`)

Accept a slug or display name, then resolve it against the authenticated organization's actual teams.

## Step 2: Read the Actual Queue

No `fetch_review_requests.py` script is bundled in this AAS entrypoint. Use the
configured GitHub connector or authenticated `gh` API rather than inventing it.
Confirm the organization and exact team slug from its API; display-name conversion
alone cannot prove the slug. Do not default every repository to `getsentry`.

```bash
gh api notifications --paginate
```

Keep unread `review_requested` notifications whose subject is a pull request.
Follow the returned subject API URL only after verifying GitHub origin and repository.
For each candidate, inspect open/unmerged state, requested reviewer teams, and the
selected team's paginated membership. Being authored by a teammate is distinct from
being assigned for review. Do not mark notifications read or submit reviews.

Return the actual API results as rows with PR URL, author, and observed reason.
Missing permissions or incomplete pagination must be reported as incomplete, not zero.

## Step 3: Present Results

Display results as a markdown table with full URLs:

| # | Title | URL | Reason |
|---|-------|-----|--------|
| 1 | feat(kafka): add workflow to restart a broker | https://github.com/getsentry/ops/pull/19144 | opened by: evanh |

If `total` is 0, say: "No unread review requests found for that team."

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
