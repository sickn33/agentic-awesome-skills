# ComfyUI Gateway -- Troubleshooting Guide

Comprehensive troubleshooting reference for diagnosing and resolving issues with the
ComfyUI Gateway. Every section follows the **Symptom -> Cause -> Solution** format
with concrete commands you can run immediately.

---

## Table of Contents

1. [ComfyUI Not Reachable](#1-comfyui-not-reachable)
2. [OOM (Out of Memory) Errors](#2-oom-out-of-memory-errors)
3. [Slow Generation](#3-slow-generation)
4. [Webhook Failures](#4-webhook-failures)
5. [Redis Connection Issues](#5-redis-connection-issues)
6. [Storage Errors](#6-storage-errors)
7. [Database Issues](#7-database-issues)
8. [Job Stuck in "running"](#8-job-stuck-in-running)
9. [Rate Limiting Issues](#9-rate-limiting-issues)
10. [Authentication Problems](#10-authentication-problems)

---

## 1. ComfyUI Not Reachable

The gateway returns `COMFYUI_UNREACHABLE` and the `/health` endpoint shows
`comfyui.reachable: false`.

### 1a. Wrong COMFYUI_URL

**Symptom**: Gateway starts fine but every job fails with `COMFYUI_UNREACHABLE`.
The health endpoint returns `{ ok: false, comfyui: { reachable: false } }`.

**Cause**: The `COMFYUI_URL` in `.env` does not point to a running ComfyUI instance.

**Solution**:

```bash
# 1. Verify what you have configured
grep COMFYUI_URL .env

# 2. Test connectivity from the gateway host
curl -s http://127.0.0.1:8188/
# Expected: HTML page or JSON from ComfyUI

# 3. If ComfyUI is on a different port or host, update .env
# Example: COMFYUI_URL=http://192.168.1.50:8188

# 4. Restart the gateway after changing .env
npm run dev
```

### 1b. Firewall Blocking the Port

**Symptom**: `curl` to the ComfyUI URL times out or returns `Connection refused`,
but ComfyUI is confirmed running on that machine.

**Cause**: A host firewall (Windows Defender, iptables, ufw) is blocking the port.

**Solution**:

```bash
# Linux (ufw)
sudo ufw allow 8188/tcp
sudo ufw reload

# Linux (iptables)
sudo iptables -A INPUT -p tcp --dport 8188 -j ACCEPT

# Windows (PowerShell, run as Admin)
New-NetFirewallRule -DisplayName "ComfyUI" -Direction Inbound -Port 8188 -Protocol TCP -Action Allow

# Verify the port is listening
# Linux
ss -tlnp | grep 8188
# Windows
netstat -an | findstr 8188
```

### 1c. Docker Networking

**Symptom**: Gateway running inside Docker cannot reach ComfyUI on `127.0.0.1:8188`.

**Cause**: `127.0.0.1` inside a Docker container refers to the container itself,
not the host machine.

**Solution**:

```bash
# Option A: Use Docker's special host DNS (Linux + Docker Desktop)
COMFYUI_URL=http://host.docker.internal:8188

# Option B: Use the host network mode
docker run --network host comfyui-gateway

# Option C: Put both containers on the same Docker network
docker network create comfy-net
docker run --name comfyui --network comfy-net ...
docker run --name gateway --network comfy-net -e COMFYUI_URL=http://comfyui:8188 ...

# Verify from inside the gateway container
docker exec -it gateway sh -c "wget -qO- http://comfyui:8188/ || echo FAIL"
```

### 1d. WSL2 Networking

**Symptom**: Gateway running on Windows/WSL2 cannot reach ComfyUI running on the
other side (host vs WSL or vice-versa).

**Cause**: WSL2 uses a virtual network adapter. The WSL2 guest and Windows host
have different IP addresses.

**Solution**:

```bash
# From WSL2, get the Windows host IP
cat /etc/resolv.conf | grep nameserver | awk '{print $2}'
# Example output: 172.25.192.1

# Set COMFYUI_URL to that IP
COMFYUI_URL=http://172.25.192.1:8188

# Alternatively, if ComfyUI runs inside WSL2 and the gateway is on Windows:
# Find WSL2 IP
wsl hostname -I
# Example output: 172.25.198.5
# Set: COMFYUI_URL=http://172.25.198.5:8188

# Make sure ComfyUI is listening on 0.0.0.0, not just 127.0.0.1
# Launch ComfyUI with: python main.py --listen 0.0.0.0
```

### 1e. ComfyUI Not Started or Crashed

**Symptom**: Port is not listening at all.

**Cause**: ComfyUI process is not running.

**Solution**:

```bash
# Check if the process is running
# Linux
ps aux | grep "main.py"
# Windows
tasklist | findstr python

# Start ComfyUI
cd /path/to/ComfyUI
python main.py --listen 0.0.0.0 --port 8188

# Check logs for startup errors
python main.py --listen 0.0.0.0 --port 8188 2>&1 | tail -50

# Verify it is accepting connections
curl -s http://127.0.0.1:8188/ && echo "OK" || echo "NOT REACHABLE"
```

---

## 2. OOM (Out of Memory) Errors

The gateway classifies these as `COMFYUI_OOM` with `retryable: false`.

### 2a. Resolution or Batch Size Too Large

**Symptom**: Job fails with error containing "CUDA out of memory",
"allocator backend out of memory", or "failed to allocate".

**Cause**: The requested image dimensions or batch size exceeds available VRAM.

**Solution**:

```bash
# 1. Reduce resolution in your job request
# Instead of 2048x2048, try 1024x1024 or 768x768
curl -X POST http://localhost:3000/jobs \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-key" \
  -d '{
    "workflowId": "sdxl_realism_v1",
    "inputs": {
      "prompt": "a mountain landscape",
      "width": 1024,
      "height": 1024
    }
  }'

# 2. Reduce batch size to 1
# Set in your job inputs: "batch_size": 1

# 3. Lower the gateway-level limits in .env
MAX_IMAGE_SIZE=1024
MAX_BATCH_SIZE=2
```

### 2b. Too Many Steps

**Symptom**: OOM occurs mid-generation, not immediately at submission.

**Cause**: The sampler accumulates intermediate tensors over many steps.

**Solution**:

```bash
# Reduce steps in the job inputs
# Instead of 50 steps, try 20-30
curl -X POST http://localhost:3000/jobs \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-key" \
  -d '{
    "workflowId": "sdxl_realism_v1",
    "inputs": {
      "prompt": "a portrait photo",
      "steps": 20,
      "width": 1024,
      "height": 1024
    }
  }'
```

### 2c. Model Quantization

**Symptom**: Even at low resolution, OOM errors occur because the model is too
large for the GPU (common on 8 GB VRAM cards with SDXL).

**Cause**: Full-precision (fp32) or half-precision (fp16) model weights exceed
available VRAM.

**Solution**:

```bash
# In ComfyUI, use fp8 or quantized checkpoints
# Update your workflow template to use a quantized model:
# e.g., "ckpt_name": "sdxl_base_1.0_fp8.safetensors"

# Or add --fp8_e4m3fn-unet flag when starting ComfyUI
python main.py --listen 0.0.0.0 --fp8_e4m3fn-unet

# Monitor VRAM usage
nvidia-smi -l 2
```

### 2d. VAE Tiling

**Symptom**: OOM happens during the VAE decode step (after sampling completes).

**Cause**: The VAE decoder processes the entire latent at once, which can be very
memory-intensive at high resolutions.

**Solution**:

```
Enable VAE tiling in your ComfyUI workflow by adding a "VAEDecodeTiled" node
instead of "VAEDecode". Tile size of 512 is a good default.

In the workflow JSON template:
{
  "10": {
    "class_type": "VAEDecodeTiled",
    "inputs": {
      "samples": ["3", 0],
      "vae": ["4", 2],
      "tile_size": 512
    }
  }
}
```

---

## 3. Slow Generation

### 3a. GPU Not Being Utilized

**Symptom**: Jobs complete but take much longer than expected. GPU utilization
stays near 0%.

**Cause**: ComfyUI is falling back to CPU inference, or the wrong GPU is selected.

**Solution**:

```bash
# 1. Check GPU utilization during a job
nvidia-smi -l 1
# Look for "GPU-Util" column -- should be 80-100% during sampling

# 2. Verify CUDA is available in ComfyUI
# Check ComfyUI startup logs for "Using device: cuda"

# 3. Force GPU selection (multi-GPU systems)
CUDA_VISIBLE_DEVICES=0 python main.py --listen 0.0.0.0

# 4. Verify PyTorch sees the GPU
python -c "import torch; print(torch.cuda.is_available()); print(torch.cuda.get_device_name(0))"
```

### 3b. Model Loading on Every Job

**Symptom**: First job is slow, subsequent jobs with the same workflow are faster,
but switching workflows causes long delays.

**Cause**: ComfyUI loads the model from disk each time a different checkpoint is
requested. This can take 10-30 seconds per model load.

**Solution**:

```bash
# 1. Increase ComfyUI's model cache
# Start ComfyUI with a larger cache (default is 1 model):
python main.py --listen 0.0.0.0 --cache-size 3

# 2. Use the same checkpoint across workflows when possible
# Standardize on one checkpoint (e.g., sdxl_base_1.0.safetensors)

# 3. Place models on an SSD, not an HDD
# Move ComfyUI/models/ to an NVMe drive for faster load times
```

### 3c. Queue Depth / Concurrency

**Symptom**: Jobs are queued for a long time before starting.
The job stays in `status: "queued"` for minutes.

**Cause**: The worker concurrency is set to 1 (default) and multiple jobs are
queued, or the single slot is occupied by a long-running job.

**Solution**:

```bash
# 1. Check current queue state
curl -s http://localhost:3000/jobs?status=queued | jq '.count'
curl -s http://localhost:3000/jobs?status=running | jq '.count'

# 2. Increase concurrency if your GPU can handle it (multi-batch)
# Edit .env:
MAX_CONCURRENCY=2

# WARNING: Only increase if you have enough VRAM for parallel jobs.
# Two concurrent 1024x1024 SDXL jobs need ~20+ GB VRAM.

# 3. For multi-GPU setups, run multiple worker processes
# Terminal 1: CUDA_VISIBLE_DEVICES=0 npm run start:worker
# Terminal 2: CUDA_VISIBLE_DEVICES=1 npm run start:worker
# Both connect to the same Redis queue
```

### 3d. ComfyUI Startup Time

**Symptom**: The very first job after starting ComfyUI takes 30-60 seconds even
for a simple generation.

**Cause**: ComfyUI performs initialization (loading nodes, compiling, warming up
CUDA) on the first prompt.

**Solution**:

```bash
# 1. Send a warm-up job immediately after starting ComfyUI
# This is a tiny 64x64 generation that forces initialization
curl -X POST http://localhost:3000/jobs \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-key" \
  -d '{
    "workflowId": "sdxl_realism_v1",
    "inputs": {
      "prompt": "test",
      "width": 64,
      "height": 64,
      "steps": 1
    }
  }'

# 2. Increase the gateway timeout to account for cold starts
COMFYUI_TIMEOUT_MS=600000
```

---

## 4. Webhook Failures

Webhook errors appear in logs as `WEBHOOK_DELIVERY_FAILED`.

### 4a. DNS Resolution Failure

**Symptom**: Webhook fails with "getaddrinfo ENOTFOUND" or "DNS lookup failed".

**Cause**: The callback URL hostname cannot be resolved.

**Solution**:

```bash
# 1. Test DNS resolution from the gateway host
nslookup your-webhook-domain.com
dig your-webhook-domain.com

# 2. If using a local hostname (e.g., within Docker), make sure it is resolvable
# Add to /etc/hosts if needed:
echo "192.168.1.50 my-webhook-server" | sudo tee -a /etc/hosts

# 3. Verify the callback URL is correct in your job request
curl -X POST http://localhost:3000/jobs \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-key" \
  -d '{
    "workflowId": "sdxl_realism_v1",
    "inputs": { "prompt": "test" },
    "callbackUrl": "https://your-valid-domain.com/webhook"
  }'
```

### 4b. SSL Certificate Errors

**Symptom**: Webhook fails with "self signed certificate", "CERT_HAS_EXPIRED",
or "unable to verify the first certificate".

**Cause**: The webhook receiver uses an invalid, expired, or self-signed SSL certificate.

**Solution**:

```bash
# 1. Test the certificate manually
openssl s_client -connect your-webhook-domain.com:443 -servername your-webhook-domain.com < /dev/null 2>&1 | head -20

# 2. Check expiration
echo | openssl s_client -connect your-webhook-domain.com:443 2>/dev/null | openssl x509 -noout -dates

# 3. For development with self-signed certs, set NODE_TLS_REJECT_UNAUTHORIZED
# WARNING: Do NOT use this in production
NODE_TLS_REJECT_UNAUTHORIZED=0 npm run dev

# 4. For production, fix the certificate (use Let's Encrypt or a valid CA)
```

### 4c. Webhook Timeout

**Symptom**: Webhook logs show "AbortError" or "Webhook POST timed out".

**Cause**: The webhook receiver takes longer than 10 seconds to respond.
The gateway has a hardcoded 10-second timeout per webhook attempt with
3 retries and exponential backoff.

**Solution**:

```bash
# 1. Ensure your webhook receiver responds quickly
# The receiver should return 200 immediately and process asynchronously
# BAD:  app.post("/webhook", async (req, res) => { await longProcess(); res.send("ok"); })
# GOOD: app.post("/webhook", (req, res) => { res.send("ok"); enqueueWork(req.body); })

# 2. Test receiver response time
time curl -s -o /dev/null -w "%{time_total}" -X POST https://your-webhook.com/callback \
  -H "Content-Type: application/json" -d '{"test": true}'
# Should be < 2 seconds
```

### 4d. Domain Not in Allowlist

**Symptom**: Job creation fails with `Callback domain "example.com" is not in the
allowed domains list`.

**Cause**: `WEBHOOK_ALLOWED_DOMAINS` is configured and does not include the
callback URL's domain.

**Solution**:

```bash
# 1. Check current setting
grep WEBHOOK_ALLOWED_DOMAINS .env

# 2. Add the domain (comma-separated list)
WEBHOOK_ALLOWED_DOMAINS=your-app.com,n8n.your-domain.com,*.internal.company.com

# 3. Or allow all domains (less secure, suitable for development)
WEBHOOK_ALLOWED_DOMAINS=*

# 4. Restart the gateway
npm run dev
```

### 4e. HMAC Signature Mismatch

**Symptom**: Your webhook receiver receives the POST but HMAC validation fails
on your end.

**Cause**: The `WEBHOOK_SECRET` configured in the gateway does not match the secret
your receiver uses to validate signatures, or the signature computation differs.

**Solution**:

```bash
# 1. Verify the WEBHOOK_SECRET matches on both sides
grep WEBHOOK_SECRET .env

# 2. The gateway sends: X-Signature: sha256=<hex>
# Computed as: HMAC-SHA256(secret, raw_body_string)
# Verify in Node.js:
node -e "
const crypto = require('crypto');
const secret = 'your-webhook-secret';
const body = '{\"jobId\":\"test\",\"status\":\"succeeded\"}';
const sig = crypto.createHmac('sha256', secret).update(body, 'utf8').digest('hex');
console.log('Expected header: sha256=' + sig);
"

# 3. Common mistakes:
# - Parsing the body before computing HMAC (must use raw string)
# - Using different encodings (gateway uses utf8)
# - Comparing strings case-sensitively (hex is lowercase)
```

---

## 5. Redis Connection Issues

### 5a. Cannot Connect to Redis

**Symptom**: Gateway crashes at startup with "Redis connection error" or
"ECONNREFUSED" targeting the Redis port.

**Cause**: Redis server is not running, or the `REDIS_URL` is wrong.

**Solution**:

```bash
# 1. Check if Redis is running
redis-cli ping
# Expected: PONG

# 2. Verify the URL format
# Correct formats:
#   redis://localhost:6379
#   redis://:yourpassword@redis-host:6379/0
#   rediss://user:password@host:6380/0  (TLS)

# 3. Test connectivity
redis-cli -u "redis://localhost:6379" ping

# 4. If Redis is not needed, remove REDIS_URL to use in-memory queue
# Edit .env:
REDIS_URL=
# The gateway falls back to an in-memory queue automatically
```

### 5b. Redis Authentication Failure

**Symptom**: Error message contains "NOAUTH Authentication required" or
"ERR invalid password".

**Cause**: Redis requires a password but `REDIS_URL` does not include one,
or the password is wrong.

**Solution**:

```bash
# 1. Include the password in the URL
REDIS_URL=redis://:your_redis_password@localhost:6379/0

# 2. Test with redis-cli
redis-cli -a "your_redis_password" ping

# 3. Check Redis config for requirepass
redis-cli CONFIG GET requirepass
```

### 5c. Fallback to In-Memory Queue

**Symptom**: Logs show "No Redis URL configured, using in-memory queue" and
you expected BullMQ.

**Cause**: `REDIS_URL` is empty or not set in `.env`.

**Solution**:

```bash
# 1. Set REDIS_URL in .env
REDIS_URL=redis://localhost:6379

# 2. Verify Redis is running
redis-cli ping

# 3. Restart the gateway
npm run dev

# 4. Confirm in logs: should show "Redis URL configured, using BullMQ worker"
```

> **Note**: The in-memory queue is fine for single-instance development deployments.
> For production with multiple workers or durability requirements, use Redis + BullMQ.

---

## 6. Storage Errors

### 6a. Local Disk Permission Denied

**Symptom**: Job fails at the output storage step with "EACCES: permission denied"
or `STORAGE_READ_ERROR`.

**Cause**: The gateway process does not have write permissions to `STORAGE_LOCAL_PATH`.

**Solution**:

```bash
# 1. Check the configured path
grep STORAGE_LOCAL_PATH .env
# Default: ./data/outputs

# 2. Ensure the directory exists and is writable
mkdir -p ./data/outputs
chmod 755 ./data/outputs

# 3. Check ownership
ls -la ./data/

# 4. If running as a different user (e.g., in Docker)
chown -R node:node ./data/outputs

# 5. For Docker, mount a volume with correct permissions
# docker run -v /host/path/outputs:/app/data/outputs ...
```

### 6b. S3 Credentials Invalid

**Symptom**: Job fails with `STORAGE_S3_PUT_ERROR` and the underlying error
mentions "InvalidAccessKeyId", "SignatureDoesNotMatch", or "AccessDenied".

**Cause**: The `S3_ACCESS_KEY` / `S3_SECRET_KEY` are wrong, expired, or the
IAM policy does not grant `s3:PutObject` permission.

**Solution**:

```bash
# 1. Verify credentials are set
grep S3_ACCESS_KEY .env
grep S3_SECRET_KEY .env
grep S3_BUCKET .env

# 2. Test with AWS CLI
aws s3 ls s3://your-bucket/ \
  --endpoint-url http://your-minio:9000 \
  --region us-east-1

# 3. Test a put operation
echo "test" > /tmp/test.txt
aws s3 cp /tmp/test.txt s3://your-bucket/test.txt \
  --endpoint-url http://your-minio:9000

# 4. Minimum IAM policy for the gateway:
# {
#   "Version": "2012-10-17",
#   "Statement": [{
#     "Effect": "Allow",
#     "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject", "s3:ListBucket"],
#     "Resource": ["arn:aws:s3:::your-bucket", "arn:aws:s3:::your-bucket/*"]
#   }]
# }
```

### 6c. MinIO Configuration

**Symptom**: S3 storage fails with "socket hang up", "ECONNREFUSED", or
"Bucket does not exist".

**Cause**: MinIO endpoint is wrong, the bucket has not been created, or
`forcePathStyle` is not enabled (handled automatically by the gateway).

**Solution**:

```bash
# 1. Verify MinIO is running
curl http://localhost:9000/minio/health/live
# Expected: HTTP 200

# 2. Set the correct endpoint in .env
S3_ENDPOINT=http://localhost:9000
S3_BUCKET=comfyui-outputs
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_REGION=us-east-1

# 3. Create the bucket if it does not exist
# Using mc (MinIO Client)
mc alias set local http://localhost:9000 minioadmin minioadmin
mc mb local/comfyui-outputs

# Or using AWS CLI
aws s3 mb s3://comfyui-outputs --endpoint-url http://localhost:9000
```

---

## 7. Database Issues

### 7a. SQLite WAL Lock Errors

**Symptom**: Intermittent "SQLITE_BUSY" or "database is locked" errors under
concurrent load.

**Cause**: Multiple processes or threads are writing to the SQLite database
simultaneously. SQLite WAL mode supports concurrent readers but only one writer.

**Solution**:

```bash
# 1. The gateway already sets optimal pragmas:
#    journal_mode = WAL
#    synchronous = NORMAL
#    busy_timeout = 5000 (5 seconds)

# 2. If running multiple gateway instances, switch to Postgres
DATABASE_URL=postgresql://user:password@localhost:5432/comfyui_gateway

# 3. If you must use SQLite with a single instance, increase busy timeout
# (requires code change or env override):
# The default 5000ms should be sufficient for most single-instance use cases

# 4. Check for stuck WAL files
ls -la ./data/gateway.db*
# You should see: gateway.db, gateway.db-wal, gateway.db-shm

# 5. If the database is corrupted, try recovery
sqlite3 ./data/gateway.db "PRAGMA integrity_check;"
# If it reports errors, back up and recreate:
cp ./data/gateway.db ./data/gateway.db.bak
sqlite3 ./data/gateway.db ".recover" | sqlite3 ./data/gateway_recovered.db
```

### 7b. Postgres Connection Pooling

**Symptom**: Errors like "too many clients already", "remaining connection slots
are reserved", or intermittent "Connection terminated unexpectedly".

**Cause**: The gateway opens too many connections to Postgres, exceeding
`max_connections`, or connections are not being properly returned to the pool.

**Solution**:

```bash
# 1. Check current connections in Postgres
psql -c "SELECT count(*) FROM pg_stat_activity WHERE datname = 'comfyui_gateway';"

# 2. Check max_connections setting
psql -c "SHOW max_connections;"

# 3. Use a connection pooler like PgBouncer
# Install PgBouncer and point DATABASE_URL to it
DATABASE_URL=postgresql://user:password@localhost:6432/comfyui_gateway

# 4. If running multiple gateway instances, ensure the total pool size
# across all instances does not exceed Postgres max_connections
```

### 7c. Database URL Format

**Symptom**: Gateway crashes at startup with "Invalid connection string" or
uses SQLite when you intended Postgres.

**Cause**: The `DATABASE_URL` format is wrong. The gateway checks if the URL
starts with `postgres://` or `postgresql://` to select the Postgres backend.

**Solution**:

```bash
# SQLite formats (all valid):
DATABASE_URL=./data/gateway.db
DATABASE_URL=/absolute/path/to/gateway.db

# Postgres formats (must start with postgres:// or postgresql://):
DATABASE_URL=postgresql://user:password@localhost:5432/comfyui_gateway
DATABASE_URL=postgres://user:password@host:5432/dbname?sslmode=require
```

---

## 8. Job Stuck in "running"

### 8a. ComfyUI Crashed During Execution

**Symptom**: A job shows `status: "running"` indefinitely. No progress updates.
The gateway health endpoint may show `comfyui.reachable: false`.

**Cause**: ComfyUI crashed (segfault, CUDA error, killed by OOM killer) while
processing the job, and the gateway's WebSocket connection was severed.

**Solution**:

```bash
# 1. Check job status
curl -s http://localhost:3000/jobs/<jobId> | jq '.status'

# 2. Check if ComfyUI is still running
curl -s http://localhost:3000/health | jq '.comfyui.reachable'

# 3. If ComfyUI crashed, restart it
cd /path/to/ComfyUI
python main.py --listen 0.0.0.0

# 4. The stuck job will eventually time out (COMFYUI_TIMEOUT_MS, default 5 min)
# and be marked as failed with COMFYUI_TIMEOUT

# 5. To immediately cancel the stuck job
curl -X POST http://localhost:3000/jobs/<jobId>/cancel \
  -H "X-API-Key: your-key"

# 6. To reduce timeout for faster failure detection
COMFYUI_TIMEOUT_MS=120000
```

### 8b. WebSocket Disconnection

**Symptom**: Job stays "running" but ComfyUI is actually done. The output
exists in ComfyUI's history.

**Cause**: The WebSocket connection dropped mid-execution, and the polling
fallback failed to pick up the result.

**Solution**:

```bash
# 1. Check ComfyUI history directly
curl -s http://127.0.0.1:8188/history | jq 'keys | length'

# 2. The gateway automatically falls back to HTTP polling if WebSocket fails.
# If polling also fails, the job times out.

# 3. Restart the gateway to reset connections
npm run dev

# 4. Check network stability between gateway and ComfyUI
ping -c 10 <comfyui-host>
```

### 8c. Restart Recovery

**Symptom**: After restarting the gateway, jobs that were "running" remain
in that state permanently.

**Cause**: The in-memory queue loses track of running jobs when the process
restarts. There is no automatic recovery for in-memory jobs.

**Solution**:

```bash
# 1. For production, use Redis (BullMQ) for durable job queues
REDIS_URL=redis://localhost:6379

# 2. Manually fail stuck jobs via the database
sqlite3 ./data/gateway.db \
  "UPDATE jobs SET status='failed', errorJson='{\"code\":\"GATEWAY_RESTART\",\"message\":\"Job interrupted by gateway restart\"}', completedAt=datetime('now') WHERE status='running';"

# 3. Verify
sqlite3 ./data/gateway.db "SELECT id, status FROM jobs WHERE status='running';"
```

---

## 9. Rate Limiting Issues

### 9a. Identifying You Are Being Rate Limited

**Symptom**: API returns HTTP 429 with body `{ "error": "RATE_LIMITED" }` and
a `Retry-After` header.

**Cause**: You exceeded `RATE_LIMIT_MAX` requests within the `RATE_LIMIT_WINDOW_MS`
window. Limits are applied per API key or per IP.

**Solution**:

```bash
# 1. Check the response headers
curl -v http://localhost:3000/health -H "X-API-Key: your-key" 2>&1 | grep -i "x-ratelimit"
# X-RateLimit-Limit: 100
# X-RateLimit-Remaining: 0
# Retry-After: 42

# 2. Wait for the Retry-After period, then retry

# 3. Implement exponential backoff in your client
```

### 9b. Adjusting Rate Limits

**Symptom**: Legitimate usage is being throttled.

**Cause**: Default limits (100 requests/minute) are too low for your workload.

**Solution**:

```bash
# 1. Increase the limit in .env
RATE_LIMIT_MAX=500
RATE_LIMIT_WINDOW_MS=60000

# 2. For burst workloads, widen the window
RATE_LIMIT_MAX=1000
RATE_LIMIT_WINDOW_MS=300000

# 3. Restart the gateway
npm run dev

# 4. Note: Rate limits are per API key (if authenticated) or per IP.
# Different API keys have independent counters.
```

### 9c. Rate Limit Per API Key vs Per IP

**Symptom**: Different clients sharing the same IP are interfering with each
other's rate limits.

**Cause**: Without API keys, all requests from the same IP share a single
rate-limit bucket.

**Solution**:

```bash
# 1. Assign unique API keys to each client
API_KEYS=client1-key:user,client2-key:user,admin-key:admin

# 2. Each client uses its own X-API-Key header
# Client 1: -H "X-API-Key: client1-key"
# Client 2: -H "X-API-Key: client2-key"

# 3. Each key gets its own independent rate-limit counter
```

---

## 10. Authentication Problems

### 10a. API Key Not Accepted

**Symptom**: Every request returns HTTP 401 with `{ "error": "AUTH_FAILED",
"message": "Invalid API key" }`.

**Cause**: The `X-API-Key` header value does not match any entry in `API_KEYS`.

**Solution**:

```bash
# 1. Check configured keys
grep API_KEYS .env
# Format: key1:admin,key2:user

# 2. Ensure your request uses the exact key (no extra whitespace)
curl -H "X-API-Key: mykey123" http://localhost:3000/health

# 3. Keys are case-sensitive and matched exactly

# 4. If API_KEYS is empty, authentication is DISABLED (development mode)
# All requests are treated as admin. Set keys for production:
API_KEYS=sk-prod-abc123:admin,sk-user-xyz789:user
```

### 10b. JWT Token Expired

**Symptom**: Request returns `{ "error": "AUTH_FAILED", "message": "JWT token
has expired" }`.

**Cause**: The JWT `exp` claim is in the past.

**Solution**:

```bash
# 1. Decode the JWT to check expiration (without verification)
echo "<your-token>" | cut -d'.' -f2 | base64 -d 2>/dev/null | jq '.exp'

# 2. Compare with current time
date +%s

# 3. Generate a new token with a longer TTL
# Example using Node.js:
node -e "
const crypto = require('crypto');
const secret = 'your-jwt-secret';
const header = Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url');
const payload = Buffer.from(JSON.stringify({
  sub: 'user-1',
  role: 'admin',
  iat: Math.floor(Date.now()/1000),
  exp: Math.floor(Date.now()/1000) + 86400  // 24 hours
})).toString('base64url');
const sig = crypto.createHmac('sha256', secret).update(header+'.'+payload).digest('base64url');
console.log(header+'.'+payload+'.'+sig);
"
```

### 10c. JWT Signature Invalid

**Symptom**: Request returns `{ "error": "AUTH_FAILED", "message": "Invalid JWT
signature" }`.

**Cause**: The JWT was signed with a different secret than what is configured in
`JWT_SECRET`.

**Solution**:

```bash
# 1. Verify the secret matches on token-issuer side and gateway side
grep JWT_SECRET .env

# 2. The gateway uses HMAC-SHA256 (HS256) exclusively
# Make sure your token issuer also uses HS256 with the same secret

# 3. Re-generate the token using the correct secret
```

### 10d. No Authentication Header Provided

**Symptom**: Request returns `{ "error": "AUTH_FAILED", "message": "Authentication
required. Provide X-API-Key header or Authorization: Bearer token." }`.

**Cause**: The request has no `X-API-Key` header and no `Authorization: Bearer`
header, and authentication is enabled (API_KEYS or JWT_SECRET is set).

**Solution**:

```bash
# Option A: Use API Key
curl -H "X-API-Key: your-key" http://localhost:3000/health

# Option B: Use JWT Bearer token
curl -H "Authorization: Bearer your.jwt.token" http://localhost:3000/health

# Option C: Disable auth for development (NOT for production)
# Remove all values from API_KEYS and JWT_SECRET in .env:
API_KEYS=
JWT_SECRET=
```

### 10e. Insufficient Permissions (Forbidden)

**Symptom**: Request returns HTTP 403 with `{ "error": "FORBIDDEN", "message":
"Admin role required for this operation" }`.

**Cause**: You are using a `user` role key to perform an admin-only action
(workflow CRUD).

**Solution**:

```bash
# 1. Check which role your key has
grep API_KEYS .env
# Example: sk-user-key:user,sk-admin-key:admin

# 2. Use the admin key for workflow management
curl -H "X-API-Key: sk-admin-key" -X POST http://localhost:3000/workflows ...

# 3. User role can: create jobs, read own jobs, view health/capabilities
# Admin role can: everything the user can + workflow CRUD + view all jobs
```

---

## Quick Diagnostic Commands

```bash
# Gateway health
curl -s http://localhost:3000/health | jq .

# ComfyUI direct connectivity
curl -s http://127.0.0.1:8188/ | head -5

# Queue status
curl -s http://localhost:3000/jobs?status=queued -H "X-API-Key: KEY" | jq '.count'
curl -s http://localhost:3000/jobs?status=running -H "X-API-Key: KEY" | jq '.count'

# GPU memory
nvidia-smi --query-gpu=memory.used,memory.total --format=csv,noheader

# Redis connectivity
redis-cli -u "$REDIS_URL" ping

# SQLite integrity
sqlite3 ./data/gateway.db "PRAGMA integrity_check;"

# Logs (if using pino-pretty)
npm run dev 2>&1 | npx pino-pretty

# Check all configured environment variables
grep -v '^#' .env | grep -v '^$'
```
