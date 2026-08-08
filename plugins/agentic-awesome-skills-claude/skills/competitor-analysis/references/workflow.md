# Competitor Analysis — Workflow Reference

## Contents
- [Discovery Batch JSON Schema](#discovery-batch-json-schema) — browse cloud search output format
- [Competitor Research Markdown Format](#competitor-research-markdown-format) — frontmatter + body section spec
- [Extracting Page Text](#extracting-page-text) — browse cloud fetch (markdown default; --format raw for HTML)
- [Discovery — parallel Bash, not subagents](#discovery--parallel-bash-not-subagents) — Wave A/B/C recipes
- [Enrichment fan-out — 5 subagents PER competitor](#enrichment-fan-out--5-subagents-per-competitor-deepdeeper-modes)
- [Legacy: Single-subagent template](#legacy-single-subagent-template-quick-mode-only) — quick mode only
- [Wave Management](#wave-management) — parallelism rule, gate phase, sizing formula
- [Report Compilation](#report-compilation) — compile_report.mjs invocation

## Discovery Batch JSON Schema

File: `/tmp/competitor_discovery_batch_{N}.json`

`browse cloud search --output` writes a JSON object:

```json
{
  "requestId": "abc123",
  "query": "alternatives to acme",
  "results": [
    { "id": "...", "url": "https://example.com", "title": "Example Corp", "image": null, "favicon": null }
  ]
}
```

The `list_urls.mjs` script (run with `--prefix competitor`) deduplicates across batches.

## Competitor Research Markdown Format

File: `{OUTPUT_DIR}/{competitor-slug}.md` — see `references/example-research.md` for the full template.

**YAML frontmatter fields** (used by `compile_report.mjs`):
- `competitor_name` (required)
- `website` (required)
- `tagline`
- `positioning`
- `product_description`
- `target_customer`
- `pricing_model`
- `pricing_tiers` (pipe-separated: `Free | Pro $99 | Enterprise Contact`)
- `key_features` (pipe-separated)
- `integrations` (pipe-separated)
- `headquarters`
- `founded`
- `employee_estimate`
- `funding_info`
- `strategic_diff` (one-line for overview table; deeper mode only)

**Body sections** (in this order — `compile_report.mjs` parses by heading):
- `## Product`
- `## Pricing`
- `## Features`
- `## Positioning`
- `## Comparison vs {user_company}` (deeper only)
- `## Mentions`
- `## Benchmarks` (deeper only)
- `## Research Findings`

**Mentions line format** (parsed into the mentions feed):
```
- **[SourceType]** Title | Snippet (source: URL, YYYY-MM-DD)
```
`SourceType` ∈ `Benchmark | Comparison | News | Reddit | HN | LinkedIn | YouTube | Review | Podcast | X`. Date is optional but preferred.

## Extracting Page Text

`browse cloud fetch --allow-redirects` returns clean **markdown by default** — no HTML stripping needed. Just cap the length:

```bash
browse cloud fetch --allow-redirects "https://rivalco.com/pricing" | head -c 3000
```

If you need the original HTML (e.g. to read the `<title>` tag or parse markup), add `--format raw` and strip tags:

```bash
browse cloud fetch --allow-redirects --format raw "https://rivalco.com/pricing" | sed 's/<script[^>]*>.*<\/script>//g; s/<style[^>]*>.*<\/style>//g; s/<[^>]*>//g; s/&amp;/\&/g; s/&lt;/</g; s/&gt;/>/g; s/&nbsp;/ /g; s/&#[0-9]*;//g' | tr -s ' \n' | head -c 3000
```

Limit to ~3000 chars per page to keep subagent context manageable. For JS-heavy pages (client-rendered pricing tables) where the Fetch API returns thin content, open the page in a browser session and read it: `browse open "{url}" --remote` then `browse get markdown`.

## Discovery — parallel Bash, not subagents

The main agent runs discovery as **3 parallel `browse cloud search` Bash calls** (one per wave) in a SINGLE message. No subagent layer. Each wave chains its 2-4 queries with `&&` and writes results to `/tmp/competitor_discovery_batch_{wave}{N}.json`.

Example — main agent issues these three Bash tool calls in parallel in one message:

```bash
# Wave A — alternatives
browse cloud search "alternatives to {user_company}" --num-results 12 --output /tmp/competitor_discovery_batch_A1.json && \
browse cloud search "{user_company} competitors" --num-results 12 --output /tmp/competitor_discovery_batch_A2.json && \
echo "A done"
```

```bash
# Wave B — precise category
browse cloud search "{precise_category}" --num-results 12 --output /tmp/competitor_discovery_batch_B1.json && \
browse cloud search "{compose 3 distinctive tokens}" --num-results 12 --output /tmp/competitor_discovery_batch_B2.json && \
browse cloud search "{primary_noun} for ai agents" --num-results 12 --output /tmp/competitor_discovery_batch_B3.json && \
echo "B done"
```

```bash
# Wave C — comparison-page graph
browse cloud search "{user_company} vs" --num-results 12 --output /tmp/competitor_discovery_batch_C1.json && \
browse cloud search "{seed1} vs" --num-results 12 --output /tmp/competitor_discovery_batch_C2.json && \
browse cloud search "{seed2} vs" --num-results 12 --output /tmp/competitor_discovery_batch_C3.json && \
echo "C done"
```

Why direct Bash and not subagents: each wave is 2-4 `browse cloud search` calls — agent cold-start + tool-reasoning overhead is bigger than the actual work. Using parallel Bash saves ~1-2 min per run with no quality loss.

### Discovery query patterns

Discovery uses **three parallel waves** (evaluated — all three are additive):

**Wave A — Generic alternatives** (broad net, lots of noise):
- `"alternatives to {user_company}"`
- `"{user_company} competitors"`

**Wave B — Precise category queries** (uses `precise_category` from self-research):
- `"{precise_category}"` verbatim
- `"{precise_category_2_3_keywords}"` — pick the 3 most distinctive tokens
- Compose with "API", "cloud", "for agents": `"cloud {primary_noun} for ai agents"`, `"{primary_noun} infrastructure API"`

**Wave C — Comparison-page graph** (highest-precision single wave):
- `"{user_company} vs"`
- For each seed competitor from the user's profile, also run `"{seed} vs"`
- After the searches, `scripts/extract_vs_names.mjs` parses `"X vs Y"` titles across all Wave C results to surface candidate names that don't appear as URLs.

**Evaluation result** (tested on a search-API run): Wave A returns ~10% real competitors (mostly AI-tool-listicle aggregators). Wave B returns ~35%. Wave C uniquely surfaces named brands via title parsing that neither A nor B finds. Use all three.

## Enrichment fan-out — 5 subagents PER competitor (deep/deeper modes)

For each gated-PASS competitor, launch **five parallel subagents**, one per lane. Each subagent writes a *partial* to `{OUTPUT_DIR}/partials/{slug}.{lane}.md`. After all subagents complete, `scripts/merge_partials.mjs` unions the partials into one canonical `{OUTPUT_DIR}/{slug}.md` per competitor (dedup mentions by URL, sort by date desc).

The 5 lanes:

| Lane | Slug | Scope |
|------|------|-------|
| **A. Marketing** | `marketing` | Owns canonical frontmatter. Pricing, features, positioning, integrations, customers, target, team, funding, HQ. Homepage + sitemap-driven page discovery. |
| **B. Discussion** | `discussion` | Reddit, HN, forums, dev.to, hashnode. Broader queries beyond `site:` restrictions — also `"{competitor}" discussion`, `"{competitor}" review 2026`, `"{competitor}" issues OR problems`. Writes Mentions bullets with dates. |
| **C. Social** | `social` | LinkedIn posts, YouTube videos, Twitter/X threads. Search snippets only — do NOT fetch (auth walls). |
| **D. News & Comparisons** | `news` | Comparison pages ("X vs Y"), TechCrunch / Verge / Forbes / VentureBeat / Businesswire, independent blog reviews, Substack. Every mention MUST include a date. |
| **E. Technical & Benchmarks** | `technical` | GitHub benchmark repos/PRs, performance blog posts, independent tests. Writes Benchmarks bullets AND Findings on technical specifics (retrieval modes, latency, rate limits, SDKs). |

**Wave management — launch ALL subagents in ONE message**: for N competitors × 5 lanes = 5N subagents, fit them all in a single Agent-tool message. Wall clock then equals the slowest single subagent (~3-5 min) instead of `batches × slowest_per_batch`. On a real 10-competitor run we measured 25 minutes wasted by self-throttling to 10-per-message — the Agent tool happily runs 50+ in parallel; do not split into batches for "politeness". The only cap is that each subagent still batches its own Bash operations into a single call.

**Merge step** (once all partials exist):
```bash
node {SKILL_DIR}/scripts/merge_partials.mjs {OUTPUT_DIR}
```
Produces one `{OUTPUT_DIR}/{slug}.md` per competitor with dedup'd Mentions (sorted date desc), Benchmarks, and Findings.

## Legacy: Single-subagent template (quick mode only)

In `quick` mode, keep a single subagent per batch of competitors (no fan-out — Lane 1 only, budget 2-3 calls each).

```
You are a competitor enrichment subagent. For each competitor URL, run the 4-lane research
pattern and write a single markdown file per competitor.

CONTEXT:
- User's company: {user_company}
- User's product: {user_product}
- User's key features: {user_key_features}
- Depth mode: {depth_mode}   (quick | deep | deeper)
- Output directory: {OUTPUT_DIR}   ← write files HERE, as a full literal path

COMPETITOR URLS TO PROCESS:
{url_list}

TOOL RULES — CRITICAL, FOLLOW EXACTLY:
1. You may ONLY use the Bash tool. No exceptions.
2. All searches: Bash → browse cloud search "..." --num-results 10
3. All page fetches: Bash → browse cloud fetch --allow-redirects "..."
   browse cloud fetch returns clean markdown by default — just `| head -c 3000`, no HTML stripping.
   If you need the raw HTML, add --format raw and pipe through:
   sed 's/<script[^>]*>.*<\/script>//g; s/<style[^>]*>.*<\/style>//g; s/<[^>]*>//g' | tr -s ' \n' | head -c 3000
   If a page returns thin content or "enable JavaScript", use `browse open "{url}" --remote` then `browse get markdown`.
4. BATCH all file writes: Write ALL markdown files in a SINGLE Bash call using chained heredocs.
5. BANNED TOOLS: WebFetch, WebSearch, Write, Read, Glob, Grep — ALL BANNED.
6. NEVER use ~ or $HOME in paths — use full literal paths.

RESEARCH PATTERN (per competitor — lanes are depth-gated):

LANE 1 — Marketing Surface (always run):
  a. Fetch competitor homepage
  b. Discover via sitemap: /sitemap.xml — find /pricing, /features, /integrations, /customers
  c. Fetch 2-4 most relevant pages
  d. Extract: tagline, positioning, product_description, target_customer,
     pricing_model, pricing_tiers, key_features, integrations

LANE 2 — External Signal (deep + deeper):
  Run these searches:
    browse cloud search "{competitor} vs"
    browse cloud search "{competitor} alternatives review"
    browse cloud search "site:reddit.com {competitor}"
    browse cloud search "site:news.ycombinator.com {competitor}"
    browse cloud search "site:linkedin.com/posts {competitor}"
    browse cloud search "site:youtube.com {competitor}"
    browse cloud search "{competitor} G2 OR Capterra"
    browse cloud search "{competitor} launch OR funding 2025 OR 2026"

  For each search result, classify source type from URL:
    reddit.com → Reddit
    news.ycombinator.com → HN
    linkedin.com → LinkedIn
    youtube.com/youtu.be → YouTube
    twitter.com/x.com → X (or Twitter — either works)
    dev.to → DevTo
    hashnode.dev, hashnode.com → Hashnode
    *.substack.com → Substack
    spotify.com/episode, transistor.fm, simplecast.com → Podcast
    g2.com/capterra.com/trustradius.com → Review
    url or title contains "vs" → Comparison
    techcrunch/theverge/venturebeat/forbes/businesswire/wired/fortune → News
    other blog domain → Blog

  Record each as a Mentions line with title + one-line snippet + URL + **date**. Always include
  the date when available. If a `browse cloud search` result carries a date field, prefer it.
  If absent, parse the year from title/URL (e.g. "2026" or `/2025/11/` in a news URL).
  For LinkedIn and YouTube — use search snippet only, do NOT fetch the page.

LANE 3 — Public Benchmarks (deeper only):
  Run these searches:
    browse cloud search "{competitor} benchmark"
    browse cloud search "site:github.com {competitor} benchmark"
    browse cloud search "{category} benchmark {competitor}"

  Record each hit in ## Benchmarks with: title, source, URL, one-line key finding.
  Also append to ## Mentions with type Benchmark.

LANE 4 — Strategic Diff vs {user_company} (deeper only):
  Using Lane 1-3 findings + the user's company profile, write:
  ## Comparison vs {user_company}
  - Overlaps: ...
  - Gaps: ...
  - Where they win: ...
  - Where you win: ...
  Also fill the `strategic_diff` frontmatter field with a one-line summary.

HARD TOOL-CALL CAP — count your browse cloud calls and STOP at the cap. Partial output beats blocking the pipeline.
  quick mode:   3 browse cloud calls max per competitor
  deep mode:    8 browse cloud calls max per competitor
  deeper mode:  12 browse cloud calls max per competitor

ENFORCEMENT — at the start of every Bash call, prepend a comment like
  # browse call N/8 (deep mode)
After hitting the cap, write the output file with WHAT YOU HAVE — even if a section is thin.
NEVER do a 9th call in deep mode "to be thorough". The pipeline budgets time on this assumption.

Observed cost of overshoot (Apr 25 search-API run): two lanes hit 29-30 calls each, drove
wall-clock for the whole 30-agent fan-out from 5 min → 12 min. Don't do this.

OUTPUT — write ALL competitor files in a SINGLE Bash call using chained heredocs directly to {OUTPUT_DIR}:

cat << 'COMPETITOR_MD' > {OUTPUT_DIR}/{slug1}.md
---
competitor_name: {name}
website: {url}
tagline: {tagline}
positioning: {positioning}
product_description: {description}
target_customer: {audience}
pricing_model: {model}
pricing_tiers: {tier1} | {tier2} | {tier3}
key_features: {f1} | {f2} | {f3}
integrations: {i1} | {i2}
headquarters: {hq}
founded: {year}
employee_estimate: {estimate}
funding_info: {funding}
strategic_diff: {one line — deeper only}
---

## Product
{paragraph}

## Pricing
{bullets per tier}

## Features
{bullets}

## Positioning
{paragraph}

## Comparison vs {user_company}    ← deeper only
- Overlaps: ...
- Gaps: ...
- Where they win: ...
- Where you win: ...

## Mentions
- **[SourceType]** Title | Snippet (source: URL, YYYY-MM-DD)

## Benchmarks                       ← deeper only
- Title | Source | URL | Key finding

## Research Findings
- **[confidence]** Fact (source: URL)
COMPETITOR_MD
cat << 'COMPETITOR_MD' > {OUTPUT_DIR}/{slug2}.md
...
COMPETITOR_MD

Use 'COMPETITOR_MD' (quoted) as the heredoc delimiter to prevent shell variable expansion.

Report back ONLY: "Batch {batch_id}: {succeeded}/{total} competitors researched, {mentions_count} mentions, {benchmarks_count} benchmarks."
Do NOT return raw data to the main conversation.
```

## Wave Management

### Key Principle: Maximize Parallelism, Minimize Prompts
**Launch ALL subagents needed for a phase in ONE message.** No "up to 6 per message" cap — the Agent tool runs them in parallel, so wall clock = slowest single agent regardless of count. On a 10-competitor × 5-lane = 50-subagent enrichment, splitting into 5 batches of 10 cost an extra 20 minutes of wall clock vs one batch of 50 (measured Apr 2026). Each subagent still MUST batch its own Bash operations into a single call.

### Discovery Phase
- **Run discovery as parallel `browse cloud search` Bash calls, not subagents.** Subagent overhead (cold start + tool reasoning) is bigger than the work. Three Bash tool calls in one message — one per wave (A/B/C) — chain each wave's searches with `&&`.
- Each wave's bash call writes its outputs as `/tmp/competitor_discovery_batch_{wave}{N}.json`
- After all waves complete, run the following in sequence:
  ```bash
  # 1. Dedup URLs from all batches
  node {SKILL_DIR}/scripts/list_urls.mjs /tmp --prefix competitor > /tmp/competitor_urls.txt

  # 2. Extract candidate names from "X vs Y" titles (Wave C output)
  node {SKILL_DIR}/scripts/extract_vs_names.mjs /tmp --prefix competitor \
    --seed "{user_company},{seed1},{seed2},{seed3}" \
    > /tmp/competitor_vs_names.jsonl
  ```
- **Filter URLs**: Remove blog posts, news articles, AI-tool directories (seektool.ai, respan.ai, agentsindex.ai, toolradar.com, aitoolsatlas.ai, aidirectory.com, vibecodedthis.com, aichief.com, openalternative.co, cbinsights.com, saasworthy.com, softwareworld.com), review aggregators (g2.com, capterra.com, trustradius.com), databases (crunchbase.com, tracxn.com), and the user's own domain. Keep only candidate company homepages.
- For names from `extract_vs_names.mjs` that didn't resolve to a domain, optionally run `browse cloud search "{name}" --num-results 3` to resolve the top domain; skip if ambiguous.
- **Merge**: filtered-URL list ∪ resolved `vs_names` domains ∪ user-provided seed URLs. Dedup by hostname into `/tmp/competitor_candidates.txt`.

### User-confirm phase (between gate and enrichment — mandatory)

After the gate writes `/tmp/competitor_gated.jsonl`, the main agent MUST ask the user to confirm the enrichment set before launching subagents. Enrichment is 25 subagents × depth budget per competitor — too expensive to run on guesses.

Present three buckets to the user:
1. **PASS** — status=PASS rows with title
2. **UNKNOWN** — status=UNKNOWN (fetch failed; always a silent miss risk — JS-heavy homepages, Cloudflare challenges)
3. **Rejected-brand matches** — top ~10 REJECT rows whose title contains a seed token or that showed up repeatedly in the Wave C "X vs Y" graph

Then `AskUserQuestion` with a checkbox list + free-text "add more". Write the confirmed set to `/tmp/competitor_enrichment_set.txt` (one URL per line). That file — not `/tmp/competitor_passed.txt` — is the input to the enrichment subagents.

Known gate blind spots to surface aggressively:
- JS-heavy landing pages return near-empty hero text → gate's keyword matcher has nothing to bite on
- Cloudflare challenge titles ("Just a moment...") → obvious false negative
- "Search foundation" / "retrieval backbone" / "agent runtime" — semantic variants of the category don't lexically match
- Apex domain vs product subdomain (e.g. `brave.com` the browser vs `api-dashboard.search.brave.com` the actual API product)

### Gate Phase (between discovery and enrichment)

Drop wrong-category candidates BEFORE enrichment burns tool calls on them.

```bash
cat /tmp/competitor_candidates.txt \
  | node {SKILL_DIR}/scripts/gate_candidates.mjs \
      --include "{category_include_keywords_csv}" \
      --exclude "{exclusion_list_csv}" \
      --concurrency 6 \
  > /tmp/competitor_gated.jsonl

# Extract PASS-only URLs for enrichment
grep '"status":"PASS"' /tmp/competitor_gated.jsonl \
  | node -e 'require("fs").readFileSync(0,"utf-8").split("\n").filter(Boolean).forEach(l => { try { console.log(JSON.parse(l).url); } catch {} })' \
  > /tmp/competitor_passed.txt
```

**Keyword sources**:
- `--include` ← profile's `category_include_keywords` (comma-joined).
- `--exclude` ← profile's `exclusion_list`.

**Gate logic** (position-aware): REJECT if exclude term in `<title>`; PASS if include term in `<title>`; for hybrid titles with both (e.g. "Browser Automation & Web Scraping API"), tiebreak by first 200 chars of hero text; otherwise fall through to hero-wide check. Conservative by default.

**Review the output** — the main agent SHOULD spot-check both lists and MAY manually re-include a REJECT if it recognizes a known direct competitor whose own marketing is category-ambiguous.

**Evaluation on a search-API run** (12 candidates): 7/7 real competitors PASSED; 4/4 wrong-category (vector database, scraping/ETL platform, analytics tool, internal-KB search) REJECTED. One split-identity edge (a search vendor that also sells a scraping suite) rejected — acceptable.

### Enrichment Phase
Two modes:

- **`quick` mode** — single subagent per batch of competitors. Lane A (marketing) only. ~8 competitors per subagent, 2-3 tool calls each. Writes directly to `{OUTPUT_DIR}/{slug}.md`.
- **`deep` / `deeper` modes** — 5-subagent fan-out PER competitor. Each subagent owns ONE lane (marketing / discussion / social / news / technical). Writes to `{OUTPUT_DIR}/partials/{slug}.{lane}.md`. Budget: 5-8 calls per subagent (deep), 10-15 (deeper). After all lanes complete, run `scripts/merge_partials.mjs` to consolidate.
- **Launch ALL competitor × lane subagents in a SINGLE Agent tool message.** For 10 competitors × 5 lanes = 50 parallel agents in one message. Do NOT split into batches — wall clock becomes the slowest single agent (~3-5 min) instead of batches-times-batch-max (~25 min on 10 competitors split into 5 rounds of 10).

### Screenshots Phase (after merge, before compile)

Capture homepage hero screenshot for each competitor:
```bash
node {SKILL_DIR}/scripts/capture_screenshots.mjs {OUTPUT_DIR} --mode remote --concurrency 1
```
Requires the `browse` CLI (`npm install -g browse`). `--mode remote` drives a Browserbase session (the script passes `--remote` on each `browse` command); use `--mode local` for local Chrome. Writes one PNG per competitor to `{OUTPUT_DIR}/screenshots/{slug}-hero.png`. `compile_report.mjs` auto-embeds the hero in the per-competitor HTML page when present.

Cost: ~10-20s per competitor (serial). Total for 5 competitors ≈ 60s.

### Sizing Formula
```
search_queries = ceil(requested_competitors / 20)   # discovery is narrower than lead gen
discovery_subagents = ceil(search_queries / 3)
expected_urls = search_queries * 15

quick:   research_subagents = ceil(expected_urls / 8)
deep:    research_subagents = ceil(expected_urls / 4)
deeper:  research_subagents = ceil(expected_urls / 2)
```

### Error Handling
- If a subagent fails, log and continue with remaining batches
- If >50% of subagents fail in a wave, pause and inform the user
- If `browse cloud fetch --allow-redirects` fails, try `browse open "{url}" --remote` + `browse get markdown` as fallback, or skip that page

## Report Compilation

After all enrichment subagents complete, compile all HTML views in one command:

```bash
node {SKILL_DIR}/scripts/compile_report.mjs {OUTPUT_DIR} --user-company "{user_company}" --open
```

The script:
- Reads all `.md` files in `{OUTPUT_DIR}`
- Parses YAML frontmatter + body sections
- Deduplicates by normalized competitor name
- Generates `{OUTPUT_DIR}/index.html` — overview table (name, tagline, pricing, key features, strategic diff)
- Generates `{OUTPUT_DIR}/competitors/{slug}.html` — per-competitor deep dive
- Generates `{OUTPUT_DIR}/matrix.html` — side-by-side feature/pricing grid across competitors
- Generates `{OUTPUT_DIR}/mentions.html` — chronological feed with source-type pills + client-side filter
- Generates `{OUTPUT_DIR}/results.csv` — flat spreadsheet
- Opens `index.html` in the default browser (`--open` flag)
- Prints a JSON summary to stderr
