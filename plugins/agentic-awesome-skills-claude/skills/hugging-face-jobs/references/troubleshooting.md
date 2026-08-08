# Troubleshooting Guide

Common issues and solutions for Hugging Face Jobs.

## Authentication Issues

### Error: 401 Unauthorized

**Symptoms:**
```
401 Client Error: Unauthorized for url: https://huggingface.co/api/...
```

**Causes:**
- Token missing from job
- Token invalid or expired
- Token not passed correctly

**Solutions:**
1. Add token to secrets: `hf_jobs` MCP uses `"$HF_TOKEN"` (auto-replaced); `HfApi().run_uv_job()` MUST use `get_token()` from `huggingface_hub` (the literal string `"$HF_TOKEN"` will NOT work with the Python API)
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
- Token lacks required permissions
- No access to private repository
- Organization permissions insufficient

**Solutions:**
1. Ensure token has write permissions
2. Check token type at https://huggingface.co/settings/tokens
3. Verify access to target repository
4. Use organization token if needed

### Error: Token not found in environment

**Symptoms:**
```
KeyError: 'HF_TOKEN'
ValueError: HF_TOKEN not found
```

**Causes:**
- `secrets` not passed in job config
- Wrong key name (should be `HF_TOKEN`)
- Using `env` instead of `secrets`

**Solutions:**
1. Use `secrets` (not `env`) — with `hf_jobs` MCP: `"$HF_TOKEN"`; with `HfApi().run_uv_job()`: `get_token()`
2. Verify key name is exactly `HF_TOKEN`
3. Check job config syntax

## Job Execution Issues

### Error: Job Timeout

**Symptoms:**
- Job stops unexpectedly
- Status shows "TIMEOUT"
- Partial results only

**Causes:**
- Default 30min timeout exceeded
- Job takes longer than expected
- No timeout specified

**Solutions:**
1. Check logs for actual runtime
2. Increase timeout with buffer: `"timeout": "3h"`
3. Optimize code for faster execution
4. Process data in chunks
5. Add 20-30% buffer to estimated time

**MCP Tool Example:**
```python
hf_jobs("uv", {
    "script": "...",
    "timeout": "2h"  # Set appropriate timeout
})
```

**Python API Example:**
```python
from huggingface_hub import run_uv_job, inspect_job, fetch_job_logs

job = run_uv_job("script.py", timeout="4h")

# Check if job failed
job_info = inspect_job(job_id=job.id)
if job_info.status.stage == "ERROR":
    print(f"Job failed: {job_info.status.message}")
    # Check logs for details
    for log in fetch_job_logs(job_id=job.id):
        print(log)
```

### Error: Out of Memory (OOM)

**Symptoms:**
```
RuntimeError: CUDA out of memory
MemoryError: Unable to allocate array
```

**Causes:**
- Batch size too large
- Model too large for hardware
- Insufficient GPU memory

**Solutions:**
1. Reduce batch size
2. Process data in smaller chunks
3. Upgrade hardware: cpu → t4 → a10g → a100
4. Use smaller models or quantization
5. Enable gradient checkpointing (for training)

**Example:**
```python
# Reduce batch size
batch_size = 1

# Process in chunks
for chunk in chunks:
    process(chunk)
```

### Error: Missing Dependencies

**Symptoms:**
```
ModuleNotFoundError: No module named 'package_name'
ImportError: cannot import name 'X'
```

**Causes:**
- Package not in dependencies
- Wrong package name
- Version mismatch

**Solutions:**
1. Add to PEP 723 header:
   ```python
   # /// script
   # dependencies = ["package-name>=1.0.0"]
   # ///
   ```
2. Check package name spelling
3. Specify version if needed
4. Check package availability

### Error: Script Not Found

**Symptoms:**
```
FileNotFoundError: script.py not found
```

**Causes:**
- Local file path used (not supported)
- URL incorrect
- Script not accessible

**Solutions:**
1. Use inline script (recommended)
2. Use publicly accessible URL
3. Upload script to Hub first
4. Check URL is correct

**Correct approaches:**
```python
# ✅ Inline code
hf_jobs("uv", {"script": "# /// script\n# dependencies = [...]\n# ///\n\n<code>"})

# ✅ From URL
hf_jobs("uv", {"script": "https://huggingface.co/user/repo/resolve/main/script.py"})
```

## Hub Push Issues

### Error: Push Failed

**Symptoms:**
```
Error pushing to Hub
Upload failed
```

**Causes:**
- Network issues
- Token missing or invalid
- Repository access denied
- File too large

**Solutions:**
1. Check token: `assert "HF_TOKEN" in os.environ`
2. Verify repository exists or can be created
3. Check network connectivity in logs
4. Retry push operation
5. Split large files into chunks

### Error: Repository Not Found

**Symptoms:**
```
404 Client Error: Not Found
Repository not found
```

**Causes:**
- Repository doesn't exist
- Wrong repository name
- No access to private repo

**Solutions:**
1. Create repository first:
   ```python
   from huggingface_hub import HfApi
   api = HfApi()
   api.create_repo("username/repo-name", repo_type="dataset")
   ```
2. Check repository name format
3. Verify namespace exists
4. Check repository visibility

### Error: Results Not Saved

**Symptoms:**
- Job completes successfully
- No results visible on Hub
- Files not persisted

**Causes:**
- No persistence code in script
- Push code not executed
- Push failed silently

**Solutions:**
1. Add persistence code to script
2. Verify push executes successfully
3. Check logs for push errors
4. Add error handling around push

**Example:**
```python
try:
    dataset.push_to_hub("username/dataset")
    print("✅ Push successful")
except Exception as e:
    print(f"❌ Push failed: {e}")
    raise
```

## Hardware Issues

### Error: GPU Not Available

**Symptoms:**
```
CUDA not available
No GPU found
```

**Causes:**
- CPU flavor used instead of GPU
- GPU not requested
- CUDA not installed in image

**Solutions:**
1. Use GPU flavor: `"flavor": "a10g-large"`
2. Check image has CUDA support
3. Verify GPU availability in logs

### Error: Slow Performance

**Symptoms:**
- Job takes longer than expected
- Low GPU utilization
- CPU bottleneck

**Causes:**
- Wrong hardware selected
- Inefficient code
- Data loading bottleneck

**Solutions:**
1. Upgrade hardware
2. Optimize code
3. Use batch processing
4. Profile code to find bottlenecks

## General Issues

### Error: Job Status Unknown

**Symptoms:**
- Can't check job status
- Status API returns error

**Solutions:**
1. Use job URL: `https://huggingface.co/jobs/username/job-id`
2. Check logs: `hf_jobs("logs", {"job_id": "..."})`
3. Inspect job: `hf_jobs("inspect", {"job_id": "..."})`

### Error: Logs Not Available

**Symptoms:**
- No logs visible
- Logs delayed

**Causes:**
- Job just started (logs delayed 30-60s)
- Job failed before logging
- Logs not yet generated

**Solutions:**
1. Wait 30-60 seconds after job start
2. Check job status first
3. Use job URL for web interface

### Error: Cost Unexpectedly High

**Symptoms:**
- Job costs more than expected
- Longer runtime than estimated

**Causes:**
- Job ran longer than timeout
- Wrong hardware selected
- Inefficient code

**Solutions:**
1. Monitor job runtime
2. Set appropriate timeout
3. Optimize code
4. Choose right hardware
5. Check cost estimates before running

## Debugging Tips

### 1. Add Logging

```python
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

logger.info("Starting processing...")
logger.info(f"Processed {count} items")
```

### 2. Verify Environment

```python
import os
print(f"Python version: {os.sys.version}")
print(f"CUDA available: {torch.cuda.is_available()}")
print(f"HF_TOKEN present: {'HF_TOKEN' in os.environ}")
```

### 3. Test Locally First

Run script locally before submitting to catch errors early:
```bash
python script.py
# Or with uv
uv run script.py
```

### 4. Check Job Logs

**MCP Tool:**
```python
# View logs
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

**Or use job URL:** `https://huggingface.co/jobs/username/job-id`

### 5. Add Error Handling

```python
try:
    # Your code
    process_data()
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
    raise
```

### 6. Check Job Status Programmatically

```python
from huggingface_hub import inspect_job, fetch_job_logs

job_info = inspect_job(job_id="your-job-id")
print(f"Status: {job_info.status.stage}")
print(f"Message: {job_info.status.message}")

if job_info.status.stage == "ERROR":
    print("Job failed! Logs:")
    for log in fetch_job_logs(job_id="your-job-id"):
        print(log)
```

## Quick Reference

### Common Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| 401 | Unauthorized | Add token to secrets: MCP uses `"$HF_TOKEN"`, Python API uses `get_token()` |
| 403 | Forbidden | Check token permissions |
| 404 | Not Found | Verify repository exists |
| 500 | Server Error | Retry or contact support |

### Checklist Before Submitting

- [ ] Token configured: MCP uses `secrets={"HF_TOKEN": "$HF_TOKEN"}`, Python API uses `secrets={"HF_TOKEN": get_token()}`
- [ ] Script checks for token: `assert "HF_TOKEN" in os.environ`
- [ ] Timeout set appropriately
- [ ] Hardware selected correctly
- [ ] Dependencies listed in PEP 723 header
- [ ] Persistence code included
- [ ] Error handling added
- [ ] Logging added for debugging

## Getting Help

If issues persist:

1. **Check logs** - Most errors include detailed messages
2. **Review documentation** - See main SKILL.md
3. **Check Hub status** - https://status.huggingface.co
4. **Community forums** - https://discuss.huggingface.co
5. **GitHub issues** - For bugs in huggingface_hub

## Key Takeaways

1. **Always include token** - MCP: `secrets={"HF_TOKEN": "$HF_TOKEN"}`, Python API: `secrets={"HF_TOKEN": get_token()}`
2. **Set appropriate timeout** - Default 30min may be insufficient
3. **Verify persistence** - Results won't persist without code
4. **Check logs** - Most issues visible in job logs
5. **Test locally** - Catch errors before submitting
6. **Add error handling** - Better debugging information
7. **Monitor costs** - Set timeouts to avoid unexpected charges

