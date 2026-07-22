---
name: hf-cloud-aws-context-discovery
description: "Discover the effective local AWS profile, region, account, and caller identity before any AWS task without exposing credentials."
risk: safe
source: https://github.com/huggingface/skills/tree/main/skills/hf-cloud-aws-context-discovery
source_repo: huggingface/skills
source_type: official
date_added: "2026-07-21"
author: Hugging Face
license: Apache-2.0
license_source: https://github.com/huggingface/skills/blob/main/LICENSE
tags: [hugging-face, aws, credentials, discovery, cloud]
tools: [claude, codex, cursor]
---

# AWS Context Discovery

Before doing any AWS work, inspect only masked AWS CLI metadata. Don't guess the region, and don't ask the user for things the CLI already answers. Never open or print `~/.aws/credentials`, credential-process output, secret environment variables, access keys, session tokens, or SSO token caches.

## When to Use

- Establish the effective AWS profile, region, account, and caller before AWS work.
- Diagnose expired SSO sessions, missing profiles, or configuration overrides.
- Provide verified context to later SageMaker planning and deployment skills.

## What to discover

Run these at the start of the AWS work and remember the results for the rest of the session.

### 1. Active profile

Use a profile the user explicitly named, otherwise use the profile identified by masked AWS CLI metadata. If the named profile is absent from `aws configure list-profiles`, surface that clearly.

### 2. Region

Resolution order — stop at the first one that produces a value:
1. Region the user explicitly named in this conversation
2. Region reported by `aws configure list --profile "$profile"`
3. Region reported by `aws configure get region --profile "$profile"`
5. Ask the user — but only after the first four have failed

Do not fall back to `us-east-1` or any other hardcoded default.

### 3. Credentials, account ID, caller ARN

```bash
aws sts get-caller-identity --profile "$profile" --region "$region"
```

Three purposes in one call: confirms credentials are valid (stop if not), returns the `Account` ID (needed for ARN construction), returns the `Arn` of the caller.

### 4. Identify SSO / assumed-role principals

The `Arn` field tells you what kind of principal this is. The pattern matters because it determines what IAM operations the caller can do.

| ARN pattern | Type | IAM write capability |
|---|---|---|
| `arn:aws:iam::<acct>:user/<name>` | IAM user | Depends on attached policies |
| `arn:aws:sts::<acct>:assumed-role/AWSReservedSSO_<...>/<email>` | **SSO assumed-role** | Typically **none** — can't create/modify IAM roles |
| `arn:aws:sts::<acct>:assumed-role/<role>/<session>` | Regular assumed-role | Depends on the role |

**If the caller is SSO**, surface this immediately before later skills hit `iam:CreateRole` and fail:

> Heads up: you're authenticated via SSO (`AWSReservedSSO_<PermissionSet>_...`). SSO principals usually can't create IAM roles directly. If we need a SageMaker execution role, I'll look for an existing one first — if none exists, you'll need to ask whoever manages your AWS access to create one.

This is the highest-leverage thing this skill does. Surfacing it now turns a confusing mid-deployment error into a five-second conversation.

## Commands to run

```bash
# Profiles and masked effective metadata; never read credential files directly
aws configure list-profiles
aws configure list --profile "$profile"
aws configure get region --profile "$profile"

# Validate credentials and get identity
aws sts get-caller-identity --profile "$profile" --region "$region"
```

`aws configure list` masks credential values and identifies their source. Use these metadata commands instead of parsing AWS files or inspecting secret-bearing environment variables. If the CLI cannot resolve a profile or region without exposing credentials, stop and ask the user for the non-secret profile or region value.

## What to report back

One or two lines, not a wall of text:

> Working with profile `my-profile` in `eu-west-1`, account `123456789012`. You're authenticated via SSO, so we'll need to use an existing IAM role rather than create one.

Don't ask the user to confirm the region you just read from their config — they configured it; that is the confirmation.

If something is wrong (credentials expired, profile doesn't exist, no region anywhere), stop and surface the specific error before continuing.

## Limitations

- Discovery may reveal account IDs, role ARNs, or profile names; report only what the task needs and never expose secrets or session tokens.
- STS identity checks require network access and valid credentials.
- A valid identity does not imply permission to change resources.
