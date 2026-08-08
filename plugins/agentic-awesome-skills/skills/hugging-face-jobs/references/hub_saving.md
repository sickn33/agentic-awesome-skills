# Saving Results to Hugging Face Hub

**⚠️ CRITICAL:** Job environments are ephemeral. ALL results are lost when a job completes unless persisted to the Hub or external storage.

## Why Persistence is Required

When running on Hugging Face Jobs:
- Environment is temporary
- All files deleted on job completion
- No local disk persistence
- Cannot access results after job ends

**Without persistence, all work is permanently lost.**

## Persistence Options

### Option 1: Push to Hugging Face Hub (Recommended)

**For models:**
```python
from transformers import AutoModel
model.push_to_hub("username/model-name", token=os.environ.get("HF_TOKEN"))
```

**For datasets:**
```python
from datasets import Dataset
dataset.push_to_hub("username/dataset-name", token=os.environ.get("HF_TOKEN"))
```

**For files/artifacts:**
```python
from huggingface_hub import HfApi
api = HfApi(token=os.environ.get("HF_TOKEN"))
api.upload_file(
    path_or_fileobj="results.json",
    path_in_repo="results.json",
    repo_id="username/results",
    repo_type="dataset"
)
```

### Option 2: External Storage

**S3:**
```python
import boto3
s3 = boto3.client('s3')
s3.upload_file('results.json', 'my-bucket', 'results.json')
```

**Google Cloud Storage:**
```python
from google.cloud import storage
client = storage.Client()
bucket = client.bucket('my-bucket')
blob = bucket.blob('results.json')
blob.upload_from_filename('results.json')
```

### Option 3: API Endpoint

```python
import requests
requests.post("https://your-api.com/results", json=results)
```

## Required Configuration for Hub Push

### Job Configuration

**Always include HF_TOKEN:**
```python
hf_jobs("uv", {
    "script": "your_script.py",
    "secrets": {"HF_TOKEN": "$HF_TOKEN"}  # ✅ Required for Hub operations
})
```

### Script Configuration

**Verify token exists:**
```python
import os
assert "HF_TOKEN" in os.environ, "HF_TOKEN required for Hub operations!"
```

**Use token for Hub operations:**
```python
from huggingface_hub import HfApi

# Auto-detects HF_TOKEN from environment
api = HfApi()

# Or explicitly pass token
api = HfApi(token=os.environ.get("HF_TOKEN"))
```

## Complete Examples

### Example 1: Push Dataset

```python
hf_jobs("uv", {
    "script": """
# /// script
# dependencies = ["datasets", "huggingface-hub"]
# ///

import os
from datasets import Dataset
from huggingface_hub import HfApi

# Verify token
assert "HF_TOKEN" in os.environ, "HF_TOKEN required!"

# Process data
data = {"text": ["Sample 1", "Sample 2"]}
dataset = Dataset.from_dict(data)

# Push to Hub
dataset.push_to_hub("username/my-dataset")
print("✅ Dataset pushed!")
""",
    "flavor": "cpu-basic",
    "timeout": "30m",
    "secrets": {"HF_TOKEN": "$HF_TOKEN"}
})
```

### Example 2: Push Model

```python
hf_jobs("uv", {
    "script": """
# /// script
# dependencies = ["transformers"]
# ///

import os
from transformers import AutoModel, AutoTokenizer

# Verify token
assert "HF_TOKEN" in os.environ, "HF_TOKEN required!"

# Load and process model
model = AutoModel.from_pretrained("base-model")
tokenizer = AutoTokenizer.from_pretrained("base-model")
# ... process model ...

# Push to Hub
model.push_to_hub("username/my-model")
tokenizer.push_to_hub("username/my-model")
print("✅ Model pushed!")
""",
    "flavor": "a10g-large",
    "timeout": "2h",
    "secrets": {"HF_TOKEN": "$HF_TOKEN"}
})
```

### Example 3: Push Artifacts

```python
hf_jobs("uv", {
    "script": """
# /// script
# dependencies = ["huggingface-hub", "pandas"]
# ///

import os
import json
import pandas as pd
from huggingface_hub import HfApi

# Verify token
assert "HF_TOKEN" in os.environ, "HF_TOKEN required!"

# Generate results
results = {"accuracy": 0.95, "loss": 0.05}
df = pd.DataFrame([results])

# Save files
with open("results.json", "w") as f:
    json.dump(results, f)
df.to_csv("results.csv", index=False)

# Push to Hub
api = HfApi()
api.upload_file("results.json", "results.json", "username/results", repo_type="dataset")
api.upload_file("results.csv", "results.csv", "username/results", repo_type="dataset")
print("✅ Results pushed!")
""",
    "flavor": "cpu-basic",
    "timeout": "30m",
    "secrets": {"HF_TOKEN": "$HF_TOKEN"}
})
```

## Authentication Methods

### Method 1: Automatic Token (Recommended)

```python
"secrets": {"HF_TOKEN": "$HF_TOKEN"}
```

Uses your logged-in Hugging Face token automatically.

### Method 2: Explicit Token

```python
"secrets": {"HF_TOKEN": "hf_abc123..."}
```

Provide token explicitly (not recommended for security).

### Method 3: Environment Variable

```python
"env": {"HF_TOKEN": "hf_abc123..."}
```

Pass as regular environment variable (less secure than secrets).

**Always prefer Method 1** for security and convenience.

## Verification Checklist

Before submitting any job that saves to Hub, verify:

- [ ] `secrets={"HF_TOKEN": "$HF_TOKEN"}` in job config
- [ ] Script checks for token: `assert "HF_TOKEN" in os.environ`
- [ ] Hub push code included in script
- [ ] Repository name doesn't conflict with existing repos
- [ ] You have write access to the target namespace

## Repository Setup

### Automatic Creation

If repository doesn't exist, it's created automatically when first pushing (if token has write permissions).

### Manual Creation

Create repository before pushing:

```python
from huggingface_hub import HfApi

api = HfApi()
api.create_repo(
    repo_id="username/repo-name",
    repo_type="model",  # or "dataset"
    private=False,  # or True for private repo
)
```

### Repository Naming

**Valid names:**
- `username/my-model`
- `username/model-name`
- `organization/model-name`

**Invalid names:**
- `model-name` (missing username)
- `username/model name` (spaces not allowed)
- `username/MODEL` (uppercase discouraged)

## Troubleshooting

### Error: 401 Unauthorized

**Cause:** HF_TOKEN not provided or invalid

**Solutions:**
1. Verify `secrets={"HF_TOKEN": "$HF_TOKEN"}` in job config
2. Check you're logged in: `hf_whoami()`
3. Re-login: `hf auth login`

### Error: 403 Forbidden

**Cause:** No write access to repository

**Solutions:**
1. Check repository namespace matches your username
2. Verify you're a member of organization (if using org namespace)
3. Check token has write permissions

### Error: Repository not found

**Cause:** Repository doesn't exist and auto-creation failed

**Solutions:**
1. Manually create repository first
2. Check repository name format
3. Verify namespace exists

### Error: Push failed

**Cause:** Network issues or Hub unavailable

**Solutions:**
1. Check logs for specific error
2. Verify token is valid
3. Retry push operation

## Best Practices

1. **Always verify token exists** before Hub operations
2. **Use descriptive repo names** (e.g., `my-experiment-results` not `results`)
3. **Push incrementally** for large results (use checkpoints)
4. **Verify push success** in logs before job completes
5. **Use appropriate repo types** (model vs dataset)
6. **Add README** with result descriptions
7. **Tag repos** with relevant tags

## Monitoring Push Progress

Check logs for push progress:

**MCP Tool:**
```python
hf_jobs("logs", {"job_id": "your-job-id"})
```

**CLI:**
```bash
hf jobs logs <job-id>
```

**Python API:**
```python
from huggingface_hub import fetch_job_logs
for log in fetch_job_logs(job_id="your-job-id"):
    print(log)
```

**Look for:**
```
Pushing to username/repo-name...
Upload file results.json: 100%
✅ Push successful
```

## Key Takeaway

**Without `secrets={"HF_TOKEN": "$HF_TOKEN"}` and persistence code, all results are permanently lost.**

Always verify both are configured before submitting any job that produces results.

