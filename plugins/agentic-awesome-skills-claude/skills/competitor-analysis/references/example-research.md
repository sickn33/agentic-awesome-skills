# Example Competitor Research File

## Contents
- [Template](#template) — full worked example for a fictional "Rival Co"
- [Field Rules](#field-rules) — frontmatter fields, body section order, mention/findings format
- [Writing via Bash Heredoc](#writing-via-bash-heredoc) — required pattern for subagents to avoid permission prompts

Each enrichment subagent writes one markdown file per competitor to `{OUTPUT_DIR}/{competitor-slug}.md`, where `{OUTPUT_DIR}` is the per-run Desktop directory set up by the main agent in Step 0 (e.g., `~/Desktop/acme_competitors_2026-04-23/`). The YAML frontmatter contains structured fields for report/matrix compilation. The body contains per-section research plus aggregated mentions and benchmarks.

## Template

```markdown
---
competitor_name: Rival Co
website: https://rivalco.com
tagline: The fastest way to give your agents the web
positioning: Developer-first web search API
product_description: Web search & retrieval API for AI agents and RAG pipelines
target_customer: AI engineers, RAG/agent teams, SaaS companies
pricing_model: Usage-based + seat tiers
pricing_tiers: Free (1K searches) | Pro $99/mo | Scale $499/mo | Enterprise Contact
key_features: web search API | neural/semantic search | site crawler | reranking | live crawl
integrations: LangChain | LlamaIndex | Python SDK | TypeScript SDK
headquarters: San Francisco, CA
founded: 2023
employee_estimate: 11-50
funding_info: Seed, $5M (2024)
strategic_diff: Similar retrieval API; weaker neural relevance, but cheaper entry tier
---

## Product
Web search and retrieval API for AI agents. Exposes a REST search endpoint with both
keyword and semantic/neural modes, plus a site crawler and live-crawl fallback.
Positioned at AI engineers building RAG and agent pipelines.

## Pricing
- Free: 1K searches/month, 1 API key
- Pro ($99/mo): 100K searches, reranking, basic support
- Scale ($499/mo): 1M searches, neural search, live crawl, higher rate limits
- Enterprise: custom pricing, SSO, dedicated support

## Features
- Keyword + neural/semantic search modes
- Site crawler with scheduled recrawls
- Result reranking and content highlights
- Live-crawl fallback for fresh pages
- REST API with JSON responses
- Python and TypeScript SDKs

## Positioning
Marketing emphasizes "AI-native" and developer-first DX. Landing page hero:
"Give your agents the web." Targets solo devs through mid-market AI teams.

## Comparison vs {user_company}
- **Overlaps**: Web search API, neural search mode, crawler, LangChain integration
- **Gaps**: No dedicated research/answer endpoint, weaker neural relevance benchmarks, no news endpoint
- **Where they win**: Lower entry price ($99 vs $199), simpler pricing tiers
- **Where you win**: Stronger neural relevance (per public benchmarks), research API, larger integration ecosystem

## Mentions
- **[Benchmark]** retrieval-quality leaderboard — Rival Co 73% nDCG@10, 4th of 7 tested (source: https://github.com/example-org/search-bench/pull/92, 2026-03-14)
- **[Comparison]** Exa vs Rival Co — side-by-side review (source: https://example.com/exa-vs-rivalco, 2026-02-01)
- **[Reddit]** r/LangChain thread: "Moved from Rival Co to X after relevance issues" — 24 upvotes (source: https://reddit.com/r/LangChain/comments/abc123)
- **[HN]** "Show HN: Rival Co raises seed to build..." — 112 points, 48 comments (source: https://news.ycombinator.com/item?id=12345)
- **[LinkedIn]** CEO post on product launch — 412 reactions (source: https://linkedin.com/posts/rivalco-launch)
- **[YouTube]** "Rival Co vs Exa" review by Dev YouTuber — 8.2K views (source: https://youtube.com/watch?v=xyz)
- **[News]** TechCrunch coverage of seed round (source: https://techcrunch.com/2024/11/rival-co-seed)
- **[Review]** G2 4.3/5 (31 reviews), main complaint: stale results (source: https://g2.com/products/rival-co)

## Benchmarks
- **search-bench PR #92** — Rival Co 73% nDCG@10 on retrieval quality, 4th of 7 tested (https://github.com/example-org/search-bench/pull/92)
- **retrieval-latency blog** — Rival Co 480ms p50, 2nd fastest (https://example.com/search-latency-2026)

## Research Findings
- **[high]** Usage-based pricing starts at $99/mo for 100K searches (source: rivalco.com/pricing)
- **[high]** Series seed, $5M raised Nov 2024 (source: TechCrunch)
- **[medium]** CEO LinkedIn emphasizes AI-agent use cases (source: linkedin.com/in/rivalco-ceo)
- **[low]** Possibly a team under 20 based on careers page (source: rivalco.com/careers)

## Battle Card

### Landmines
- **Rival Co scores 73% nDCG@10 on the search-bench leaderboard (4th of 7 tested)** — use against relevance-sensitive prospects; they rank below Exa on the same test. (source: https://github.com/example-org/search-bench/pull/92)
- **G2 average 4.3/5 with "stale results" as top complaint across 31 reviews** — cite when prospect raises freshness concerns. (source: https://g2.com/products/rival-co)

### Objection Handlers
- If they say: "Rival Co is $99/mo — cheaper than your Pro tier"
  You say: "Cheaper upfront, but compare total cost of poor relevance — their 73% nDCG@10 means more irrelevant results your agent has to filter or re-query, and re-queries aren't free." (evidence: https://github.com/example-org/search-bench/pull/92)

### Talk Tracks
1. For RAG pipelines where relevance drives answer quality, Exa ships a neural index and a dedicated research/answer endpoint as table stakes; Rival Co has neither in their 2024 product set.
```

## Field Rules

- **YAML frontmatter**: All structured fields go here. Extracted for matrix + CSV compilation.
- **`pricing_tiers`**: Pipe-separated (`|`) with tier name + short price. `compile_report.mjs` parses on `|` for the matrix view.
- **`key_features`**, **`integrations`**: Pipe-separated lists.
- **`strategic_diff`**: One-line summary (shown in overview table).
- **Body sections**: `## Product`, `## Pricing`, `## Features`, `## Positioning`, `## Comparison vs {user_company}`, `## Mentions`, `## Benchmarks`, `## Research Findings`, `## Battle Card` (deep/deeper modes only; synthesized by the Battle lane after fact-check).
- **Mentions format**: `- **[SourceType]** title | snippet (source: url, date)` — `SourceType` is one of `Benchmark`, `Comparison`, `News`, `Reddit`, `HN`, `LinkedIn`, `YouTube`, `Review`, `Podcast`, `X`.
- **Findings format**: `- **[confidence]** fact (source: url)` — `confidence` is `high`, `medium`, or `low`.
- **Filename**: `{OUTPUT_DIR}/{competitor-slug}.md` where slug is lowercase, hyphenated.

## Writing via Bash Heredoc

Subagents write these files using bash heredoc to avoid security prompts. Use the full literal `{OUTPUT_DIR}` path — no `~` or `$HOME`:

```bash
cat << 'COMPETITOR_MD' > {OUTPUT_DIR}/rival-co.md
---
competitor_name: Rival Co
website: https://rivalco.com
...
---

## Product
...

## Pricing
...

## Mentions
- **[Benchmark]** ...
COMPETITOR_MD
```

Use `'COMPETITOR_MD'` (quoted) as the delimiter to prevent shell variable expansion.

**IMPORTANT**: Write ALL competitor files in a SINGLE Bash call using chained heredocs to minimize permission prompts.
