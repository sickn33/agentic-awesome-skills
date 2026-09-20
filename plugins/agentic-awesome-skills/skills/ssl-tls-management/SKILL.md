---
name: ssl-tls-management
description: Manage SSL/TLS certificates with Let's Encrypt and internal PKI. Configure
  secure HTTPS, certificate renewal, and cipher suites. Use when implementing secure
  communications.
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

# SSL/TLS Management

Manage certificates and secure communications across web servers, Kubernetes clusters, and internal services.

## Prerequisites

- Domain name with DNS control for public certificates
- Root/sudo access on web servers
- `certbot` installed for Let's Encrypt
- `openssl` CLI available (installed by default on most Linux distros)
- Kubernetes cluster with Helm for cert-manager deployment
- Understanding of X.509 certificate chain of trust

## Let's Encrypt with Certbot

### Installation and Certificate Issuance

```bash
# Install certbot (Ubuntu/Debian)
apt update && apt install -y certbot python3-certbot-nginx

# Obtain certificate for nginx (interactive)
certbot --nginx -d example.com -d www.example.com

# Non-interactive mode for automation
certbot certonly --nginx \
  -d example.com \
  -d www.example.com \
  --non-interactive \
  --agree-tos \
  --email admin@example.com

# Standalone mode (when no web server is running)
certbot certonly --standalone \
  -d example.com \
  --preferred-challenges http

# DNS challenge (for wildcard certs)
certbot certonly --manual \
  --preferred-challenges dns \
  -d "*.example.com" \
  -d example.com

# Using DNS plugin for automation (Cloudflare example)
pip install certbot-dns-cloudflare
cat > /etc/letsencrypt/cloudflare.ini << 'EOF'
dns_cloudflare_api_token = YOUR_CLOUDFLARE_API_TOKEN
EOF
chmod 600 /etc/letsencrypt/cloudflare.ini

certbot certonly --dns-cloudflare \
  --dns-cloudflare-credentials /etc/letsencrypt/cloudflare.ini \
  -d "*.example.com" \
  -d example.com
```

### Renewal Automation

```bash
# Test renewal
certbot renew --dry-run

# Systemd timer (preferred over cron)
cat > /etc/systemd/system/certbot-renewal.service << 'EOF'
[Unit]
Description=Certbot certificate renewal
After=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/bin/certbot renew --quiet --deploy-hook "systemctl reload nginx"
EOF

cat > /etc/systemd/system/certbot-renewal.timer << 'EOF'
[Unit]
Description=Run certbot renewal twice daily

[Timer]
OnCalendar=*-*-* 00,12:00:00
RandomizedDelaySec=3600
Persistent=true

[Install]
WantedBy=timers.target
EOF

systemctl enable --now certbot-renewal.timer

# Verify timer is active
systemctl list-timers certbot-renewal.timer

# Renewal hooks for post-renewal actions
mkdir -p /etc/letsencrypt/renewal-hooks/deploy
cat > /etc/letsencrypt/renewal-hooks/deploy/reload-services.sh << 'HOOK'
#!/bin/bash
systemctl reload nginx
# Also reload other services using the cert
systemctl reload haproxy 2>/dev/null || true
HOOK
chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-services.sh
```

## cert-manager for Kubernetes

### Installation

```bash
# Install with Helm
helm repo add jetstack https://charts.jetstack.io
helm repo update

helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --version v1.14.0 \
  --set installCRDs=true \
  --set prometheus.enabled=true

# Verify installation
kubectl get pods -n cert-manager
kubectl get crds | grep cert-manager
```

### ClusterIssuer Configurations

```yaml
# letsencrypt-staging (use for testing first)
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-staging
spec:
  acme:
    server: https://acme-staging-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-staging
    solvers:
      - http01:
          ingress:
            class: nginx
---
# letsencrypt-prod
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            class: nginx
---
# DNS challenge solver (for wildcard certs with Cloudflare)
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod-dns
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-prod-dns
    solvers:
      - dns01:
          cloudflare:
            apiTokenSecretRef:
              name: cloudflare-api-token
              key: api-token
---
# Self-signed CA issuer for internal services
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: selfsigned-ca
spec:
  selfSigned: {}
```

### Certificate Resources

```yaml
# Public-facing certificate
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: example-cert
  namespace: default
spec:
  secretName: example-tls
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
    - example.com
    - www.example.com
  duration: 2160h    # 90 days
  renewBefore: 720h  # 30 days before expiry
---
# Wildcard certificate
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: wildcard-cert
  namespace: default
spec:
  secretName: wildcard-tls
  issuerRef:
    name: letsencrypt-prod-dns
    kind: ClusterIssuer
  dnsNames:
    - "*.example.com"
    - example.com
---
# Ingress with automatic TLS
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: example-ingress
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
    - hosts:
        - example.com
      secretName: example-tls
  rules:
    - host: example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: web
                port:
                  number: 80
```

## OpenSSL Commands Reference

```bash
# Generate a private key
openssl genrsa -out server.key 4096

# Generate an ECDSA key (preferred for performance)
openssl ecparam -genkey -name prime256v1 -out server-ec.key

# Generate a CSR (Certificate Signing Request)
openssl req -new -key server.key -out server.csr \
  -subj "/C=US/ST=California/L=San Francisco/O=Acme Corp/CN=example.com"

# Generate CSR with SAN (Subject Alternative Names)
openssl req -new -key server.key -out server.csr -config <(cat <<EOF
[req]
default_bits = 4096
distinguished_name = dn
req_extensions = san
prompt = no

[dn]
CN = example.com
O = Acme Corp
C = US

[san]
subjectAltName = DNS:example.com,DNS:www.example.com,DNS:api.example.com
EOF
)

# Generate self-signed certificate (development/testing)
openssl req -x509 -nodes -days 365 -newkey rsa:4096 \
  -keyout selfsigned.key -out selfsigned.crt \
  -subj "/CN=localhost"

# View certificate details
openssl x509 -in cert.pem -noout -text

# Check certificate expiration date
openssl x509 -in cert.pem -noout -dates

# Check remote certificate
openssl s_client -connect example.com:443 -servername example.com 2>/dev/null | \
  openssl x509 -noout -dates -subject -issuer

# Verify certificate chain
openssl verify -CAfile ca-bundle.crt server.crt

# Check certificate chain from remote server
openssl s_client -connect example.com:443 -showcerts 2>/dev/null | \
  openssl x509 -noout -text

# Convert PEM to PKCS12
openssl pkcs12 -export -out cert.pfx -inkey server.key -in server.crt -certfile ca.crt

# Convert PKCS12 to PEM
openssl pkcs12 -in cert.pfx -out cert.pem -nodes

# Test TLS connection and cipher negotiation
openssl s_client -connect example.com:443 -tls1_3
openssl s_client -connect example.com:443 -cipher 'ECDHE-RSA-AES256-GCM-SHA384'
```

## Strong TLS Configuration

### Nginx

```nginx
server {
    listen 443 ssl http2;
    server_name example.com;

    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    # Protocol versions
    ssl_protocols TLSv1.2 TLSv1.3;

    # Cipher suites (TLS 1.2)
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Session settings
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:10m;
    ssl_session_tickets off;

    # OCSP stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    ssl_trusted_certificate /etc/letsencrypt/live/example.com/chain.pem;
    resolver 8.8.8.8 8.8.4.4 valid=300s;
    resolver_timeout 5s;

    # Security headers
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options DENY always;

    # HTTP to HTTPS redirect (in separate server block)
}

server {
    listen 80;
    server_name example.com www.example.com;
    return 301 https://$host$request_uri;
}
```

### Apache

```apache
<VirtualHost *:443>
    ServerName example.com

    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/example.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/example.com/privkey.pem

    SSLProtocol all -SSLv3 -TLSv1 -TLSv1.1
    SSLCipherSuite ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384
    SSLHonorCipherOrder off

    SSLUseStapling on
    SSLStaplingCache shmcb:/tmp/stapling_cache(128000)

    Header always set Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
</VirtualHost>
```


## Contents

- [Certificate Monitoring](references/details.md)
- [Troubleshooting](references/details.md)
- [Best Practices](references/details.md)
- [Related Skills](references/details.md)

## When to Use This Skill

Use this skill when:
- Setting up HTTPS for a new web application
- Automating certificate renewal with Let's Encrypt
- Deploying cert-manager in Kubernetes
- Configuring TLS for internal service-to-service communication
- Auditing cipher suites and TLS versions for compliance
- Responding to an expiring or compromised certificate

## Limitations

- Apply guidance only within authorized scope; test destructive steps in non-production first.
- Docs-only import: upstream scripts and templates not bundled.

### Example

```bash
# Read-only first: inventory before any active step.
which <tool> && <tool> --help | head -n 20
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.
