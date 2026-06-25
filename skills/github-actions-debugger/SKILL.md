---
name: github-actions-debugger
description: "Specialized skill for diagnosing, analyzing, and fixing failing GitHub Actions workflows by parsing run logs and pipeline definitions."
category: devops
risk: safe
source: community
source_type: community
date_added: "2026-06-25"
author: Owais
tags: [github-actions, ci-cd, devops, debugging, workflows]
tools: [claude, cursor, gemini, antigravity]
---

# GitHub Actions Pipeline Debugger

## Overview

This skill is designed to act as an expert CI/CD diagnostician. It focuses specifically on reading raw logs from failed GitHub Actions, identifying the root cause of the crash or failure, and outputting the precise YAML or code changes required to fix the pipeline.

## When to Use

- Use when a GitHub Actions workflow fails unexpectedly and the error log is long, obscure, or misleading.
- Use when debugging dependency mismatch errors, missing secrets, caching issues, or runner environment problems in CI.
- Use to optimize slow pipelines by identifying bottlenecks in workflow steps.
- Use to update and modernize deprecated actions or workflow syntax.

## How It Works

1. **Log Ingestion & Redaction:** Analyze the provided GitHub Actions workflow log (often exported as a raw text file or pasted directly). **CRITICAL SAFETY REQUIREMENT:** The user/agent must redact all sensitive credentials, secrets, tokens, private keys, and internal system paths from the logs before pasting or uploading them.
2. **Context Mapping:** Cross-reference the failure point with the specific step and job in the `.github/workflows/*.yml` definition.
3. **Root Cause Analysis:** Identify if the failure is due to:
   - Missing or misconfigured secrets (`${{ secrets.API_KEY }}`).
   - Node/Python/OS environment version mismatches.
   - Flaky tests or timeout limits.
   - Syntax errors in bash scripts run within the `run:` block.
   - Invalid action versions or deprecated actions.
4. **Resolution Proposal:** Provide a direct `diff` of the `.yml` file or the underlying script that needs to be modified.

## Best Practices

- **Provide Full Context:** Always review both the workflow definition (`.yml` file) and the failure log simultaneously to ensure accurate diagnosis.
- **Check Action Versions:** Many failures are caused by deprecated runtime versions (e.g., Node.js 16) in older third-party actions (e.g., `actions/checkout@v2`). Always recommend upgrading to the latest major versions (e.g., `v4`).
- **Permissions Audit:** Ensure the workflow has the correct `permissions:` block if it's attempting to write to the repository, packages, or deploy environments.
- **Reproducibility:** If a test fails in CI but passes locally, investigate environment differences such as timezone, headless browser state, memory limits, or parallel execution race conditions.

## Examples

### Example 1: Fixing a Deprecated Node.js Action Version Error
**Failing Log:**
```text
Warning: The Go/Node.js/Python version used by this action is deprecated.
Error: Node.js 16 actions are deprecated. Please update to use Node.js 20.
```

**Proposed Fix Diff:**
```diff
       - name: Checkout Code
-        uses: actions/checkout@v2
+        uses: actions/checkout@v4
```

### Example 2: Diagnosing and Fixing a Missing Repository Secret
**Failing Log:**
```text
Run npm run deploy
  npm run deploy
  shell: /usr/bin/bash -e {0}
Error: API Key is required for deployment. Process exited with code 1.
```

**Proposed Fix Diff:**
```diff
       - name: Deploy App
         run: npm run deploy
+        env:
+          DEPLOY_API_KEY: ${{ secrets.DEPLOY_API_KEY }}
```

## Security & Safety Notes

- **Credential Exposure**: Never output raw secrets, API tokens, or private keys if they appear in logs. Recommend using masking (`::add-mask::`) or GitHub Secrets environment variables.
- **Dry-Run Mode**: When recommending modifications to bash script steps inside workflows, ensure you suggest adding flags like `--dry-run` or staging execution where possible to prevent unintended side effects in downstream environments during debugging.

## Limitations

- The skill cannot securely read repository secrets. It can only infer missing or malformed secrets if the log complains about undefined environment variables or authentication failures.
- It cannot execute the GitHub action itself to test the fix; validation requires pushing the proposed fix to the repository and triggering a workflow run.
- Network-related transient failures (e.g., a package registry being down temporarily) might be incorrectly diagnosed as structural workflow issues if not carefully analyzed.

## Related Skills

- `@devops-troubleshooter` - General DevOps and infrastructure issue resolution.
- `@cicd-automation-workflow-automate` - For creating new CI/CD pipelines from scratch.
