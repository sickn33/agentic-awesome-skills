---
name: hugging-face-evaluation
description: Add and manage evaluation results in Hugging Face model cards. Supports extracting eval tables from README content, importing scores from Artificial Analysis API, and running custom model evaluations with vLLM/lighteval. Works with the model-index metadata format.
metadata:
  aas-risk: critical
  aas-source: community
  aas-date-added: '2026-03-06'
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

## Evaluation provenance and publication limits

Importing a number or extracting YAML is not running an evaluation, reproducing a benchmark or establishing leaderboard acceptance. Preserve model revision, task/dataset revision and split, prompt/chat template, shots, decoding parameters, metric definition/scale, date, evaluator version and original source. Never attach another hosted model’s scores to a different downloadable checkpoint merely because names resemble one another. Missing context remains unknown. Separate different benchmark datasets/results rather than putting unrelated scores under one dataset entry.

Check only relevant existing evaluation PRs for duplication; an unrelated open PR does not by itself block legitimate work. Prepare a local diff and publish only to the explicitly authorized repo/branch, preserving unrelated model-card metadata. The helper example ignores readme_content and lacks the described duplicate-PR check; do not treat it as a complete integration. Hardware size tables are rough leads, not memory guarantees, and the shown 70B Llama-3.2 identifier must be resolved against an actual model repository rather than invented. Bound GPU/API cost, execution time, data transfer and code-evaluation sandbox permissions. No dependencies installed, model loaded, job submitted, evaluation run or model card published here.
