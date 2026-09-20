---
name: cloudflare-r2
description: Manage Cloudflare R2 buckets, lifecycle, and signed URLs. Use for low-egress
  object storage and media delivery.
category: devops
risk: critical
source: https://github.com/BagelHole/DevOps-Security-Agent-Skills
source_repo: BagelHole/DevOps-Security-Agent-Skills
source_type: community
date_added: '2026-09-20'
license: MIT
license_source: https://github.com/BagelHole/DevOps-Security-Agent-Skills/blob/main/LICENSE
compatibility: Requires the relevant OS/platform tooling and privileged access where
  noted. Docs-only; helper scripts and templates not bundled.
metadata:
  author: devops-skills
  version: '1.0'
---

# Cloudflare R2

S3-compatible object storage with zero egress fees, built on Cloudflare's global network.

## When to Use

- Storing user uploads, media files, backups, or static assets.
- Replacing AWS S3 to eliminate egress costs for read-heavy workloads.
- Serving files at the edge via Workers or public bucket access.
- Building multi-cloud storage that avoids vendor lock-in (S3 API compatible).
- Storing ML model artifacts, training data, or inference results.

## Prerequisites

- Cloudflare account with R2 enabled (dashboard > R2 > subscribe).
- Wrangler CLI v3+ installed: `npm install -g wrangler`.
- Authenticated via `wrangler login` or `CLOUDFLARE_API_TOKEN`.
- For S3 API access: R2 API token created under **R2 > Manage R2 API Tokens**.

## Bucket Management with Wrangler

### Create and List Buckets

```bash
# Create a new bucket
npx wrangler r2 bucket create app-assets

# Create a bucket in a specific region (hint for data locality)
npx wrangler r2 bucket create eu-uploads --location=eu

# List all buckets
npx wrangler r2 bucket list

# Delete an empty bucket
npx wrangler r2 bucket delete old-bucket
```

### Object Operations

```bash
# Upload a single file
npx wrangler r2 object put app-assets/images/logo.png --file=./logo.png

# Upload with content type
npx wrangler r2 object put app-assets/data/report.json \
  --file=./report.json \
  --content-type="application/json"

# Download an object
npx wrangler r2 object get app-assets/images/logo.png --file=./downloaded-logo.png

# Delete an object
npx wrangler r2 object delete app-assets/images/old-logo.png

# Get object metadata
npx wrangler r2 object head app-assets/images/logo.png
```

## S3-Compatible API Access

R2 supports the S3 API, so existing tools (AWS CLI, boto3, s3cmd) work out of the box.

### Generate R2 API Tokens

1. Go to **R2 > Manage R2 API Tokens > Create API token**.
2. Select permissions: Object Read & Write, or Object Read only.
3. Scope to specific buckets if possible.
4. Save the Access Key ID and Secret Access Key.

### AWS CLI Configuration

```bash
# Configure a named profile for R2
aws configure --profile r2
# Access Key ID: <your-r2-access-key>
# Secret Access Key: <your-r2-secret-key>
# Region: auto
# Output: json

# Use the R2 endpoint
export R2_ENDPOINT="https://<ACCOUNT_ID>.r2.cloudflarestorage.com"

# List buckets
aws s3 ls --endpoint-url=$R2_ENDPOINT --profile=r2

# Sync a directory
aws s3 sync ./dist s3://app-assets/static/ \
  --endpoint-url=$R2_ENDPOINT \
  --profile=r2

# Copy a file
aws s3 cp ./backup.tar.gz s3://app-assets/backups/backup-$(date +%Y%m%d).tar.gz \
  --endpoint-url=$R2_ENDPOINT \
  --profile=r2

# List objects with prefix
aws s3 ls s3://app-assets/images/ \
  --endpoint-url=$R2_ENDPOINT \
  --profile=r2

# Remove objects by prefix
aws s3 rm s3://app-assets/tmp/ --recursive \
  --endpoint-url=$R2_ENDPOINT \
  --profile=r2
```

### Python boto3 Client

```python
import boto3

s3 = boto3.client(
    "s3",
    endpoint_url="https://<ACCOUNT_ID>.r2.cloudflarestorage.com",
    aws_access_key_id="<R2_ACCESS_KEY>",
    aws_secret_access_key="<R2_SECRET_KEY>",
    region_name="auto",
)

# Upload file
s3.upload_file("./report.pdf", "app-assets", "reports/report.pdf")

# Generate presigned URL (valid for 1 hour)
url = s3.generate_presigned_url(
    "get_object",
    Params={"Bucket": "app-assets", "Key": "reports/report.pdf"},
    ExpiresIn=3600,
)
print(url)

# List objects
response = s3.list_objects_v2(Bucket="app-assets", Prefix="images/", MaxKeys=100)
for obj in response.get("Contents", []):
    print(f"{obj['Key']} - {obj['Size']} bytes")
```

## Worker Bindings

Bind R2 buckets to Workers or Pages Functions for server-side access without API tokens.

### Wrangler Configuration

```toml
# wrangler.toml
name = "asset-worker"
main = "src/index.ts"
compatibility_date = "2024-09-01"

[[r2_buckets]]
binding = "ASSETS"
bucket_name = "app-assets"

[[r2_buckets]]
binding = "UPLOADS"
bucket_name = "user-uploads"
```

### Worker with R2 Operations

```typescript
// src/index.ts
interface Env {
  ASSETS: R2Bucket;
  UPLOADS: R2Bucket;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // GET — serve file from R2
    if (request.method === "GET") {
      const key = url.pathname.slice(1); // strip leading /
      const object = await env.ASSETS.get(key);

      if (!object) {
        return new Response("Not Found", { status: 404 });
      }

      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set("etag", object.httpEtag);
      headers.set("cache-control", "public, max-age=86400");

      return new Response(object.body, { headers });
    }

    // PUT — upload file to R2
    if (request.method === "PUT") {
      const key = url.pathname.slice(1);
      const contentType = request.headers.get("content-type") || "application/octet-stream";

      await env.UPLOADS.put(key, request.body, {
        httpMetadata: { contentType },
        customMetadata: { uploadedAt: new Date().toISOString() },
      });

      return new Response(JSON.stringify({ key, status: "uploaded" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // DELETE — remove file
    if (request.method === "DELETE") {
      const key = url.pathname.slice(1);
      await env.UPLOADS.delete(key);
      return new Response(null, { status: 204 });
    }

    return new Response("Method Not Allowed", { status: 405 });
  },
};
```

### Presigned URL Generation in a Worker

```typescript
// Generate time-limited signed URLs using Workers
import { AwsClient } from "aws4fetch";

interface Env {
  R2_ACCESS_KEY: string;
  R2_SECRET_KEY: string;
  R2_ACCOUNT_ID: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const aws = new AwsClient({
      accessKeyId: env.R2_ACCESS_KEY,
      secretAccessKey: env.R2_SECRET_KEY,
    });

    const url = new URL(request.url);
    const key = url.searchParams.get("key");
    if (!key) return new Response("Missing key", { status: 400 });

    const r2Url = `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/app-assets/${key}`;

    const signed = await aws.sign(new Request(r2Url), {
      aws: { signQuery: true },
    });

    return Response.json({ url: signed.url });
  },
};
```

## Public Bucket Access

Enable public access to serve files directly without a Worker.

1. Go to **R2 > bucket > Settings > Public access**.
2. Enable and set a custom domain (e.g., `assets.example.com`).
3. Objects are accessible at `https://assets.example.com/<key>`.

```bash
# Or enable via the r2.dev subdomain (for testing)
# Bucket Settings > R2.dev subdomain > Allow Access
# URL: https://pub-<hash>.r2.dev/<key>
```

## Lifecycle Rules

Configure automatic object expiration or transition.

```bash
# Set lifecycle rules via the Cloudflare dashboard:
# R2 > bucket > Settings > Object lifecycle rules

# Or via API
curl -X PUT "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/r2/buckets/app-assets/lifecycle" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rules": [
      {
        "id": "expire-tmp-files",
        "enabled": true,
        "conditions": { "prefix": "tmp/" },
        "actions": { "deleteObject": { "daysAfterCreationDate": 7 } }
      },
      {
        "id": "expire-old-logs",
        "enabled": true,
        "conditions": { "prefix": "logs/" },
        "actions": { "deleteObject": { "daysAfterCreationDate": 90 } }
      }
    ]
  }'
```

## CORS Configuration

```bash
# Set CORS policy for browser-based uploads
curl -X PUT "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/r2/buckets/app-assets/cors" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "corsRules": [
      {
        "allowedOrigins": ["https://example.com"],
        "allowedMethods": ["GET", "PUT", "HEAD"],
        "allowedHeaders": ["Content-Type", "Authorization"],
        "maxAgeSeconds": 3600
      }
    ]
  }'
```

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `NoSuchBucket` error via S3 API | Wrong endpoint or bucket name | Verify endpoint is `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` |
| `SignatureDoesNotMatch` | Incorrect secret key or endpoint mismatch | Regenerate R2 API token; ensure region is `auto` |
| Uploads succeed but GET returns 404 | Key path mismatch (leading slash) | R2 keys should not start with `/` |
| Slow uploads for large files | Single-stream upload | Use multipart upload; set `--expected-size` with wrangler |
| CORS errors in browser | Missing CORS config on bucket | Add CORS rules for your origin domain |
| Worker binding returns `undefined` | `wrangler.toml` binding name mismatch | Verify `binding` name matches `Env` interface property |
| Public access returns 403 | Public access not enabled | Enable in bucket Settings > Public access |

## Related Skills

- cloudflare-workers (`cloudflare-workers`) - Signed URL generation and edge file serving
- cloudflare-pages (`cloudflare-pages`) - Pages Functions with R2 bindings
- cdn-setup (`cdn-setup`) - CDN configuration for asset delivery

## Limitations

- Infrastructure commands can disrupt services: confirm target host/scope and have backups/snapshots before mutating state.
- Docs-only import: upstream scripts and templates not bundled.

