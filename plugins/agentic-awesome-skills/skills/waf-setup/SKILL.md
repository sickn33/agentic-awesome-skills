---
name: waf-setup
description: Deploy and tune Web Application Firewalls. Configure rules for OWASP
  Top 10 protection. Use when protecting web applications from common attacks.
category: security
risk: critical
source: https://github.com/BagelHole/DevOps-Security-Agent-Skills
source_repo: BagelHole/DevOps-Security-Agent-Skills
source_type: community
date_added: '2026-09-20'
license: MIT
license_source: https://github.com/BagelHole/DevOps-Security-Agent-Skills/blob/main/LICENSE
compatibility: Requires the relevant security tooling (scanners, vault CLIs) and an
  authorized scope for any active assessment. Docs-only; helper scripts and templates
  not bundled.
metadata:
  author: devops-skills
  version: '1.0'
---

# WAF Setup

Protect web applications with Web Application Firewalls.

## Prerequisites

- Web application behind a load balancer or reverse proxy
- AWS account for AWS WAF, or Cloudflare account for Cloudflare WAF
- Nginx with ModSecurity module compiled for self-hosted WAF
- Access to application logs to tune rules and identify false positives
- Understanding of HTTP request/response structure

## AWS WAF

### Create Web ACL with Managed Rules

```bash
# Create Web ACL with AWS managed rules
aws wafv2 create-web-acl \
  --name production-waf \
  --scope REGIONAL \
  --default-action Allow={} \
  --visibility-config SampledRequestsEnabled=true,CloudWatchMetricsEnabled=true,MetricName=production-waf \
  --rules file://waf-rules.json
```

### AWS WAF Rules Configuration

```json
[
  {
    "Name": "AWSManagedRulesCommonRuleSet",
    "Priority": 1,
    "Statement": {
      "ManagedRuleGroupStatement": {
        "VendorName": "AWS",
        "Name": "AWSManagedRulesCommonRuleSet",
        "ExcludedRules": []
      }
    },
    "OverrideAction": { "None": {} },
    "VisibilityConfig": {
      "SampledRequestsEnabled": true,
      "CloudWatchMetricsEnabled": true,
      "MetricName": "AWSCommonRules"
    }
  },
  {
    "Name": "AWSManagedRulesSQLiRuleSet",
    "Priority": 2,
    "Statement": {
      "ManagedRuleGroupStatement": {
        "VendorName": "AWS",
        "Name": "AWSManagedRulesSQLiRuleSet"
      }
    },
    "OverrideAction": { "None": {} },
    "VisibilityConfig": {
      "SampledRequestsEnabled": true,
      "CloudWatchMetricsEnabled": true,
      "MetricName": "AWSSQLiRules"
    }
  },
  {
    "Name": "AWSManagedRulesKnownBadInputsRuleSet",
    "Priority": 3,
    "Statement": {
      "ManagedRuleGroupStatement": {
        "VendorName": "AWS",
        "Name": "AWSManagedRulesKnownBadInputsRuleSet"
      }
    },
    "OverrideAction": { "None": {} },
    "VisibilityConfig": {
      "SampledRequestsEnabled": true,
      "CloudWatchMetricsEnabled": true,
      "MetricName": "AWSBadInputRules"
    }
  },
  {
    "Name": "RateLimitRule",
    "Priority": 4,
    "Statement": {
      "RateBasedStatement": {
        "Limit": 2000,
        "AggregateKeyType": "IP"
      }
    },
    "Action": { "Block": {} },
    "VisibilityConfig": {
      "SampledRequestsEnabled": true,
      "CloudWatchMetricsEnabled": true,
      "MetricName": "RateLimit"
    }
  },
  {
    "Name": "GeoBlockRule",
    "Priority": 5,
    "Statement": {
      "GeoMatchStatement": {
        "CountryCodes": ["KP", "IR", "SY"]
      }
    },
    "Action": { "Block": {} },
    "VisibilityConfig": {
      "SampledRequestsEnabled": true,
      "CloudWatchMetricsEnabled": true,
      "MetricName": "GeoBlock"
    }
  },
  {
    "Name": "BlockBadUserAgents",
    "Priority": 6,
    "Statement": {
      "ByteMatchStatement": {
        "SearchString": "sqlmap",
        "FieldToMatch": { "SingleHeader": { "Name": "user-agent" } },
        "TextTransformations": [{ "Priority": 0, "Type": "LOWERCASE" }],
        "PositionalConstraint": "CONTAINS"
      }
    },
    "Action": { "Block": {} },
    "VisibilityConfig": {
      "SampledRequestsEnabled": true,
      "CloudWatchMetricsEnabled": true,
      "MetricName": "BadUserAgent"
    }
  }
]
```

### Associate WAF with ALB

```bash
# Associate with Application Load Balancer
aws wafv2 associate-web-acl \
  --web-acl-arn arn:aws:wafv2:us-east-1:123456789:regional/webacl/production-waf/abc123 \
  --resource-arn arn:aws:elasticloadbalancing:us-east-1:123456789:loadbalancer/app/my-alb/abc123

# Associate with API Gateway
aws wafv2 associate-web-acl \
  --web-acl-arn arn:aws:wafv2:us-east-1:123456789:regional/webacl/production-waf/abc123 \
  --resource-arn arn:aws:apigateway:us-east-1::/restapis/abc123/stages/prod
```

### AWS WAF Terraform

```hcl
resource "aws_wafv2_web_acl" "main" {
  name        = "production-waf"
  scope       = "REGIONAL"
  description = "Production WAF with OWASP protections"

  default_action {
    allow {}
  }

  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 1

    override_action { none {} }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"

        rule_action_override {
          name = "SizeRestrictions_BODY"
          action_to_use { count {} }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSCommonRules"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "RateLimit"
    priority = 10

    action { block {} }

    statement {
      rate_based_statement {
        limit              = 2000
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimit"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "production-waf"
    sampled_requests_enabled   = true
  }
}

resource "aws_wafv2_web_acl_association" "alb" {
  resource_arn = aws_lb.main.arn
  web_acl_arn  = aws_wafv2_web_acl.main.arn
}
```

## Cloudflare WAF

### API Configuration

```bash
# List available WAF rulesets
curl -s "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/rulesets" \
  -H "Authorization: Bearer ${CF_TOKEN}" | jq '.result[] | {id, name, phase}'

# Create a custom WAF rule
curl -X POST "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/rulesets" \
  -H "Authorization: Bearer ${CF_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Custom WAF Rules",
    "kind": "zone",
    "phase": "http_request_firewall_custom",
    "rules": [
      {
        "action": "block",
        "expression": "(http.request.uri.query contains \"union select\" or http.request.uri.query contains \"1=1\")",
        "description": "Block SQL injection patterns in query string"
      },
      {
        "action": "block",
        "expression": "(http.request.uri.path contains \"..%2f\" or http.request.uri.path contains \"..%5c\")",
        "description": "Block path traversal attempts"
      },
      {
        "action": "challenge",
        "expression": "(cf.threat_score gt 30)",
        "description": "Challenge high threat score visitors"
      },
      {
        "action": "block",
        "expression": "(http.request.headers[\"user-agent\"] contains \"sqlmap\" or http.request.headers[\"user-agent\"] contains \"nikto\")",
        "description": "Block known attack tools"
      }
    ]
  }'

# Configure rate limiting
curl -X POST "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/rulesets" \
  -H "Authorization: Bearer ${CF_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Rate Limiting",
    "kind": "zone",
    "phase": "http_ratelimit",
    "rules": [
      {
        "action": "block",
        "ratelimit": {
          "characteristics": ["ip.src"],
          "period": 60,
          "requests_per_period": 100,
          "mitigation_timeout": 600
        },
        "expression": "(http.request.uri.path matches \"^/api/\")",
        "description": "Rate limit API endpoints"
      }
    ]
  }'
```

### Cloudflare Terraform

```hcl
resource "cloudflare_ruleset" "waf_custom" {
  zone_id = var.zone_id
  name    = "Custom WAF Rules"
  kind    = "zone"
  phase   = "http_request_firewall_custom"

  rules {
    action      = "block"
    expression  = "(http.request.uri.query contains \"union select\")"
    description = "Block SQL injection in query string"
  }

  rules {
    action      = "managed_challenge"
    expression  = "(cf.threat_score gt 30)"
    description = "Challenge suspicious visitors"
  }
}
```


## Contents

- [ModSecurity with Nginx](references/details.md)
- [WAF Tuning Workflow](references/details.md)
- [Troubleshooting](references/details.md)
- [Best Practices](references/details.md)
- [Related Skills](references/details.md)

## When to Use This Skill

Use this skill when:
- Deploying a public-facing web application that needs attack protection
- Meeting compliance requirements (PCI-DSS, SOC2) for web application security
- Blocking OWASP Top 10 attack categories (SQLi, XSS, CSRF, etc.)
- Protecting APIs from abuse, injection, and rate-based attacks
- Adding a virtual patching layer while application code is being fixed

## Limitations

- Apply guidance only within authorized scope; test destructive steps in non-production first.
- Docs-only import: upstream scripts and templates not bundled.

### Example

```bash
# Read-only first: inventory before any active step.
which <tool> && <tool> --help | head -n 20
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.
