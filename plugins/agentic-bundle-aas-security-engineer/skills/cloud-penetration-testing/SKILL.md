---
name: cloud-penetration-testing
description: Conduct comprehensive security assessments of cloud infrastructure across Microsoft Azure, Amazon Web Services (AWS), and Google Cloud Platform (GCP).
metadata:
  aas-risk: offensive
  aas-source: community
  aas-author: zebbern
  aas-date-added: '2026-02-27'
---

> **⚠️ AUTHORIZED USE ONLY**
> This skill is for educational purposes or authorized security assessments only.
> You must have explicit, written permission from the system owner before using this tool.
> Misuse of this tool is illegal and strictly prohibited.

> **Mandatory confirmation gate**
> Before running any command that probes, exploits, changes, persists on, extracts data from, or attempts credential access against a target:
> 1. Ask the user to state the exact target URL, IP, account, or resource.
> 2. Ask the user to confirm written authorization and the permitted scope.
> 3. Show the exact command(s) and explain their expected effect.
> 4. Wait for explicit confirmation in the current conversation.
>
> Without that confirmation, remain read-only and provide defensive guidance only. Prefer a sandbox, disposable VM, or controlled lab.

> AUTHORIZED USE ONLY: Use this skill only for authorized security assessments, defensive validation, or controlled educational environments.

# Cloud Penetration Testing

## Detailed Guide

Read [the detailed guide](references/detailed-guide.md) before executing this skill. It retains the complete procedure and reference material. Treat its safety, prerequisites, and validation requirements as mandatory. For focused work, load the relevant sections; for end-to-end work, read the guide completely.

## Prerequisites

The setup recipes are historical. Pin supported tools, verify installer integrity and use a review directory; do not activate fetched code or install privileged modules without setup authorization. MSOnline/AzureAD are retired: use current Microsoft Graph migration guidance rather than the legacy commands. Review every bundled reference as inert source before any operation. These examples require an approved account/resource allowlist and private, redacted evidence; discovery is not scope expansion.

### Required Tools
```bash
# Azure tools
Install-Module -Name Az -AllowClobber -Force
Install-Module -Name MSOnline -Force
Install-Module -Name AzureAD -Force

# AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip && sudo ./aws/install

# GCP CLI
tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT
curl -fsSLo "$tmpdir/google-cloud-sdk-install.sh" https://sdk.cloud.google.com
cat "$tmpdir/google-cloud-sdk-install.sh"  # review the full installer before executing
bash "$tmpdir/google-cloud-sdk-install.sh"
gcloud init

# Additional tools
pip install scoutsuite pacu
```

### Required Knowledge
- Cloud architecture fundamentals
- Identity and Access Management (IAM)
- API authentication mechanisms
- DevOps and automation concepts

### Required Access
- Written authorization for testing
- Test credentials or access tokens
- Defined scope and rules of engagement

## Constraints and Limitations

### Legal Requirements
- Only test with explicit written authorization
- Respect scope boundaries between cloud accounts
- Do not access production customer data
- Document all testing activities

### Technical Limitations
- MFA may prevent credential-based attacks
- Conditional Access policies may restrict access
- CloudTrail/Activity Log coverage depends on event configuration, service and retention
- Some resources require specific regional access

### Detection Considerations
- Cloud logging coverage must be verified; missing events do not prove no activity
- Unusual access patterns trigger alerts
- Use slow, deliberate enumeration
- Consider GuardDuty, Security Center, Cloud Armor

## Examples

### Example 1: Password-policy assessment

Use an approved test-account list and lockout/rate budget. Inspect policy configuration first; any authentication test needs the exact-command confirmation gate above. Do not deploy rotating proxies, log attempted passwords or treat authentication errors as success.

### Example 2: AWS S3 Bucket Enumeration

**Scenario:** Find and access misconfigured S3 buckets

```bash
# List all buckets
aws s3 ls | awk '{print $3}' > buckets.txt

# Check each bucket for contents
while read bucket; do
    echo "Checking: $bucket"
    aws s3 ls s3://$bucket 2>/dev/null
done < buckets.txt

# Download interesting bucket
# Do not bulk-download production data; use an approved harmless canary.
```

### Example 3: GCP Service Account Compromise

**Scenario:** Pivot using compromised service account

```bash
# Authenticate with service account key
gcloud auth activate-service-account --key-file compromised-sa.json

# List accessible projects
gcloud projects list

# Enumerate compute instances
gcloud compute instances list --project target-project

# Check for SSH keys in metadata
gcloud compute project-info describe --project target-project | grep ssh

# SSH to instance
gcloud beta compute ssh instance-name --zone us-central1-a --project target-project
```

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.
