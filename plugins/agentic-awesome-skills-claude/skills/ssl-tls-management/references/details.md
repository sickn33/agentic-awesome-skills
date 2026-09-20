# Details (moved from SKILL.md)

> Extended reference content for `ssl-tls-management`, kept under `references/` so the entrypoint stays within the audit budget.

## Certificate Monitoring

```bash
#!/bin/bash
# cert-monitor.sh - Monitor certificate expiration across hosts

WARN_DAYS=30
CRIT_DAYS=7
HOSTS=(
  "example.com:443"
  "api.example.com:443"
  "admin.example.com:443"
)

for host in "${HOSTS[@]}"; do
  expiry=$(echo | openssl s_client -connect "$host" -servername "${host%%:*}" 2>/dev/null | \
    openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)

  if [ -z "$expiry" ]; then
    echo "ERROR: Cannot connect to $host"
    continue
  fi

  expiry_epoch=$(date -d "$expiry" +%s)
  now_epoch=$(date +%s)
  days_left=$(( (expiry_epoch - now_epoch) / 86400 ))

  if [ "$days_left" -le "$CRIT_DAYS" ]; then
    echo "CRITICAL: $host expires in $days_left days ($expiry)"
  elif [ "$days_left" -le "$WARN_DAYS" ]; then
    echo "WARNING: $host expires in $days_left days ($expiry)"
  else
    echo "OK: $host expires in $days_left days ($expiry)"
  fi
done
```

### Prometheus cert-manager Metrics

```yaml
# Alert on expiring certificates in Kubernetes
groups:
  - name: cert-manager
    rules:
      - alert: CertificateExpiringSoon
        expr: certmanager_certificate_expiration_timestamp_seconds - time() < 7 * 24 * 3600
        for: 1h
        labels:
          severity: critical
        annotations:
          summary: "Certificate {{ $labels.name }} expires in less than 7 days"

      - alert: CertificateNotReady
        expr: certmanager_certificate_ready_status{condition="True"} == 0
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "Certificate {{ $labels.name }} is not ready"
```


## Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| Certbot fails with "connection refused" | Port 80 blocked by firewall | Open port 80 for ACME HTTP-01 challenge |
| "Too many certificates already issued" | Let's Encrypt rate limit hit | Use staging endpoint for testing; wait for rate limit reset |
| cert-manager challenge stuck pending | Ingress or DNS misconfigured | Check `kubectl describe challenge`; verify DNS records |
| Mixed content warnings | HTTP resources on HTTPS page | Update all asset URLs to HTTPS; use CSP headers |
| OCSP stapling not working | Resolver not configured | Add `resolver` directive in nginx; verify outbound DNS |
| Intermediate cert missing | Incomplete chain served | Use `fullchain.pem` not `cert.pem`; verify with `openssl s_client -showcerts` |
| TLS handshake failure | Client doesn't support offered ciphers | Add TLS 1.2 support; check cipher suite compatibility |


## Best Practices

- Automate renewal with systemd timers or cert-manager
- Monitor expiration dates with alerting (30-day and 7-day warnings)
- Use only TLS 1.2 and TLS 1.3
- Enable HSTS with long max-age and includeSubDomains
- Enable OCSP stapling to improve handshake performance
- Use ECDSA keys for better performance where possible
- Test configuration with SSL Labs (ssllabs.com/ssltest)
- Keep private keys secure with proper file permissions (0600)
- Rotate certificates before expiry, not after
- Maintain a certificate inventory across all services


## Related Skills

- hashicorp-vault (`hashicorp-vault`) - PKI management
- waf-setup (`waf-setup`) - Web protection
- zero-trust (`zero-trust`) - mTLS and identity-based access

