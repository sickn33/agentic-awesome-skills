# Cryptographic API Footguns

> Catalog correction (CC-BY-SA-4.0 adaptation; original attribution/license in UPSTREAM-NOTICE.md): snippets are isolated teaching fragments, not production implementations or an assertion of exploitability. Confirm the installed language/library version, trust boundary, reachable input and impact. Use inert local fixtures only; do not execute the intentionally unsafe snippets, untrusted audited code or destructive payloads. No network attack or configuration change is authorized by this guide.


Detailed patterns for identifying misuse-prone cryptographic interfaces.

## Algorithm Selection Anti-Patterns

### The "alg" Header Attack (JWT)

The JSON Web Token standard allows the token itself to specify which algorithm to use for verification. This is catastrophically wrong.

**Attack 1: "none" algorithm**
```json
{"alg": "none", "typ": "JWT"}
```
Historically vulnerable or misconfigured libraries accepted unsigned tokens; do not assume maintained verifiers accept them. Check the exact version and verification settings.

**Attack 2: Algorithm confusion (RS256 → HS256)**
- Server expects RSA signature, uses public key for verification
- Attacker changes algorithm to HMAC, uses *public key* as HMAC secret
- Public key is public, so attacker can forge valid signatures

**Root cause**: Trusting untrusted input to select security mechanisms.

**Fix**: Never let data dictate algorithm. Use an explicit verifier-side algorithm allowlist tied to the trusted key type and issuer; validate issuer, audience, expiry and token purpose. Algorithm agility is safe only when trusted policy controls it.

### Cipher Mode Parameters

```python
# DANGEROUS: mode is selectable
def encrypt(plaintext, key, mode="ECB"):  # ECB is never correct
    ...

# BAD: accepts any OpenSSL cipher string
cipher = OpenSSL::Cipher.new(user_selected_cipher)

# GOOD: no parameters
def encrypt(plaintext, key):  # internally uses AES-256-GCM
    ...
```

**Detection**: Parameters named `mode`, `cipher`, `algorithm`, `hash_type`

### Hash Algorithm Downgrade

```php
// PHP's hash() accepts ANY algorithm
hash("crc32", $password);  // Valid call, terrible security
hash("md5", $password);    // Valid call, broken security
hash("sha256", $password); // Valid call, still wrong for passwords

// Password functions limit choices
password_hash($password, PASSWORD_ARGON2ID);  // Better
```

**Pattern**: APIs that accept algorithm as string instead of restricting to safe subset.

## Key/Nonce/IV Confusion

### Indistinguishable Byte Arrays

```go
// All three are just []byte - easy to swap
func Encrypt(plaintext, key, nonce []byte) []byte

// Easy mistakes:
Encrypt(plaintext, nonce, key)  // Swapped - compiles fine
Encrypt(plaintext, key, key)    // Reused key as nonce - compiles fine
```

**Fix**: Distinct types

```go
type EncryptionKey [32]byte
type Nonce [24]byte

func Encrypt(plaintext []byte, key EncryptionKey, nonce Nonce) []byte
// Now type system catches swaps
```

### Nonce Reuse

```python
# DANGEROUS: nonce parameter with no guidance
def encrypt(plaintext, key, nonce):
    ...

# Developer "simplifies" by reusing:
nonce = b'\x00' * 12
encrypt(msg1, key, nonce)
encrypt(msg2, key, nonce)  # Catastrophic with GCM/ChaCha
```

**Fix**: Generate nonces internally, return them with ciphertext.

## Comparison Footguns

### Timing-Safe vs. Regular Comparison

```python
# These look identical but have different security properties
if computed_mac == expected_mac:  # VULNERABLE: timing attack
if hmac.compare_digest(computed_mac, expected_mac):  # Safe
```

**The problem**: Developers don't know to use special comparison. Default string equality is vulnerable.

**Detection**: Direct equality checks on MACs, signatures, hashes, tokens.

### Boolean Confusion

```python
# Signature verification APIs
result = verify(signature, message, key)

# Some return True/False
if verify(...):  # Must check return value

# Some raise exceptions
verify(...)  # Failure = exception, no return to check

# Developers mixing these up = vulnerabilities
```

## Padding Oracle Enablers

### Raw Decryption APIs

```python
# DANGEROUS: returns plaintext even if padding invalid
def decrypt(ciphertext, key):
    # ... decrypt ...
    return unpad(plaintext)  # Throws on bad padding

# Attacker can distinguish:
# - Valid padding → success
# - Invalid padding → exception

# This distinction enables padding oracle attacks
```

**Fix**: Prefer a reviewed AEAD API. For an established encrypt-then-MAC construction, authenticate before decrypting or unpadding; do not invent a decrypt-then-MAC scheme. Uniform messages alone do not remove timing or status oracles.

### Error Message Differentiation

```
# DANGEROUS error messages
"Invalid padding"           # Padding oracle signal
"MAC verification failed"   # Different error = oracle
"Decryption failed"         # Good: single error for all failures
```

## Key Derivation Footguns

### Using Hashes Instead of KDFs

```python
# DANGEROUS: hash is not a KDF
key = hashlib.sha256(password.encode()).digest()

# Developer reasoning: "SHA-256 is secure"
# Reality: Fast hash enables brute force

# CORRECT: use actual KDF
# Choose and benchmark current reviewed KDF parameters and a fresh random salt.
# Do not copy historical work factors as a current production recommendation.
key = reviewed_password_kdf(password, salt=salt)
```

### Password Storage Misuse

```python
# DANGEROUS: encryption is not password storage
encrypted_password = encrypt(password, master_key)
# Compromise of master_key = all passwords exposed

# CORRECT: one-way hash with salt
from argon2 import PasswordHasher
hashed_password = PasswordHasher().hash(password)
# No key to steal; each password salted differently
```

## Safe API Design Checklist

For cryptographic APIs, verify:

- [ ] **Trusted algorithm policy**: Explicit allowed algorithms and correct key types; never trust token headers alone
- [ ] **No mode selection**: GCM/ChaCha20-Poly1305 only, no ECB/CBC
- [ ] **Distinct types**: Keys, nonces, ciphertexts are different types
- [ ] **Internal nonce generation**: Don't require developer to provide
- [ ] **Authenticated encryption**: Encrypt-then-MAC or AEAD built in
- [ ] **Constant-time comparison**: Default or only comparison method
- [ ] **Uniform errors**: Same error for all decryption failures
- [ ] **KDF for passwords**: Argon2/scrypt/bcrypt, not raw hashes
