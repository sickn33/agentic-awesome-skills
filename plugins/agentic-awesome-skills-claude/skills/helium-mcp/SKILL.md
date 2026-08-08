---
name: helium-mcp
description: "Connect to Helium's MCP server for news research, media bias analysis, balanced perspectives, stock/options data, and semantic meme search across 3.2M+ articles and 5,000+ sources"
risk: safe
source: "https://heliumtrades.com/mcp-page/"
source_repo: connerlambden/helium-mcp
source_type: community
date_added: "2026-04-13"
author: connerlambden
tags: [mcp, news, media-bias, stocks, options, finance, research]
tools: [claude, cursor, gemini]
---

# Helium MCP

## Overview

Helium MCP provides AI coding assistants with access to news intelligence, media bias analysis, financial market data, and meme search through 9 tools exposed via the Model Context Protocol. It covers 3.2M+ articles from 5,000+ news sources with 15+ bias dimensions, live stock/ETF/crypto data with AI-generated analysis, and ML-predicted options pricing.

## When to Use This Skill

- Use when you need to search or analyze news articles with bias-aware context
- Use when researching media bias for a specific source or article URL
- Use when you want balanced left/right/center perspectives on a topic
- Use when looking up live stock, ETF, or crypto data with AI bull/bear cases
- Use when pricing options or evaluating trading strategies
- Use when searching for memes by semantic meaning

## MCP Configuration

Add the Helium MCP server to your client configuration. The endpoint uses streamable HTTP and requires no authentication.

### Claude Desktop / Cursor / Windsurf

```json
{
  "mcpServers": {
    "helium": {
      "url": "https://heliumtrades.com/mcp"
    }
  }
}
```

No API key or authentication is required.

## Available Tools

### News & Media Bias

#### `search_news`
Search 3.2M+ articles from 5,000+ sources with 15+ bias dimensions. Filter by topic, source, date range, and bias attributes.

```
search_news({ query: "artificial intelligence regulation" })
```

#### `search_balanced_news`
Get AI-synthesized balanced articles presenting left, right, and center perspectives on any topic.

```
search_balanced_news({ query: "immigration policy" })
```

#### `get_source_bias`
Retrieve the detailed bias profile for any news source, including political lean, factual reporting score, and 15+ bias dimensions.

```
get_source_bias({ source: "reuters" })
```

#### `get_all_source_biases`
Get bias data for all 5,000+ tracked news sources in a single call.

```
get_all_source_biases()
```

#### `get_bias_from_url`
Run a full bias analysis on a specific article URL, returning the source bias profile and article-level bias indicators.

```
get_bias_from_url({ url: "https://example.com/article" })
```

### Finance & Markets

#### `get_ticker`
Get live stock, ETF, or crypto data including price, volume, AI-generated bull/bear cases, and forecasts.

```
get_ticker({ ticker: "AAPL" })
```

#### `get_option_price`
Get ML-predicted fair value and probability of finishing in-the-money for a specific options contract.

```
get_option_price({ ticker: "AAPL", strike: 200, expiration: "2026-06-19", type: "call" })
```

#### `get_top_trading_strategies`
Get top-ranked options strategies for a ticker with risk/reward analysis.

```
get_top_trading_strategies({ ticker: "TSLA" })
```

### Memes

#### `search_memes`
Semantic meme search — find memes by meaning rather than exact keywords.

```
search_memes({ query: "debugging at 3am" })
```

## Examples

### Example 1: Balanced News Research

Ask your AI assistant:

> "Search for balanced news coverage on climate policy and show me how left, right, and center sources frame the issue differently."

The assistant will call `search_balanced_news` and present synthesized perspectives from across the political spectrum.

### Example 2: Source Credibility Check

> "What is the media bias profile for The New York Times?"

The assistant will call `get_source_bias` and return the full bias breakdown including political lean, factual reporting, and other dimensions.

### Example 3: Stock Research with Options

> "Give me the bull and bear case for NVDA, then find the best options strategies."

The assistant will call `get_ticker` for market data and AI analysis, then `get_top_trading_strategies` for ranked strategy recommendations.

### Example 4: Article Bias Analysis

> "Analyze the bias of this article: https://example.com/politics/story"

The assistant will call `get_bias_from_url` to return source-level and article-level bias indicators.

## Best Practices

- **Start broad, then narrow:** Use `search_news` for discovery, then `get_bias_from_url` for deep analysis on specific articles
- **Cross-reference perspectives:** Combine `search_balanced_news` with `get_source_bias` to understand why sources frame topics differently
- **Pair market tools:** Use `get_ticker` for the fundamental view, then `get_option_price` or `get_top_trading_strategies` for actionable trades
- **No auth needed:** The endpoint works immediately with no API keys or setup beyond adding the MCP config

## Common Pitfalls

- **Problem:** Tool calls return empty results for very niche queries
  **Solution:** Broaden the search terms — Helium indexes mainstream and mid-tier sources, so hyper-local topics may have limited coverage

- **Problem:** Options data unavailable for a ticker
  **Solution:** Verify the ticker has listed options — some small-cap stocks and most crypto assets do not have options markets

## Related Skills

- `@mcp-builder` - If you want to build your own MCP server rather than consume this one

## Additional Resources

- [Helium MCP Page](https://heliumtrades.com/mcp-page/)
- [GitHub Repository](https://github.com/connerlambden/helium-mcp)
- [MCP Protocol Specification](https://modelcontextprotocol.io/)

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
