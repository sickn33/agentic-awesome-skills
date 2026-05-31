---
name: socialclaw
description: "Agent-first social media publishing skill — schedule and publish posts across 13 platforms (X, LinkedIn, Instagram, Facebook Pages, TikTok, Discord, Telegram, YouTube, Reddit, WordPress, Pinterest) via a single workspace API key."
category: marketing
risk: critical
source: community
source_repo: ndesv21/socialclaw
source_type: community
date_added: "2026-05-25"
author: ndesv21
tags: [social-media, publishing, scheduling, marketing, twitter, linkedin, instagram, tiktok, discord, telegram, reddit, wordpress, pinterest]
tools: [claude]
license: "MIT"
license_source: "https://github.com/ndesv21/socialclaw/blob/main/LICENSE"
plugin:
  targets:
    codex: blocked
    claude: blocked
---

# SocialClaw — Social Media Publisher

## Overview

SocialClaw is an agent-first social media publishing skill that lets you schedule and publish posts across 13 platforms using a single workspace API key. No per-platform OAuth setup required — one key covers everything.

## When to Use

- Use when the user wants to plan, schedule, or publish a social media campaign across multiple platforms.
- Use when the user has a SocialClaw workspace API key and wants one workflow for X, LinkedIn, Instagram, Facebook, TikTok, Discord, Telegram, YouTube, Reddit, WordPress, or Pinterest.
- Use when the user asks for social publishing automation that can validate schedules, attach media, and retrieve post performance metrics.

## Supported Platforms

- X (Twitter)
- LinkedIn (Profile + Page)
- Instagram (Business + Standalone)
- Facebook Pages
- TikTok
- Discord
- Telegram
- YouTube
- Reddit
- WordPress
- Pinterest

## Installation

```bash
npx skills add ndesv21/socialclaw
```

Or install the npm package directly:

```bash
npm install socialclaw@0.1.12
```

## Configuration

Set your workspace API key:

```bash
export SOCIALCLAW_API_KEY=your_workspace_api_key
```

Get your API key at [getsocialclaw.com](https://getsocialclaw.com).

## Workflow

### Step 1: Create a Campaign

Define your campaign with target platforms, content, and schedule.

### Step 2: Upload Media (Optional)

Upload images or videos to attach to posts.

### Step 3: Validate Schedule

Confirm platform-specific timing rules are met (e.g., rate limits, posting windows).

### Step 4: Publish or Schedule

Publish immediately or schedule for a future time across all selected platforms simultaneously.

### Step 5: Analytics

Retrieve post performance metrics after publishing.

## Example Usage

```
/social-publishing

Create a campaign for our product launch:
- Platforms: X, LinkedIn, Instagram
- Message: "Excited to announce our new feature! Check it out at example.com #launch #product"
- Schedule: Tomorrow at 9am PST
```

## Source

GitHub: [ndesv21/socialclaw](https://github.com/ndesv21/socialclaw)
Website: [getsocialclaw.com](https://getsocialclaw.com)

## Limitations

- Requires a valid SocialClaw workspace API key; do not attempt publishing without explicit user-provided credentials.
- Treat every publish, schedule, delete, or account-changing action as state-changing: show the target platforms, content, media, and timing, then wait for explicit user confirmation before calling the service.
- Platform availability, rate limits, analytics fields, and scheduling behavior depend on the upstream SocialClaw service.
- This skill describes the publishing workflow; it does not replace platform-specific compliance, brand review, or legal approval before posting.
