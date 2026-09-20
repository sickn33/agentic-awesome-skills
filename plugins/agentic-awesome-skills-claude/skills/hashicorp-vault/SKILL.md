---
name: hashicorp-vault
description: Manage secrets and PKI with HashiCorp Vault.
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

# HashiCorp Vault

Centrally manage secrets, encryption, and access with HashiCorp Vault.

## When to Use This Skill

Use this skill when:
- Centralizing secrets management
- Implementing dynamic credentials
- Managing PKI and certificates
- Encrypting sensitive data
- Meeting compliance requirements

## Prerequisites

- Vault server (dev or production)
- Vault CLI installed
- Network access to Vault

## Quick Start

### Development Server

```bash
# Start dev server
vault server -dev

# Set environment
export VAULT_ADDR='http://127.0.0.1:8200'
export VAULT_TOKEN='root'

# Verify connection
vault status
```

### Production Deployment

```hcl
# config.hcl
storage "raft" {
  path = "/opt/vault/data"
  node_id = "vault-1"
}

listener "tcp" {
  address = "0.0.0.0:8200"
  tls_cert_file = "/opt/vault/tls/vault.crt"
  tls_key_file = "/opt/vault/tls/vault.key"
}

api_addr = "https://vault.example.com:8200"
cluster_addr = "https://vault.example.com:8201"

ui = true
```

```bash
# Initialize Vault
vault operator init -key-shares=5 -key-threshold=3

# Unseal (run 3 times with different keys)
vault operator unseal <key-1>
vault operator unseal <key-2>
vault operator unseal <key-3>

# Login
vault login <root-token>
```

## Secret Engines

### KV Secrets

```bash
# Enable KV v2
vault secrets enable -path=secret kv-v2

# Write secret
vault kv put secret/myapp/config \
  username="admin" \
  password="..." # example value; use a vault-generated secret

# Read secret
vault kv get secret/myapp/config
vault kv get -field=password secret/myapp/config

# Update secret
vault kv put secret/myapp/config \
  username="admin" \
  password="..." # rotated value from your vault

# List secrets
vault kv list secret/

# Delete secret
vault kv delete secret/myapp/config

# Version history
vault kv metadata get secret/myapp/config
```

### Database Secrets

```bash
# Enable database engine
vault secrets enable database

# Configure PostgreSQL connection
vault write database/config/postgresql \
  plugin_name=postgresql-database-plugin \
  connection_url="postgresql://{{username}}:{{password}}@localhost:5432/mydb" \
  allowed_roles="readonly,readwrite" \
  username="vault" \
  password="..." # service credential from your vault

# Create role
vault write database/roles/readonly \
  db_name=postgresql \
  creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; \
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
  default_ttl="1h" \
  max_ttl="24h"

# Get credentials
vault read database/creds/readonly
```

### AWS Secrets

```bash
# Enable AWS engine
vault secrets enable aws

# Configure root credentials
vault write aws/config/root \
  access_key=AKIA... \
  secret_key=secret... \
  region=us-east-1

# Create role
vault write aws/roles/deploy \
  credential_type=iam_user \
  policy_document=-<<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:*"],
      "Resource": ["arn:aws:s3:::my-bucket/*"]
    }
  ]
}
EOF

# Get credentials
vault read aws/creds/deploy
```

### PKI Secrets

```bash
# Enable PKI engine
vault secrets enable pki
vault secrets tune -max-lease-ttl=87600h pki

# Generate root CA
vault write -field=certificate pki/root/generate/internal \
  common_name="example.com" \
  ttl=87600h > ca_cert.crt

# Configure URLs
vault write pki/config/urls \
  issuing_certificates="https://vault.example.com:8200/v1/pki/ca" \
  crl_distribution_points="https://vault.example.com:8200/v1/pki/crl"

# Create role
vault write pki/roles/web-server \
  allowed_domains="example.com" \
  allow_subdomains=true \
  max_ttl="720h"

# Issue certificate
vault write pki/issue/web-server \
  common_name="web.example.com" \
  ttl="24h"
```

## Authentication Methods

### AppRole

```bash
# Enable AppRole
vault auth enable approle

# Create role
vault write auth/approle/role/myapp \
  token_policies="myapp-policy" \
  token_ttl=1h \
  token_max_ttl=4h \
  secret_id_ttl=10m

# Get role ID
vault read auth/approle/role/myapp/role-id

# Generate secret ID
vault write -f auth/approle/role/myapp/secret-id

# Login
vault write auth/approle/login \
  role_id=<role-id> \
  secret_id=<secret-id>
```

### Kubernetes

```bash
# Enable Kubernetes auth
vault auth enable kubernetes

# Configure
vault write auth/kubernetes/config \
  kubernetes_host="https://kubernetes.default.svc" \
  kubernetes_ca_cert=@/var/run/secrets/kubernetes.io/serviceaccount/ca.crt

# Create role
vault write auth/kubernetes/role/myapp \
  bound_service_account_names=myapp \
  bound_service_account_namespaces=default \
  policies=myapp-policy \
  ttl=1h
```

### OIDC

```bash
# Enable OIDC auth
vault auth enable oidc

# Configure
vault write auth/oidc/config \
  oidc_discovery_url="https://accounts.google.com" \
  oidc_client_id="your-client-id" \
  oidc_client_secret=<your-vault-oidc-client-secret> \
  default_role="default"

# Create role
vault write auth/oidc/role/default \
  bound_audiences="your-client-id" \
  allowed_redirect_uris="http://localhost:8250/oidc/callback" \
  user_claim="sub" \
  policies="default"
```

## Policies

### Policy Definition

```hcl
# myapp-policy.hcl
# Read secrets
path "secret/data/myapp/*" {
  capabilities = ["read", "list"]
}

# Database credentials
path "database/creds/myapp-db" {
  capabilities = ["read"]
}

# PKI certificates
path "pki/issue/web-server" {
  capabilities = ["create", "update"]
}

# Deny access to other secrets
path "secret/data/other/*" {
  capabilities = ["deny"]
}
```

```bash
# Create policy
vault policy write myapp myapp-policy.hcl

# List policies
vault policy list

# Read policy
vault policy read myapp
```

## Application Integration

### Python

```python
import hvac

# Initialize client
client = hvac.Client(url='http://localhost:8200')

# AppRole authentication
client.auth.approle.login(
    role_id='role-id',
    secret_id='secret-id'
)

# Read secret
secret = client.secrets.kv.v2.read_secret_version(
    path='myapp/config',
    mount_point='secret'
)
password = secret['data']['data']['password']

# Get database credentials
db_creds = client.secrets.database.generate_credentials(
    name='myapp-db'
)
```

### Kubernetes Sidecar

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
  annotations:
    vault.hashicorp.com/agent-inject: "true"
    vault.hashicorp.com/role: "myapp"
    vault.hashicorp.com/agent-inject-secret-config: "secret/data/myapp/config"
    vault.hashicorp.com/agent-inject-template-config: |
      {{- with secret "secret/data/myapp/config" -}}
      export DB_PASSWORD  # populated from the referenced Vault/K8s Secret at deploy time
      {{- end }}
spec:
  serviceAccountName: myapp
  containers:
    - name: myapp
      image: myapp:latest
      command: ["/bin/sh", "-c", "source /vault/secrets/config && ./start.sh"]
```

## Common Issues

### Issue: Sealed Vault
**Problem**: Vault is sealed after restart
**Solution**: Implement auto-unseal with cloud KMS or HSM

### Issue: Token Expired
**Problem**: Application token has expired
**Solution**: Implement token renewal, use shorter-lived tokens

### Issue: Permission Denied
**Problem**: Cannot access secrets
**Solution**: Review policies, check token capabilities

## Best Practices

- Use short-lived tokens
- Implement auto-unseal
- Enable audit logging
- Use namespaces for isolation
- Rotate root tokens regularly
- Implement least-privilege policies
- Use dynamic secrets where possible
- Regular backup and DR testing

## Related Skills

- aws-secrets-manager (`aws-secrets-manager`) - AWS native secrets
- sops-encryption (`sops-encryption`) - File encryption
- kubernetes-hardening (`kubernetes-hardening`) - K8s security

## Limitations

- Apply guidance only within authorized scope; test destructive steps in non-production first.
- Docs-only import: upstream scripts and templates not bundled.

### Example

```bash
# Read-only first: inventory before any active step.
which <tool> && <tool> --help | head -n 20
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.
