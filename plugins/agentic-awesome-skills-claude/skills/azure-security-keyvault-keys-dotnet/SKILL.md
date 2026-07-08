---
name: azure-security-keyvault-keys-dotnet
description: Azure Key Vault Keys SDK for .NET. Client library for managing cryptographic keys in Azure Key Vault and Managed HSM. Use for key creation, rotation, encryption, decryption, signing, and verification.
risk: unknown
source: community
date_added: '2026-02-27'
---

# Azure.Security.KeyVault.Keys (.NET)

Client library for managing cryptographic keys in Azure Key Vault and Managed HSM.

## Installation

```bash
dotnet add package Azure.Security.KeyVault.Keys
dotnet add package Azure.Identity
```

**Current Version**: 4.7.0 (stable)

## Environment Variables

```bash
KEY_VAULT_NAME=<your-key-vault-name>
# Or full URI
AZURE_KEYVAULT_URL=https://<vault-name>.vault.azure.net
```

## Client Hierarchy

```
KeyClient (key management)
├── CreateKey / CreateRsaKey / CreateEcKey
├── GetKey / GetKeys
├── UpdateKeyProperties
├── DeleteKey / PurgeDeletedKey
├── BackupKey / RestoreKey
└── GetCryptographyClient() → CryptographyClient

CryptographyClient (cryptographic operations)
├── Encrypt / Decrypt
├── WrapKey / UnwrapKey
├── Sign / Verify
└── SignData / VerifyData

KeyResolver (key resolution)
└── Resolve(keyId) → CryptographyClient
```

## Authentication

### DefaultAzureCredential (Recommended)

```csharp
using Azure.Identity;
using Azure.Security.KeyVault.Keys;

var keyVaultName = Environment.GetEnvironmentVariable("KEY_VAULT_NAME");
var kvUri = $"https://{keyVaultName}.vault.azure.net";

var client = new KeyClient(new Uri(kvUri), new DefaultAzureCredential());
```

### Service Principal

```csharp
var credential = new ClientSecretCredential(
    tenantId: "<tenant-id>",
    clientId: "<client-id>",
    clientSecret: "<client-secret>");

var client = new KeyClient(new Uri(kvUri), credential);
```

## Key Management

### Create Keys

```csharp
// Create RSA key
KeyVaultKey rsaKey = await client.CreateKeyAsync("my-rsa-key", KeyType.Rsa);
Console.WriteLine($"Created key: {rsaKey.Name}, Type: {rsaKey.KeyType}");

// Create RSA key with options
var rsaOptions = new CreateRsaKeyOptions("my-rsa-key-2048")
{
    KeySize = 2048,
    HardwareProtected = false, // true for HSM-backed
    ExpiresOn = DateTimeOffset.UtcNow.AddYears(1),
    NotBefore = DateTimeOffset.UtcNow,
    Enabled = true
};
rsaOptions.KeyOperations.Add(KeyOperation.Encrypt);
rsaOptions.KeyOperations.Add(KeyOperation.Decrypt);

KeyVaultKey rsaKey2 = await client.CreateRsaKeyAsync(rsaOptions);

// Create EC key
var ecOptions = new CreateEcKeyOptions("my-ec-key")
{
    CurveName = KeyCurveName.P256,
    HardwareProtected = true // HSM-backed
};
KeyVaultKey ecKey = await client.CreateEcKeyAsync(ecOptions);

// Create Oct (symmetric) key for wrap/unwrap
var octOptions = new CreateOctKeyOptions("my-oct-key")
{
    KeySize = 256,
    HardwareProtected = true
};
KeyVaultKey octKey = await client.CreateOctKeyAsync(octOptions);
```

### Retrieve Keys

```csharp
// Get specific key (latest version)
KeyVaultKey key = await client.GetKeyAsync("my-rsa-key");
Console.WriteLine($"Key ID: {key.Id}");
Console.WriteLine($"Key Type: {key.KeyType}");
Console.WriteLine($"Version: {key.Properties.Version}");

// Get specific version
KeyVaultKey keyVersion = await client.GetKeyAsync("my-rsa-key", "version-id");

// List all keys
await foreach (KeyProperties keyProps in client.GetPropertiesOfKeysAsync())
{
    Console.WriteLine($"Key: {keyProps.Name}, Enabled: {keyProps.Enabled}");
}

// List key versions
await foreach (KeyProperties version in client.GetPropertiesOfKeyVersionsAsync("my-rsa-key"))
{
    Console.WriteLine($"Version: {version.Version}, Created: {version.CreatedOn}");
}
```

### Update Key Properties

```csharp
KeyVaultKey key = await client.GetKeyAsync("my-rsa-key");

key.Properties.ExpiresOn = DateTimeOffset.UtcNow.AddYears(2);
key.Properties.Tags["environment"] = "production";

KeyVaultKey updatedKey = await client.UpdateKeyPropertiesAsync(key.Properties);
```

### Delete and Purge Keys

```csharp
// Start delete operation
DeleteKeyOperation operation = await client.StartDeleteKeyAsync("my-rsa-key");

// Wait for deletion to complete (required before purge)
await operation.WaitForCompletionAsync();
Console.WriteLine($"Deleted key scheduled purge date: {operation.Value.ScheduledPurgeDate}");

// Purge immediately (if soft-delete is enabled)
await client.PurgeDeletedKeyAsync("my-rsa-key");

// Or recover deleted key
KeyVaultKey recoveredKey = await client.StartRecoverDeletedKeyAsync("my-rsa-key");
```

### Backup and Restore

```csharp
// Backup key
byte[] backup = await client.BackupKeyAsync("my-rsa-key");
await File.WriteAllBytesAsync("key-backup.bin", backup);

// Restore key
byte[] backupData = await File.ReadAllBytesAsync("key-backup.bin");
KeyVaultKey restoredKey = await client.RestoreKeyBackupAsync(backupData);
```

## Cryptographic Operations

### Get CryptographyClient

```csharp
// From KeyClient
KeyVaultKey key = await client.GetKeyAsync("my-rsa-key");
CryptographyClient cryptoClient = client.GetCryptographyClient(
    key.Name, 
    key.Properties.Version);

// Or create directly with key ID
CryptographyClient cryptoClient = new CryptographyClient(
    new Uri("https://myvault.vault.azure.net/keys/my-rsa-key/version"),
    new DefaultAzureCredential());
```

### Encrypt and Decrypt

```csharp
byte[] plaintext = Encoding.UTF8.GetBytes("Secret message to encrypt");

// Encrypt
EncryptResult encryptResult = await cryptoClient.EncryptAsync(
    EncryptionAlgorithm.RsaOaep256, 
    plaintext);
Console.WriteLine($"Encrypted: {Convert.ToBase64String(encryptResult.Ciphertext)}");

// Decrypt
DecryptResult decryptResult = await cryptoClient.DecryptAsync(
    EncryptionAlgorithm.RsaOaep256, 
    encryptResult.Ciphertext);
string decrypted = Encoding.UTF8.GetString(decryptResult.Plaintext);
Console.WriteLine($"Decrypted: {decrypted}");
```

### Wrap and Unwrap Keys

```csharp
// Key to wrap (e.g., AES key)
byte[] keyToWrap = new byte[32]; // 256-bit key
RandomNumberGenerator.Fill(keyToWrap);

// Wrap key
WrapResult wrapResult = await cryptoClient.WrapKeyAsync(
    KeyWrapAlgorithm.RsaOaep256, 
    keyToWrap);

// Unwrap key
UnwrapResult unwrapResult = await cryptoClient.UnwrapKeyAsync(
    KeyWrapAlgorithm.RsaOaep256, 
    wrapResult.EncryptedKey);
```

### Sign and Verify

```csharp
// Data to sign
byte[] data = Encoding.UTF8.GetBytes("Data to sign");

// Sign data (computes hash internally)
SignResult signResult = await cryptoClient.SignDataAsync(
    SignatureAlgorithm.RS256, 
    data);

// Verify signature
VerifyResult verifyResult = await cryptoClient.VerifyDataAsync(
    SignatureAlgorithm.RS256, 
    data, 
    signResult.Signature);
Console.WriteLine($"Signature valid: {verifyResult.IsValid}");

// Or sign pre-computed hash
using var sha256 = SHA256.Create();
byte[] hash = sha256.ComputeHash(data);

SignResult signHashResult = await cryptoClient.SignAsync(
    SignatureAlgorithm.RS256, 
    hash);
```

## Key Resolver

```csharp
using Azure.Security.KeyVault.Keys.Cryptography;

var resolver = new KeyResolver(new DefaultAzureCredential());

// Resolve key by ID to get CryptographyClient
CryptographyClient cryptoClient = await resolver.ResolveAsync(
    new Uri("https://myvault.vault.azure.net/keys/my-key/version"));

// Use for encryption
EncryptResult result = await cryptoClient.EncryptAsync(
    EncryptionAlgorithm.RsaOaep256, 
    plaintext);
```

## Key Rotation

```csharp
// Rotate key (creates new version)
KeyVaultKey rotatedKey = await client.RotateKeyAsync("my-rsa-key");
Console.WriteLine($"New version: {rotatedKey.Properties.Version}");

// Get rotation policy
KeyRotationPolicy policy = await client.GetKeyRotationPolicyAsync("my-rsa-key");

// Update rotation policy
policy.ExpiresIn = "P90D"; // 90 days
policy.LifetimeActions.Add(new KeyRotationLifetimeAction
{
    Action = KeyRotationPolicyAction.Rotate,
    TimeBeforeExpiry = "P30D" // Rotate 30 days before expiry
});

await client.UpdateKeyRotationPolicyAsync("my-rsa-key", policy);
```

## Key Types Reference

| Type | Purpose |
|------|---------|
| `KeyClient` | Key management operations |
| `CryptographyClient` | Cryptographic operations |
| `KeyResolver` | Resolve key ID to CryptographyClient |
| `KeyVaultKey` | Key with cryptographic material |
| `KeyProperties` | Key metadata (no crypto material) |
| `CreateRsaKeyOptions` | RSA key creation options |
| `CreateEcKeyOptions` | EC key creation options |
| `CreateOctKeyOptions` | Symmetric key options |
| `EncryptResult` | Encryption result |
| `DecryptResult` | Decryption result |
| `SignResult` | Signing result |
| `VerifyResult` | Verification result |
| `WrapResult` | Key wrap result |
| `UnwrapResult` | Key unwrap result |

## Algorithms Reference

### Encryption Algorithms
| Algorithm | Key Type | Description |
|-----------|----------|-------------|
| `RsaOaep` | RSA | RSA-OAEP |
| `RsaOaep256` | RSA | RSA-OAEP-256 |
| `Rsa15` | RSA | RSA 1.5 (legacy) |
| `A128Gcm` | Oct | AES-128-GCM |
| `A256Gcm` | Oct | AES-256-GCM |

### Signature Algorithms
| Algorithm | Key Type | Description |
|-----------|----------|-------------|
| `RS256` | RSA | RSASSA-PKCS1-v1_5 SHA-256 |
| `RS384` | RSA | RSASSA-PKCS1-v1_5 SHA-384 |
| `RS512` | RSA | RSASSA-PKCS1-v1_5 SHA-512 |
| `PS256` | RSA | RSASSA-PSS SHA-256 |
| `ES256` | EC | ECDSA P-256 SHA-256 |
| `ES384` | EC | ECDSA P-384 SHA-384 |
| `ES512` | EC | ECDSA P-521 SHA-512 |

### Key Wrap Algorithms
| Algorithm | Key Type | Description |
|-----------|----------|-------------|
| `RsaOaep` | RSA | RSA-OAEP |
| `RsaOaep256` | RSA | RSA-OAEP-256 |
| `A128KW` | Oct | AES-128 Key Wrap |
| `A256KW` | Oct | AES-256 Key Wrap |

## Best Practices

1. **Use Managed Identity** — Prefer `DefaultAzureCredential` over secrets
2. **Enable soft-delete** — Protect against accidental deletion
3. **Use HSM-backed keys** — Set `HardwareProtected = true` for sensitive keys
4. **Implement key rotation** — Use automatic rotation policies
5. **Limit key operations** — Only enable required `KeyOperations`
6. **Set expiration dates** — Always set `ExpiresOn` for keys
7. **Use specific versions** — Pin to versions in production
8. **Cache CryptographyClient** — Reuse for multiple operations

## Error Handling

```csharp
using Azure;

try
{
    KeyVaultKey key = await client.GetKeyAsync("my-key");
}
catch (RequestFailedException ex) when (ex.Status == 404)
{
    Console.WriteLine("Key not found");
}
catch (RequestFailedException ex) when (ex.Status == 403)
{
    Console.WriteLine("Access denied - check RBAC permissions");
}
catch (RequestFailedException ex)
{
    Console.WriteLine($"Key Vault error: {ex.Status} - {ex.Message}");
}
```

## Required RBAC Roles

| Role | Permissions |
|------|-------------|
| Key Vault Crypto Officer | Full key management |
| Key Vault Crypto User | Use keys for crypto operations |
| Key Vault Reader | Read key metadata |

## Related SDKs

| SDK | Purpose | Install |
|-----|---------|---------|
| `Azure.Security.KeyVault.Keys` | Keys (this SDK) | `dotnet add package Azure.Security.KeyVault.Keys` |
| `Azure.Security.KeyVault.Secrets` | Secrets | `dotnet add package Azure.Security.KeyVault.Secrets` |
| `Azure.Security.KeyVault.Certificates` | Certificates | `dotnet add package Azure.Security.KeyVault.Certificates` |
| `Azure.Identity` | Authentication | `dotnet add package Azure.Identity` |

## Reference Links

| Resource | URL |
|----------|-----|
| NuGet Package | https://www.nuget.org/packages/Azure.Security.KeyVault.Keys |
| API Reference | https://learn.microsoft.com/dotnet/api/azure.security.keyvault.keys |
| Quickstart | https://learn.microsoft.com/azure/key-vault/keys/quick-create-net |
| GitHub Source | https://github.com/Azure/azure-sdk-for-net/tree/main/sdk/keyvault/Azure.Security.KeyVault.Keys |

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
