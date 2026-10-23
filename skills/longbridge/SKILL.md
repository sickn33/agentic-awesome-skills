---
name: longbridge
description: "Guide to using a separately installed Longbridge integration — real-time quotes, charts, fundamentals, portfolio analysis, options, and more for HK/US/A-share/SG markets. Trilingual: Simplified Chinese, Traditional Chinese, English."
category: finance
risk: critical
source: official
source_repo: longbridge/skills
source_type: official
date_added: "2026-05-29"
author: longbridge
tags: [finance, stocks, trading, portfolio, market-data]
tools: [claude, cursor, gemini, codex]
license: "MIT"
license_source: "https://github.com/longbridge/skills/blob/main/LICENSE"
plugin:
  targets:
    codex: blocked
    claude: blocked
---

# Longbridge

## Overview

Longbridge is the official skill collection for Longbridge Securities, covering a separately maintained set of skills across real-time market data, chart analysis, company fundamentals, portfolio management, options, sector screening, and more. Supports HK, US, A-share (SH/SZ), and SG markets. All skills are trilingual (Simplified Chinese / Traditional Chinese / English).

Source repository: [github.com/longbridge/skills](https://github.com/longbridge/skills) (verify the selected revision and license)

## When to Use This Skill

- Use when the user asks about stock prices, charts, or market data for HK/US/A-share/SG markets
- Use when the user wants company fundamentals, earnings, or analyst ratings
- Use when the user asks about their portfolio, positions, or account P&L via Longbridge
- Use when the user wants options analysis, sector rankings, capital flow, or news
- Use when the user asks in Chinese (Simplified or Traditional) or English about any securities topic

## Scope and data verification

AAS bundles this guide only, not the upstream collection or CLI. Inspect the actual installed version/tool schemas and current data entitlements. Verify market, exchange, currency, timestamp, delay and corporate-action adjustments; broad language support does not establish symbol coverage. Use existing scoped credentials. Reading a portfolio does not authorize orders, watchlist changes, transfers or broader trading permissions. Keep account data private and do not send it to another provider without consent.

## How It Works

### Step 1: Discover the Right Subcommand

```bash
longbridge --help
```

List all available subcommands. Never hard-code subcommand names — the CLI evolves.

### Step 2: Check Subcommand Options

```bash
longbridge <subcommand> --help
```

Confirm flags and output format before calling.

### Step 3: Call with JSON Output

```bash
longbridge <subcommand> --format json
```

Parse the structured output and render in the user's language (detect from input).

## Authentication

```bash
longbridge auth login          # Basic market data (read-only)
longbridge auth login --trade  # Portfolio and account features
```

## Install

```bash
# Claude Code plugin marketplace
/plugin marketplace add longbridge/skills

# Or via npx
npx skills add https://github.com/longbridge/skills
```

## MCP Fallback

If the `longbridge` CLI binary is not installed, fall back to MCP tools. Inspect available MCP tools at runtime — do not hard-code MCP tool names as they change with server versions.

## Limitations

- Portfolio and account features require login with Trade scope.
- Real-time data is subject to Longbridge data subscription (delayed data available without subscription).
- Crypto symbols use `.HAS` suffix on the Longbridge platform.
- The default task is read-only. A trade-capable token is not authorization to place an order; exact account, instrument, side, quantity, order terms and costs require an explicit authorized action and timeout reconciliation.

## Security & Safety Notes

- Inspect the actual command schema and effects before execution. Data retrieval may use network requests, rate limits and paid entitlements even when it does not mutate an account.
- Require an authorized preview and confirmation for watchlist or order mutations; do not assume the installed integration enforces a two-step protocol.
- Use the installed auth system and verify its credential storage. This guide does not establish how a separate CLI stores or transmits tokens.
