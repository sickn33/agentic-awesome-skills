---
source: "https://github.com/huggingface/skills/tree/main/skills/huggingface-jobs"
name: hugging-face-jobs
description: Run workloads on Hugging Face Jobs with managed CPUs, GPUs, TPUs, secrets, and Hub persistence.
license: Complete terms in LICENSE.txt
risk: unknown
---

# Running Workloads on Hugging Face Jobs

## Overview

Run any workload on fully managed Hugging Face infrastructure. No local setup required—jobs run on cloud CPUs, GPUs, or TPUs and can persist results to the Hugging Face Hub.

**Common use cases:**
- **Data Processing** - Transform, filter, or analyze large datasets
- **Batch Inference** - Run inference on thousands of samples
- **Experiments & Benchmarks** - Reproducible ML experiments
- **Model Training** - Fine-tune models (see `model-trainer` skill for TRL-specific training)
- **Synthetic Data Generation** - Generate datasets using LLMs
- **Development & Testing** - Test code without local GPU setup
- **Scheduled Jobs** - Automate recurring tasks

**For model training specifically:** See the `model-trainer` skill for TRL-based training workflows.

## When to Use This Skill

Use this skill when users want to:
- Run Python workloads on cloud infrastructure
- Execute jobs without local GPU/TPU setup
- Process data at scale
- Run batch inference or experiments
- Schedule recurring tasks
- Use GPUs/TPUs for any workload
- Persist results to the Hugging Face Hub

## Key Directives

When assisting with jobs:

1. **ALWAYS use `hf_jobs()` MCP tool** - Submit jobs using `hf_jobs("uv", {...})` or `hf_jobs("run", {...})`. The `script` parameter accepts Python code directly. Do NOT save to local files unless the user explicitly requests it. Pass the script content as a string to `hf_jobs()`.

2. **Always handle authentication** - Jobs that interact with the Hub require `HF_TOKEN` via secrets. See Token Usage section below.

3. **Provide job details after submission** - After submitting, provide job ID, monitoring URL, estimated time, and note that the user can request status checks later.

4. **Set appropriate timeouts** - Default 30min may be insufficient for long-running tasks.

## Prerequisites Checklist

Before starting any job, verify:

### ✅ **Account & Authentication**
- Hugging Face Account with [Pro](https://hf.co/pro), [Team](https://hf.co/enterprise), or [Enterprise](https://hf.co/enterprise) plan (Jobs require paid plan)
- Authenticated login: Check with `hf_whoami()`
- **HF_TOKEN for Hub Access** ⚠️ CRITICAL - Required for any Hub operations (push models/datasets, download private repos, etc.)
- Token must have appropriate permissions (read for downloads, write for uploads)

### ✅ **Token Usage** (See Token Usage section for details)

**When tokens are required:**
- Pushing models/datasets to Hub
- Accessing private repositories
- Using Hub APIs in scripts
- Any authenticated Hub operations

**How to provide tokens:**
```python
# hf_jobs MCP tool — $HF_TOKEN is auto-replaced with real token:
{"secrets": {"HF_TOKEN": "$HF_TOKEN"}}

# HfApi().run_uv_job() — MUST pass actual token:
from huggingface_hub import get_token
secrets={"HF_TOKEN": get_token()}
```

**⚠️ CRITICAL:** The `$HF_TOKEN` placeholder is ONLY auto-replaced by the `hf_jobs` MCP tool. When using `HfApi().run_uv_job()`, you MUST pass the real token via `get_token()`. Passing the literal string `"$HF_TOKEN"` results in a 9-character invalid token and 401 errors.

## Token Usage Guide

### Understanding Tokens

**What are HF Tokens?**
- Authentication credentials for Hugging Face Hub
- Required for authenticated operations (push, private repos, API access)
- Stored securely on your machine after `hf auth login`

**Token Types:**
- **Read Token** - Can download models/datasets, read private repos
- **Write Token** - Can push models/datasets, create repos, modify content
- **Organization Token** - Can act on behalf of an organization

### When Tokens Are Required

**Always Required:**
- Pushing models/datasets to Hub
- Accessing private repositories
- Creating new repositories
- Modifying existing repositories
- Using Hub APIs programmatically

**Not Required:**
- Downloading public models/datasets
- Running jobs that don't interact with Hub
- Reading public repository information

### How to Provide Tokens to Jobs

#### Method 1: Automatic Token (Recommended)

```python
hf_jobs("uv", {
    "script": "your_script.py",
    "secrets": {"HF_TOKEN": "$HF_TOKEN"}  # ✅ Automatic replacement
})
```

**How it works:**
- `$HF_TOKEN` is a placeholder that gets replaced with your actual token
- Uses the token from your logged-in session (`hf auth login`)
- Most secure and convenient method
- Token is encrypted server-side when passed as a secret

**Benefits:**
- No token exposure in code
- Uses your current login session
- Automatically updated if you re-login
- Works seamlessly with MCP tools

#### Method 2: Explicit Token (Not Recommended)

```python
hf_jobs("uv", {
    "script": "your_script.py",
    "secrets": {"HF_TOKEN": "hf_abc123..."}  # ⚠️ Hardcoded token
})
```

**When to use:**
- Only if automatic token doesn't work
- Testing with a specific token
- Organization tokens (use with caution)

**Security concerns:**
- Token visible in code/logs
- Must manually update if token rotates
- Risk of token exposure

#### Method 3: Environment Variable (Less Secure)

```python
hf_jobs("uv", {
    "script": "your_script.py",
    "env": {"HF_TOKEN": "hf_abc123..."}  # ⚠️ Less secure than secrets
})
```

**Difference from secrets:**
- `env` variables are visible in job logs
- `secrets` are encrypted server-side
- Always prefer `secrets` for tokens

### Using Tokens in Scripts

**In your Python script, tokens are available as environment variables:**

```python
# /// script
# dependencies = ["huggingface-hub"]
# ///

import os
from huggingface_hub import HfApi

# Token is automatically available if passed via secrets
token = os.environ.get("HF_TOKEN")

# Use with Hub API
api = HfApi(token=token)

# Or let huggingface_hub auto-detect
api = HfApi()  # Automatically uses HF_TOKEN env var
```

**Best practices:**
- Don't hardcode tokens in scripts
- Use `os.environ.get("HF_TOKEN")` to access
- Let `huggingface_hub` auto-detect when possible
- Verify token exists before Hub operations

### Token Verification

**Check if you're logged in:**
```python
from huggingface_hub import whoami
user_info = whoami()  # Returns your username if authenticated
```

**Verify token in job:**
```python
import os
assert "HF_TOKEN" in os.environ, "HF_TOKEN not found!"
token = os.environ["HF_TOKEN"]
print(f"Token starts with: {token[:7]}...")  # Should start with "hf_"
```

### Common Token Issues

**Error: 401 Unauthorized**
- **Cause:** Token missing or invalid
- **Fix:** Add `secrets={"HF_TOKEN": "$HF_TOKEN"}` to job config
- **Verify:** Check `hf_whoami()` works locally

**Error: 403 Forbidden**
- **Cause:** Token lacks required permissions
- **Fix:** Ensure token has write permissions for push operations
- **Check:** Token type at https://huggingface.co/settings/tokens

**Error: Token not found in environment**
- **Cause:** `secrets` not passed or wrong key name
- **Fix:** Use `secrets={"HF_TOKEN": "$HF_TOKEN"}` (not `env`)
- **Verify:** Script checks `os.environ.get("HF_TOKEN")`

**Error: Repository access denied**
- **Cause:** Token doesn't have access to private repo
- **Fix:** Use token from account with access
- **Check:** Verify repo visibility and your permissions

### Token Security Best Practices

1. **Never commit tokens** - Use `$HF_TOKEN` placeholder or environment variables
2. **Use secrets, not env** - Secrets are encrypted server-side
3. **Rotate tokens regularly** - Generate new tokens periodically
4. **Use minimal permissions** - Create tokens with only needed permissions
5. **Don't share tokens** - Each user should use their own token
6. **Monitor token usage** - Check token activity in Hub settings

### Complete Token Example

```python
# Example: Push results to Hub
hf_jobs("uv", {
    "script": """
# /// script
# dependencies = ["huggingface-hub", "datasets"]
# ///

import os
from huggingface_hub import HfApi
from datasets import Dataset

# Verify token is available
assert "HF_TOKEN" in os.environ, "HF_TOKEN required!"

# Use token for Hub operations
api = HfApi(token=os.environ["HF_TOKEN"])

# Create and push dataset
data = {"text": ["Hello", "World"]}
dataset = Dataset.from_dict(data)
dataset.push_to_hub("username/my-dataset", token=os.environ["HF_TOKEN"])

print("✅ Dataset pushed successfully!")
""",
    "flavor": "cpu-basic",
    "timeout": "30m",
    "secrets": {"HF_TOKEN": "$HF_TOKEN"}  # ✅ Token provided securely
})
```

## Quick Start: Two Approaches

### Approach 1: UV Scripts (Recommended)

UV scripts use PEP 723 inline dependencies for clean, self-contained workloads.

**MCP Tool:**
```python
hf_jobs("uv", {
    "script": """
# /// script
# dependencies = ["transformers", "torch"]
# ///

from transformers import pipeline
import torch

# Your workload here
classifier = pipeline("sentiment-analysis")
result = classifier("I love Hugging Face!")
print(result)
""",
    "flavor": "cpu-basic",
    "timeout": "30m"
})
```

**CLI Equivalent:**
```bash
hf jobs uv run my_script.py --flavor cpu-basic --timeout 30m
```

**Python API:**
```python
from huggingface_hub import run_uv_job
run_uv_job("my_script.py", flavor="cpu-basic", timeout="30m")
```

**Benefits:** Direct MCP tool usage, clean code, dependencies declared inline, no file saving required

**When to use:** Default choice for all workloads, custom logic, any scenario requiring `hf_jobs()`

#### Custom Docker Images for UV Scripts

By default, UV scripts use `ghcr.io/astral-sh/uv:python3.12-bookworm-slim`. For ML workloads with complex dependencies, use pre-built images:

```python
hf_jobs("uv", {
    "script": "inference.py",
    "image": "vllm/vllm-openai:latest",  # Pre-built image with vLLM
    "flavor": "a10g-large"
})
```

**CLI:**
```bash
hf jobs uv run --image vllm/vllm-openai:latest --flavor a10g-large inference.py
```

**Benefits:** Faster startup, pre-installed dependencies, optimized for specific frameworks

#### Python Version

By default, UV scripts use Python 3.12. Specify a different version:

```python
hf_jobs("uv", {
    "script": "my_script.py",
    "python": "3.11",  # Use Python 3.11
    "flavor": "cpu-basic"
})
```

**Python API:**
```python
from huggingface_hub import run_uv_job
run_uv_job("my_script.py", python="3.11")
```

#### Working with Scripts

⚠️ **Important:** There are *two* "script path" stories depending on how you run Jobs:

- **Using the `hf_jobs()` MCP tool (recommended in this repo)**: the `script` value must be **inline code** (a string) or a **URL**. A local filesystem path (like `"./scripts/foo.py"`) won't exist inside the remote container.
- **Using the `hf jobs uv run` CLI**: local file paths **do work** (the CLI uploads your script).

**Common mistake with `hf_jobs()` MCP tool:**

```python
# ❌ Will fail (remote container can't see your local path)
hf_jobs("uv", {"script": "./scripts/foo.py"})
```

**Correct patterns with `hf_jobs()` MCP tool:**

```python
# ✅ Inline: read the local script file and pass its *contents*
from pathlib import Path
script = Path("hf-jobs/scripts/foo.py").read_text()
hf_jobs("uv", {"script": script})

# ✅ URL: host the script somewhere reachable
hf_jobs("uv", {"script": "https://huggingface.co/datasets/uv-scripts/.../raw/main/foo.py"})

# ✅ URL from GitHub
hf_jobs("uv", {"script": "https://raw.githubusercontent.com/huggingface/trl/main/trl/scripts/sft.py"})
```

**CLI equivalent (local paths supported):**

```bash
hf jobs uv run ./scripts/foo.py -- --your --args
```

#### Adding Dependencies at Runtime

Add extra dependencies beyond what's in the PEP 723 header:

```python
hf_jobs("uv", {
    "script": "inference.py",
    "dependencies": ["transformers", "torch>=2.0"],  # Extra deps
    "flavor": "a10g-small"
})
```

**Python API:**
```python
from huggingface_hub import run_uv_job
run_uv_job("inference.py", dependencies=["transformers", "torch>=2.0"])
```

### Approach 2: Docker-Based Jobs

Run jobs with custom Docker images and commands.

**MCP Tool:**
```python
hf_jobs("run", {
    "image": "python:3.12",
    "command": ["python", "-c", "print('Hello from HF Jobs!')"],
    "flavor": "cpu-basic",
    "timeout": "30m"
})
```

**CLI Equivalent:**
```bash
hf jobs run python:3.12 python -c "print('Hello from HF Jobs!')"
```

**Python API:**
```python
from huggingface_hub import run_job
run_job(image="python:3.12", command=["python", "-c", "print('Hello!')"], flavor="cpu-basic")
```

**Benefits:** Full Docker control, use pre-built images, run any command
**When to use:** Need specific Docker images, non-Python workloads, complex environments

**Example with GPU:**
```python
hf_jobs("run", {
    "image": "pytorch/pytorch:2.6.0-cuda12.4-cudnn9-devel",
    "command": ["python", "-c", "import torch; print(torch.cuda.get_device_name())"],
    "flavor": "a10g-small",
    "timeout": "1h"
})
```

**Using Hugging Face Spaces as Images:**

You can use Docker images from HF Spaces:
```python
hf_jobs("run", {
    "image": "hf.co/spaces/lhoestq/duckdb",  # Space as Docker image
    "command": ["duckdb", "-c", "SELECT 'Hello from DuckDB!'"],
    "flavor": "cpu-basic"
})
```

**CLI:**
```bash
hf jobs run hf.co/spaces/lhoestq/duckdb duckdb -c "SELECT 'Hello!'"
```

### Finding More UV Scripts on Hub

The `uv-scripts` organization provides ready-to-use UV scripts stored as datasets on Hugging Face Hub:

```python
# Discover available UV script collections
dataset_search({"author": "uv-scripts", "sort": "downloads", "limit": 20})

# Explore a specific collection
hub_repo_details(["uv-scripts/classification"], repo_type="dataset", include_readme=True)
```

**Popular collections:** OCR, classification, synthetic-data, vLLM, dataset-creation

## Hardware Selection

> **Reference:** [HF Jobs Hardware Docs](https://huggingface.co/docs/hub/en/spaces-config-reference) (updated 07/2025)

| Workload Type | Recommended Hardware | Use Case |
|---------------|---------------------|----------|
| Data processing, testing | `cpu-basic`, `cpu-upgrade` | Lightweight tasks |
| Small models, demos | `t4-small` | <1B models, quick tests |
| Medium models | `t4-medium`, `l4x1` | 1-7B models |
| Large models, production | `a10g-small`, `a10g-large` | 7-13B models |
| Very large models | `a100-large` | 13B+ models |
| Batch inference | `a10g-large`, `a100-large` | High-throughput |
| Multi-GPU workloads | `l4x4`, `a10g-largex2`, `a10g-largex4` | Parallel/large models |
| TPU workloads | `v5e-1x1`, `v5e-2x2`, `v5e-2x4` | JAX/Flax, TPU-optimized |

**All Available Flavors:**
- **CPU:** `cpu-basic`, `cpu-upgrade`
- **GPU:** `t4-small`, `t4-medium`, `l4x1`, `l4x4`, `a10g-small`, `a10g-large`, `a10g-largex2`, `a10g-largex4`, `a100-large`
- **TPU:** `v5e-1x1`, `v5e-2x2`, `v5e-2x4`

**Guidelines:**
- Start with smaller hardware for testing
- Scale up based on actual needs
- Use multi-GPU for parallel workloads or large models
- Use TPUs for JAX/Flax workloads
- See `references/hardware_guide.md` for detailed specifications

## Critical: Saving Results

**⚠️ EPHEMERAL ENVIRONMENT—MUST PERSIST RESULTS**

The Jobs environment is temporary. All files are deleted when the job ends. If results aren't persisted, **ALL WORK IS LOST**.

### Persistence Options

**1. Push to Hugging Face Hub (Recommended)**

```python
# Push models
model.push_to_hub("username/model-name", token=os.environ["HF_TOKEN"])

# Push datasets
dataset.push_to_hub("username/dataset-name", token=os.environ["HF_TOKEN"])

# Push artifacts
api.upload_file(
    path_or_fileobj="results.json",
    path_in_repo="results.json",
    repo_id="username/results",
    token=os.environ["HF_TOKEN"]
)
```

**2. Use External Storage**

```python
# Upload to S3, GCS, etc.
import boto3
s3 = boto3.client('s3')
s3.upload_file('results.json', 'my-bucket', 'results.json')
```

**3. Send Results via API**

```python
# POST results to your API
import requests
requests.post("https://your-api.com/results", json=results)
```

### Required Configuration for Hub Push

**In job submission:**
```python
# hf_jobs MCP tool:
{"secrets": {"HF_TOKEN": "$HF_TOKEN"}}  # auto-replaced

# HfApi().run_uv_job():
from huggingface_hub import get_token
secrets={"HF_TOKEN": get_token()}  # must pass real token
```

**In script:**
```python
import os
from huggingface_hub import HfApi

# Token automatically available from secrets
api = HfApi(token=os.environ.get("HF_TOKEN"))

# Push your results
api.upload_file(...)
```

### Verification Checklist

Before submitting:
- [ ] Results persistence method chosen
- [ ] Token in secrets if using Hub (MCP: `"$HF_TOKEN"`, Python API: `get_token()`)
- [ ] Script handles missing token gracefully
- [ ] Test persistence path works

**See:** `references/hub_saving.md` for detailed Hub persistence guide

## Timeout Management

**⚠️ DEFAULT: 30 MINUTES**

Jobs automatically stop after the timeout. For long-running tasks like training, always set a custom timeout.

### Setting Timeouts

**MCP Tool:**
```python
{
    "timeout": "2h"   # 2 hours
}
```

**Supported formats:**
- Integer/float: seconds (e.g., `300` = 5 minutes)
- String with suffix: `"5m"` (minutes), `"2h"` (hours), `"1d"` (days)
- Examples: `"90m"`, `"2h"`, `"1.5h"`, `300`, `"1d"`

**Python API:**
```python
from huggingface_hub import run_job, run_uv_job

run_job(image="python:3.12", command=[...], timeout="2h")
run_uv_job("script.py", timeout=7200)  # 2 hours in seconds
```

### Timeout Guidelines

| Scenario | Recommended | Notes |
|----------|-------------|-------|
| Quick test | 10-30 min | Verify setup |
| Data processing | 1-2 hours | Depends on data size |
| Batch inference | 2-4 hours | Large batches |
| Experiments | 4-8 hours | Multiple runs |
| Long-running | 8-24 hours | Production workloads |

**Always add 20-30% buffer** for setup, network delays, and cleanup.

**On timeout:** Job killed immediately, all unsaved progress lost

## Cost Estimation

**General guidelines:**

```
Total Cost = (Hours of runtime) × (Cost per hour)
```

**Example calculations:**

**Quick test:**
- Hardware: cpu-basic ($0.10/hour)
- Time: 15 minutes (0.25 hours)
- Cost: $0.03

**Data processing:**
- Hardware: l4x1 ($2.50/hour)
- Time: 2 hours
- Cost: $5.00

**Batch inference:**
- Hardware: a10g-large ($5/hour)
- Time: 4 hours
- Cost: $20.00

**Cost optimization tips:**
1. Start small - Test on cpu-basic or t4-small
2. Monitor runtime - Set appropriate timeouts
3. Use checkpoints - Resume if job fails
4. Optimize code - Reduce unnecessary compute
5. Choose right hardware - Don't over-provision

## Monitoring and Tracking

### Check Job Status

**MCP Tool:**
```python
# List all jobs
hf_jobs("ps")

# Inspect specific job
hf_jobs("inspect", {"job_id": "your-job-id"})

# View logs
hf_jobs("logs", {"job_id": "your-job-id"})

# Cancel a job
hf_jobs("cancel", {"job_id": "your-job-id"})
```

**Python API:**
```python
from huggingface_hub import list_jobs, inspect_job, fetch_job_logs, cancel_job

# List your jobs
jobs = list_jobs()

# List running jobs only
running = [j for j in list_jobs() if j.status.stage == "RUNNING"]

# Inspect specific job
job_info = inspect_job(job_id="your-job-id")

# View logs
for log in fetch_job_logs(job_id="your-job-id"):
    print(log)

# Cancel a job
cancel_job(job_id="your-job-id")
```

**CLI:**
```bash
hf jobs ps                    # List jobs
hf jobs logs <job-id>         # View logs
hf jobs cancel <job-id>       # Cancel job
```

**Remember:** Wait for user to request status checks. Avoid polling repeatedly.

### Job URLs

After submission, jobs have monitoring URLs:
```
https://huggingface.co/jobs/username/job-id
```

View logs, status, and details in the browser.

### Wait for Multiple Jobs

```python
import time
from huggingface_hub import inspect_job, run_job

# Run multiple jobs
jobs = [run_job(image=img, command=cmd) for img, cmd in workloads]

# Wait for all to complete
for job in jobs:
    while inspect_job(job_id=job.id).status.stage not in ("COMPLETED", "ERROR"):
        time.sleep(10)
```

## Scheduled Jobs

Run jobs on a schedule using CRON expressions or predefined schedules.

**MCP Tool:**
```python
# Schedule a UV script that runs every hour
hf_jobs("scheduled uv", {
    "script": "your_script.py",
    "schedule": "@hourly",
    "flavor": "cpu-basic"
})

# Schedule with CRON syntax
hf_jobs("scheduled uv", {
    "script": "your_script.py",
    "schedule": "0 9 * * 1",  # 9 AM every Monday
    "flavor": "cpu-basic"
})

# Schedule a Docker-based job
hf_jobs("scheduled run", {
    "image": "python:3.12",
    "command": ["python", "-c", "print('Scheduled!')"],
    "schedule": "@daily",
    "flavor": "cpu-basic"
})
```

**Python API:**
```python
from huggingface_hub import create_scheduled_job, create_scheduled_uv_job

# Schedule a Docker job
create_scheduled_job(
    image="python:3.12",
    command=["python", "-c", "print('Running on schedule!')"],
    schedule="@hourly"
)

# Schedule a UV script
create_scheduled_uv_job("my_script.py", schedule="@daily", flavor="cpu-basic")

# Schedule with GPU
create_scheduled_uv_job(
    "ml_inference.py",
    schedule="0 */6 * * *",  # Every 6 hours
    flavor="a10g-small"
)
```

**Available schedules:**
- `@annually`, `@yearly` - Once per year
- `@monthly` - Once per month
- `@weekly` - Once per week
- `@daily` - Once per day
- `@hourly` - Once per hour
- CRON expression - Custom schedule (e.g., `"*/5 * * * *"` for every 5 minutes)

**Manage scheduled jobs:**
```python
# MCP Tool
hf_jobs("scheduled ps")                              # List scheduled jobs
hf_jobs("scheduled inspect", {"job_id": "..."})     # Inspect details
hf_jobs("scheduled suspend", {"job_id": "..."})     # Pause
hf_jobs("scheduled resume", {"job_id": "..."})      # Resume
hf_jobs("scheduled delete", {"job_id": "..."})      # Delete
```

**Python API for management:**
```python
from huggingface_hub import (
    list_scheduled_jobs,
    inspect_scheduled_job,
    suspend_scheduled_job,
    resume_scheduled_job,
    delete_scheduled_job
)

# List all scheduled jobs
scheduled = list_scheduled_jobs()

# Inspect a scheduled job
info = inspect_scheduled_job(scheduled_job_id)

# Suspend (pause) a scheduled job
suspend_scheduled_job(scheduled_job_id)

# Resume a scheduled job
resume_scheduled_job(scheduled_job_id)

# Delete a scheduled job
delete_scheduled_job(scheduled_job_id)
```

## Webhooks: Trigger Jobs on Events

Trigger jobs automatically when changes happen in Hugging Face repositories.

**Python API:**
```python
from huggingface_hub import create_webhook

# Create webhook that triggers a job when a repo changes
webhook = create_webhook(
    job_id=job.id,
    watched=[
        {"type": "user", "name": "your-username"},
        {"type": "org", "name": "your-org-name"}
    ],
    domains=["repo", "discussion"],
    secret="your-secret"
)
```

**How it works:**
1. Webhook listens for changes in watched repositories
2. When triggered, the job runs with `WEBHOOK_PAYLOAD` environment variable
3. Your script can parse the payload to understand what changed

**Use cases:**
- Auto-process new datasets when uploaded
- Trigger inference when models are updated
- Run tests when code changes
- Generate reports on repository activity

**Access webhook payload in script:**
```python
import os
import json

payload = json.loads(os.environ.get("WEBHOOK_PAYLOAD", "{}"))
print(f"Event type: {payload.get('event', {}).get('action')}")
```

See [Webhooks Documentation](https://huggingface.co/docs/huggingface_hub/guides/webhooks) for more details.

## Common Workload Patterns

This repository ships ready-to-run UV scripts in `hf-jobs/scripts/`. Prefer using them instead of inventing new templates.

### Pattern 1: Dataset → Model Responses (vLLM) — `scripts/generate-responses.py`

**What it does:** loads a Hub dataset (chat `messages` or a `prompt` column), applies a model chat template, generates responses with vLLM, and **pushes** the output dataset + dataset card back to the Hub.

**Requires:** GPU + **write** token (it pushes a dataset).

```python
from pathlib import Path

script = Path("hf-jobs/scripts/generate-responses.py").read_text()
hf_jobs("uv", {
    "script": script,
    "script_args": [
        "username/input-dataset",
        "username/output-dataset",
        "--messages-column", "messages",
        "--model-id", "Qwen/Qwen3-30B-A3B-Instruct-2507",
        "--temperature", "0.7",
        "--top-p", "0.8",
        "--max-tokens", "2048",
    ],
    "flavor": "a10g-large",
    "timeout": "4h",
    "secrets": {"HF_TOKEN": "$HF_TOKEN"},
})
```

### Pattern 2: CoT Self-Instruct Synthetic Data — `scripts/cot-self-instruct.py`

**What it does:** generates synthetic prompts/answers via CoT Self-Instruct, optionally filters outputs (answer-consistency / RIP), then **pushes** the generated dataset + dataset card to the Hub.

**Requires:** GPU + **write** token (it pushes a dataset).

```python
from pathlib import Path

script = Path("hf-jobs/scripts/cot-self-instruct.py").read_text()
hf_jobs("uv", {
    "script": script,
    "script_args": [
        "--seed-dataset", "davanstrien/s1k-reasoning",
        "--output-dataset", "username/synthetic-math",
        "--task-type", "reasoning",
        "--num-samples", "5000",
        "--filter-method", "answer-consistency",
    ],
    "flavor": "l4x4",
    "timeout": "8h",
    "secrets": {"HF_TOKEN": "$HF_TOKEN"},
})
```

### Pattern 3: Streaming Dataset Stats (Polars + HF Hub) — `scripts/finepdfs-stats.py`

**What it does:** scans parquet directly from Hub (no 300GB download), computes temporal stats, and (optionally) uploads results to a Hub dataset repo.

**Requires:** CPU is often enough; token needed **only** if you pass `--output-repo` (upload).

```python
from pathlib import Path

script = Path("hf-jobs/scripts/finepdfs-stats.py").read_text()
hf_jobs("uv", {
    "script": script,
    "script_args": [
        "--limit", "10000",
        "--show-plan",
        "--output-repo", "username/finepdfs-temporal-stats",
    ],
    "flavor": "cpu-upgrade",
    "timeout": "2h",
    "env": {"HF_XET_HIGH_PERFORMANCE": "1"},
    "secrets": {"HF_TOKEN": "$HF_TOKEN"},
})
```

## Common Failure Modes

### Out of Memory (OOM)

**Fix:**
1. Reduce batch size or data chunk size
2. Process data in smaller batches
3. Upgrade hardware: cpu → t4 → a10g → a100

### Job Timeout

**Fix:**
1. Check logs for actual runtime
2. Increase timeout with buffer: `"timeout": "3h"`
3. Optimize code for faster execution
4. Process data in chunks

### Hub Push Failures

**Fix:**
1. Add token to secrets: MCP uses `"$HF_TOKEN"` (auto-replaced), Python API uses `get_token()` (must pass real token)
2. Verify token in script: `assert "HF_TOKEN" in os.environ`
3. Check token permissions
4. Verify repo exists or can be created

### Missing Dependencies

**Fix:**
Add to PEP 723 header:
```python
# /// script
# dependencies = ["package1", "package2>=1.0.0"]
# ///
```

### Authentication Errors

**Fix:**
1. Check `hf_whoami()` works locally
2. Verify token in secrets — MCP: `"$HF_TOKEN"`, Python API: `get_token()` (NOT `"$HF_TOKEN"`)
3. Re-login: `hf auth login`
4. Check token has required permissions

## Troubleshooting

**Common issues:**
- Job times out → Increase timeout, optimize code
- Results not saved → Check persistence method, verify HF_TOKEN
- Out of Memory → Reduce batch size, upgrade hardware
- Import errors → Add dependencies to PEP 723 header
- Authentication errors → Check token, verify secrets parameter

**See:** `references/troubleshooting.md` for complete troubleshooting guide

## Resources

### References (In This Skill)
- `references/token_usage.md` - Complete token usage guide
- `references/hardware_guide.md` - Hardware specs and selection
- `references/hub_saving.md` - Hub persistence guide
- `references/troubleshooting.md` - Common issues and solutions

### Scripts (In This Skill)
- `scripts/generate-responses.py` - vLLM batch generation: dataset → responses → push to Hub
- `scripts/cot-self-instruct.py` - CoT Self-Instruct synthetic data generation + filtering → push to Hub
- `scripts/finepdfs-stats.py` - Polars streaming stats over `finepdfs-edu` parquet on Hub (optional push)

### External Links

**Official Documentation:**
- [HF Jobs Guide](https://huggingface.co/docs/huggingface_hub/guides/jobs) - Main documentation
- [HF Jobs CLI Reference](https://huggingface.co/docs/huggingface_hub/guides/cli#hf-jobs) - Command line interface
- [HF Jobs API Reference](https://huggingface.co/docs/huggingface_hub/package_reference/hf_api) - Python API details
- [Hardware Flavors Reference](https://huggingface.co/docs/hub/en/spaces-config-reference) - Available hardware

**Related Tools:**
- [UV Scripts Guide](https://docs.astral.sh/uv/guides/scripts/) - PEP 723 inline dependencies
- [UV Scripts Organization](https://huggingface.co/uv-scripts) - Community UV script collection
- [HF Hub Authentication](https://huggingface.co/docs/huggingface_hub/quick-start#authentication) - Token setup
- [Webhooks Documentation](https://huggingface.co/docs/huggingface_hub/guides/webhooks) - Event triggers

## Key Takeaways

1. **Submit scripts inline** - The `script` parameter accepts Python code directly; no file saving required unless user requests
2. **Jobs are asynchronous** - Don't wait/poll; let user check when ready
3. **Always set timeout** - Default 30 min may be insufficient; set appropriate timeout
4. **Always persist results** - Environment is ephemeral; without persistence, all work is lost
5. **Use tokens securely** - MCP: `secrets={"HF_TOKEN": "$HF_TOKEN"}`, Python API: `secrets={"HF_TOKEN": get_token()}` — `"$HF_TOKEN"` only works with MCP tool
6. **Choose appropriate hardware** - Start small, scale up based on needs (see hardware guide)
7. **Use UV scripts** - Default to `hf_jobs("uv", {...})` with inline scripts for Python workloads
8. **Handle authentication** - Verify tokens are available before Hub operations
9. **Monitor jobs** - Provide job URLs and status check commands
10. **Optimize costs** - Choose right hardware, set appropriate timeouts

## Quick Reference: MCP Tool vs CLI vs Python API

| Operation | MCP Tool | CLI | Python API |
|-----------|----------|-----|------------|
| Run UV script | `hf_jobs("uv", {...})` | `hf jobs uv run script.py` | `run_uv_job("script.py")` |
| Run Docker job | `hf_jobs("run", {...})` | `hf jobs run image cmd` | `run_job(image, command)` |
| List jobs | `hf_jobs("ps")` | `hf jobs ps` | `list_jobs()` |
| View logs | `hf_jobs("logs", {...})` | `hf jobs logs <id>` | `fetch_job_logs(job_id)` |
| Cancel job | `hf_jobs("cancel", {...})` | `hf jobs cancel <id>` | `cancel_job(job_id)` |
| Schedule UV | `hf_jobs("scheduled uv", {...})` | `hf jobs scheduled uv run SCHEDULE script.py` | `create_scheduled_uv_job()` |
| Schedule Docker | `hf_jobs("scheduled run", {...})` | `hf jobs scheduled run SCHEDULE image cmd` | `create_scheduled_job()` |
| List scheduled | `hf_jobs("scheduled ps")` | `hf jobs scheduled ps` | `list_scheduled_jobs()` |
| Delete scheduled | `hf_jobs("scheduled delete", {...})` | `hf jobs scheduled delete <id>` | `delete_scheduled_job()` |

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
