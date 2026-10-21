---
name: build
argument-hint: "[subcommand] [name]"
metadata:
  author: Shpigford
  version: "1.0"
description: "Use when developing a major feature: research the project, create a phased implementation plan, track progress and verify phase outcomes before declaring completion."
risk: critical
source: community
date_added: "2026-03-06"
---


Feature development pipeline - research, plan, track, and implement major features.

## Detailed Guide

Read [the detailed guide](references/detailed-guide.md) before executing this skill. It retains the complete procedure and reference material. Treat its safety, prerequisites, and validation requirements as mandatory. For focused work, load the relevant sections; for end-to-end work, read the guide completely.

## When to Use
- You need a structured workflow for building a major feature across research, planning, implementation, and tracking.
- The task involves moving a feature through named phases such as `research`, `implementation`, `progress`, or `phase`.
- You want one command to coordinate status, next steps, and phased delivery for a feature effort.

## Example

Input: `/build status export-csv` for an authorized project whose implementation
plan exists but whose CSV encoding test is still failing. Output: implementation
in progress, failed encoding test and the next repair step; the presence of three
planning files does not justify claiming the feature is complete. With no slash
command support, interpret “show the status of export-csv” the same way.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Validate feature IDs and destination containment before writing. Host-specific command and question tools are optional interfaces, not prerequisites.
- Read-only status/research does not authorize deployment; existing plans and unrelated work must be preserved.
