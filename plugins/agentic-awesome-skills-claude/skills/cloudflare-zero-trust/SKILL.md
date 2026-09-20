---
name: cloudflare-zero-trust
description: Protect internal apps with Cloudflare Access, device posture, and Zero
  Trust policies.
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

# Cloudflare Zero Trust

Secure access to internal services without VPNs using Cloudflare's Zero Trust platform (Access, Tunnel, Gateway, and WARP).

## When to Use

- Replacing VPN access to internal web applications, SSH, or RDP.
- Enforcing identity-aware access policies on internal tools (dashboards, admin panels).
- Exposing on-premises or private-network services securely to remote teams.
- Filtering DNS traffic to block malware, phishing, and shadow IT.
- Enforcing device posture checks (managed devices, OS version, disk encryption).

## Prerequisites

- Cloudflare account with Zero Trust plan (free tier supports up to 50 users).
- A domain on Cloudflare (for Access application hostnames).
- Identity provider configured (Google Workspace, Okta, Azure AD/Entra ID, GitHub).
- `cloudflared` CLI installed on the server hosting internal services.

```bash
# Install cloudflared
# macOS
brew install cloudflared

# Debian/Ubuntu
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null
echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/cloudflared.list
sudo apt update && sudo apt install -y cloudflared

# Docker
docker pull cloudflare/cloudflared:latest
```

## Cloudflare Tunnel Setup

Tunnels create encrypted outbound connections from your infrastructure to Cloudflare's edge, eliminating the need to open inbound ports.

### Create and Configure a Tunnel

```bash
# Authenticate with Cloudflare
cloudflared tunnel login

# Create a named tunnel
cloudflared tunnel create internal-apps

# This creates credentials at ~/.cloudflared/<TUNNEL_ID>.json

# List tunnels
cloudflared tunnel list

# Route DNS to the tunnel (creates a CNAME record)
cloudflared tunnel route dns internal-apps grafana.example.com
cloudflared tunnel route dns internal-apps wiki.example.com
cloudflared tunnel route dns internal-apps ssh.example.com
```

### Tunnel Configuration File

```yaml
# ~/.cloudflared/config.yml
tunnel: <TUNNEL_ID>
credentials-file: /home/deploy/.cloudflared/<TUNNEL_ID>.json

ingress:
  # Grafana dashboard
  - hostname: grafana.example.com
    service: http://localhost:3000

  # Internal wiki
  - hostname: wiki.example.com
    service: http://localhost:8080
    originRequest:
      noTLSVerify: true

  # SSH access via browser
  - hostname: ssh.example.com
    service: ssh://localhost:22

  # Private network access (CIDR routing)
  - hostname: internal.example.com
    service: http://10.0.0.0/24

  # Catch-all — required as the last rule
  - service: http_status:404
```

### Run the Tunnel

```bash
# Run in foreground (for testing)
cloudflared tunnel run internal-apps

# Install as a systemd service
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared

# Or run via Docker
docker run -d --name cloudflared \
  --restart unless-stopped \
  -v /home/deploy/.cloudflared:/etc/cloudflared \
  cloudflare/cloudflared:latest \
  tunnel run internal-apps
```

### Docker Compose with Tunnel

```yaml
# docker-compose.yml
version: "3.8"
services:
  cloudflared:
    image: cloudflare/cloudflared:latest
    restart: unless-stopped
    command: tunnel run
    environment:
      - TUNNEL_TOKEN=${TUNNEL_TOKEN}
    networks:
      - internal

  grafana:
    image: grafana/grafana:latest
    networks:
      - internal

  wiki:
    image: requarks/wiki:2
    networks:
      - internal

networks:
  internal:
    driver: bridge
```

## Access Policies

Access policies control who can reach applications behind Cloudflare.

### Create an Access Application

```bash
# Via API — create a self-hosted application
curl -X POST "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/access/apps" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Grafana",
    "domain": "grafana.example.com",
    "type": "self_hosted",
    "session_duration": "12h",
    "auto_redirect_to_identity": true,
    "allowed_idps": ["<IDP_UUID>"]
  }'
```

### Policy Types and Examples

```bash
# Allow policy — members of the engineering group
curl -X POST "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/access/apps/<APP_ID>/policies" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Engineering Team",
    "decision": "allow",
    "include": [
      { "group": { "id": "<GROUP_UUID>" } }
    ],
    "require": [
      { "login_method": { "id": "<MFA_METHOD_UUID>" } }
    ]
  }'
```

### Common Policy Patterns

| Pattern | Include Rule | Require Rule |
|---------|-------------|--------------|
| All employees | Email domain `@company.com` | - |
| Engineering only | Access Group "Engineering" | MFA |
| Contractors (time-limited) | Email list | Device posture |
| CI/CD automation | Service token | - |
| External partners | Specific emails | Country check |

### Service Tokens for Automation

```bash
# Create a service token for CI/CD
curl -X POST "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/access/service_tokens" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "github-actions-deploy"}'

# Response includes Client ID and Client Secret
# Use in CI with headers:
# CF-Access-Client-Id: <CLIENT_ID>
# CF-Access-Client-Secret: <CLIENT_SECRET>
```

```bash
# Use service token in CI/CD
curl -H "CF-Access-Client-Id: $CF_CLIENT_ID" \
     -H "CF-Access-Client-Secret: $CF_CLIENT_SECRET" \
     https://grafana.example.com/api/health
```

## Device Posture Checks

Enforce endpoint requirements before granting access.

### Configure Posture Checks (Dashboard)

1. Go to **Settings > WARP Client > Device posture**.
2. Add checks:
   - **Disk encryption**: Require FileVault (macOS) or BitLocker (Windows).
   - **OS version**: Minimum macOS 14.0 or Windows 11.
   - **Firewall**: Ensure host firewall is enabled.
   - **Crowdstrike/SentinelOne**: Verify EDR agent is running.
3. Reference posture checks in Access policies under **Require** rules.

## Gateway DNS Filtering

Block malicious domains and enforce acceptable use policies at the DNS level.

### DNS Locations

```bash
# Configure DNS endpoints for offices or networks
# Dashboard: Gateway > DNS Locations > Add a location
# Assign the Gateway DNS IPs to your network's DNS resolver:
# IPv4: 172.64.36.1, 172.64.36.2
# IPv6: 2606:4700:4700::1111
# DoH: https://<UNIQUE_ID>.cloudflare-gateway.com/dns-query
```

### DNS Policies

```bash
# Create a DNS policy to block malware and phishing
curl -X POST "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/gateway/rules" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Block Security Threats",
    "enabled": true,
    "action": "block",
    "traffic": "any(dns.security_category[*] in {80 83 131 134 151 153})",
    "filters": ["dns"]
  }'
```

### Common DNS Policy Rules

| Rule Name | Traffic Expression | Action |
|-----------|-------------------|--------|
| Block malware | `any(dns.security_category[*] in {80 83})` | Block |
| Block phishing | `any(dns.security_category[*] in {131 134})` | Block |
| Block social media | `any(dns.content_category[*] in {75})` | Block |
| Allow exceptions | `dns.fqdn == "allowed.example.com"` | Allow |

## WARP Client Deployment

Deploy the Cloudflare WARP client to route traffic through Gateway.

```bash
# MDM deployment — macOS configuration profile
# Use Cloudflare's managed deployment:
# Dashboard: Settings > WARP Client > Device enrollment

# Manual enrollment
# 1. Install WARP client from https://1.1.1.1
# 2. Click gear icon > Account > Login with Cloudflare Zero Trust
# 3. Enter your team name (from Settings > General)

# Verify WARP is connected
curl https://connectivity.cloudflare.com/cdn-cgi/trace
# Look for: warp=on
```

### WARP Split Tunnels

```bash
# Configure split tunnels to exclude certain traffic from WARP
# Dashboard: Settings > WARP Client > Device settings > Split Tunnels

# Exclude mode (default): WARP handles everything except listed IPs
# Include mode: WARP only handles listed IPs/domains

# Common exclusions:
# - Local network: 192.168.0.0/16, 10.0.0.0/8
# - Video conferencing: zoom.us, *.teams.microsoft.com
# - Printer subnets
```

## SSH and Browser-Based Terminal

```yaml
# In cloudflared config.yml — expose SSH via browser rendering
ingress:
  - hostname: ssh.example.com
    service: ssh://localhost:22
```

```bash
# Users access ssh.example.com in their browser
# Cloudflare renders an in-browser terminal after Access authentication

# Or use cloudflared on the client side for native SSH
cloudflared access ssh --hostname ssh.example.com

# Add to SSH config for seamless access
# ~/.ssh/config
# Host ssh.example.com
#   ProxyCommand /usr/local/bin/cloudflared access ssh --hostname %h
```

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Tunnel shows `ERR` in dashboard | `cloudflared` not running or config error | Check `systemctl status cloudflared`; validate config YAML |
| Access returns 403 despite correct identity | Policy order or missing require rule | Policies are evaluated top-to-bottom; ensure Allow is above Block |
| WARP shows "Unable to connect" | Team name wrong or enrollment disabled | Verify team name in Settings > General; check enrollment permissions |
| Service token auth fails | Token expired or wrong headers | Regenerate token; use both `CF-Access-Client-Id` and `CF-Access-Client-Secret` |
| DNS filtering not blocking | Client not using Gateway DNS resolvers | Verify DNS is set to 172.64.36.1; check WARP is connected |
| Tunnel latency spikes | Tunnel running on overloaded host | Monitor `cloudflared` resource usage; run on dedicated infra |
| "No healthy origins" error | Backend service is down | Check the service at the configured ingress port; review `cloudflared` logs |

## Related Skills

- cloudflare-workers (`cloudflare-workers`) - Edge compute behind Access policies
- dns-management (`dns-management`) - DNS routing and record management
- reverse-proxy (`reverse-proxy`) - Alternative gateway patterns
- service-mesh (`service-mesh`) - Internal service-to-service security

## Limitations

- Infrastructure commands can disrupt services: confirm target host/scope and have backups/snapshots before mutating state.
- Docs-only import: upstream scripts and templates not bundled.

