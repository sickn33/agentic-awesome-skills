---
name: news-sentiment-engine
description: Multi-source RSS news aggregation with Claude-powered sentiment analysis and structured briefing output
category: research
risk: safe
source: community
source_repo: tellmefrankie/news-engine
source_type: community
date_added: "2026-05-13"
author: tellmefrankie
tags: [news, rss, sentiment-analysis, briefing, research]
tools: [claude, websearch]
---
# News Sentiment Engine (Free)

Collect and analyze AI/tech news from multiple sources with Claude-powered sentiment analysis. Open source lite version.

## When to Use

- Use when preparing a concise AI or technology news briefing from multiple RSS sources.
- Use when you need ranked article summaries with sentiment, tags, and impact scoring.
- Use when monitoring industry changes across product launches, policy moves, and infrastructure shifts.
- Use when deduplicating overlapping coverage before writing a daily or weekly briefing.

## What it does

- Collects news from 4+ RSS feeds (TechCrunch, The Verge, Ars Technica, Hacker News)
- Deduplicates articles across sources
- Ranks by importance (industry impact, technology trends, policy changes)
- Generates structured briefing with sentiment tags
- Outputs formatted briefing card

## Usage

```
Collect latest AI/tech news from RSS feeds.
Rank top 5 by importance to the tech industry.
For each: summary (2-3 sentences), sentiment (positive/negative/neutral),
impact score (1-5), industry tags, one-sentence commentary.
Output as a structured briefing card.
```

## Example Output

```
AI/Tech News Briefing — 2026-05-13

1. OpenAI announces GPT-5 with 2M context window
   Source: TechCrunch | Impact: 5/5
   Tags: #AI #LLM #OpenAI
   Sentiment: Positive

   Summary: OpenAI unveiled GPT-5 with a 2M token context window and
   improved reasoning. Enterprise pricing starts at $0.03/1k tokens.

   Commentary: Direct competitive pressure on Anthropic Claude 3.5.
   Enterprise deals may shift in H2 2026.

2. EU AI Act enforcement begins for high-risk systems
   Source: The Verge | Impact: 4/5
   Tags: #Regulation #EU #Compliance
   Sentiment: Neutral
```

## Output Format

For each article:
- Title + source + publish date
- Summary (2-3 sentences)
- Industry tags: [AI, Semiconductor, Cloud, etc.]
- Sentiment: Positive/Negative/Neutral
- Impact score: 1-5
- Commentary: 1-sentence industry perspective

## Setup

```bash
git clone https://github.com/tellmefrankie/news-engine
cd news-engine
pnpm install
cp .env.example .env
# Requires: ANTHROPIC_API_KEY
pnpm dev -- --collect-only
```

No paid APIs required for free tier. Anthropic API key only.

## Limitations

- RSS feeds can lag, disappear, throttle, or duplicate syndicated coverage.
- Sentiment and impact scores are briefing aids, not authoritative market or policy analysis.
- The example setup runs third-party code; review the repository and environment variables before use.
- Outputs should be cross-checked against original article sources before publication or investment use.

## Pro Version

Free tier covers news collection and basic analysis.

**Full bundle — $29 one-time**: Investment-grade analysis (portfolio impact scoring, options flow correlation, earnings catalyst detection), Telegram auto-delivery.
→ https://jaehyunpark.gumroad.com/l/tcyahy

## Author

Core module from a production news analysis engine processing 50+ articles daily since 2026.
