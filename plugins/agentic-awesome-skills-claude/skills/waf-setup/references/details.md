# Details (moved from SKILL.md)

> Extended reference content for `waf-setup`, kept under `references/` so the entrypoint stays within the audit budget.

## ModSecurity with Nginx

### Installation

```bash
# Install ModSecurity for Nginx (Ubuntu)
apt install -y libmodsecurity3 libmodsecurity-dev nginx libnginx-mod-http-modsecurity

# Source builds execute third-party code. Use only a reviewed pinned release/commit
# and matching connector/CRS versions in a disposable build environment; no moving clone.

```

### Nginx Configuration

```nginx
# /etc/nginx/nginx.conf
load_module modules/ngx_http_modsecurity_module.so;

http {
    modsecurity on;
    modsecurity_rules_file /etc/nginx/modsec/main.conf;

    server {
        listen 443 ssl http2;
        server_name example.com;

        # ModSecurity can also be enabled per-location
        location /api/ {
            modsecurity on;
            modsecurity_rules_file /etc/nginx/modsec/api-rules.conf;
            proxy_pass http://backend;
        }
    }
}
```

### ModSecurity Main Configuration

```apacheconf
# /etc/nginx/modsec/main.conf
Include /etc/nginx/modsec/modsecurity.conf

# Set to DetectionOnly first, switch to On after tuning
SecRuleEngine DetectionOnly

# Request body handling
SecRequestBodyAccess On
SecRequestBodyLimit 13107200
SecRequestBodyNoFilesLimit 131072

# Response body handling
SecResponseBodyAccess On
SecResponseBodyMimeType text/plain text/html text/xml application/json

# Logging
SecAuditEngine RelevantOnly
SecAuditLogRelevantStatus "^(?:5|4(?!04))"
SecAuditLogParts AHZ  # Minimal example; explicitly approve/redact body and header capture
SecAuditLogType Serial
SecAuditLog /var/log/modsec/modsec_audit.log

# Include OWASP Core Rule Set
Include /etc/nginx/modsec/crs/crs-setup.conf
Include /etc/nginx/modsec/crs/rules/*.conf
```

### OWASP Core Rule Set Setup

```bash
# Download and install OWASP CRS
cd /etc/nginx/modsec
git clone --no-checkout https://github.com/coreruleset/coreruleset crs
git -C crs checkout --detach <reviewed-full-commit-sha>
cp crs/crs-setup.conf.example crs/crs-setup.conf

# Customize CRS settings
cat >> crs/crs-setup.conf << 'EOF'

# Set paranoia level (1-4, higher = more strict)
SecAction "id:900000, phase:1, pass, t:none, nolog, setvar:tx.paranoia_level=2"

# Set anomaly score thresholds
SecAction "id:900110, phase:1, pass, t:none, nolog, \
  setvar:tx.inbound_anomaly_score_threshold=5, \
  setvar:tx.outbound_anomaly_score_threshold=4"

# Exclude known false positives
SecRule REQUEST_URI "@beginsWith /api/upload" \
  "id:1001,phase:1,pass,nolog,ctl:ruleRemoveById=920420"
EOF

# Create rule exclusions file
cat > /etc/nginx/modsec/crs/rules/REQUEST-900-EXCLUSION-RULES-BEFORE-CRS.conf << 'EOF'
# Exclude rules that cause false positives on specific paths
SecRule REQUEST_URI "@beginsWith /api/webhook" \
  "id:1000001,phase:1,pass,nolog,ctl:ruleRemoveTargetById=942100;ARGS:payload"

# Exclude rules for specific parameters
SecRule ARGS_NAMES "^content$" \
  "id:1000002,phase:1,pass,nolog,ctl:ruleRemoveTargetById=941100;ARGS:content"
EOF
```

### Custom ModSecurity Rules

```apacheconf
# /etc/nginx/modsec/custom-rules.conf

# Block requests with known attack tool user agents
SecRule REQUEST_HEADERS:User-Agent "@pm sqlmap nikto nmap masscan dirbuster" \
  "id:10001,phase:1,deny,status:403,log,msg:'Blocked attack tool'"

# Block requests to sensitive paths
SecRule REQUEST_URI "@rx /(\.git|\.env|\.svn|wp-admin|phpmyadmin|adminer)" \
  "id:10002,phase:1,deny,status:404,log,msg:'Blocked sensitive path access'"

# IP:REQUEST_RATE is not automatically maintained; no working rate limiter is
# provided by this example. Use a tested reverse-proxy or managed WAF limiter with
# explicit trusted-client-IP extraction and bounded persistent state.

# Block oversized cookies (potential overflow attack)
SecRule REQUEST_HEADERS:Cookie "@gt 4096" \
  "id:10004,phase:1,t:none,t:length,deny,status:400,log,msg:'Oversized cookie header'"

# Virtual patch: block specific CVE exploit pattern
SecRule ARGS:filename "@contains ../../" \
  "id:10005,phase:2,deny,status:403,log,msg:'Path traversal blocked (virtual patch CVE-XXXX-XXXX)'"

# Require Content-Type on POST requests
SecRule REQUEST_METHOD "@streq POST" \
  "id:10006,phase:1,chain,deny,status:400,log,msg:'POST without Content-Type'"
SecRule &REQUEST_HEADERS:Content-Type "@eq 0" ""
```


The Nginx fragment also needs a valid upstream, TLS certificate/key and included custom-rule file. Check `nginx -t` before an authorized reload. CRS examples must not duplicate enabled 900000/900110 IDs: edit the existing directives, and place runtime exclusions before CRS using the matched release’s documented order. Exclusions are examples only; constrain them to a verified path/parameter and regression-test both legitimate requests and the attack it must still block. Audit-log body capture can expose secrets.

## WAF Tuning Workflow

```bash
#!/bin/bash
# waf-tune.sh - Analyze WAF logs for false positives

AUDIT_LOG="/var/log/modsec/modsec_audit.log"
TIMEFRAME="entire selected log file; no time filter applied"

echo "=== WAF Tuning Report ==="
echo "Analyzing ${TIMEFRAME}"
echo ""

# Top blocked rules
echo "--- Top 10 triggered rules ---"
grep -oP 'id "\K[0-9]+' "$AUDIT_LOG" | sort | uniq -c | sort -rn | head -10

echo ""
echo "--- Top blocked URIs ---"
grep -oP 'REQUEST_URI: \K[^\s]+' "$AUDIT_LOG" | sort | uniq -c | sort -rn | head -10

echo ""
echo "--- Top blocked IPs ---"
grep -oP 'client \K[0-9.]+' "$AUDIT_LOG" | sort | uniq -c | sort -rn | head -10

echo ""
echo "--- False positive candidates (high-frequency blocks on common paths) ---"
grep -oP 'id "\K[0-9]+' "$AUDIT_LOG" | sort | uniq -c | sort -rn | \
  while read count rule_id; do
    if [ "$count" -gt 100 ]; then
      echo "  Rule $rule_id triggered $count times - review for false positive"
    fi
  done
```


## Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| Legitimate requests blocked | False positives from CRS rules | Set `SecRuleEngine DetectionOnly` first; review audit log; add exclusions |
| WAF not blocking attacks | Rules in detection-only mode | Switch `SecRuleEngine On` after tuning period |
| High latency with WAF enabled | Response body inspection overhead | Disable `SecResponseBodyAccess` if not needed; reduce `paranoia_level` |
| AWS WAF rules not matching | Rule priority order wrong | Lower priority number = evaluated first; reorder rules |
| ModSecurity crashes nginx | Memory exhaustion on large requests | Reduce bounded request/inspection limits and profile memory/regex behavior; raising limits can worsen exhaustion |
| Cloudflare WAF blocks API calls | Expression too broad | Narrow expression with path or method conditions |
| CRS update breaks application | New rules trigger on existing traffic | Pin CRS version; test updates in staging first |


## Best Practices

- Start in detection/log mode, switch to blocking after tuning
- Tune rules for at least 1-2 weeks before enforcement
- Monitor blocked requests daily during tuning phase
- Update managed rule sets and CRS regularly
- Create custom rules for application-specific attack patterns
- Use virtual patching to protect against known CVEs while code is being fixed
- Set appropriate rate limits per endpoint
- Maintain exclusion rules documentation with justifications
- Test WAF rules with known attack payloads before deploying
- Select retention from incident/compliance needs and privacy obligations; protect and minimize audit data


## Related Skills

- dast-scanning (`dast-scanning`) - Web security testing
- ssl-tls-management (`ssl-tls-management`) - HTTPS configuration
- firewall-config (`firewall-config`) - Network-level firewalling

