---
name: azure-keyvault-py
description: Azure Key Vault SDK for Python. Use for secrets, keys, and certificates management with secure storage.
risk: unknown
source: community
date_added: '2026-02-27'
---

# Azure Key Vault SDK for Python

Secure storage and management for secrets, cryptographic keys, and certificates.

## Installation

```bash
# Secrets
pip install azure-keyvault-secrets azure-identity

# Keys (cryptographic operations)
pip install azure-keyvault-keys azure-identity

# Certificates
pip install azure-keyvault-certificates azure-identity

# All
pip install azure-keyvault-secrets azure-keyvault-keys azure-keyvault-certificates azure-identity
```

## Environment Variables

```bash
AZURE_KEYVAULT_URL=https://<vault-name>.vault.azure.net/
```

## Secrets

### SecretClient Setup

```python
from azure.identity import DefaultAzureCredential
from azure.keyvault.secrets import SecretClient

credential = DefaultAzureCredential()
vault_url = "https://<vault-name>.vault.azure.net/"

client = SecretClient(vault_url=vault_url, credential=credential)
```

### Secret Operations

```python
# Set secret
secret = client.set_secret("database-password", "super-secret-value")
print(f"Created: {secret.name}, version: {secret.properties.version}")

# Get secret
secret = client.get_secret("database-password")
print(f"Value: {secret.value}")

# Get specific version
secret = client.get_secret("database-password", version="abc123")

# List secrets (names only, not values)
for secret_properties in client.list_properties_of_secrets():
    print(f"Secret: {secret_properties.name}")

# List versions
for version in client.list_properties_of_secret_versions("database-password"):
    print(f"Version: {version.version}, Created: {version.created_on}")

# Delete secret (soft delete)
poller = client.begin_delete_secret("database-password")
deleted_secret = poller.result()

# Purge (permanent delete, if soft-delete enabled)
client.purge_deleted_secret("database-password")

# Recover deleted secret
client.begin_recover_deleted_secret("database-password").result()
```

## Keys

### KeyClient Setup

```python
from azure.identity import DefaultAzureCredential
from azure.keyvault.keys import KeyClient

credential = DefaultAzureCredential()
vault_url = "https://<vault-name>.vault.azure.net/"

client = KeyClient(vault_url=vault_url, credential=credential)
```

### Key Operations

```python
from azure.keyvault.keys import KeyType

# Create RSA key
rsa_key = client.create_rsa_key("rsa-key", size=2048)

# Create EC key
ec_key = client.create_ec_key("ec-key", curve="P-256")

# Get key
key = client.get_key("rsa-key")
print(f"Key type: {key.key_type}")

# List keys
for key_properties in client.list_properties_of_keys():
    print(f"Key: {key_properties.name}")

# Delete key
poller = client.begin_delete_key("rsa-key")
deleted_key = poller.result()
```

### Cryptographic Operations

```python
from azure.keyvault.keys.crypto import CryptographyClient, EncryptionAlgorithm

# Get crypto client for a specific key
crypto_client = CryptographyClient(key, credential=credential)
# Or from key ID
crypto_client = CryptographyClient(
    "https://<vault>.vault.azure.net/keys/<key-name>/<version>",
    credential=credential
)

# Encrypt
plaintext = b"Hello, Key Vault!"
result = crypto_client.encrypt(EncryptionAlgorithm.rsa_oaep, plaintext)
ciphertext = result.ciphertext

# Decrypt
result = crypto_client.decrypt(EncryptionAlgorithm.rsa_oaep, ciphertext)
decrypted = result.plaintext

# Sign
from azure.keyvault.keys.crypto import SignatureAlgorithm
import hashlib

digest = hashlib.sha256(b"data to sign").digest()
result = crypto_client.sign(SignatureAlgorithm.rs256, digest)
signature = result.signature

# Verify
result = crypto_client.verify(SignatureAlgorithm.rs256, digest, signature)
print(f"Valid: {result.is_valid}")
```

## Certificates

### CertificateClient Setup

```python
from azure.identity import DefaultAzureCredential
from azure.keyvault.certificates import CertificateClient, CertificatePolicy

credential = DefaultAzureCredential()
vault_url = "https://<vault-name>.vault.azure.net/"

client = CertificateClient(vault_url=vault_url, credential=credential)
```

### Certificate Operations

```python
# Create self-signed certificate
policy = CertificatePolicy.get_default()
poller = client.begin_create_certificate("my-cert", policy=policy)
certificate = poller.result()

# Get certificate
certificate = client.get_certificate("my-cert")
print(f"Thumbprint: {certificate.properties.x509_thumbprint.hex()}")

# Get certificate with private key (as secret)
from azure.keyvault.secrets import SecretClient
secret_client = SecretClient(vault_url=vault_url, credential=credential)
cert_secret = secret_client.get_secret("my-cert")
# cert_secret.value contains PEM or PKCS12

# List certificates
for cert in client.list_properties_of_certificates():
    print(f"Certificate: {cert.name}")

# Delete certificate
poller = client.begin_delete_certificate("my-cert")
deleted = poller.result()
```

## Client Types Table

| Client | Package | Purpose |
|--------|---------|---------|
| `SecretClient` | `azure-keyvault-secrets` | Store/retrieve secrets |
| `KeyClient` | `azure-keyvault-keys` | Manage cryptographic keys |
| `CryptographyClient` | `azure-keyvault-keys` | Encrypt/decrypt/sign/verify |
| `CertificateClient` | `azure-keyvault-certificates` | Manage certificates |

## Async Clients

```python
from azure.identity.aio import DefaultAzureCredential
from azure.keyvault.secrets.aio import SecretClient

async def get_secret():
    credential = DefaultAzureCredential()
    client = SecretClient(vault_url=vault_url, credential=credential)
    
    async with client:
        secret = await client.get_secret("my-secret")
        print(secret.value)

import asyncio
asyncio.run(get_secret())
```

## Error Handling

```python
from azure.core.exceptions import ResourceNotFoundError, HttpResponseError

try:
    secret = client.get_secret("nonexistent")
except ResourceNotFoundError:
    print("Secret not found")
except HttpResponseError as e:
    if e.status_code == 403:
        print("Access denied - check RBAC permissions")
    raise
```

## Best Practices

1. **Use DefaultAzureCredential** for authentication
2. **Use managed identity** in Azure-hosted applications
3. **Enable soft-delete** for recovery (enabled by default)
4. **Use RBAC** over access policies for fine-grained control
5. **Rotate secrets** regularly using versioning
6. **Use Key Vault references** in App Service/Functions config
7. **Cache secrets** appropriately to reduce API calls
8. **Use async clients** for high-throughput scenarios

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
