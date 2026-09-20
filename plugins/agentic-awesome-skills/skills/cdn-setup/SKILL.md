---
name: cdn-setup
description: Configure CDNs for content delivery. Set up CloudFront, Cloudflare, and
  Fastly. Use when optimizing global content delivery.
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

# CDN Setup

Configure content delivery networks for fast, reliable global asset delivery with proper caching, invalidation, and security.

## When to Use

- Serving static assets (JS, CSS, images, fonts) globally with low latency.
- Offloading traffic from origin servers to reduce compute costs.
- Adding TLS termination and DDoS protection at the edge.
- Implementing geo-based routing or content restrictions.
- Accelerating API responses with edge caching.

## Prerequisites

- Domain with DNS management access.
- Origin server or S3/R2 bucket with content to serve.
- AWS CLI configured (for CloudFront).
- Cloudflare account with zone configured (for Cloudflare CDN).
- Terraform 1.5+ (for infrastructure-as-code examples).

## AWS CloudFront

### Create a Distribution via CLI

```bash
# Create an S3 origin distribution with OAC (Origin Access Control)
aws cloudfront create-distribution --distribution-config '{
  "CallerReference": "my-site-'$(date +%s)'",
  "Comment": "Production site CDN",
  "Enabled": true,
  "Origins": {
    "Quantity": 1,
    "Items": [{
      "Id": "s3-origin",
      "DomainName": "my-bucket.s3.us-east-1.amazonaws.com",
      "OriginPath": "",
      "S3OriginConfig": {
        "OriginAccessIdentity": ""
      },
      "OriginAccessControlId": "E2QWRUHAPOMQZL"
    }]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "s3-origin",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {
      "Quantity": 2,
      "Items": ["GET", "HEAD"]
    },
    "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6",
    "Compress": true
  },
  "DefaultRootObject": "index.html",
  "PriceClass": "PriceClass_100",
  "ViewerCertificate": {
    "ACMCertificateArn": "arn:aws:acm:us-east-1:123456789:certificate/abc-123",
    "SSLSupportMethod": "sni-only",
    "MinimumProtocolVersion": "TLSv1.2_2021"
  },
  "Aliases": {
    "Quantity": 1,
    "Items": ["www.example.com"]
  },
  "CustomErrorResponses": {
    "Quantity": 1,
    "Items": [{
      "ErrorCode": 404,
      "ResponseCode": "200",
      "ResponsePagePath": "/index.html",
      "ErrorCachingMinTTL": 10
    }]
  }
}'
```

### Cache Invalidation

```bash
# Invalidate specific paths
aws cloudfront create-invalidation \
  --distribution-id E1A2B3C4D5E6F7 \
  --paths "/index.html" "/css/*" "/js/*"

# Invalidate everything (costs apply per path)
aws cloudfront create-invalidation \
  --distribution-id E1A2B3C4D5E6F7 \
  --paths "/*"

# Check invalidation status
aws cloudfront get-invalidation \
  --distribution-id E1A2B3C4D5E6F7 \
  --id I1A2B3C4D5E6F7

# List recent invalidations
aws cloudfront list-invalidations --distribution-id E1A2B3C4D5E6F7
```

### CloudFront Functions (Lightweight Edge Logic)

```javascript
// URL rewrite function — add index.html to directory requests
function handler(event) {
  var request = event.request;
  var uri = request.uri;

  if (uri.endsWith('/')) {
    request.uri += 'index.html';
  } else if (!uri.includes('.')) {
    request.uri += '/index.html';
  }

  return request;
}
```

### CloudFront with Terraform

```hcl
# cloudfront.tf
resource "aws_cloudfront_distribution" "site" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  aliases             = ["www.example.com"]
  price_class         = "PriceClass_100"

  origin {
    domain_name              = aws_s3_bucket.site.bucket_regional_domain_name
    origin_id                = "s3-origin"
    origin_access_control_id = aws_cloudfront_origin_access_control.oac.id
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "s3-origin"

    cache_policy_id          = "658327ea-f89d-4fab-a63d-7e88639e58f6" # CachingOptimized
    origin_request_policy_id = "88a5eaf4-2fd4-4709-b370-b4c650ea3fcf" # CORS-S3Origin

    viewer_protocol_policy = "redirect-to-https"
    compress               = true
  }

  # SPA fallback
  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  # API pass-through (no caching)
  ordered_cache_behavior {
    path_pattern     = "/api/*"
    allowed_methods  = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "api-origin"

    cache_policy_id          = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad" # CachingDisabled
    origin_request_policy_id = "b689b0a8-53d0-40ab-baf2-68738e2966ac" # AllViewerExceptHostHeader

    viewer_protocol_policy = "https-only"
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.cert.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
}

resource "aws_cloudfront_origin_access_control" "oac" {
  name                              = "s3-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}
```

## Cloudflare CDN

### Zone Setup

```bash
# Add a zone
curl -X POST "https://api.cloudflare.com/client/v4/zones" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"example.com","jump_start":true}'

# Get zone ID
ZONE_ID=$(curl -s "https://api.cloudflare.com/client/v4/zones?name=example.com" \
  -H "Authorization: Bearer $CF_API_TOKEN" | jq -r '.result[0].id')
```

### Cache Rules (Replacing Page Rules)

```bash
# Create a cache rule for static assets
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/rulesets/phases/http_request_cache_settings/entrypoint" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rules": [
      {
        "expression": "(http.request.uri.path.extension in {\"css\" \"js\" \"png\" \"jpg\" \"woff2\" \"svg\"})",
        "action": "set_cache_settings",
        "action_parameters": {
          "cache": true,
          "browser_ttl": { "mode": "override_origin", "default": 2592000 },
          "edge_ttl": { "mode": "override_origin", "default": 86400 }
        },
        "description": "Cache static assets aggressively"
      }
    ]
  }'
```

### Purge Cache

```bash
# Purge everything
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/purge_cache" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"purge_everything":true}'

# Purge specific URLs
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/purge_cache" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"files":["https://example.com/style.css","https://example.com/app.js"]}'

# Purge by prefix
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/purge_cache" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prefixes":["https://example.com/images/"]}'
```

## Cache Headers on Origin

### nginx Cache Headers

```nginx
# Immutable hashed assets (fingerprinted filenames)
location ~* \.(js|css)$ {
    if ($uri ~* "\.[a-f0-9]{8,}\.(js|css)$") {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    expires 7d;
    add_header Cache-Control "public, must-revalidate";
}

# Images and fonts
location ~* \.(jpg|jpeg|png|gif|ico|svg|webp|woff2|ttf)$ {
    expires 30d;
    add_header Cache-Control "public, immutable";
}

# HTML — always revalidate
location ~* \.html$ {
    expires -1;
    add_header Cache-Control "no-cache, must-revalidate";
}

# API responses — no caching
location /api/ {
    add_header Cache-Control "no-store, no-cache";
    add_header Vary "Authorization, Accept";
}
```

### Cache-Control Cheat Sheet

| Header | Meaning |
|--------|---------|
| `public, max-age=31536000, immutable` | Cache for 1 year, never revalidate (hashed assets) |
| `public, max-age=86400, must-revalidate` | Cache 1 day, check freshness after |
| `private, max-age=600` | Browser cache only, 10 min (user-specific content) |
| `no-cache` | Always revalidate with origin before serving |
| `no-store` | Never cache (sensitive data) |
| `s-maxage=3600` | CDN caches for 1 hour, overrides `max-age` for shared caches |

## Cache Warming

```bash
# Warm cache for critical pages after deployment
#!/bin/bash
URLS=(
  "https://www.example.com/"
  "https://www.example.com/products"
  "https://www.example.com/about"
  "https://www.example.com/css/main.abc123.css"
  "https://www.example.com/js/app.def456.js"
)

for url in "${URLS[@]}"; do
  curl -s -o /dev/null -w "%{http_code} %{time_total}s %{url_effective}\n" "$url"
done
```

## Monitoring Cache Performance

```bash
# Check cache status from response headers
curl -sI https://www.example.com/style.css | grep -i -E "cf-cache|x-cache|age|cache-control"

# Expected headers:
# cf-cache-status: HIT (Cloudflare)
# x-cache: Hit from cloudfront (CloudFront)
# age: 3600 (seconds since cached)

# CloudFront cache hit ratio
aws cloudwatch get-metric-statistics \
  --namespace AWS/CloudFront \
  --metric-name CacheHitRate \
  --dimensions Name=DistributionId,Value=E1A2B3C4D5E6F7 \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average
```

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `cf-cache-status: DYNAMIC` | No cache rule matches or Cache-Control prevents it | Set `s-maxage` or create a cache rule for the path |
| Cache hit ratio below 50% | Low TTLs or high URL cardinality (query strings) | Increase TTL; strip unnecessary query strings in cache key |
| Stale content after deploy | Old objects still cached at edge | Invalidate; use content-hashed filenames to avoid this entirely |
| CORS errors through CDN | CDN strips or caches wrong `Vary` header | Add `Vary: Origin` and configure origin request policy to forward `Origin` |
| 502 errors from CDN | Origin down or timeout | Check origin health; increase CDN origin timeout settings |
| Mixed content warnings | CDN serves HTTPS but origin links use HTTP | Set `viewer-protocol-policy: redirect-to-https`; fix origin URLs |
| High invalidation costs | Purging `/*` on every deploy | Use fingerprinted filenames; only invalidate `index.html` |

## Related Skills

- dns-management (`dns-management`) - DNS records for CDN CNAME setup
- cloudflare-pages (`cloudflare-pages`) - Cloudflare's built-in CDN for Pages projects
- reverse-proxy (`reverse-proxy`) - Origin server configuration behind CDN
- load-balancing (`load-balancing`) - Multi-origin CDN backends

## Limitations

- Infrastructure commands can disrupt services: confirm target host/scope and have backups/snapshots before mutating state.
- Docs-only import: upstream scripts and templates not bundled.

