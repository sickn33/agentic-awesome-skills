---
name: reddit-rules-first
description: "Post to Reddit the way communities accept it: read each subreddit's rules first, one fresh post per community, disclose affiliation, check what stayed up."
category: marketing
risk: safe
source: community
source_repo: amflimited/threadfox-lite
source_type: community
date_added: "2026-09-26"
author: ThreadFox (AMF Indiana)
tags: [reddit, community, marketing, launch, disclosure]
tools: [claude, codex, cursor, gemini]
license: "MIT"
license_source: "https://github.com/amflimited/threadfox-lite/blob/main/LICENSE"
---

# Reddit, rules first

## Overview

Most Reddit promotion fails for the same reasons: the post ignores the community's rules, the same text goes to many subreddits, or nobody checks whether it was removed. This skill gives an agent a short, repeatable workflow for sharing, launching or promoting something on Reddit in a way communities accept. It is adapted from the `reddit-rules-first` skill in [amflimited/threadfox-lite](https://github.com/amflimited/threadfox-lite) (MIT).

## When to Use This Skill

- Use when the user asks the agent to share, launch or promote a product, project or post on Reddit.
- Use when choosing which subreddits to post in.
- Use when a Reddit post was removed and the user wants to know what to do next.

## How It Works

### Step 1: Pick communities by fit

Choose communities where the product answers a question people there already ask. Fit comes before size.

### Step 2: Read each community's rules the day you post

Open `https://www.reddit.com/r/<name>/about/rules` and the sidebar. Look for self-promotion limits (for example a 10% rule), a weekly promo thread, required flair, link bans, and account age or karma minimums. If self-promotion isn't allowed, use the promo thread or don't post the link.

### Step 3: Write for each community

Write a new title and body for each community; never paste the same post twice. Say it's yours in the first lines ("I built this", "I'm with the team"). Lead with something useful on its own (what you learned, real numbers, a how-to); the link is the footnote.

### Step 4: Post slowly and stay

Space posts out: minutes between them, never a burst of communities in one hour. Stay for the comments and answer real questions in the first few hours.

### Step 5: Check what stayed up

Check at 1, 6 and 24 hours whether each post is still up. If a community removes you twice, stop posting there. Don't repost removed content.

## Examples

### Example 1: Launching a side project

User: "Post my new budgeting app to Reddit."
Agent: shortlists r/personalfinance-style communities where people ask for budgeting tools, reads each one's rules, finds that two allow self-promotion only in a weekly thread, writes a distinct post for the one that allows launches, discloses "I built this", and schedules the rest for the promo threads.

### Example 2: A removed post

User: "My post in r/SideProject disappeared."
Agent: rereads the rules, checks whether the post is removed or only hidden, and recommends not reposting the same content; if it was a first removal, it adjusts the next post to the rule that was missed.

## Best Practices

- ✅ Read the rules on the day you post; they change.
- ✅ Disclose affiliation in the first lines.
- ✅ One fresh post per community.
- ❌ Don't cross-post identical text to many subreddits.
- ❌ Don't repost removed content or keep posting after two removals.

## Limitations

- This skill is guidance; it does not read Reddit or post by itself. The optional ThreadFox Lite MCP server (same source repo) adds read-only tools for rules, community search, account standing and post status.
- Community rules and Reddit's site-wide policies take precedence over anything here.
