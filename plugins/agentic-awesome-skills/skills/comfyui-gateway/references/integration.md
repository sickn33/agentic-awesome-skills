# ComfyUI Gateway -- Integration Guide

Complete integration reference with ready-to-use code examples for every endpoint
and common platforms. All examples assume the gateway is running at
`http://localhost:3000` with API key authentication enabled.

---

## Table of Contents

1. [curl Examples (Every Endpoint)](#1-curl-examples)
2. [n8n Webhook Workflow](#2-n8n-webhook-workflow)
3. [Supabase Edge Function](#3-supabase-edge-function)
4. [Claude Code Integration](#4-claude-code-integration)
5. [Python Requests Client](#5-python-requests-client)
6. [JavaScript/TypeScript Fetch Client](#6-javascripttypescript-fetch-client)
7. [Webhook Receiver (Express.js + HMAC)](#7-webhook-receiver-expressjs--hmac)
8. [Docker Compose](#8-docker-compose)
9. [Environment Configuration Examples](#9-environment-configuration-examples)

---

## 1. curl Examples

### Health Check

```bash
curl -s http://localhost:3000/health | jq .
```

Response:

```json
{
  "ok": true,
  "version": null,
  "comfyui": {
    "reachable": true,
    "url": "http://127.0.0.1:8188"
  },
  "uptime": 1234.567
}
```

### Capabilities

```bash
curl -s http://localhost:3000/capabilities \
  -H "X-API-Key: your-api-key" | jq .
```

Response:

```json
{
  "workflows": [
    { "id": "sdxl_realism_v1", "name": "SDXL Realism v1", "description": "..." },
    { "id": "sprite_transparent_bg", "name": "Sprite Transparent BG", "description": "..." }
  ],
  "maxSize": 2048,
  "maxBatch": 4,
  "formats": ["png", "jpg", "webp"],
  "storageProvider": "local"
}
```

### List Workflows

```bash
curl -s http://localhost:3000/workflows \
  -H "X-API-Key: your-api-key" | jq .
```

### Get Workflow Details

```bash
curl -s http://localhost:3000/workflows/sdxl_realism_v1 \
  -H "X-API-Key: your-api-key" | jq .
```

### Create Workflow (Admin)

```bash
curl -X POST http://localhost:3000/workflows \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-admin-key" \
  -d '{
    "id": "my_custom_workflow",
    "name": "My Custom Workflow",
    "description": "A custom txt2img workflow",
    "workflowJson": {
      "3": {
        "class_type": "KSampler",
        "inputs": {
          "seed": "{{seed}}",
          "steps": "{{steps}}",
          "cfg": "{{cfg}}",
          "sampler_name": "euler",
          "scheduler": "normal",
          "denoise": 1,
          "model": ["4", 0],
          "positive": ["6", 0],
          "negative": ["7", 0],
          "latent_image": ["5", 0]
        }
      },
      "6": {
        "class_type": "CLIPTextEncode",
        "inputs": {
          "text": "{{prompt}}",
          "clip": ["4", 1]
        }
      }
    },
    "inputSchema": {
      "type": "object",
      "fields": {
        "prompt": { "type": "string", "required": true, "description": "Text prompt" },
        "seed": { "type": "number", "default": -1, "description": "Random seed" },
        "steps": { "type": "number", "default": 30, "min": 1, "max": 100 },
        "cfg": { "type": "number", "default": 7.0, "min": 1, "max": 20 }
      }
    },
    "defaultParams": {
      "seed": -1,
      "steps": 30,
      "cfg": 7.0
    }
  }' | jq .
```

### Update Workflow (Admin)

```bash
curl -X PUT http://localhost:3000/workflows/my_custom_workflow \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-admin-key" \
  -d '{
    "name": "My Custom Workflow v2",
    "description": "Updated description"
  }' | jq .
```

### Delete Workflow (Admin)

```bash
curl -X DELETE http://localhost:3000/workflows/my_custom_workflow \
  -H "X-API-Key: your-admin-key" -v
# Returns HTTP 204 No Content
```

### Create Job

```bash
curl -X POST http://localhost:3000/jobs \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "workflowId": "sdxl_realism_v1",
    "inputs": {
      "prompt": "a photorealistic mountain landscape at sunset, 8k, detailed",
      "negative_prompt": "blurry, low quality",
      "width": 1024,
      "height": 1024,
      "steps": 30,
      "cfg": 7.0,
      "seed": 42
    },
    "callbackUrl": "https://your-app.com/webhook/comfyui",
    "metadata": {
      "requestId": "req_abc123",
      "userId": "user_456"
    }
  }' | jq .
```

Response (HTTP 202):

```json
{
  "jobId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "queued",
  "etaSeconds": 0,
  "pollUrl": "/jobs/a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

### Poll Job Status

```bash
curl -s http://localhost:3000/jobs/a1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "X-API-Key: your-api-key" | jq .
```

Response (completed):

```json
{
  "jobId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "succeeded",
  "workflowId": "sdxl_realism_v1",
  "progress": 100,
  "outputs": [
    {
      "filename": "ComfyUI_00001_.png",
      "storagePath": "/data/outputs/a1b2.../uuid.png",
      "url": "/outputs/a1b2.../uuid.png",
      "size": 1542890,
      "sha256": "abc123..."
    }
  ],
  "error": null,
  "timing": {
    "createdAt": "2025-01-15T10:30:00.000Z",
    "startedAt": "2025-01-15T10:30:01.000Z",
    "completedAt": "2025-01-15T10:30:15.000Z",
    "executionTimeMs": 14000
  },
  "metadata": { "requestId": "req_abc123", "userId": "user_456" }
}
```

### List Jobs (with Filters)

```bash
# All jobs
curl -s "http://localhost:3000/jobs" \
  -H "X-API-Key: your-api-key" | jq .

# Filter by status
curl -s "http://localhost:3000/jobs?status=succeeded&limit=10" \
  -H "X-API-Key: your-api-key" | jq .

# Filter by workflow and date range
curl -s "http://localhost:3000/jobs?workflowId=sdxl_realism_v1&after=2025-01-01T00:00:00Z&limit=50" \
  -H "X-API-Key: your-api-key" | jq .
```

### Get Job Logs

```bash
curl -s http://localhost:3000/jobs/a1b2c3d4-e5f6-7890-abcd-ef1234567890/logs \
  -H "X-API-Key: your-api-key" | jq .
```

### Cancel Job

```bash
curl -X POST http://localhost:3000/jobs/a1b2c3d4-e5f6-7890-abcd-ef1234567890/cancel \
  -H "X-API-Key: your-api-key" | jq .
```

Response:

```json
{
  "jobId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "cancelled",
  "message": "Cancellation requested"
}
```

### List Outputs

```bash
curl -s http://localhost:3000/outputs/a1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "X-API-Key: your-api-key" | jq .
```

### Download Output (Binary)

```bash
# Stream to file
curl -s http://localhost:3000/outputs/a1b2c3d4-e5f6-7890-abcd-ef1234567890/uuid.png \
  -H "X-API-Key: your-api-key" \
  -o output.png

# View content type and size
curl -sI http://localhost:3000/outputs/a1b2c3d4-e5f6-7890-abcd-ef1234567890/uuid.png \
  -H "X-API-Key: your-api-key"
```

### Download Output (Base64)

```bash
curl -s "http://localhost:3000/outputs/a1b2c3d4-e5f6-7890-abcd-ef1234567890/uuid.png?format=base64" \
  -H "X-API-Key: your-api-key" | jq .
```

Response:

```json
{
  "filename": "uuid.png",
  "contentType": "image/png",
  "size": 1542890,
  "data": "iVBORw0KGgoAAAANSUhEUgAA..."
}
```

---

## 2. n8n Webhook Workflow

Step-by-step setup for using n8n to trigger image generation and receive results
via webhook.

### Step 1: Create a Webhook Trigger Node

1. Add a **Webhook** node in n8n.
2. Set HTTP Method to `POST`.
3. Set Path to `/comfyui-result`.
4. Under Authentication, select **Header Auth** and configure:
   - Name: `X-Signature`
   - Value: leave blank (we will verify in code).
5. Copy the **Production URL** (e.g., `https://n8n.your-domain.com/webhook/comfyui-result`).

### Step 2: Create an HTTP Request Node to Submit a Job

1. Add an **HTTP Request** node.
2. Configure:
   - Method: `POST`
   - URL: `http://your-gateway:3000/jobs`
   - Authentication: select **Generic Credential Type** > **Header Auth**
     - Name: `X-API-Key`
     - Value: `your-api-key`
   - Body Content Type: JSON
   - Body:

```json
{
  "workflowId": "sdxl_realism_v1",
  "inputs": {
    "prompt": "{{ $json.prompt }}",
    "width": 1024,
    "height": 1024,
    "steps": 30
  },
  "callbackUrl": "https://n8n.your-domain.com/webhook/comfyui-result",
  "metadata": {
    "requestId": "{{ $json.requestId }}"
  }
}
```

### Step 3: Process the Webhook Callback

Back in the Webhook node, add downstream nodes:

1. **IF** node: Check `{{ $json.status }}` equals `succeeded`.
2. On true branch, **HTTP Request** node to download the image:
   - URL: `http://your-gateway:3000{{ $json.result.outputs[0].url }}`
   - Headers: `X-API-Key: your-api-key`
   - Response Format: File
3. Continue with your pipeline (save to disk, upload to S3, send to Slack, etc.).

### Step 4: HMAC Verification (Optional)

Add a **Code** node before the IF to verify the webhook signature:

```javascript
const crypto = require('crypto');
const secret = 'your-webhook-secret';
const body = JSON.stringify($json);
const expected = crypto
  .createHmac('sha256', secret)
  .update(body, 'utf8')
  .digest('hex');
const received = $headers['x-signature']?.replace('sha256=', '');

if (received !== expected) {
  throw new Error('Invalid webhook signature');
}

return $json;
```

### Step 5: Add WEBHOOK_ALLOWED_DOMAINS

In your gateway `.env`:

```
WEBHOOK_ALLOWED_DOMAINS=n8n.your-domain.com
WEBHOOK_SECRET=your-webhook-secret
```

---

## 3. Supabase Edge Function

A Supabase Edge Function that submits a job to the gateway and returns the job
ID for client-side polling.

### File: `supabase/functions/generate-image/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const GATEWAY_URL = Deno.env.get("COMFYUI_GATEWAY_URL") ?? "http://localhost:3000";
const GATEWAY_KEY = Deno.env.get("COMFYUI_GATEWAY_KEY") ?? "";

interface GenerateRequest {
  prompt: string;
  negative_prompt?: string;
  width?: number;
  height?: number;
  steps?: number;
  workflow_id?: string;
  callback_url?: string;
}

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body: GenerateRequest = await req.json();

    if (!body.prompt || body.prompt.trim().length === 0) {
      return new Response(JSON.stringify({ error: "prompt is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Submit job to ComfyUI Gateway
    const jobResponse = await fetch(`${GATEWAY_URL}/jobs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": GATEWAY_KEY,
      },
      body: JSON.stringify({
        workflowId: body.workflow_id ?? "sdxl_realism_v1",
        inputs: {
          prompt: body.prompt,
          negative_prompt: body.negative_prompt ?? "",
          width: body.width ?? 1024,
          height: body.height ?? 1024,
          steps: body.steps ?? 30,
        },
        callbackUrl: body.callback_url,
        metadata: {
          requestId: crypto.randomUUID(),
          source: "supabase-edge-function",
        },
      }),
    });

    if (!jobResponse.ok) {
      const errorData = await jobResponse.json();
      return new Response(JSON.stringify(errorData), {
        status: jobResponse.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    const jobData = await jobResponse.json();

    return new Response(
      JSON.stringify({
        job_id: jobData.jobId,
        status: jobData.status,
        poll_url: `${GATEWAY_URL}${jobData.pollUrl}`,
      }),
      {
        status: 202,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal error", message: String(err) }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
});
```

### Deploy

```bash
# Set secrets in Supabase
supabase secrets set COMFYUI_GATEWAY_URL=https://your-gateway.com
supabase secrets set COMFYUI_GATEWAY_KEY=your-api-key

# Deploy the function
supabase functions deploy generate-image

# Test
curl -X POST https://your-project.supabase.co/functions/v1/generate-image \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "a photorealistic cat"}'
```

---

## 4. Claude Code Integration

How to use the ComfyUI Gateway from within a Claude Code session or any
environment where Claude has access to shell tools.

### Generating an Image from Claude Code

When Claude Code has access to `bash` or `curl`, you can generate images directly:

```bash
# 1. Submit a generation job
JOB_RESPONSE=$(curl -s -X POST http://localhost:3000/jobs \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "workflowId": "sdxl_realism_v1",
    "inputs": {
      "prompt": "a professional headshot photo, studio lighting, neutral background",
      "width": 1024,
      "height": 1024,
      "steps": 30
    },
    "metadata": { "requestId": "claude-session-001" }
  }')

JOB_ID=$(echo "$JOB_RESPONSE" | jq -r '.jobId')
echo "Job submitted: $JOB_ID"

# 2. Poll until complete (simple loop)
while true; do
  STATUS=$(curl -s "http://localhost:3000/jobs/$JOB_ID" \
    -H "X-API-Key: your-api-key" | jq -r '.status')
  echo "Status: $STATUS"
  if [ "$STATUS" = "succeeded" ] || [ "$STATUS" = "failed" ] || [ "$STATUS" = "cancelled" ]; then
    break
  fi
  sleep 3
done

# 3. Get the output URL
OUTPUT_URL=$(curl -s "http://localhost:3000/jobs/$JOB_ID" \
  -H "X-API-Key: your-api-key" | jq -r '.outputs[0].url')
echo "Output: http://localhost:3000$OUTPUT_URL"

# 4. Download the image
curl -s "http://localhost:3000$OUTPUT_URL" \
  -H "X-API-Key: your-api-key" -o generated_image.png
```

### Using Base64 Output in Claude Code

If you need the image as base64 (for inline display or further processing):

```bash
# Get base64 encoded output
B64_DATA=$(curl -s "http://localhost:3000${OUTPUT_URL}?format=base64" \
  -H "X-API-Key: your-api-key" | jq -r '.data')

# Save the base64 to a file (can be read by Claude's image viewer)
echo "$B64_DATA" | base64 -d > generated_image.png
```

### Helper Script for Repeated Use

Save as `generate.sh` in your project:

```bash
#!/usr/bin/env bash
set -euo pipefail

GATEWAY_URL="${COMFYUI_GATEWAY_URL:-http://localhost:3000}"
API_KEY="${COMFYUI_API_KEY:-}"
WORKFLOW="${1:-sdxl_realism_v1}"
PROMPT="${2:-a test image}"
OUTPUT="${3:-output.png}"

# Submit
JOB=$(curl -sf -X POST "$GATEWAY_URL/jobs" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d "{
    \"workflowId\": \"$WORKFLOW\",
    \"inputs\": { \"prompt\": \"$PROMPT\", \"width\": 1024, \"height\": 1024 }
  }")

JOB_ID=$(echo "$JOB" | jq -r '.jobId')
echo "Job: $JOB_ID"

# Poll
for i in $(seq 1 120); do
  RESULT=$(curl -sf "$GATEWAY_URL/jobs/$JOB_ID" -H "X-API-Key: $API_KEY")
  STATUS=$(echo "$RESULT" | jq -r '.status')
  if [ "$STATUS" = "succeeded" ]; then
    URL=$(echo "$RESULT" | jq -r '.outputs[0].url')
    curl -sf "$GATEWAY_URL$URL" -H "X-API-Key: $API_KEY" -o "$OUTPUT"
    echo "Saved to $OUTPUT"
    exit 0
  elif [ "$STATUS" = "failed" ]; then
    echo "FAILED: $(echo "$RESULT" | jq '.error')"
    exit 1
  fi
  sleep 2
done

echo "TIMEOUT"
exit 1
```

Usage:

```bash
chmod +x generate.sh
export COMFYUI_API_KEY=your-api-key
./generate.sh sdxl_realism_v1 "a sunset over the ocean" sunset.png
```

---

## 5. Python Requests Client

Full-featured Python client with job submission, polling, and download.

### File: `comfyui_client.py`

```python
"""
ComfyUI Gateway Python Client

Usage:
    from comfyui_client import ComfyUIGateway

    gw = ComfyUIGateway("http://localhost:3000", api_key="your-key")
    result = gw.generate("sdxl_realism_v1", prompt="a mountain landscape")
    gw.download(result["outputs"][0]["url"], "output.png")
"""

import time
import uuid
import hashlib
import hmac
import requests
from typing import Any, Optional


class ComfyUIGatewayError(Exception):
    """Base exception for gateway errors."""

    def __init__(self, message: str, status_code: int = 0, details: Any = None):
        super().__init__(message)
        self.status_code = status_code
        self.details = details


class ComfyUIGateway:
    """Client for the ComfyUI Gateway REST API."""

    def __init__(self, base_url: str, api_key: str = "", timeout: int = 30):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.timeout = timeout
        self.session = requests.Session()
        if api_key:
            self.session.headers["X-API-Key"] = api_key

    # ── Health & Capabilities ──────────────────────────────────────────────

    def health(self) -> dict:
        """Check gateway and ComfyUI health."""
        resp = self.session.get(f"{self.base_url}/health", timeout=self.timeout)
        resp.raise_for_status()
        return resp.json()

    def capabilities(self) -> dict:
        """Get available workflows and server capabilities."""
        resp = self.session.get(
            f"{self.base_url}/capabilities", timeout=self.timeout
        )
        resp.raise_for_status()
        return resp.json()

    # ── Workflows ──────────────────────────────────────────────────────────

    def list_workflows(self) -> list[dict]:
        """List all registered workflows."""
        resp = self.session.get(
            f"{self.base_url}/workflows", timeout=self.timeout
        )
        resp.raise_for_status()
        return resp.json()["workflows"]

    def get_workflow(self, workflow_id: str) -> dict:
        """Get details of a specific workflow."""
        resp = self.session.get(
            f"{self.base_url}/workflows/{workflow_id}", timeout=self.timeout
        )
        resp.raise_for_status()
        return resp.json()["workflow"]

    def create_workflow(
        self,
        workflow_id: str,
        name: str,
        workflow_json: dict,
        input_schema: Optional[dict] = None,
        description: str = "",
        default_params: Optional[dict] = None,
    ) -> dict:
        """Register a new workflow (admin only)."""
        body: dict[str, Any] = {
            "id": workflow_id,
            "name": name,
            "workflowJson": workflow_json,
        }
        if description:
            body["description"] = description
        if input_schema:
            body["inputSchema"] = input_schema
        if default_params:
            body["defaultParams"] = default_params

        resp = self.session.post(
            f"{self.base_url}/workflows",
            json=body,
            timeout=self.timeout,
        )
        resp.raise_for_status()
        return resp.json()["workflow"]

    def delete_workflow(self, workflow_id: str) -> bool:
        """Delete a workflow (admin only). Returns True on success."""
        resp = self.session.delete(
            f"{self.base_url}/workflows/{workflow_id}", timeout=self.timeout
        )
        return resp.status_code == 204

    # ── Jobs ───────────────────────────────────────────────────────────────

    def submit_job(
        self,
        workflow_id: str,
        inputs: dict,
        params: Optional[dict] = None,
        callback_url: Optional[str] = None,
        request_id: Optional[str] = None,
        metadata: Optional[dict] = None,
    ) -> dict:
        """Submit a new generation job. Returns immediately with jobId."""
        body: dict[str, Any] = {
            "workflowId": workflow_id,
            "inputs": inputs,
        }
        if params:
            body["params"] = params
        if callback_url:
            body["callbackUrl"] = callback_url

        meta = metadata or {}
        if request_id:
            meta["requestId"] = request_id
        if meta:
            body["metadata"] = meta

        resp = self.session.post(
            f"{self.base_url}/jobs", json=body, timeout=self.timeout
        )

        if not resp.ok:
            data = resp.json()
            raise ComfyUIGatewayError(
                data.get("message", "Job submission failed"),
                status_code=resp.status_code,
                details=data,
            )

        return resp.json()

    def get_job(self, job_id: str) -> dict:
        """Get the status and details of a job."""
        resp = self.session.get(
            f"{self.base_url}/jobs/{job_id}", timeout=self.timeout
        )
        resp.raise_for_status()
        return resp.json()

    def list_jobs(
        self,
        status: Optional[str] = None,
        workflow_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> dict:
        """List jobs with optional filters."""
        params: dict[str, Any] = {"limit": limit, "offset": offset}
        if status:
            params["status"] = status
        if workflow_id:
            params["workflowId"] = workflow_id

        resp = self.session.get(
            f"{self.base_url}/jobs", params=params, timeout=self.timeout
        )
        resp.raise_for_status()
        return resp.json()

    def cancel_job(self, job_id: str) -> dict:
        """Cancel a queued or running job."""
        resp = self.session.post(
            f"{self.base_url}/jobs/{job_id}/cancel", timeout=self.timeout
        )
        resp.raise_for_status()
        return resp.json()

    def get_job_logs(self, job_id: str) -> dict:
        """Get processing logs for a job."""
        resp = self.session.get(
            f"{self.base_url}/jobs/{job_id}/logs", timeout=self.timeout
        )
        resp.raise_for_status()
        return resp.json()

    # ── Outputs ────────────────────────────────────────────────────────────

    def list_outputs(self, job_id: str) -> list[dict]:
        """List output files for a completed job."""
        resp = self.session.get(
            f"{self.base_url}/outputs/{job_id}", timeout=self.timeout
        )
        resp.raise_for_status()
        return resp.json()["files"]

    def get_output_base64(self, job_id: str, filename: str) -> dict:
        """Get a single output file as base64."""
        resp = self.session.get(
            f"{self.base_url}/outputs/{job_id}/{filename}",
            params={"format": "base64"},
            timeout=self.timeout,
        )
        resp.raise_for_status()
        return resp.json()

    def download(self, url_path: str, output_path: str) -> str:
        """Download an output file to a local path. Returns the path."""
        full_url = f"{self.base_url}{url_path}" if url_path.startswith("/") else url_path
        resp = self.session.get(full_url, timeout=120)
        resp.raise_for_status()
        with open(output_path, "wb") as f:
            f.write(resp.content)
        return output_path

    # ── High-Level: Generate & Wait ────────────────────────────────────────

    def generate(
        self,
        workflow_id: str,
        poll_interval: float = 2.0,
        max_wait: float = 300.0,
        **inputs: Any,
    ) -> dict:
        """
        Submit a job, poll until complete, and return the full result.

        Usage:
            result = gw.generate("sdxl_realism_v1", prompt="a sunset", steps=30)
            print(result["outputs"])
        """
        job = self.submit_job(
            workflow_id=workflow_id,
            inputs=inputs,
            request_id=str(uuid.uuid4()),
        )
        job_id = job["jobId"]

        start = time.time()
        while time.time() - start < max_wait:
            result = self.get_job(job_id)
            status = result["status"]

            if status == "succeeded":
                return result
            elif status in ("failed", "cancelled"):
                raise ComfyUIGatewayError(
                    f"Job {status}: {result.get('error')}",
                    details=result,
                )

            time.sleep(poll_interval)

        raise ComfyUIGatewayError(f"Job {job_id} timed out after {max_wait}s")


# ── Usage Example ──────────────────────────────────────────────────────────

if __name__ == "__main__":
    gw = ComfyUIGateway("http://localhost:3000", api_key="your-api-key")

    # Check health
    print("Health:", gw.health())

    # Generate an image (blocking)
    result = gw.generate(
        "sdxl_realism_v1",
        prompt="a photorealistic golden retriever in a park",
        width=1024,
        height=1024,
        steps=30,
    )

    # Download the first output
    if result["outputs"]:
        output_url = result["outputs"][0]["url"]
        gw.download(output_url, "generated.png")
        print(f"Image saved to generated.png ({result['outputs'][0]['size']} bytes)")
    else:
        print("No outputs produced")
```

---

## 6. JavaScript/TypeScript Fetch Client

A full client using native `fetch` (Node.js 18+, Deno, Bun, or browsers).

### File: `comfyui-client.ts`

```typescript
/**
 * ComfyUI Gateway TypeScript Client
 *
 * Works with Node.js 18+ (native fetch), Deno, Bun, and browsers.
 */

export interface GatewayConfig {
  baseUrl: string;
  apiKey?: string;
  timeout?: number;
}

export interface JobSubmission {
  workflowId: string;
  inputs: Record<string, unknown>;
  params?: Record<string, unknown>;
  callbackUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface JobResult {
  jobId: string;
  status: "queued" | "running" | "succeeded" | "failed" | "cancelled";
  workflowId: string;
  progress: number | null;
  outputs: Array<{
    filename: string;
    storagePath: string;
    url: string;
    size: number;
    sha256: string;
  }> | null;
  error: unknown;
  timing: {
    createdAt: string;
    startedAt: string | null;
    completedAt: string | null;
    executionTimeMs: number | null;
  };
  metadata: Record<string, unknown> | null;
}

export class ComfyUIGateway {
  private baseUrl: string;
  private headers: Record<string, string>;
  private timeout: number;

  constructor(config: GatewayConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.timeout = config.timeout ?? 30_000;
    this.headers = {
      "Content-Type": "application/json",
    };
    if (config.apiKey) {
      this.headers["X-API-Key"] = config.apiKey;
    }
  }

  // ── Internal fetch wrapper ──────────────────────────────────────────────

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options: { timeout?: number; params?: Record<string, string> } = {},
  ): Promise<T> {
    let url = `${this.baseUrl}${path}`;

    if (options.params) {
      const searchParams = new URLSearchParams(options.params);
      url += `?${searchParams.toString()}`;
    }

    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      options.timeout ?? this.timeout,
    );

    try {
      const resp = await fetch(url, {
        method,
        headers: this.headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (!resp.ok) {
        const errorBody = await resp.json().catch(() => ({}));
        throw new Error(
          `Gateway error ${resp.status}: ${(errorBody as { message?: string }).message ?? resp.statusText}`,
        );
      }

      // 204 No Content
      if (resp.status === 204) {
        return undefined as T;
      }

      return (await resp.json()) as T;
    } finally {
      clearTimeout(timer);
    }
  }

  // ── Health ──────────────────────────────────────────────────────────────

  async health(): Promise<{
    ok: boolean;
    version: string | null;
    comfyui: { reachable: boolean; url: string };
    uptime: number;
  }> {
    return this.request("GET", "/health");
  }

  async capabilities(): Promise<{
    workflows: Array<{ id: string; name: string }>;
    maxSize: number;
    maxBatch: number;
    formats: string[];
    storageProvider: string;
  }> {
    return this.request("GET", "/capabilities");
  }

  // ── Workflows ───────────────────────────────────────────────────────────

  async listWorkflows(): Promise<Array<{ id: string; name: string }>> {
    const data = await this.request<{ workflows: Array<{ id: string; name: string }> }>(
      "GET",
      "/workflows",
    );
    return data.workflows;
  }

  async getWorkflow(id: string): Promise<Record<string, unknown>> {
    const data = await this.request<{ workflow: Record<string, unknown> }>(
      "GET",
      `/workflows/${encodeURIComponent(id)}`,
    );
    return data.workflow;
  }

  // ── Jobs ────────────────────────────────────────────────────────────────

  async submitJob(
    submission: JobSubmission,
  ): Promise<{ jobId: string; status: string; pollUrl: string }> {
    return this.request("POST", "/jobs", submission);
  }

  async getJob(jobId: string): Promise<JobResult> {
    return this.request("GET", `/jobs/${encodeURIComponent(jobId)}`);
  }

  async cancelJob(
    jobId: string,
  ): Promise<{ jobId: string; status: string; message: string }> {
    return this.request("POST", `/jobs/${encodeURIComponent(jobId)}/cancel`);
  }

  async listJobs(filters?: {
    status?: string;
    workflowId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ jobs: JobResult[]; count: number }> {
    const params: Record<string, string> = {};
    if (filters?.status) params.status = filters.status;
    if (filters?.workflowId) params.workflowId = filters.workflowId;
    if (filters?.limit) params.limit = String(filters.limit);
    if (filters?.offset) params.offset = String(filters.offset);

    return this.request("GET", "/jobs", undefined, { params });
  }

  // ── Outputs ─────────────────────────────────────────────────────────────

  async listOutputs(
    jobId: string,
  ): Promise<Array<{ filename: string; size: number; sha256: string; url: string }>> {
    const data = await this.request<{
      files: Array<{ filename: string; size: number; sha256: string; url: string }>;
    }>("GET", `/outputs/${encodeURIComponent(jobId)}`);
    return data.files;
  }

  async getOutputBase64(
    jobId: string,
    filename: string,
  ): Promise<{ filename: string; contentType: string; size: number; data: string }> {
    return this.request(
      "GET",
      `/outputs/${encodeURIComponent(jobId)}/${encodeURIComponent(filename)}`,
      undefined,
      { params: { format: "base64" } },
    );
  }

  async downloadOutput(jobId: string, filename: string): Promise<Blob> {
    const url = `${this.baseUrl}/outputs/${encodeURIComponent(jobId)}/${encodeURIComponent(filename)}`;
    const resp = await fetch(url, { headers: this.headers });
    if (!resp.ok) throw new Error(`Download failed: ${resp.status}`);
    return resp.blob();
  }

  // ── High-Level: Generate & Wait ─────────────────────────────────────────

  async generate(
    workflowId: string,
    inputs: Record<string, unknown>,
    options: {
      pollIntervalMs?: number;
      maxWaitMs?: number;
      onProgress?: (progress: number | null, status: string) => void;
    } = {},
  ): Promise<JobResult> {
    const { pollIntervalMs = 2000, maxWaitMs = 300_000, onProgress } = options;

    const job = await this.submitJob({
      workflowId,
      inputs,
      metadata: { requestId: crypto.randomUUID() },
    });

    const start = Date.now();

    while (Date.now() - start < maxWaitMs) {
      const result = await this.getJob(job.jobId);

      onProgress?.(result.progress, result.status);

      if (result.status === "succeeded") {
        return result;
      }

      if (result.status === "failed" || result.status === "cancelled") {
        throw new Error(
          `Job ${result.status}: ${JSON.stringify(result.error)}`,
        );
      }

      await new Promise((r) => setTimeout(r, pollIntervalMs));
    }

    throw new Error(`Job ${job.jobId} timed out after ${maxWaitMs}ms`);
  }
}

// ── Usage Example ─────────────────────────────────────────────────────────

async function main() {
  const gw = new ComfyUIGateway({
    baseUrl: "http://localhost:3000",
    apiKey: "your-api-key",
  });

  // Health check
  const health = await gw.health();
  console.log("ComfyUI reachable:", health.comfyui.reachable);

  // Generate (blocking)
  const result = await gw.generate(
    "sdxl_realism_v1",
    {
      prompt: "a photorealistic golden retriever in a park",
      width: 1024,
      height: 1024,
      steps: 30,
    },
    {
      onProgress: (progress, status) =>
        console.log(`Status: ${status}, Progress: ${progress ?? "N/A"}%`),
    },
  );

  console.log("Outputs:", result.outputs);

  // Download first output as base64
  if (result.outputs && result.outputs.length > 0) {
    const firstOutput = result.outputs[0];
    const b64 = await gw.getOutputBase64(result.jobId, firstOutput.filename);
    console.log(`Image: ${b64.contentType}, ${b64.size} bytes`);
  }
}

// Uncomment to run:
// main().catch(console.error);
```

---

## 7. Webhook Receiver (Express.js + HMAC)

A standalone Express.js server that receives webhook callbacks from the gateway,
verifies HMAC-SHA256 signatures, and processes results.

### File: `webhook-receiver.js`

```javascript
const express = require("express");
const crypto = require("crypto");

const app = express();
const PORT = process.env.WEBHOOK_PORT || 4000;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "your-webhook-secret";

// IMPORTANT: Must use raw body for HMAC computation
app.use(
  express.json({
    verify: (req, _res, buf) => {
      // Store raw body buffer for signature verification
      req.rawBody = buf;
    },
  }),
);

/**
 * Verify HMAC-SHA256 signature from the gateway.
 *
 * The gateway sends: X-Signature: sha256=<hex_digest>
 * Computed as: HMAC-SHA256(secret, raw_json_body)
 */
function verifySignature(req) {
  const signatureHeader = req.headers["x-signature"];
  if (!signatureHeader) {
    return { valid: false, reason: "Missing X-Signature header" };
  }

  // Extract hex digest (format: "sha256=abcdef...")
  const receivedSig = signatureHeader.replace("sha256=", "");

  // Compute expected signature using raw body bytes
  const expectedSig = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(req.rawBody, "utf8")
    .digest("hex");

  // Constant-time comparison to prevent timing attacks
  const valid = crypto.timingSafeEqual(
    Buffer.from(receivedSig, "hex"),
    Buffer.from(expectedSig, "hex"),
  );

  return { valid, reason: valid ? null : "Signature mismatch" };
}

/**
 * POST /webhook/comfyui
 *
 * Receives job completion/failure callbacks from the ComfyUI Gateway.
 */
app.post("/webhook/comfyui", (req, res) => {
  // 1. Verify HMAC signature
  if (WEBHOOK_SECRET) {
    const { valid, reason } = verifySignature(req);
    if (!valid) {
      console.error("Webhook signature verification FAILED:", reason);
      return res.status(401).json({ error: "Invalid signature" });
    }
  }

  // 2. Respond immediately (gateway has a 10s timeout)
  res.status(200).json({ received: true });

  // 3. Process the payload asynchronously
  const payload = req.body;
  console.log("Webhook received:", {
    event: payload.event,
    jobId: payload.jobId,
    status: payload.status,
  });

  if (payload.status === "succeeded") {
    handleSuccess(payload);
  } else if (payload.status === "failed") {
    handleFailure(payload);
  }
});

async function handleSuccess(payload) {
  console.log(`Job ${payload.jobId} succeeded!`);
  console.log(`Outputs: ${payload.result?.outputs?.length ?? 0} files`);

  // Example: Download the first output
  if (payload.result?.outputs?.length > 0) {
    const output = payload.result.outputs[0];
    console.log(`  - ${output.filename}: ${output.size} bytes, URL: ${output.url}`);

    // You could download the file here:
    // const resp = await fetch(`http://gateway:3000${output.url}`,
    //   { headers: { "X-API-Key": "your-key" } });
    // const buffer = await resp.arrayBuffer();
    // fs.writeFileSync(`./downloads/${output.filename}`, Buffer.from(buffer));
  }
}

function handleFailure(payload) {
  console.error(`Job ${payload.jobId} FAILED:`, payload.error);
  // Implement your error handling: retry, notify, log, etc.
}

app.listen(PORT, () => {
  console.log(`Webhook receiver listening on port ${PORT}`);
  console.log(`Endpoint: POST http://localhost:${PORT}/webhook/comfyui`);
  console.log(`HMAC verification: ${WEBHOOK_SECRET ? "ENABLED" : "DISABLED"}`);
});
```

### Run

```bash
npm install express
WEBHOOK_SECRET=your-webhook-secret node webhook-receiver.js
```

---

## 8. Docker Compose

Production-ready Docker Compose configuration with the gateway, ComfyUI, Redis,
and MinIO (S3-compatible storage).

### File: `docker-compose.yml`

```yaml
version: "3.9"

services:
  # ── ComfyUI (GPU) ────────────────────────────────────────────────────────
  comfyui:
    image: ghcr.io/ai-dock/comfyui:latest
    container_name: comfyui
    restart: unless-stopped
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
    ports:
      - "8188:8188"
    volumes:
      - comfyui-data:/workspace/ComfyUI
      - ./models:/workspace/ComfyUI/models
    environment:
      - CLI_ARGS=--listen 0.0.0.0 --port 8188
    networks:
      - comfy-net
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8188/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

  # ── ComfyUI Gateway ──────────────────────────────────────────────────────
  gateway:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: comfyui-gateway
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - HOST=0.0.0.0
      - NODE_ENV=production
      - LOG_LEVEL=info
      - PRIVACY_MODE=true

      # ComfyUI connection (use Docker service name)
      - COMFYUI_URL=http://comfyui:8188
      - COMFYUI_TIMEOUT_MS=300000

      # Authentication
      - API_KEYS=sk-admin-key:admin,sk-user-key:user
      - JWT_SECRET=change-this-to-a-random-secret

      # Redis queue
      - REDIS_URL=redis://redis:6379/0

      # Database (SQLite inside the container)
      - DATABASE_URL=./data/gateway.db

      # S3 storage (MinIO)
      - STORAGE_PROVIDER=s3
      - S3_ENDPOINT=http://minio:9000
      - S3_BUCKET=comfyui-outputs
      - S3_ACCESS_KEY=minioadmin
      - S3_SECRET_KEY=minioadmin
      - S3_REGION=us-east-1

      # Rate limiting
      - RATE_LIMIT_MAX=200
      - RATE_LIMIT_WINDOW_MS=60000

      # Job limits
      - MAX_CONCURRENCY=1
      - MAX_IMAGE_SIZE=2048
      - MAX_BATCH_SIZE=4

      # Cache
      - CACHE_ENABLED=true
      - CACHE_TTL_SECONDS=86400

      # Webhooks
      - WEBHOOK_SECRET=your-webhook-hmac-secret
      - WEBHOOK_ALLOWED_DOMAINS=*

      # CORS
      - CORS_ORIGINS=*
    volumes:
      - gateway-data:/app/data
    depends_on:
      redis:
        condition: service_healthy
      comfyui:
        condition: service_healthy
      minio:
        condition: service_healthy
    networks:
      - comfy-net
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 15s
      timeout: 5s
      retries: 3

  # ── Redis ────────────────────────────────────────────────────────────────
  redis:
    image: redis:7-alpine
    container_name: comfyui-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
    networks:
      - comfy-net
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3

  # ── MinIO (S3-compatible storage) ────────────────────────────────────────
  minio:
    image: minio/minio:latest
    container_name: comfyui-minio
    restart: unless-stopped
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      - MINIO_ROOT_USER=minioadmin
      - MINIO_ROOT_PASSWORD=minioadmin
    volumes:
      - minio-data:/data
    command: server /data --console-address ":9001"
    networks:
      - comfy-net
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 15s
      timeout: 5s
      retries: 3

  # ── MinIO Bucket Init ────────────────────────────────────────────────────
  minio-init:
    image: minio/mc:latest
    container_name: comfyui-minio-init
    depends_on:
      minio:
        condition: service_healthy
    entrypoint: >
      /bin/sh -c "
      mc alias set local http://minio:9000 minioadmin minioadmin;
      mc mb --ignore-existing local/comfyui-outputs;
      mc anonymous set download local/comfyui-outputs;
      echo 'Bucket created and configured';
      "
    networks:
      - comfy-net

volumes:
  comfyui-data:
  gateway-data:
  redis-data:
  minio-data:

networks:
  comfy-net:
    driver: bridge
```

### Gateway Dockerfile

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --include=optional
COPY tsconfig.json ./
COPY src/ ./src/
RUN npx tsc

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --include=optional
COPY --from=builder /app/dist/ ./dist/
COPY config/ ./config/
RUN mkdir -p data/outputs data/workflows data/cache
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### Usage

```bash
# Start everything
docker compose up -d

# Watch logs
docker compose logs -f gateway

# Test health
curl http://localhost:3000/health | jq .

# Generate an image
curl -X POST http://localhost:3000/jobs \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sk-admin-key" \
  -d '{
    "workflowId": "sdxl_realism_v1",
    "inputs": { "prompt": "a sunset over the ocean" }
  }'

# Stop everything
docker compose down

# Stop and remove volumes (full reset)
docker compose down -v
```

---

## 9. Environment Configuration Examples

### Local Development (Minimal)

```bash
# .env for local development
PORT=3000
HOST=0.0.0.0
NODE_ENV=development
LOG_LEVEL=debug
COMFYUI_URL=http://127.0.0.1:8188
COMFYUI_TIMEOUT_MS=300000

# No auth in development (all requests treated as admin)
API_KEYS=
JWT_SECRET=

# In-memory queue (no Redis needed)
REDIS_URL=

# SQLite database
DATABASE_URL=./data/gateway.db

# Local file storage
STORAGE_PROVIDER=local
STORAGE_LOCAL_PATH=./data/outputs

# Cache enabled
CACHE_ENABLED=true
CACHE_TTL_SECONDS=3600

# Lenient rate limits
RATE_LIMIT_MAX=1000
RATE_LIMIT_WINDOW_MS=60000

# No webhook restrictions
WEBHOOK_SECRET=
WEBHOOK_ALLOWED_DOMAINS=*

# Allow all CORS
CORS_ORIGINS=*
```

### Production (Full Security)

```bash
# .env for production
PORT=3000
HOST=0.0.0.0
NODE_ENV=production
LOG_LEVEL=info
PRIVACY_MODE=true
COMFYUI_URL=http://comfyui-internal:8188
COMFYUI_TIMEOUT_MS=300000

# API keys with roles
API_KEYS=sk-prod-admin-a1b2c3d4:admin,sk-prod-user-e5f6g7h8:user,sk-prod-service-i9j0k1l2:user
JWT_SECRET=a-very-long-random-secret-at-least-32-chars

# Redis for durable job queue
REDIS_URL=redis://:redis-password@redis-host:6379/0

# Postgres for production database
DATABASE_URL=postgresql://gateway_user:strong_password@postgres-host:5432/comfyui_gateway?sslmode=require

# S3 storage
STORAGE_PROVIDER=s3
S3_ENDPOINT=
S3_BUCKET=my-comfyui-outputs
S3_ACCESS_KEY=<AWS_ACCESS_KEY_ID>
S3_SECRET_KEY=<AWS_SECRET_ACCESS_KEY>
S3_REGION=us-east-1

# Cache
CACHE_ENABLED=true
CACHE_TTL_SECONDS=86400

# Strict rate limits
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=60000

# Concurrency
MAX_CONCURRENCY=1
MAX_IMAGE_SIZE=2048
MAX_BATCH_SIZE=4

# Webhook security
WEBHOOK_SECRET=webhook-hmac-secret-at-least-32-chars
WEBHOOK_ALLOWED_DOMAINS=api.your-app.com,n8n.your-app.com

# Restricted CORS
CORS_ORIGINS=https://your-app.com,https://admin.your-app.com
```

### Docker (Internal Network)

```bash
# .env for Docker Compose (services communicate via Docker DNS)
PORT=3000
HOST=0.0.0.0
NODE_ENV=production
LOG_LEVEL=info
PRIVACY_MODE=true

# Docker service name instead of localhost
COMFYUI_URL=http://comfyui:8188
COMFYUI_TIMEOUT_MS=300000

API_KEYS=sk-docker-admin:admin,sk-docker-user:user
JWT_SECRET=docker-jwt-secret-change-me

# Redis via Docker service name
REDIS_URL=redis://redis:6379/0

# SQLite (mounted volume)
DATABASE_URL=./data/gateway.db

# MinIO via Docker service name
STORAGE_PROVIDER=s3
S3_ENDPOINT=http://minio:9000
S3_BUCKET=comfyui-outputs
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_REGION=us-east-1

CACHE_ENABLED=true
CACHE_TTL_SECONDS=86400

RATE_LIMIT_MAX=200
RATE_LIMIT_WINDOW_MS=60000

MAX_CONCURRENCY=1
MAX_IMAGE_SIZE=2048
MAX_BATCH_SIZE=4

WEBHOOK_SECRET=docker-webhook-secret
WEBHOOK_ALLOWED_DOMAINS=*

CORS_ORIGINS=*
```

### WSL2 (Gateway in WSL, ComfyUI on Windows)

```bash
# .env for WSL2 setup
PORT=3000
HOST=0.0.0.0
NODE_ENV=development
LOG_LEVEL=debug

# Use Windows host IP from WSL2 perspective
# Get this with: cat /etc/resolv.conf | grep nameserver | awk '{print $2}'
COMFYUI_URL=http://172.25.192.1:8188
COMFYUI_TIMEOUT_MS=300000

API_KEYS=
JWT_SECRET=

REDIS_URL=
DATABASE_URL=./data/gateway.db

STORAGE_PROVIDER=local
STORAGE_LOCAL_PATH=./data/outputs

CACHE_ENABLED=true
CACHE_TTL_SECONDS=3600

RATE_LIMIT_MAX=500
RATE_LIMIT_WINDOW_MS=60000

WEBHOOK_SECRET=
WEBHOOK_ALLOWED_DOMAINS=*
CORS_ORIGINS=*
```

### Multi-GPU (Separate Workers)

```bash
# .env.shared (common settings)
NODE_ENV=production
LOG_LEVEL=info
COMFYUI_URL=http://comfyui:8188
REDIS_URL=redis://redis:6379/0
DATABASE_URL=postgresql://user:pass@postgres:5432/gateway
STORAGE_PROVIDER=s3
S3_ENDPOINT=http://minio:9000
S3_BUCKET=outputs
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
API_KEYS=sk-admin:admin

# Worker 1 (GPU 0) -- start with: CUDA_VISIBLE_DEVICES=0 npm run start:worker
MAX_CONCURRENCY=1

# Worker 2 (GPU 1) -- start with: CUDA_VISIBLE_DEVICES=1 npm run start:worker
# Uses the same .env, same Redis queue -- BullMQ distributes jobs automatically

# API server (no GPU needed) -- start with: npm run start:api
# Serves the REST API; workers handle ComfyUI execution
```
