---
id: 'wiki-changelog'
name: wiki-changelog
description: "Generate structured changelogs from git history. Use when user asks \"what changed recently\", \"generate a changelog\", \"summarize commits\" or user wants to understand recent development activity."
risk: critical
source: community
date_added: "2026-02-27"
category: 'devops'
tags:
- ai
- ci
- docs
- git
- migration
- readme
tools:
- claude-code
author: 'emanueleodierna'
---

# Wiki Changelog

Generate structured changelogs from git history.

## When to Use
- User asks "what changed recently", "generate a changelog", "summarize commits"
- User wants to understand recent development activity

## Procedure

1. Examine git log (commits, dates, authors, messages)
2. Group by time period: daily (last 7 days), weekly (older)
3. Classify each commit: Features (🆕), Fixes (🐛), Refactoring (🔄), Docs (📝), Config (🔧), Dependencies (📦), Breaking (⚠️)
4. Generate concise user-facing descriptions using project terminology

## Constraints

- Focus on user-facing changes
- Merge related commits into coherent descriptions
- Use project terminology from README
- Highlight breaking changes prominently with migration notes

### When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Examples

### Example 1: Set up a GitHub Actions CI pipeline

Create `.github/workflows/ci.yml` that runs lint, tests, and Docker build on every pull request.

### Example 2: Dockerize a Python FastAPI app

Write a multi-stage `Dockerfile` with a slim base image and a `docker-compose.yml` for local development.

