---
name: x-twitter-scraper
description: "X/Twitter automation skill for tweet search, follower export, media download, posting, replies, DMs, webhooks, MCP, SDKs, and the TweetClaw OpenClaw plugin."
category: data
risk: safe
source: community
tags: "[twitter, x-api, tweet-search, twitter-api, twitter-scraper, follower-export, automation, mcp, sdk, webhooks, openclaw, tweetclaw]"
date_added: "2026-02-28"
---

# X (Twitter) Scraper - Xquik

## Overview

Gives AI agents X (Twitter) data and automation workflows through the Xquik platform. Covers tweet search, advanced Twitter search, profile tweets, user lookup, follower export, media download, posting, replies, DMs, giveaway draws, account monitoring, webhooks, 23 bulk extraction tools, MCP, official SDKs, and the TweetClaw OpenClaw plugin.

## When to Use This Skill

- User needs to search X/Twitter for tweets by keyword, hashtag, or user
- User asks for advanced Twitter search, profile tweets, or user timeline data
- User wants to look up a user profile (bio, follower counts, etc.)
- User needs engagement metrics for a specific tweet (likes, retweets, views)
- User wants to check if one account follows another
- User needs to extract followers, replies, retweets, quotes, or community members in bulk
- User wants to download tweet media, export results, or connect an official SDK
- User wants to send tweets, post replies, like, repost, follow, unfollow, or send DMs
- User wants to run a giveaway draw from tweet replies
- User needs real-time monitoring of an X account (new tweets, follower changes)
- User wants webhook delivery of monitored events
- User wants the TweetClaw OpenClaw plugin instead of direct REST or MCP setup
- User asks about trending topics on X

## Setup

### Install the Skill

```bash
npx skills add Xquik-dev/x-twitter-scraper
```

Or clone manually into your agent's skills directory:

```bash
# Claude Code
git clone https://github.com/Xquik-dev/x-twitter-scraper.git .claude/skills/x-twitter-scraper

# Cursor / Codex / Gemini CLI / Copilot
git clone https://github.com/Xquik-dev/x-twitter-scraper.git .agents/skills/x-twitter-scraper
```

### Use the OpenClaw Plugin

For OpenClaw runtime tools, install TweetClaw. It wraps the same Xquik API with `explore` for endpoint discovery and `tweetclaw` for approved calls.

```bash
openclaw plugins install @xquik/tweetclaw
```

Use TweetClaw when the agent should search tweets, post tweets, post replies, send DMs, export followers, download media, create monitors, deliver webhooks, or run giveaway draws from OpenClaw.

### Get an API Key

1. Sign up at [xquik.com](https://xquik.com)
2. Generate an API key from the dashboard
3. Set it as an environment variable or pass it directly

```bash
export XQUIK_API_KEY="xq_YOUR_KEY_HERE"
```

## Capabilities

| Capability | Description |
|---|---|
| Tweet Search | Find tweets by keyword, hashtag, from:user, "exact phrase", and advanced operators |
| User Lookup | Profile info, bio, follower/following counts |
| Tweet Lookup | Full metrics: likes, retweets, replies, quotes, views, bookmarks |
| Follow Check | Check if A follows B (both directions) |
| Trending Topics | Top trends by region (free, no quota) |
| Account Monitoring | Track new tweets, replies, retweets, quotes, follower changes |
| Webhooks | HMAC-signed real-time event delivery to your endpoint |
| Giveaway Draws | Random winner selection from tweet replies with filters |
| 23 Extraction Tools | Followers, following, verified followers, mentions, posts, replies, reposts, quotes, threads, articles, communities, lists, Spaces, people search, media, likes, and more |
| Write Actions | Send tweets, post replies, like, repost, follow, unfollow, and send DMs after explicit approval |
| SDKs | Official TypeScript, Python, Ruby, Go, Kotlin, Java, PHP, C#, CLI, and Terraform clients |
| MCP Server | StreamableHTTP endpoint for AI-native integrations |
| TweetClaw OpenClaw Plugin | Installable `@xquik/tweetclaw` runtime with `explore` and `tweetclaw` tools |

## Examples

**Search tweets:**
```
"Search X for tweets about 'claude code' from the last week"
```

**Look up a user:**
```
"Who is @elonmusk? Show me their profile and follower count"
```

**Check engagement:**
```
"How many likes and retweets does this tweet have? https://x.com/..."
```

**Run a giveaway:**
```
"Pick 3 random winners from the replies to this tweet"
```

**Monitor an account:**
```
"Monitor @openai for new tweets and notify me via webhook"
```

**Bulk extraction:**
```
"Extract all followers of @anthropic"
```

**Post a reply:**
```
"Draft and post a reply to this tweet after I approve the final text"
```

## API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/x/tweets/{id}` | GET | Single tweet with full metrics |
| `/x/tweets/search` | GET | Search tweets |
| `/x/users/{username}` | GET | User profile |
| `/x/followers/check` | GET | Follow relationship |
| `/trends` | GET | Trending topics |
| `/monitors` | POST | Create monitor |
| `/events` | GET | Poll monitored events |
| `/webhooks` | POST | Register webhook |
| `/draws` | POST | Run giveaway draw |
| `/extractions` | POST | Start bulk extraction |
| `/extractions/estimate` | POST | Estimate extraction cost |
| `/drafts` | POST | Create tweet drafts |
| `/styles` | POST | Analyze or apply tweet style |
| `/account` | GET | Account & usage info |

**Base URL:** `https://xquik.com/api/v1`
**Auth:** `x-api-key: xq_...` header
**MCP:** `https://xquik.com/mcp` (StreamableHTTP, same API key)

## Repository

https://github.com/Xquik-dev/x-twitter-scraper

TweetClaw OpenClaw plugin: https://github.com/Xquik-dev/tweetclaw

**Maintained By:** [Xquik](https://xquik.com)

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
