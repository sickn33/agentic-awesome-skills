---
name: seek-and-analyze-video
description: "Seek and analyze video content using Memories.ai Large Visual Memory Model for persistent video intelligence"
category: data-ai
risk: safe
source: "https://github.com/kennyzheng-builds/seek-and-analyze-video"
date_added: "2026-03-09"
author: kennyzheng-builds
tags: [video, ai, memories, social-media, youtube, tiktok, analysis]
tools: [claude, cursor, gemini]
---

## When to Use
Use this skill when the user wants to search for, import, or analyze video content from TikTok, YouTube, or Instagram, summarize meetings or lectures from recordings, build a searchable knowledge base from video content, or research social media trends and creators.

# Seek and Analyze Video

## Description

This skill enables AI agents to search, import, and analyze video content using Memories.ai's Large Visual Memory Model (LVMM). Unlike one-shot video analysis tools, it provides persistent video intelligence -- videos are indexed once and can be queried repeatedly across sessions. Supports social media import (TikTok, YouTube, Instagram), meeting summarization, knowledge base building, and cross-video Q&A via Memory Augmented Generation (MAG).

## Overview

The skill wraps 21 API commands into workflow-oriented reference guides that agents load on demand. A routing table in SKILL.md maps user intent to the right workflow automatically.

## When to Use This Skill

- Use when analyzing or asking questions about a video from a URL
- Use when searching for videos on TikTok, YouTube, or Instagram by topic, hashtag, or creator
- Use when summarizing meetings, lectures, or webinars from recordings
- Use when building a searchable knowledge base from video content and text memories
- Use when researching social media content trends, influencers, or viral patterns
- Use when analyzing or describing images with AI vision

## How It Works

### Step 1: Intent Detection

The agent reads the SKILL.md workflow router and matches the user's request to one of 6 intent categories.

### Step 2: Reference Loading

The agent loads the appropriate reference file (e.g., video_qa.md for video questions, social_research.md for social media research).

### Step 3: Workflow Execution

The agent follows the step-by-step workflow: upload/import -> wait for processing -> analyze/chat -> present results.

## Examples

### Example 1: Video Q&A

```
User: "What are the key arguments in this video? https://youtube.com/watch?v=abc123"
Agent: uploads video -> waits for processing -> uses chat_video to ask questions -> presents structured summary
```

### Example 2: Social Media Research

```
User: "What's trending on TikTok about sustainable fashion?"
Agent: uses search_public to find trending videos -> imports top results -> analyzes content patterns
```

### Example 3: Meeting Notes

```
User: "Summarize this meeting recording and extract action items"
Agent: uploads recording -> waits -> gets transcript -> uses chat_video for structured summary with action items
```

## Best Practices

- Always wait for video processing to complete before querying
- Use caption_video for quick analysis (no upload needed)
- Use chat_video for deep, multi-turn analysis (requires upload)
- Use search_audio to find specific moments or quotes in a video
- Use memory_add to store important findings for later retrieval

## Common Pitfalls

- **Problem:** Querying a video before processing completes
  **Solution:** Always use the `wait` command after upload before any analysis

- **Problem:** Uploading a video when only a quick caption is needed
  **Solution:** Use `caption_video` for one-off analysis; only upload for repeated queries

## Limitations

- Video processing takes 1-5 minutes depending on length
- Free tier limited to 100 credits
- Social media import requires public content
- Audio search only works on processed videos

## Related Skills

- Video analysis tools for one-shot analysis
- Web search skills for non-video content research
