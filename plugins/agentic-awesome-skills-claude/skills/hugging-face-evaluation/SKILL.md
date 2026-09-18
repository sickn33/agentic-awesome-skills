---
name: hugging-face-evaluation
description: Add and manage evaluation results in Hugging Face model cards. Supports extracting eval tables from README content, importing scores from Artificial Analysis API, and running custom model evaluations with vLLM/lighteval. Works with the model-index metadata format.
risk: critical
source: community
date_added: "2026-09-04"
---

# Overview
This skill provides tools to add structured evaluation results to Hugging Face model cards. It supports multiple methods for adding evaluation data:
- Extracting existing evaluation tables from README content
- Importing benchmark scores from Artificial Analysis
- Running custom model evaluations with vLLM or accelerate backends (lighteval/inspect-ai)

## Detailed Guide

Read [the detailed guide](references/detailed-guide.md) before executing this skill. It retains the complete procedure and reference material. Treat its safety, prerequisites, and validation requirements as mandatory. For focused work, load the relevant sections; for end-to-end work, read the guide completely.

## When to Use
- You need to add structured evaluation results to a Hugging Face model card.
- You want to import benchmark data or run custom evaluations with vLLM, lighteval, or inspect-ai.
- You are preparing leaderboard-compatible `model-index` metadata for a model release.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
