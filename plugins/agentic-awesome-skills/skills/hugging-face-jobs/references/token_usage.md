# Token Usage Guide for Hugging Face Jobs

**⚠️ CRITICAL:** Proper token usage is essential for any job that interacts with the Hugging Face Hub.

## Overview

Hugging Face tokens are authentication credentials that allow your jobs to interact with the Hub. They're required for:
- Pushing models/datasets to Hub
- Accessing private repositories
- Creating new repositories
- Using Hub APIs programmatically
- Any authenticated Hub operations

## Token Types

### Read Token
- **Permissions:** Download models/datasets, read private repos
- **Use case:** Jobs that only need to download/read content
- **Creation:** https://huggingface.co/settings/tokens

### Write Token
- **Permissions:** Push models/datasets, create repos, modify content
- **Use case:** Jobs that need to upload results (most common)
- **Creation:** https://huggingface.co/settings/tokens
- **⚠️ Required for:** Pushing models, datasets, or any uploads

### Organization Token
- **Permissions:** Act on behalf of an organization
- **Use case:** Jobs running under organization namespace
- **Creation:** Organization settings → Tokens

## Providing Tokens to Jobs

### Method 1: `hf_jobs` MCP tool with `$HF_TOKEN` (Recommended) ⭐

```python
hf_jobs("uv", {
    "script": "your_script.py",
    "secrets": {"HF_TOKEN": "$HF_TOKEN"}  # ✅ Automatic replacement
})
```

**How it works:**
1. `$HF_TOKEN` is a placeholder that gets replaced with your actual token
2. Uses the token from your logged-in session (`hf auth login`)
3. Token is encrypted server-side when passed as a secret
4. Most secure and convenient method

**Benefits:**
- ✅ No token exposure in code
- ✅ Uses your current login session
- ✅ Automatically updated if you re-login
- ✅ Works seamlessly with MCP tools
- ✅ Token encrypted server-side

**Requirements:**
- Must be logged in: `hf auth login` or `hf_whoami()` works
- Token must have required permissions

**⚠️ CRITICAL:** `$HF_TOKEN` auto-replacement is an `hf_jobs` MCP tool feature ONLY. It does NOT work with `HfApi().run_uv_job()` — see Method 1b below.

### Method 1b: `HfApi().run_uv_job()` with `get_token()` (Required for Python API)

```python
from huggingface_hub import HfApi, get_token
api = HfApi()
api.run_uv_job(
    script="your_script.py",
    secrets={"HF_TOKEN": get_token()},  # ✅ Passes actual token value
)
```

**How it works:**
1. `get_token()` retrieves the token from your logged-in session
2. The actual token value is passed to the `secrets` parameter
3. Token is encrypted server-side

**Why `"$HF_TOKEN"` fails with `HfApi().run_uv_job()`:**
- The Python API passes the literal string `"$HF_TOKEN"` (9 characters) as the token
- The Jobs server receives this invalid string instead of a real token
- Result: `401 Unauthorized` errors when the script tries to authenticate
- You MUST use `get_token()` from `huggingface_hub` to get the real token

### Method 2: Explicit Token (Not Recommended)

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
- ❌ Token visible in code/logs
- ❌ Must manually update if token rotates
- ❌ Risk of token exposure
- ❌ Not recommended for production

### Method 3: Environment Variable (Less Secure)

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

**When to use:**
- Only for non-sensitive configuration
- Never use for tokens (use `secrets` instead)

## Using Tokens in Scripts

### Accessing Tokens

Tokens passed via `secrets` are available as environment variables in your script:

```python
import os

# Get token from environment
token = os.environ.get("HF_TOKEN")

# Verify token exists
if not token:
    raise ValueError("HF_TOKEN not found in environment!")
```

### Using with Hugging Face Hub

**Option 1: Explicit token parameter**
```python
from huggingface_hub import HfApi

api = HfApi(token=os.environ.get("HF_TOKEN"))
api.upload_file(...)
```

**Option 2: Auto-detection (Recommended)**
```python
from huggingface_hub import HfApi

# Automatically uses HF_TOKEN env var
api = HfApi()  # ✅ Simpler, uses token from environment
api.upload_file(...)
```

**Option 3: With transformers/datasets**
```python
from transformers import AutoModel
from datasets import load_dataset

# Auto-detects HF_TOKEN from environment
model = AutoModel.from_pretrained("username/model")
dataset = load_dataset("username/dataset")

# For push operations, token is auto-detected
model.push_to_hub("username/new-model")
dataset.push_to_hub("username/new-dataset")
```

### Complete Example

```python
# /// script
# dependencies = ["huggingface-hub", "datasets"]
# ///

import os
from huggingface_hub import HfApi
from datasets import Dataset

# Verify token is available
assert "HF_TOKEN" in os.environ, "HF_TOKEN required for Hub operations!"

# Use token for Hub operations
api = HfApi()  # Auto-detects HF_TOKEN

# Create and push dataset
data = {"text": ["Hello", "World"]}
dataset = Dataset.from_dict(data)

# Push to Hub (token auto-detected)
dataset.push_to_hub("username/my-dataset")

print("✅ Dataset pushed successfully!")
```

## Token Verification

### Check Authentication Locally

```python
from huggingface_hub import whoami

try:
    user_info = whoami()
    print(f"✅ Logged in as: {user_info['name']}")
except Exception as e:
    print(f"❌ Not authenticated: {e}")
```

### Verify Token in Job

```python
import os

# Check token exists
if "HF_TOKEN" not in os.environ:
    raise ValueError("HF_TOKEN not found in environment!")

token = os.environ["HF_TOKEN"]

# Verify token format (should start with "hf_")
if not token.startswith("hf_"):
    raise ValueError(f"Invalid token format: {token[:10]}...")

# Test token works
from huggingface_hub import whoami
try:
    user_info = whoami(token=token)
    print(f"✅ Token valid for user: {user_info['name']}")
except Exception as e:
    raise ValueError(f"Token validation failed: {e}")
```

## Common Token Issues

### Error: 401 Unauthorized

**Symptoms:**
```
401 Client Error: Unauthorized for url: https://huggingface.co/api/...
```

**Causes:**
1. Token missing from job
2. Token invalid or expired
3. Token not passed correctly

**Solutions:**
1. Add `secrets={"HF_TOKEN": "$HF_TOKEN"}` to job config
2. Verify `hf_whoami()` works locally
3. Re-login: `hf auth login`
4. Check token hasn't expired

**Verification:**
```python
# In your script
import os
assert "HF_TOKEN" in os.environ, "HF_TOKEN missing!"
```

### Error: 403 Forbidden

**Symptoms:**
```
403 Client Error: Forbidden for url: https://huggingface.co/api/...
```

**Causes:**
1. Token lacks required permissions (read-only token used for write)
2. No access to private repository
3. Organization permissions insufficient

**Solutions:**
1. Ensure token has write permissions
2. Check token type at https://huggingface.co/settings/tokens
3. Verify access to target repository
4. Use organization token if needed

**Check token permissions:**
```python
from huggingface_hub import whoami

user_info = whoami()
print(f"User: {user_info['name']}")
print(f"Type: {user_info.get('type', 'user')}")
```

### Error: Token not found in environment

**Symptoms:**
```
KeyError: 'HF_TOKEN'
ValueError: HF_TOKEN not found
```

**Causes:**
1. `secrets` not passed in job config
2. Wrong key name (should be `HF_TOKEN`)
3. Using `env` instead of `secrets`

**Solutions:**
1. Use `secrets={"HF_TOKEN": "$HF_TOKEN"}` (not `env`)
2. Verify key name is exactly `HF_TOKEN`
3. Check job config syntax

**Correct configuration:**
```python
# ✅ Correct
hf_jobs("uv", {
    "script": "...",
    "secrets": {"HF_TOKEN": "$HF_TOKEN"}
})

# ❌ Wrong - using env instead of secrets
hf_jobs("uv", {
    "script": "...",
    "env": {"HF_TOKEN": "$HF_TOKEN"}  # Less secure
})

# ❌ Wrong - wrong key name
hf_jobs("uv", {
    "script": "...",
    "secrets": {"TOKEN": "$HF_TOKEN"}  # Wrong key
})
```

### Error: Repository access denied

**Symptoms:**
```
403 Client Error: Forbidden
Repository not found or access denied
```

**Causes:**
1. Token doesn't have access to private repo
2. Repository doesn't exist and can't be created
3. Wrong namespace

**Solutions:**
1. Use token from account with access
2. Verify repo visibility (public vs private)
3. Check namespace matches token owner
4. Create repo first if needed

**Check repository access:**
```python
from huggingface_hub import HfApi

api = HfApi()
try:
    repo_info = api.repo_info("username/repo-name")
    print(f"✅ Access granted: {repo_info.id}")
except Exception as e:
    print(f"❌ Access denied: {e}")
```

## Token Security Best Practices

### 1. Never Commit Tokens

**❌ Bad:**
```python
# Never do this!
token = "hf_abc123xyz..."
api = HfApi(token=token)
```

**✅ Good:**
```python
# Use environment variable
token = os.environ.get("HF_TOKEN")
api = HfApi(token=token)
```

### 2. Use Secrets, Not Environment Variables

**❌ Bad:**
```python
hf_jobs("uv", {
    "script": "...",
    "env": {"HF_TOKEN": "$HF_TOKEN"}  # Visible in logs
})
```

**✅ Good:**
```python
hf_jobs("uv", {
    "script": "...",
    "secrets": {"HF_TOKEN": "$HF_TOKEN"}  # Encrypted server-side
})
```

### 3. Use Automatic Token Replacement

**❌ Bad:**
```python
hf_jobs("uv", {
    "script": "...",
    "secrets": {"HF_TOKEN": "hf_abc123..."}  # Hardcoded
})
```

**✅ Good:**
```python
hf_jobs("uv", {
    "script": "...",
    "secrets": {"HF_TOKEN": "$HF_TOKEN"}  # Automatic
})
```

### 4. Rotate Tokens Regularly

- Generate new tokens periodically
- Revoke old tokens
- Update job configurations
- Monitor token usage

### 5. Use Minimal Permissions

- Create tokens with only needed permissions
- Use read tokens when write isn't needed
- Don't use admin tokens for regular jobs

### 6. Don't Share Tokens

- Each user should use their own token
- Don't commit tokens to repositories
- Don't share tokens in logs or messages

### 7. Monitor Token Usage

- Check token activity in Hub settings
- Review job logs for token issues
- Set up alerts for unauthorized access

## Token Workflow Examples

### Example 1: Push Model to Hub

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
# ... process model ...

# Push to Hub (token auto-detected)
model.push_to_hub("username/my-model")
print("✅ Model pushed!")
""",
    "flavor": "a10g-large",
    "timeout": "2h",
    "secrets": {"HF_TOKEN": "$HF_TOKEN"}  # ✅ Token provided
})
```

### Example 2: Access Private Dataset

```python
hf_jobs("uv", {
    "script": """
# /// script
# dependencies = ["datasets"]
# ///

import os
from datasets import load_dataset

# Verify token
assert "HF_TOKEN" in os.environ, "HF_TOKEN required!"

# Load private dataset (token auto-detected)
dataset = load_dataset("private-org/private-dataset")
print(f"✅ Loaded {len(dataset)} examples")
""",
    "flavor": "cpu-basic",
    "timeout": "30m",
    "secrets": {"HF_TOKEN": "$HF_TOKEN"}  # ✅ Token provided
})
```

### Example 3: Create and Push Dataset

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

# Create dataset
data = {"text": ["Sample 1", "Sample 2"]}
dataset = Dataset.from_dict(data)

# Push to Hub
api = HfApi()  # Auto-detects HF_TOKEN
dataset.push_to_hub("username/my-dataset")
print("✅ Dataset pushed!")
""",
    "flavor": "cpu-basic",
    "timeout": "30m",
    "secrets": {"HF_TOKEN": "$HF_TOKEN"}  # ✅ Token provided
})
```

## Quick Reference

### Token Checklist

Before submitting a job that uses Hub:

- [ ] Job includes `secrets={"HF_TOKEN": "$HF_TOKEN"}`
- [ ] Script checks for token: `assert "HF_TOKEN" in os.environ`
- [ ] Token has required permissions (read/write)
- [ ] User is logged in: `hf_whoami()` works
- [ ] Token not hardcoded in script
- [ ] Using `secrets` not `env` for token

### Common Patterns

**Pattern 1: Auto-detect token**
```python
from huggingface_hub import HfApi
api = HfApi()  # Uses HF_TOKEN from environment
```

**Pattern 2: Explicit token**
```python
import os
from huggingface_hub import HfApi
api = HfApi(token=os.environ.get("HF_TOKEN"))
```

**Pattern 3: Verify token**
```python
import os
assert "HF_TOKEN" in os.environ, "HF_TOKEN required!"
```

## Key Takeaways

1. **Always use `secrets={"HF_TOKEN": "$HF_TOKEN"}`** for Hub operations
2. **Never hardcode tokens** in scripts or job configs
3. **Verify token exists** in script before Hub operations
4. **Use auto-detection** when possible (`HfApi()` without token parameter)
5. **Check permissions** - ensure token has required access
6. **Monitor token usage** - review activity regularly
7. **Rotate tokens** - generate new tokens periodically

