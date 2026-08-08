---
name: gemini-deep-research
description: "Run autonomous multi-step research with Google's Gemini Deep Research Agent: kick off a query, poll progress, and collect a cited report for market analysis or literature reviews."
category: research
risk: critical
source: https://github.com/sanjay3290/ai-skills/tree/main/skills/deep-research
source_repo: sanjay3290/ai-skills
source_type: community
date_added: "2026-07-09"
author: sanjay3290
tags: [research, gemini, google, reports]
tools: [claude, cursor, gemini]
license: "Apache-2.0"
license_source: "https://github.com/sanjay3290/ai-skills/blob/main/LICENSE"
---

# Gemini Deep Research Skill

## When to Use

- Use when a question needs autonomous multi-step research with cited sources (market analysis, literature reviews, competitive scans)
- Use when you want to start a Gemini Deep Research run, poll its progress, and collect the final report
- Use when a quick web search is not enough and a structured, source-grounded report is required

Run autonomous research tasks that plan, search, read, and synthesize information into comprehensive reports.

## Requirements

- Python 3.8+
- httpx: `pip install -r requirements.txt`
- GEMINI_API_KEY environment variable

## Setup

1. Get a Gemini API key from [Google AI Studio](https://aistudio.google.com/)
2. Set the environment variable:
   ```bash
   export GEMINI_API_KEY=your-api-key-here
   ```
   Or create a `.env` file in the skill directory.

## Safety Gate

Before starting a research job, show the user the exact query, the fact that it will be sent
to Google's Gemini service, the expected cost range, and the output destination. Start a job
only after explicit approval. Do not include private workspace material, credentials, personal
data, or confidential customer information in a query.

## Usage

### Start a research task
```bash
python3 scripts/research.py --query "Research the history of Kubernetes"
```

### With structured output format
```bash
python3 scripts/research.py --query "Compare Python web frameworks" \
  --format "1. Executive Summary\n2. Comparison Table\n3. Recommendations"
```

### Stream progress in real-time
```bash
python3 scripts/research.py --query "Analyze EV battery market" --stream
```

### Start without waiting
```bash
python3 scripts/research.py --query "Research topic" --no-wait
```

### Check status of running research
```bash
python3 scripts/research.py --status <interaction_id>
```

### Wait for completion
```bash
python3 scripts/research.py --wait <interaction_id>
```

### Continue from previous research
```bash
python3 scripts/research.py --query "Elaborate on point 2" --continue <interaction_id>
```

### List recent research
```bash
python3 scripts/research.py --list
```

## Output Formats

- **Default**: Human-readable markdown report
- **JSON** (`--json`): Structured data for programmatic use
- **Raw** (`--raw`): Unprocessed API response

## Cost & Time

| Metric | Value |
|--------|-------|
| Time | 2-10 minutes per task |
| Cost | $2-5 per task (varies by complexity) |
| Token usage | ~250k-900k input, ~60k-80k output |

## Best Use Cases

- Market analysis and competitive landscaping
- Technical literature reviews
- Due diligence research
- Historical research and timelines
- Comparative analysis (frameworks, products, technologies)

## Workflow

1. User requests research → Run `--query "..."`
2. Inform user of estimated time (2-10 minutes)
3. Monitor with `--stream` or poll with `--status`
4. Return formatted results
5. Use `--continue` for follow-up questions

## Exit Codes

- **0**: Success
- **1**: Error (API error, config issue, timeout)
- **130**: Cancelled by user (Ctrl+C)

## Limitations

- Each research job is a paid, third-party API request; costs and availability can change, and
  the listed estimate is not a spending authorization.
- Reports may contain incomplete, stale, or incorrect citations. Verify consequential claims
  against primary sources.
- This skill cannot guarantee that a prompt is safe to disclose; redact proprietary or personal
  material before requesting user approval.
- An API key must remain local and must never be committed, printed, or sent in a query.
