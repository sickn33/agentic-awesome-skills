---
name: taisly-social-media-posting
description: "Use Taisly Agent Kit to prepare and publish approved short-form video posts across TikTok, Instagram Reels, YouTube Shorts, X, and Facebook."
category: marketing
risk: critical
source: community
source_repo: taisly/agent
source_type: community
date_added: "2026-07-07"
author: taisly
tags: [social-media, video, publishing, mcp, cli, sdk, tiktok, instagram, youtube-shorts, x, facebook]
tools: [codex, claude]
license: "MIT"
license_source: "https://github.com/taisly/agent/blob/main/LICENSE"
---

# Taisly Social Media Posting

## Overview

Taisly Agent Kit provides an MCP server, CLI, SDK, and agent docs for publishing
approved short-form videos to TikTok, Instagram Reels, YouTube Shorts, X, and
Facebook. Use this skill to plan a posting workflow around Taisly, verify that
the user has the required account access, and keep publishing actions behind an
explicit confirmation gate.

## When to Use

- Use when the user wants an agent-assisted workflow for publishing short-form
  videos with Taisly.
- Use when the user mentions `taisly/agent`, the Taisly MCP server, Taisly CLI,
  or the Taisly SDK.
- Use when coordinating final approval, caption metadata, target platforms, and
  posting status for social video distribution.

## Workflow

1. Confirm the exact target platforms and video asset paths or URLs.
2. Confirm that the user has already connected the relevant social accounts in
   Taisly or has provided the intended MCP/CLI setup path.
3. Draft or review captions, hashtags, titles, descriptions, and platform
   metadata before any publishing command is run.
4. Present a final posting summary with platforms, media, captions, visibility,
   and timing.
5. Wait for explicit user approval before invoking any Taisly command, MCP tool,
   SDK call, or other state-changing publishing action.

## Examples

```text
Use Taisly to prepare this product demo for TikTok, Reels, Shorts, X, and Facebook.
Review the caption and metadata first; do not publish until I approve.
```

```text
Set up a Taisly MCP publishing workflow for approved video assets in ./campaign.
```

## Safety Notes

- Treat publish, schedule, delete, account-linking, and metadata update actions
  as state-changing operations requiring explicit user approval.
- Never request, print, or store platform passwords, OAuth secrets, API keys, or
  session tokens. Use the user's existing Taisly/MCP/CLI authentication flow.
- If the requested action could violate platform policies, brand review, legal
  constraints, or creator permissions, pause and ask for confirmation.

## Limitations

- Platform availability, media requirements, and API behavior depend on the
  upstream Taisly Agent Kit and connected platform accounts.
- This skill does not replace human review for legal, brand, copyright, or
  platform-compliance decisions.
- Verify the current Taisly setup instructions from `taisly/agent` before
  installing or running tools in a new environment.

## Source

- GitHub: [taisly/agent](https://github.com/taisly/agent)
