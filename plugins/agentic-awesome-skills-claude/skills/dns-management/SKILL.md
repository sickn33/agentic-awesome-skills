---
name: dns-management
description: Configure DNS zones and records. Manage Route53, Cloud DNS, and self-hosted
  DNS. Use when setting up DNS infrastructure.
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

# DNS Management

Configure and manage DNS zones, records, and resolution for production infrastructure.

## When to Use

- Setting up domains for web applications, APIs, and email.
- Migrating DNS providers or consolidating zones.
- Configuring DNS for CDN, load balancers, and cloud services.
- Troubleshooting resolution failures, propagation delays, or misconfigurations.
- Implementing DNSSEC, SPF, DKIM, and DMARC for email security.

## Prerequisites

- Domain registered with a registrar (Namecheap, Route53, Google Domains, Cloudflare).
- Access to DNS provider dashboard or API.
- AWS CLI configured (for Route53 examples).
- `dig` and `nslookup` available locally (included in most OS installs).

## DNS Record Types Reference

| Type  | Purpose | Example Value |
|-------|---------|---------------|
| A     | IPv4 address | `93.184.216.34` |
| AAAA  | IPv6 address | `2606:2800:220:1:248:1893:25c8:1946` |
| CNAME | Alias to another domain | `www.example.com -> example.com` |
| MX    | Mail server with priority | `10 mail.example.com` |
| TXT   | Arbitrary text (SPF, DKIM, verification) | `v=spf1 include:_spf.google.com ~all` |
| NS    | Authoritative name servers | `ns1.example.com` |
| SRV   | Service location (host, port, priority) | `10 5 5060 sip.example.com` |
| CAA   | Certificate Authority Authorization | `0 issue "letsencrypt.org"` |
| PTR   | Reverse DNS lookup | `34.216.184.93.in-addr.arpa` |

## AWS Route 53

### Hosted Zone Management

```bash
# Create a hosted zone
aws route53 create-hosted-zone \
  --name example.com \
  --caller-reference "$(date +%s)"

# List hosted zones
aws route53 list-hosted-zones

# Get name servers for a zone (update at your registrar)
aws route53 get-hosted-zone --id Z1234567890ABC \
  --query 'DelegationSet.NameServers'
```

### Create and Manage Records

```bash
# Create an A record
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "app.example.com",
        "Type": "A",
        "TTL": 300,
        "ResourceRecords": [{"Value": "93.184.216.34"}]
      }
    }]
  }'

# Create a CNAME record
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "www.example.com",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{"Value": "example.com"}]
      }
    }]
  }'

# Create an alias record (no TTL, Route53-specific)
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "example.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z2FDTNDATAQYW2",
          "DNSName": "d1234567890.cloudfront.net",
          "EvaluateTargetHealth": false
        }
      }
    }]
  }'

# List records in a zone
aws route53 list-resource-record-sets --hosted-zone-id Z1234567890ABC

# Delete a record (Action: DELETE with exact match)
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch '{
    "Changes": [{
      "Action": "DELETE",
      "ResourceRecordSet": {
        "Name": "old.example.com",
        "Type": "A",
        "TTL": 300,
        "ResourceRecords": [{"Value": "1.2.3.4"}]
      }
    }]
  }'
```

### Route 53 Health Checks

```bash
# Create a health check
aws route53 create-health-check --caller-reference "$(date +%s)" \
  --health-check-config '{
    "IPAddress": "93.184.216.34",
    "Port": 443,
    "Type": "HTTPS",
    "ResourcePath": "/health",
    "RequestInterval": 30,
    "FailureThreshold": 3
  }'
```

## Cloudflare DNS

### Manage Records via API

```bash
# Get zone ID
ZONE_ID=$(curl -s "https://api.cloudflare.com/client/v4/zones?name=example.com" \
  -H "Authorization: Bearer $CF_API_TOKEN" | jq -r '.result[0].id')

# Create an A record (proxied through Cloudflare)
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"A","name":"app","content":"93.184.216.34","proxied":true,"ttl":1}'

# Create a CNAME record (DNS only, not proxied)
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -d '{"type":"CNAME","name":"docs","content":"docs.readthedocs.io","proxied":false,"ttl":3600}'

# List all records
curl -s "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
  -H "Authorization: Bearer $CF_API_TOKEN" | jq '.result[] | {name, type, content, proxied}'

# Delete a record
curl -X DELETE "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records/$RECORD_ID" \
  -H "Authorization: Bearer $CF_API_TOKEN"
```

## Terraform DNS Management

### Route 53 with Terraform

```hcl
# dns.tf
resource "aws_route53_zone" "main" {
  name = "example.com"
}

resource "aws_route53_record" "app" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "app.example.com"
  type    = "A"
  ttl     = 300
  records = ["93.184.216.34"]
}

resource "aws_route53_record" "www" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "www.example.com"
  type    = "CNAME"
  ttl     = 300
  records = ["example.com"]
}

# Alias record for CloudFront
resource "aws_route53_record" "cdn" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "example.com"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.main.domain_name
    zone_id                = aws_cloudfront_distribution.main.hosted_zone_id
    evaluate_target_health = false
  }
}

# Email records
resource "aws_route53_record" "mx" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "example.com"
  type    = "MX"
  ttl     = 3600
  records = [
    "1 aspmx.l.google.com",
    "5 alt1.aspmx.l.google.com",
    "5 alt2.aspmx.l.google.com",
  ]
}

resource "aws_route53_record" "spf" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "example.com"
  type    = "TXT"
  ttl     = 3600
  records = ["v=spf1 include:_spf.google.com ~all"]
}

resource "aws_route53_record" "dmarc" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "_dmarc.example.com"
  type    = "TXT"
  ttl     = 3600
  records = ["v=DMARC1; p=quarantine; rua=mailto:dmarc@example.com; pct=100"]
}
```

### Cloudflare with Terraform

```hcl
resource "cloudflare_record" "app" {
  zone_id = var.cloudflare_zone_id
  name    = "app"
  content = "93.184.216.34"
  type    = "A"
  proxied = true
}

resource "cloudflare_record" "mail" {
  zone_id  = var.cloudflare_zone_id
  name     = "@"
  content  = "aspmx.l.google.com"
  type     = "MX"
  priority = 1
}
```

## DNS Troubleshooting Commands

### dig

```bash
# Query A record
dig app.example.com A +short

# Query from a specific DNS server
dig @8.8.8.8 app.example.com A

# Show full answer with TTL
dig app.example.com A +noall +answer

# Query MX records
dig example.com MX +short

# Trace the full resolution path
dig app.example.com +trace

# Check DNSSEC validation
dig example.com +dnssec +short

# Query TXT records (SPF, DKIM)
dig example.com TXT +short
dig default._domainkey.example.com TXT +short
```

### nslookup

```bash
# Basic lookup
nslookup app.example.com

# Specify DNS server
nslookup app.example.com 8.8.8.8

# Query specific record type
nslookup -type=MX example.com
nslookup -type=TXT example.com
```

### Check DNS Propagation

```bash
# Query multiple public resolvers
for dns in 8.8.8.8 1.1.1.1 9.9.9.9 208.67.222.222; do
  echo "=== $dns ==="
  dig @$dns app.example.com A +short
done
```

## Email Security Records

```bash
# SPF — authorize sending servers
# TXT record on example.com
"v=spf1 include:_spf.google.com include:sendgrid.net -all"

# DKIM — email signing verification
# TXT record on google._domainkey.example.com
# (value provided by your email provider)

# DMARC — policy for failed SPF/DKIM
# TXT record on _dmarc.example.com
"v=DMARC1; p=reject; rua=mailto:dmarc-reports@example.com; pct=100"
```

## TTL Strategies

| Scenario | Recommended TTL | Rationale |
|----------|----------------|-----------|
| Stable production records | 3600-86400 (1h-24h) | Reduce DNS queries, faster resolution |
| Pre-migration warmup | 60-300 (1-5 min) | Lower TTL days before migration |
| During migration/failover | 60 | Fast propagation of changes |
| Post-migration cooldown | Gradually increase to 3600+ | Return to normal after confirming stability |
| Load-balanced records | 60-300 | Allow health-check-driven failover |

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| DNS changes not visible | TTL not expired on recursive resolvers | Wait for old TTL to expire; lower TTL before next change |
| `SERVFAIL` response | DNSSEC validation failure or broken delegation | Check NS records at registrar; verify DNSSEC signatures |
| `NXDOMAIN` for valid record | Wrong hosted zone or missing record | Verify record exists with `dig @<authoritative-ns> domain` |
| CNAME at zone apex returns error | CNAME not allowed at zone apex per RFC | Use ALIAS (Route53) or proxied A record (Cloudflare) |
| Email going to spam | Missing or broken SPF/DKIM/DMARC | Verify TXT records with `dig example.com TXT`; test at mail-tester.com |
| Slow resolution | Recursive resolver far from authoritative NS | Use Anycast DNS providers (Cloudflare, Route53) |
| Inconsistent results across resolvers | Partial propagation or cache poisoning | Query authoritative NS directly; check for conflicting records |

## Related Skills

- cdn-setup (`cdn-setup`) - CDN CNAME and alias record configuration
- load-balancing (`load-balancing`) - DNS-based load balancing and health checks
- cloudflare-zero-trust (`cloudflare-zero-trust`) - Tunnel DNS routing
- reverse-proxy (`reverse-proxy`) - Connecting domains to backend services

## Limitations

- Infrastructure commands can disrupt services: confirm target host/scope and have backups/snapshots before mutating state.
- Docs-only import: upstream scripts and templates not bundled.

