---
name: load-balancing
description: Configure load balancers and traffic distribution. Implement health checks
  and SSL termination. Use when distributing traffic across servers.
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

# Load Balancing

Distribute traffic across application servers for high availability, scalability, and fault tolerance.

## When to Use

- Distributing HTTP/HTTPS traffic across multiple backend servers.
- Implementing health checks to route around unhealthy instances.
- Terminating TLS at the load balancer for simplified certificate management.
- Enabling blue/green or canary deployments with traffic shifting.
- Scaling horizontally behind a single entry point.

## Prerequisites

- Two or more backend servers running the same application.
- TLS certificate for HTTPS termination (ACM, Let's Encrypt, or self-signed for internal).
- For AWS: VPC with public and private subnets across availability zones.
- For nginx/HAProxy: Linux server with root access.

## nginx Load Balancer

### Basic Round-Robin

```nginx
# /etc/nginx/conf.d/loadbalancer.conf
upstream app_backend {
    server 10.0.1.10:8080;
    server 10.0.1.11:8080;
    server 10.0.1.12:8080;
}

server {
    listen 80;
    server_name app.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name app.example.com;

    ssl_certificate     /etc/ssl/certs/app.example.com.pem;
    ssl_certificate_key /etc/ssl/private/app.example.com-key.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://app_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_connect_timeout 5s;
        proxy_read_timeout 30s;
        proxy_send_timeout 30s;
    }

    location /health {
        access_log off;
        return 200 "OK";
    }
}
```

### Weighted and Backup Servers

```nginx
upstream app_backend {
    least_conn;  # Route to server with fewest active connections

    server 10.0.1.10:8080 weight=5;      # Gets 5x traffic
    server 10.0.1.11:8080 weight=3;      # Gets 3x traffic
    server 10.0.1.12:8080 weight=1;      # Gets 1x traffic
    server 10.0.1.20:8080 backup;        # Only used when others are down
    server 10.0.1.21:8080 down;          # Temporarily removed from pool
}
```

### Health Checks (nginx Plus / OpenResty)

```nginx
upstream app_backend {
    zone backend 64k;  # Shared memory zone for health data

    server 10.0.1.10:8080;
    server 10.0.1.11:8080;
    server 10.0.1.12:8080;
}

# Health check (requires nginx Plus or third-party module)
# match healthy {
#     status 200;
#     body ~ "OK";
# }
# health_check interval=5s fails=3 passes=2 match=healthy;
```

### Sticky Sessions (IP Hash)

```nginx
upstream app_backend {
    ip_hash;  # Same client IP always goes to the same server
    server 10.0.1.10:8080;
    server 10.0.1.11:8080;
    server 10.0.1.12:8080;
}
```

## HAProxy Configuration

### Full Production Config

```
# /etc/haproxy/haproxy.cfg
global
    log /dev/log local0
    maxconn 4096
    daemon
    ssl-default-bind-ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256
    ssl-default-bind-options no-sslv3 no-tlsv10 no-tlsv11
    tune.ssl.default-dh-param 2048

defaults
    mode http
    log global
    option httplog
    option dontlognull
    option forwardfor
    timeout connect 5s
    timeout client  30s
    timeout server  30s
    timeout http-request 10s
    timeout http-keep-alive 5s
    retries 3

frontend http_front
    bind *:80
    redirect scheme https code 301 if !{ ssl_fc }

frontend https_front
    bind *:443 ssl crt /etc/ssl/certs/app.example.com.pem
    http-request set-header X-Forwarded-Proto https

    # Route based on path
    acl is_api path_beg /api/
    acl is_ws  path_beg /ws/

    use_backend api_servers if is_api
    use_backend ws_servers  if is_ws
    default_backend web_servers

backend web_servers
    balance roundrobin
    option httpchk GET /health HTTP/1.1\r\nHost:\ app.example.com
    http-check expect status 200

    cookie SERVERID insert indirect nocache
    server web1 10.0.1.10:8080 check inter 5s fall 3 rise 2 cookie web1
    server web2 10.0.1.11:8080 check inter 5s fall 3 rise 2 cookie web2
    server web3 10.0.1.12:8080 check inter 5s fall 3 rise 2 cookie web3

backend api_servers
    balance leastconn
    option httpchk GET /api/health
    http-check expect status 200

    server api1 10.0.2.10:8080 check inter 5s fall 3 rise 2
    server api2 10.0.2.11:8080 check inter 5s fall 3 rise 2

backend ws_servers
    balance source
    option httpchk GET /health
    timeout tunnel 1h

    server ws1 10.0.3.10:8080 check inter 5s fall 3 rise 2
    server ws2 10.0.3.11:8080 check inter 5s fall 3 rise 2

listen stats
    bind *:8404
    stats enable
    stats uri /stats
    stats refresh 10s
    stats admin if LOCALHOST
```

### HAProxy Management

```bash
# Test config before reloading
haproxy -c -f /etc/haproxy/haproxy.cfg

# Reload without dropping connections
sudo systemctl reload haproxy

# View stats from CLI
echo "show stat" | sudo socat stdio /var/run/haproxy/admin.sock

# Drain a server (stop new connections, let existing finish)
echo "set server web_servers/web1 state drain" | sudo socat stdio /var/run/haproxy/admin.sock

# Set server to maintenance
echo "set server web_servers/web1 state maint" | sudo socat stdio /var/run/haproxy/admin.sock

# Re-enable server
echo "set server web_servers/web1 state ready" | sudo socat stdio /var/run/haproxy/admin.sock
```

## AWS Application Load Balancer (ALB)

### Create ALB via CLI

```bash
# Create the load balancer
aws elbv2 create-load-balancer \
  --name my-app-alb \
  --subnets subnet-aaa111 subnet-bbb222 \
  --security-groups sg-xxx123 \
  --type application \
  --scheme internet-facing

# Create a target group
aws elbv2 create-target-group \
  --name my-app-targets \
  --protocol HTTP \
  --port 8080 \
  --vpc-id vpc-xxx123 \
  --health-check-protocol HTTP \
  --health-check-path /health \
  --health-check-interval-seconds 15 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --target-type instance

# Register targets
aws elbv2 register-targets \
  --target-group-arn arn:aws:elasticloadbalancing:us-east-1:123456:targetgroup/my-app-targets/abc123 \
  --targets Id=i-0123456789abc Id=i-0987654321def

# Create HTTPS listener
aws elbv2 create-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:us-east-1:123456:loadbalancer/app/my-app-alb/abc123 \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=arn:aws:acm:us-east-1:123456:certificate/abc-123 \
  --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:us-east-1:123456:targetgroup/my-app-targets/abc123

# Create HTTP redirect listener
aws elbv2 create-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:us-east-1:123456:loadbalancer/app/my-app-alb/abc123 \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=redirect,RedirectConfig='{Protocol=HTTPS,Port=443,StatusCode=HTTP_301}'
```

### Check Target Health

```bash
# Check health of registered targets
aws elbv2 describe-target-health \
  --target-group-arn arn:aws:elasticloadbalancing:us-east-1:123456:targetgroup/my-app-targets/abc123
```

## AWS Network Load Balancer (NLB)

```bash
# Create NLB (for TCP, UDP, or TLS traffic)
aws elbv2 create-load-balancer \
  --name my-tcp-nlb \
  --subnets subnet-aaa111 subnet-bbb222 \
  --type network \
  --scheme internet-facing

# Create TCP target group
aws elbv2 create-target-group \
  --name my-tcp-targets \
  --protocol TCP \
  --port 5432 \
  --vpc-id vpc-xxx123 \
  --health-check-protocol TCP \
  --target-type ip
```

## ALB with Terraform

```hcl
resource "aws_lb" "app" {
  name               = "my-app-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = var.public_subnet_ids

  enable_deletion_protection = true
}

resource "aws_lb_target_group" "app" {
  name     = "my-app-tg"
  port     = 8080
  protocol = "HTTP"
  vpc_id   = var.vpc_id

  health_check {
    path                = "/health"
    port                = "traffic-port"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 15
    matcher             = "200"
  }

  deregistration_delay = 30

  stickiness {
    type            = "lb_cookie"
    cookie_duration = 86400
    enabled         = true
  }
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.app.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate.cert.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}

resource "aws_lb_listener" "http_redirect" {
  load_balancer_arn = aws_lb.app.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}
```

## Load Balancing Algorithms

| Algorithm | Use Case | nginx | HAProxy |
|-----------|----------|-------|---------|
| Round Robin | Default, equal servers | `(default)` | `balance roundrobin` |
| Least Connections | Uneven request durations | `least_conn` | `balance leastconn` |
| IP Hash | Session persistence without cookies | `ip_hash` | `balance source` |
| URI Hash | Cache locality per URL | `hash $request_uri` | `balance uri` |
| Random with Two | Large server pools | `random two least_conn` | `balance random(2)` |

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| All backends show "unhealthy" | Health check path returns non-200 | Verify `/health` endpoint returns 200; check security groups |
| 502 Bad Gateway | Backend not running or wrong port | Confirm backend is listening on the configured port |
| Uneven traffic distribution | Sticky sessions or weighted config | Check session affinity settings; review server weights |
| Connection timeouts | Backend too slow or timeout too low | Increase `proxy_read_timeout` or HAProxy `timeout server` |
| TLS handshake failures | Certificate mismatch or expired cert | Verify cert matches the domain; renew if expired |
| ALB returns 503 | No healthy targets registered | Check target group health; verify targets are in correct subnets |
| WebSocket disconnects | Proxy not configured for upgrades | Add `proxy_set_header Upgrade` and `Connection "upgrade"` |

## Related Skills

- reverse-proxy (`reverse-proxy`) - Reverse proxy configuration patterns
- dns-management (`dns-management`) - DNS records pointing to load balancers
- cdn-setup (`cdn-setup`) - CDN in front of load balanced origins
- service-mesh (`service-mesh`) - Service-level load balancing in Kubernetes

## Limitations

- Infrastructure commands can disrupt services: confirm target host/scope and have backups/snapshots before mutating state.
- Docs-only import: upstream scripts and templates not bundled.

