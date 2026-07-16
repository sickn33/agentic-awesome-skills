# Competitor Analysis — Research Patterns

## Contents
- [Overview](#overview) — two research contexts (self vs target)
- [Self-Research (User's Company)](#self-research-users-company) — sub-questions, page discovery, synthesis output (precise_category, include keywords, exclusion list)
- [Competitor Research — 4 Research Lanes](#competitor-research--4-research-lanes) — Marketing / External / Benchmarks / Strategic Diff
- [Depth Mode Behavior](#depth-mode-behavior) — quick / deep / deeper budgets and scope
- [Finding Format (per lane)](#finding-format-per-lane) — JSON shape, confidence levels
- [Research Loop Rules](#research-loop-rules) — 7 meta-rules for the research phase
- [Synthesis Instructions](#synthesis-instructions) — turn findings into matrix cells

## Overview

Two research contexts:
1. **Self-Research** (Step 1) — Deep research on the user's company so we know what "competitor" means for this run.
2. **Competitor Research** (Step 4) — For each discovered/seeded competitor, run the 4-lane enrichment below.

Both use the Plan → Research → Synthesize pattern. Self-research is identical in shape to the one in `company-research`, so profiles can be reused across skills.

## Self-Research (User's Company)

### Sub-Questions
- "What does {company} sell and what specific problem does it solve?"
- "Who are {company}'s existing customers? What industries, company sizes, use cases?"
- "Who are {company}'s known competitors? What category do they compete in?"
- "What pricing model does {company} use?"
- "What features, integrations, and differentiators does {company}'s marketing emphasize?"

### Page Discovery
Dynamic via sitemap — do NOT hardcode `/about` or `/pricing`:
1. `browse cloud fetch --allow-redirects "{company website}/sitemap.xml"` — primary source
2. Scan for URLs with keywords: `pricing`, `customer`, `compare`, `vs`, `about`, `features`, `integrations`
3. Optionally fetch `/llms.txt` for page descriptions
4. Pick 3-5 most relevant URLs

### External Research
- `browse cloud search "{company} alternatives competitors vs"`
- `browse cloud search "{company} review comparison"`
- Fetch 1-2 most informative third-party pages

### Synthesis Output
Produce a profile with:
- **Company**, **Product**, **Existing Customers**, **Competitors** (seed list), **Use Cases**
- **precise_category** — one clear sentence that describes what category this product competes in. Avoid fuzzy words like "tools" or "platform". Good: "AI web search API for agents with neural + keyword retrieval". Bad: "search tools". This becomes the anchor for discovery queries and the gate.
- **category_include_keywords** — 8-15 phrases that a *direct competitor's* marketing would very likely contain (title or hero). Include semantic variants. e.g. for Exa: `web search api`, `search api`, `neural search`, `semantic search`, `retrieval api`, `search for ai agents`, `search for llms`, `serp api`, `embeddings search`, `live crawling`, `answer api`, `research api`.
- **exclusion_list** — phrases that indicate a *different* category, used by the gate to reject false positives. e.g. `vector database`, `enterprise search appliance`, `site search widget`, `observability`, `analytics platform`, `data warehouse`, `scraping platform` (full ETL/scraping suites, not retrieval APIs), `internal knowledge base`.

The same `profiles/{company-slug}.json` shape used by `company-research`, extended with the three new fields. The `competitors` array becomes the seed list and the first inputs to the comparison-graph expansion in Step 3.

---

## Competitor Research — 4 Research Lanes

For each competitor, run these four lanes (depth-gated):

### Lane 1 — Marketing Surface (ALL depth modes)
Goal: extract what the competitor says about themselves from their own site.

**Sub-questions**:
- "What does {competitor} sell, who is it for, and how is it positioned?"
- "What are {competitor}'s pricing tiers and pricing model?"
- "What key features, integrations, and platforms does {competitor} list?"

**Pages to fetch** (via sitemap discovery — do NOT hardcode):
1. Homepage
2. `/pricing` (or equivalent from sitemap)
3. `/features`, `/product`, `/platform`, `/solutions`
4. `/integrations`, `/customers`, `/case-studies`

**Extract into frontmatter fields**: `tagline`, `positioning`, `product_description`, `target_customer`, `pricing_model`, `pricing_tiers`, `key_features`, `integrations`.

### Lane 2 — External Signal (deep + deeper)
Goal: what the rest of the internet says about them.

**Sub-questions**:
- "What third-party comparison pages mention {competitor}?"
- "What do users say on Reddit, HN, G2, Capterra?"
- "What recent news, launches, or announcements?"
- "Who is talking about them on LinkedIn or YouTube?"

**Search queries**:
```
"{competitor} vs"
"{competitor} alternatives"
"{competitor} review"
"{competitor} G2" / "{competitor} Capterra"
"site:reddit.com {competitor}"
"site:news.ycombinator.com {competitor}"
"site:linkedin.com/posts {competitor}"
"site:youtube.com {competitor}"
"{competitor} launch 2025 OR 2026"
"{competitor} funding announcement"
```

**Extraction rule**: From search results, harvest each hit as a `Mentions` entry. Classify source type from the URL:
- `reddit.com` → `Reddit`
- `news.ycombinator.com` → `HN`
- `linkedin.com` → `LinkedIn`
- `youtube.com` / `youtu.be` → `YouTube`
- `g2.com` / `capterra.com` / `trustradius.com` → `Review`
- `*vs*` in path or title → `Comparison`
- news domains (techcrunch, theverge, venturebeat, forbes, businesswire, globenewswire) → `News`
- `twitter.com` / `x.com` → `X`
- `spotify.com/episode` / transistor/simplecast → `Podcast`

For LinkedIn and YouTube, the snippet + URL from `browse cloud search` is enough. Do NOT try to deep-fetch individual LinkedIn posts (auth walls) — list them with title/snippet.

### Lane 3 — Public Benchmarks (deeper only)
Goal: find third-party benchmarks that measured this competitor's product.

**Sub-questions**:
- "Has {competitor} been included in any public benchmark?"
- "Are there GitHub repos, PRs, or blog posts comparing {competitor} head-to-head on a measured axis (speed, accuracy, cost, pass rate)?"

**Search queries**:
```
"{competitor} benchmark"
"{competitor} performance test"
"site:github.com {competitor} benchmark"
"site:github.com {competitor} vs"
"{competitor} vs {seed_competitor} benchmark"   # pairwise, use another known competitor as the seed
"{category} benchmark {competitor}"             # e.g. "web search api benchmark {competitor}"
```

**Extraction**: Add each hit to `Benchmarks` section with: title, source, URL, key finding (one line). Also mirror into `Mentions` with type `Benchmark`.

**Known benchmark repos to check directly** (if domain is on-topic):
- Public retrieval-quality leaderboards (e.g. BEIR / MTEB-style repos) when a vendor publishes scores
- Category-specific benchmark repos discovered via the first search wave

### Lane 4 — Strategic Diff vs User's Company (deeper only)
Goal: explicitly compare this competitor to the user's company.

**Inputs**: `{user_company_profile}` (from Step 1) — specifically `product`, `use_cases`, `key_features` if available.

**Sub-questions**:
- "What features does {competitor} have that {user_company} does not?"
- "What features does {user_company} have that {competitor} does not?"
- "Who does {competitor} serve that {user_company} does not (and vice versa)?"
- "Where does each one win on the marketing surface (price, feature depth, DX, ecosystem)?"

**No new fetches required** for this lane — it's a synthesis step over Lane 1 + 2 + 3 findings plus the user's profile. Write as:

```markdown
## Comparison vs {user_company}
- **Overlaps**: ...
- **Gaps**: ...
- **Where they win**: ...
- **Where you win**: ...
```

Also populate the `strategic_diff` frontmatter field with a one-line summary for the overview table.

---

## Depth Mode Behavior

### Quick Mode (~lots of competitors, cheap)
- **Lanes**: 1 only
- **Budget**: 2-3 tool calls per competitor (homepage + pricing page)
- **Fields populated**: tagline, product_description, pricing_tiers, key_features
- **Mentions / Benchmarks / Comparison**: skipped

### Deep Mode (balanced, default)
- **Lanes**: 1 + 2
- **Budget**: 5-8 tool calls per competitor
- **Everything in quick** + 5-10 mentions across source types

### Deeper Mode (full intel)
- **Lanes**: 1 + 2 + 3 + 4
- **Budget**: 10-15 tool calls per competitor
- **Everything in deep** + benchmarks section + strategic diff section

---

## Finding Format (per lane)

Every finding is a factual statement tied to a source:

```json
{
  "lane": "marketing | external | benchmark | strategic",
  "fact": "Rival Co charges $99/mo for 10K search requests",
  "sourceUrl": "https://rivalco.com/pricing",
  "confidence": "high"
}
```

**Confidence**:
- `high`: Directly stated on the competitor's own website or official press
- `medium`: Inferred from third-party articles, reviews, or job posts
- `low`: Speculative / outdated sources

## Research Loop Rules

1. **Lane 1 first** — always start with the competitor's own site
2. **Use sitemap, not hardcoded paths** — `/pricing` might be `/plans` or `/pricing-plans`
3. **Rephrase, don't retry** — if a search returns generic junk, switch keywords
4. **Fetch selectively** — pick the 1-2 most promising URLs per query
5. **For LinkedIn/YouTube: search only, don't fetch** — snippet is enough, avoid auth walls
6. **Respect step budget** per depth mode
7. **Deduplicate mentions** — same URL should only appear once in `## Mentions`

## Synthesis Instructions

After the research loop completes for a competitor:

1. Fill frontmatter fields from Lane 1 findings
2. Write body sections: Product, Pricing, Features, Positioning (all from Lane 1)
3. Append `## Mentions` from Lane 2 classified hits
4. Append `## Benchmarks` from Lane 3 (deeper only)
5. Append `## Comparison vs {user_company}` from Lane 4 synthesis (deeper only)
6. Append `## Research Findings` as a raw-findings appendix with confidence tags

No ICP score. No threat score. Pure intel.

If a field has no supporting findings, leave it empty rather than guessing.
