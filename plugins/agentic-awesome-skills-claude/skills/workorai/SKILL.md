---
name: workorai
description: "WorkorAI talent-marketplace skill: candidates search jobs and manage applications; employers run the job lifecycle and get ranked candidate matches with white-box fit explanations."
category: productivity
risk: critical
source: community
source_repo: work0r-ai/agent-kit
source_type: community
date_added: "2026-07-03"
author: work0r-ai
tags: [job-search, hiring, recruiting, talent-marketplace, mcp]
tools: [claude, cursor, gemini]
license: "MIT"
license_source: "https://github.com/work0r-ai/agent-kit/blob/main/skills/workorai/LICENSE.txt"
---

# WorkorAI

## Overview

WorkorAI is a talent marketplace exposed to agents through an MCP server
(streamable HTTP at https://workorai.com/mcp, listed on the official MCP
Registry as `io.github.work0r-ai/workorai`). This skill routes requests by
intent across the dual-role tool surface: 9 `candidate.*` tools (job search,
job detail, applications, apply, invitations, saved jobs) and the
`employer.*` tools (job lifecycle, candidate discovery, invitations,
applicant review). Employer candidate discovery returns tiered rankings
(best/good/weak) with a white-box match explanation per candidate — fit
score, skills proven in interview, gaps, and a quotable rationale — instead
of a black-box score.

## When to Use This Skill

- Use when a user asks to find a job, search vacancies, apply to a position,
  or track their applications ("find me a job", "ищу работу").
- Use when an employer wants to post, publish, update, close, or archive a
  job on WorkorAI.
- Use when an employer asks to find, rank, compare, or evaluate candidates,
  or asks why a candidate matches a role.
- Use when a user needs to set up or troubleshoot the WorkorAI MCP
  connection and API key onboarding.

## How It Works

### Step 1: Connect the MCP server

Add the WorkorAI MCP server to your agent's MCP configuration. For Claude
Code:

```bash
claude mcp add --transport http workorai https://workorai.com/mcp
```

If the user has no API key yet, call the `request_access` tool and follow
the onboarding it returns.

### Step 2: Route by role and intent

Detect whether the request is a candidate flow or an employer flow, then use
the matching tool group:

- Candidate: `candidate.search_jobs`, `candidate.get_job`,
  `candidate.apply_to_job`, `candidate.get_applications`,
  `candidate.accept_invitation` / `candidate.decline_invitation`,
  `candidate.withdraw_application`, `candidate.set_saved_job`,
  `candidate.get_saved_jobs`.
- Employer: `employer.create_job` → `employer.publish_job` →
  `employer.close_job` / `employer.archive_job` for the lifecycle;
  `employer.search_candidates_for_job` or
  `employer.search_candidates_by_query` for discovery;
  `employer.invite_candidate`, `employer.list_applicants`,
  `employer.get_applicant_detail`, `employer.set_review_status` for
  pipeline work.

### Step 3: Explain matches with white-box data

When presenting employer search results, keep the tier structure
(best/good/weak) and surface each candidate's `matchExplanation`: fit score,
interview-proven skills, gaps, and rationale. For deeper comparison, fetch
per-candidate interview evidence with `employer.get_candidate_evidence` and
`employer.get_applicant_transcript`.

## Examples

### Example 1: Candidate job search

```
User: "Find me remote TypeScript jobs and apply to the best one."
Agent: candidate.search_jobs(query="TypeScript", remote=true)
       → present ranked results → candidate.get_job(id)
       → confirm with the user → candidate.apply_to_job(id)
```

### Example 2: Employer candidate discovery

```
User: "Who are the best candidates for my Senior Backend role?"
Agent: employer.search_candidates_for_job(jobId)
       → report Best tier with each candidate's fit score, proven
         skills, and gaps → employer.invite_candidate on approval
```

## Best Practices

- ✅ Confirm with the user before applying, inviting, or changing job
  status — these are visible, stateful marketplace actions.
- ✅ Quote the white-box match explanation when recommending a candidate,
  so the employer sees why, not just a score.
- ✅ Use `request_access` for key onboarding instead of asking users to
  paste credentials into chat.
- ❌ Don't fabricate fit scores or ranks — only report what the tools
  return.
- ❌ Don't apply to jobs or send invitations in bulk without explicit
  user approval.

## Limitations

- Requires a WorkorAI account and API key; tools fail without a valid key.
- This skill does not replace environment-specific validation, testing, or
  expert review.
- Stop and ask for clarification if required inputs, permissions, or safety
  boundaries are missing.

## Security & Safety Notes

- All operations go through the remote WorkorAI MCP server over HTTPS; the
  skill itself runs no shell commands.
- Mutating tools (apply, withdraw, invite, publish, close, delete) should
  be preceded by an explicit user confirmation.
- Treat API keys as secrets: store them in MCP client configuration, never
  in chat transcripts or committed files.

## Additional Resources

- [Source repository](https://github.com/work0r-ai/agent-kit) — full skill
  with reference files and agents (npm: `@workorai/agent-kit`)
- [WorkorAI MCP endpoint](https://workorai.com/mcp)
