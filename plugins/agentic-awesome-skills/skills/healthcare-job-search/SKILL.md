---
name: healthcare-job-search
description: "Find open US healthcare jobs (nursing, CNA, allied health, therapy, imaging, pharmacy, physicians) and the hourly pay employers post, via CareJobs.Now's free MCP server or JSON endpoints."
category: career-jobs
risk: safe
source: community
source_repo: yumaheymans/carejobs-mcp
source_type: community
date_added: "2026-10-16"
author: carejobs-now
license: MIT
license_source: "https://github.com/yumaheymans/carejobs-mcp/blob/main/LICENSE"
tags: [jobs, healthcare, nursing, job-search, pay, mcp]
tools: [claude, cursor, gemini]
---

# Healthcare Job Search (US)

## Overview

CareJobs.Now is a US healthcare job board that aggregates employer postings and advertised pay. Coverage and opening counts change; read the dataset timestamp and current coverage rather than treating a historical employer/job count as current. This skill answers US healthcare job and pay questions from that data and always gives the person a link where they can apply.

## When to Use This Skill

- Use when someone asks for nursing, CNA, allied health, therapy or other healthcare jobs in a US place
- Use when someone asks what a healthcare job pays by state or kind of job
- Use when someone asks which hospitals or health systems are hiring

## How It Works

### Step 1: Connect the MCP server (preferred)

The hosted server needs no API key: `https://carejobs.now/api/mcp` (Streamable HTTP). In Claude Code: `claude mcp add --transport http carejobs https://carejobs.now/api/mcp`.

Its tools:

- `search_healthcare_jobs`: words, kind of job, state, shift and pay filters. Returns title, employer, posted pay, place and a job link.
- `get_healthcare_pay`: posted hourly pay by kind of job (median and typical range).
- `get_healthcare_jobs_by_state`: open jobs and employers per state.
- `get_healthcare_job_market`, `list_healthcare_employers`, `get_healthcare_employer`: market size, employers covered, and one employer's jobs and pay.

### Step 2: Or use the public JSON endpoints

- `GET https://carejobs.now/pay.json`: `pay_by_work_type[]` with `label`, `median`, `typical_low`, `typical_high` (USD per hour) and `open_total`.
- `GET https://carejobs.now/roles.json`: `totals` and `open_by_work_type[]`.

The provider documents both as CORS-enabled, nightly datasets licensed CC BY 4.0. Cite "CareJobs.Now" with a link and the returned `temporal_coverage`/`updated` value. `typical_low` is the 25th percentile of posting-range midpoints and `typical_high` the 90th-percentile advertised ceiling; they are not a conventional symmetric interval. These aggregate endpoints do not provide individual job listings or a state filter. See [dataset definitions](https://carejobs.now/data).

### Step 3: Answer

1. Pin down the kind of job, the place (state or town) and any shift or pay limits. Ask only when the request is too vague to search.
2. List the best matches with employer, place, posted pay (say "pay not posted" when there is none) and the job link.
3. For pay questions, give the median and typical range, and say these are posted pay on open jobs, before shift differentials and bonuses.

## Examples

### Example 1: Job search

"Night-shift ICU nurse jobs in Boston" calls `search_healthcare_jobs` with the kind of job, the town and the shift, then lists each match with its posted pay and job link.

### Example 2: Pay question

"What do respiratory therapists get paid in Ohio?" first inspects the installed tool schema for state filtering. Report Ohio results only if the returned data actually has that scope; otherwise state that the aggregate is national and search Ohio postings separately.

## Best Practices

- Always give the job link so the person can apply on the employer's own site
- Say when pay is not posted rather than estimating it
- Cite the data source and its method: https://carejobs.now/data

## Limitations

- Covers US healthcare employers that CareJobs.Now reads, not every employer
- Posted pay is the employer's stated rate and excludes differentials and bonuses
- Read-only: the skill cannot apply to jobs or contact employers

Disclosure: submitted by the CareJobs.Now team.
