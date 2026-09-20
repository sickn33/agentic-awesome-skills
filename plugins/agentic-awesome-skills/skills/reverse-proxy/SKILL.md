---
name: reverse-proxy
description: Configure nginx and Traefik as reverse proxies. Implement SSL termination
  and routing. Use when setting up application gateways.
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

# Reverse Proxy

Configure reverse proxies to route traffic, terminate TLS, enforce rate limits, and serve as the gateway between clients and backend services.

## When to Use

- Routing traffic from a public domain to one or more backend services.
- Terminating TLS at the edge and forwarding plain HTTP to backends.
- Adding rate limiting, CORS, security headers, and access control.
- Consolidating multiple services under a single domain with path-based routing.
- Handling WebSocket upgrades, gRPC proxying, or HTTP/2 passthrough.

## Prerequisites

- Backend service(s) running on known host:port.
- TLS certificate (Let's Encrypt, ACM, or self-signed for development).
- nginx 1.25+ or Traefik 3.x installed.
- DNS record pointing the domain to the proxy server.

## nginx Reverse Proxy

### Basic HTTPS Proxy with Redirect

```nginx
# /etc/nginx/sites-available/app.example.com
server {
    listen 80;
    server_name app.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name app.example.com;

    # TLS configuration
    ssl_certificate     /etc/letsencrypt/live/app.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.example.com/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers on;
    ssl_session_cache   shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;

    # Proxy to backend
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 5s;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;

        # Buffering
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
    }
}
```

### Path-Based Routing to Multiple Services

```nginx
server {
    listen 443 ssl http2;
    server_name app.example.com;

    ssl_certificate     /etc/letsencrypt/live/app.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.example.com/privkey.pem;

    # Frontend SPA
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
    }

    # API backend
    location /api/ {
        proxy_pass http://127.0.0.1:8080/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 120s;
    }

    # WebSocket endpoint
    location /ws/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400s;  # 24h for long-lived connections
    }

    # Static assets with caching
    location /static/ {
        alias /var/www/static/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

### Rate Limiting

```nginx
# Define rate limit zones in http block
http {
    # 10 requests/second per IP
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

    # 1 request/second for login
    limit_req_zone $binary_remote_addr zone=login_limit:10m rate=1r/s;

    # Connection limit per IP
    limit_conn_zone $binary_remote_addr zone=conn_limit:10m;
}

server {
    listen 443 ssl http2;
    server_name app.example.com;

    # Apply rate limit to API
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;
        limit_req_status 429;
        proxy_pass http://127.0.0.1:8080;
    }

    # Strict rate limit on auth endpoints
    location /api/auth/ {
        limit_req zone=login_limit burst=5;
        limit_req_status 429;
        proxy_pass http://127.0.0.1:8080;
    }

    # Connection limit
    location / {
        limit_conn conn_limit 100;
        proxy_pass http://127.0.0.1:3000;
    }
}
```

### Gzip and Brotli Compression

```nginx
http {
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml;
    gzip_min_length 256;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 5;

    # Brotli (requires ngx_brotli module)
    # brotli on;
    # brotli_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml;
    # brotli_comp_level 6;
}
```

### Let's Encrypt with Certbot

```bash
# Install certbot with nginx plugin
sudo apt install certbot python3-certbot-nginx

# Obtain and install certificate
sudo certbot --nginx -d app.example.com -d www.example.com

# Auto-renewal is configured via systemd timer
sudo systemctl status certbot.timer

# Manual renewal test
sudo certbot renew --dry-run
```

## Traefik Reverse Proxy

### Static Configuration

```yaml
# traefik.yml
entryPoints:
  web:
    address: ":80"
    http:
      redirections:
        entryPoint:
          to: websecure
          scheme: https
  websecure:
    address: ":443"

certificatesResolvers:
  letsencrypt:
    acme:
      email: admin@example.com
      storage: /letsencrypt/acme.json
      httpChallenge:
        entryPoint: web

providers:
  docker:
    exposedByDefault: false
  file:
    directory: /etc/traefik/dynamic/

api:
  dashboard: true
  insecure: false

log:
  level: INFO

accessLog:
  filePath: /var/log/traefik/access.log
```

### Dynamic Configuration (File Provider)

```yaml
# /etc/traefik/dynamic/services.yml
http:
  routers:
    app:
      rule: "Host(`app.example.com`)"
      entryPoints:
        - websecure
      service: app
      tls:
        certResolver: letsencrypt
      middlewares:
        - security-headers
        - rate-limit

    api:
      rule: "Host(`app.example.com`) && PathPrefix(`/api`)"
      entryPoints:
        - websecure
      service: api
      tls:
        certResolver: letsencrypt

  services:
    app:
      loadBalancer:
        servers:
          - url: "http://127.0.0.1:3000"
        healthCheck:
          path: /health
          interval: 10s
          timeout: 3s

    api:
      loadBalancer:
        servers:
          - url: "http://127.0.0.1:8080"
        healthCheck:
          path: /api/health
          interval: 10s
          timeout: 3s

  middlewares:
    security-headers:
      headers:
        stsSeconds: 63072000
        stsIncludeSubdomains: true
        frameDeny: true
        contentTypeNosniff: true
        browserXssFilter: true
        referrerPolicy: strict-origin-when-cross-origin

    rate-limit:
      rateLimit:
        average: 100
        burst: 50
        period: 1m
```

### Traefik with Docker Labels

```yaml
# docker-compose.yml
version: "3.8"

services:
  traefik:
    image: traefik:v3.0
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./traefik.yml:/etc/traefik/traefik.yml:ro
      - letsencrypt:/letsencrypt

  frontend:
    image: my-frontend:latest
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.frontend.rule=Host(`app.example.com`)"
      - "traefik.http.routers.frontend.tls.certresolver=letsencrypt"
      - "traefik.http.services.frontend.loadbalancer.server.port=3000"

  api:
    image: my-api:latest
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.api.rule=Host(`app.example.com`) && PathPrefix(`/api`)"
      - "traefik.http.routers.api.tls.certresolver=letsencrypt"
      - "traefik.http.services.api.loadbalancer.server.port=8080"
      - "traefik.http.routers.api.middlewares=api-ratelimit"
      - "traefik.http.middlewares.api-ratelimit.ratelimit.average=50"
      - "traefik.http.middlewares.api-ratelimit.ratelimit.burst=25"

volumes:
  letsencrypt:
```

## nginx Testing and Management

```bash
# Test configuration syntax
sudo nginx -t

# Reload without downtime
sudo nginx -s reload

# View active connections
sudo nginx -s status

# Check which config file is active
nginx -V 2>&1 | grep -o '\-\-conf-path=[^ ]*'

# Monitor access logs
tail -f /var/log/nginx/access.log

# Monitor error logs
tail -f /var/log/nginx/error.log
```

## IP Allowlisting and Geoblocking

```nginx
# Allow only specific IPs (admin panel)
location /admin/ {
    allow 203.0.113.0/24;
    allow 198.51.100.5;
    deny all;
    proxy_pass http://127.0.0.1:3000;
}

# Block by country (requires GeoIP2 module)
# geoip2 /usr/share/GeoIP/GeoLite2-Country.mmdb {
#     auto_reload 60m;
#     $geoip2_data_country_iso_code country iso_code;
# }
# if ($geoip2_data_country_iso_code = "XX") {
#     return 403;
# }
```

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| 502 Bad Gateway | Backend not running or unreachable | Verify backend is listening; check `proxy_pass` URL |
| 504 Gateway Timeout | Backend too slow | Increase `proxy_read_timeout`; check backend performance |
| Mixed content warnings | `X-Forwarded-Proto` not set | Add `proxy_set_header X-Forwarded-Proto $scheme` |
| WebSocket disconnects after 60s | Default proxy timeout expires | Set `proxy_read_timeout 86400s` for WebSocket locations |
| Rate limit hits legitimate users | Zone rate too aggressive | Increase `rate` or `burst` values; use different zones per endpoint |
| Let's Encrypt renewal fails | Port 80 blocked or wrong server block | Ensure `.well-known/acme-challenge/` is accessible |
| Traefik shows 404 for all routes | Docker labels not detected | Verify Docker socket is mounted; check `exposedByDefault` setting |
| TLS handshake failure | Certificate chain incomplete | Include intermediate certificates in `ssl_certificate` |

## Related Skills

- load-balancing (`load-balancing`) - Multi-backend traffic distribution
- cdn-setup (`cdn-setup`) - CDN in front of reverse proxy
- dns-management (`dns-management`) - DNS records for proxy domains
- service-mesh (`service-mesh`) - Service-level routing in Kubernetes

## Limitations

- Infrastructure commands can disrupt services: confirm target host/scope and have backups/snapshots before mutating state.
- Docs-only import: upstream scripts and templates not bundled.

