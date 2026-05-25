---
name: socialclaw
description: "Agent-first social media publishing skill — schedule and publish posts across 13 platforms (X, LinkedIn, Instagram, Facebook Pages, TikTok, Discord, Telegram, YouTube, Reddit, WordPress, Pinterest) via a single workspace API key."
category: marketing
risk: safe
source: community
source_repo: ndesv21/socialclaw
source_type: community
date_added: "2026-05-25"
author: ndesv21
tags: [social-media, publishing, scheduling, marketing, twitter, linkedin, instagram, tiktok, discord, telegram, reddit, wordpress, pinterest]
tools: [claude]
---

# SocialClaw — Social Media Publisher

## Overview

SocialClaw is an agent-first social media publishing skill that lets you schedule and publish posts across 13 platforms using a single workspace API key. No per-platform OAuth setup required — one key covers everything.

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
