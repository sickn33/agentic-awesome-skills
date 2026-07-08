---
name: daily-news-report
description: "Scrapes content based on a preset URL list, filters high-quality technical information, and generates daily Markdown reports."
risk: unknown
source: community
date_added: "2026-02-27"
---

# Daily News Report v3.0

> **Architecture Upgrade**: Main Agent Orchestration + SubAgent Execution + Browser Scraping + Smart Caching

## Core Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Main Agent (Orchestrator)                    │
│  Role: Scheduling, Monitoring, Evaluation, Decision, Aggregation    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│   │ 1. Init     │ → │ 2. Dispatch │ → │ 3. Monitor  │ → │ 4. Evaluate │     │
│   │ Read Config │    │ Assign Tasks│    │ Collect Res │    │ Filter/Sort │     │
│   └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘     │
│         │                  │                  │                  │           │
│         ▼                  ▼                  ▼                  ▼           │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│   │ 5. Decision │ ← │ Enough 20?  │    │ 6. Generate │ → │ 7. Update   │     │
│   │ Cont/Stop   │    │ Y/N         │    │ Report File │    │ Cache Stats │     │
│   └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘     │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
         ↓ Dispatch                          ↑ Return Results
┌─────────────────────────────────────────────────────────────────────┐
│                        SubAgent Execution Layer                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐              │
│   │ Worker A    │   │ Worker B    │   │ Browser     │              │
│   │ (WebFetch)  │   │ (WebFetch)  │   │ (Headless)  │              │
│   │ Tier1 Batch │   │ Tier2 Batch │   │ JS Render   │              │
│   └─────────────┘   └─────────────┘   └─────────────┘              │
│         ↓                 ↓                 ↓                        │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                    Structured Result Return                 │   │
│   │  { status, data: [...], errors: [...], metadata: {...} }    │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Configuration Files

This skill uses the following configuration files:

| File | Purpose |
|------|---------|
| `sources.json` | Source configuration, priorities, scrape methods |
| `cache.json` | Cached data, historical stats, deduplication fingerprints |

## Execution Process Details

### Phase 1: Initialization

```yaml
Steps:
  1. Determine date (user argument or current date)
  2. Read sources.json for source configurations
  3. Read cache.json for historical data
  4. Create output directory NewsReport/
  5. Check if a partial report exists for today (append mode)
```

### Phase 2: Dispatch SubAgents

**Strategy**: Parallel dispatch, batch execution, early stopping mechanism

```yaml
Wave 1 (Parallel):
  - Worker A: Tier1 Batch A (HN, HuggingFace Papers)
  - Worker B: Tier1 Batch B (OneUsefulThing, Paul Graham)

Wait for results → Evaluate count

If < 15 high-quality items:
  Wave 2 (Parallel):
    - Worker C: Tier2 Batch A (James Clear, FS Blog)
    - Worker D: Tier2 Batch B (HackerNoon, Scott Young)

If still < 20 items:
  Wave 3 (Browser):
    - Browser Worker: ProductHunt, Latent Space (Require JS rendering)
```

### Phase 3: SubAgent Task Format

Task format received by each SubAgent:

```yaml
task: fetch_and_extract
sources:
  - id: hn
    url: https://news.ycombinator.com
    extract: top_10
  - id: hf_papers
    url: https://huggingface.co/papers
    extract: top_voted

output_schema:
  items:
    - source_id: string      # Source Identifier
      title: string          # Title
      summary: string        # 2-4 sentence summary
      key_points: string[]   # Max 3 key points
      url: string            # Original URL
      keywords: string[]     # Keywords
      quality_score: 1-5     # Quality Score

constraints:
  filter: "Cutting-edge Tech/Deep Tech/Productivity/Practical Info"
  exclude: "General Science/Marketing Puff/Overly Academic/Job Posts"
  max_items_per_source: 10
  skip_on_error: true

return_format: JSON
```

### Phase 4: Main Agent Monitoring & Feedback

Main Agent Responsibilities:

```yaml
Monitoring:
  - Check SubAgent return status (success/partial/failed)
  - Count collected items
  - Record success rate per source

Feedback Loop:
  - If a SubAgent fails, decide whether to retry or skip
  - If a source fails persistently, mark as disabled
  - Dynamically adjust source selection for subsequent batches

Decision:
  - Items >= 25 AND HighQuality >= 20 → Stop scraping
  - Items < 15 → Continue to next batch
  - All batches done but < 20 → Generate with available content (Quality over Quantity)
```

### Phase 5: Evaluation & Filtering

```yaml
Deduplication:
  - Exact URL match
  - Title similarity (>80% considered duplicate)
  - Check cache.json to avoid history duplicates

Score Calibration:
  - Unify scoring standards across SubAgents
  - Adjust weights based on source credibility
  - Bonus points for manually curated high-quality sources

Sorting:
  - Descending order by quality_score
  - Sort by source priority if scores are equal
  - Take Top 20
```

### Phase 6: Browser Scraping (MCP Chrome DevTools)

For pages requiring JS rendering, use a headless browser:

```yaml
Process:
  1. Call mcp__chrome-devtools__new_page to open page
  2. Call mcp__chrome-devtools__wait_for to wait for content load
  3. Call mcp__chrome-devtools__take_snapshot to get page structure
  4. Parse snapshot to extract required content
  5. Call mcp__chrome-devtools__close_page to close page

Applicable Scenarios:
  - ProductHunt (403 on WebFetch)
  - Latent Space (Substack JS rendering)
  - Other SPA applications
```

### Phase 7: Generate Report

```yaml
Output:
  - Directory: NewsReport/
  - Filename: YYYY-MM-DD-news-report.md
  - Format: Standard Markdown

Content Structure:
  - Title + Date
  - Statistical Summary (Source count, items collected)
  - 20 High-Quality Items (Template based)
  - Generation Info (Version, Timestamps)
```

### Phase 8: Update Cache

```yaml
Update cache.json:
  - last_run: Record this run info
  - source_stats: Update stats per source
  - url_cache: Add processed URLs
  - content_hashes: Add content fingerprints
  - article_history: Record included articles
```

## SubAgent Call Examples

### Using general-purpose Agent

Since custom agents require session restart to be discovered, use general-purpose and inject worker prompts:

```
Task Call:
  subagent_type: general-purpose
  model: haiku
  prompt: |
    You are a stateless execution unit. Only do the assigned task and return structured JSON.

    Task: Scrape the following URLs and extract content

    URLs:
    - https://news.ycombinator.com (Extract Top 10)
    - https://huggingface.co/papers (Extract top voted papers)

    Output Format:
    {
      "status": "success" | "partial" | "failed",
      "data": [
        {
          "source_id": "hn",
          "title": "...",
          "summary": "...",
          "key_points": ["...", "...", "..."],
          "url": "...",
          "keywords": ["...", "..."],
          "quality_score": 4
        }
      ],
      "errors": [],
      "metadata": { "processed": 2, "failed": 0 }
    }

    Filter Criteria:
    - Keep: Cutting-edge Tech/Deep Tech/Productivity/Practical Info
    - Exclude: General Science/Marketing Puff/Overly Academic/Job Posts

    Return JSON directly, no explanation.
```

### Using worker Agent (Requires session restart)

```
Task Call:
  subagent_type: worker
  prompt: |
    task: fetch_and_extract
    input:
      urls:
        - https://news.ycombinator.com
        - https://huggingface.co/papers
    output_schema:
      - source_id: string
      - title: string
      - summary: string
      - key_points: string[]
      - url: string
      - keywords: string[]
      - quality_score: 1-5
    constraints:
      filter: Cutting-edge Tech/Deep Tech/Productivity/Practical Info
      exclude: General Science/Marketing Puff/Overly Academic
```

## Output Template

```markdown
# Daily News Report (YYYY-MM-DD)

> Curated from N sources today, containing 20 high-quality items
> Generation Time: X min | Version: v3.0
>
> **Warning**: Sub-agent 'worker' not detected. Running in generic mode (Serial Execution). Performance might be degraded.

---

## 1. Title

- **Summary**: 2-4 lines overview
- **Key Points**:
  1. Point one
  2. Point two
  3. Point three
- **Source**: Link
- **Keywords**: `keyword1` `keyword2` `keyword3`
- **Score**: ⭐⭐⭐⭐⭐ (5/5)

---

## 2. Title
...

---

*Generated by Daily News Report v3.0*
*Sources: HN, HuggingFace, OneUsefulThing, ...*
```

## Constraints & Principles

1.  **Quality over Quantity**: Low-quality content does not enter the report.
2.  **Early Stop**: Stop scraping once 20 high-quality items are reached.
3.  **Parallel First**: SubAgents in the same batch execute in parallel.
4.  **Fault Tolerance**: Failure of a single source does not affect the whole process.
5.  **Cache Reuse**: Avoid re-scraping the same content.
6.  **Main Agent Control**: All decisions are made by the Main Agent.
7.  **Fallback Awareness**: Detect sub-agent availability, gracefully degrade if unavailable.

## Expected Performance

| Scenario | Expected Time | Note |
|---|---|---|
| Optimal | ~2 mins | Tier1 sufficient, no browser needed |
| Normal | ~3-4 mins | Requires Tier2 supplement |
| Browser Needed | ~5-6 mins | Includes JS rendered pages |

## Error Handling

| Error Type | Handling |
|---|---|
| SubAgent Timeout | Log error, continue to next |
| Source 403/404 | Mark disabled, update sources.json |
| Extraction Failed | Return raw content, Main Agent decides |
| Browser Crash | Skip source, log entry |

## Compatibility & Fallback

To ensure usability across different Agent environments, the following checks must be performed:

1.  **Environment Check**:
    -   In Phase 1 initialization, attempt to detect if `worker` sub-agent exists.
    -   If not exists (or plugin not installed), automatically switch to **Serial Execution Mode**.

2.  **Serial Execution Mode**:
    -   Do not use parallel block.
    -   Main Agent executes scraping tasks for each source sequentially.
    -   Slower, but guarantees basic functionality.

3.  **User Alert**:
    -   MUST include a clear warning in the generated report header indicating the current degraded mode.

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.
