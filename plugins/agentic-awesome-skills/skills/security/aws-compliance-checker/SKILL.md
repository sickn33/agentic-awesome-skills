---
name: aws-compliance-checker
description: "Automated compliance checking against CIS, PCI-DSS, HIPAA, and SOC 2 benchmarks"
category: security
risk: critical
source: community
tags: "[aws, compliance, audit, cis, pci-dss, hipaa, kiro-cli]"
date_added: "2026-02-27"
---

# AWS Compliance Checker

Automated compliance validation against industry standards including CIS AWS Foundations, PCI-DSS, HIPAA, and SOC 2.

## Detailed Guide

Read [the detailed guide](references/detailed-guide.md) before executing this skill. It retains the complete procedure and reference material. Treat its safety, prerequisites, and validation requirements as mandatory. For focused work, load the relevant sections; for end-to-end work, read the guide completely.

## Review scope and execution boundaries

Select the exact account/role, partition, regions and control/framework version before collecting evidence; verify identity with `aws sts get-caller-identity`. Read-only assessment is the default. Commands that create MFA devices, change policies/keys, enable services, rotate secrets or create alarms require an approved change scope and rollback plan. Keep evidence and secret material out of shared logs.

These are partial examples, not certification or complete benchmark implementations. Control numbers are illustrative historical mappings, not a pinned current benchmark. Record PASS/FAIL/UNKNOWN/NOT-APPLICABLE per control with evidence and coverage. AccessDenied, API errors, missing permissions, absent pages and unimplemented checks are UNKNOWN, never PASS. Use paginators for SDK listings and cover all selected regions/accounts; never infer completeness from no findings. Shell snippets require Bash/GNU date, AWS CLI, jq and error checking (`set -euo pipefail` in complete scripts). Generate the IAM credential report first, wait for COMPLETE and decode its base64 Content; parse CSV by header in production. Credential reports are sensitive.

## When to Use
Use this skill when you need to validate AWS compliance against industry standards, prepare for audits, or maintain continuous compliance monitoring.

## Example Prompts

- "Run CIS AWS Foundations compliance check"
- "Generate a PCI-DSS compliance report"
- "Check HIPAA compliance for my AWS account"
- "Audit against SOC 2 requirements"
- "Create a compliance dashboard"

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
