# Constant-Time Analysis: Python

Analysis guidance for Python scripts. Uses the `dis` module to analyze CPython bytecode for timing-unsafe operations.

## Prerequisites

- Python 3.10+ (bytecode format varies by version)

## Running the Analyzer

```bash
# Analyze Python file
uv run {baseDir}/ct_analyzer/analyzer.py crypto.py

# Include warning-level violations
uv run {baseDir}/ct_analyzer/analyzer.py --warnings crypto.py

# Filter to specific functions
uv run {baseDir}/ct_analyzer/analyzer.py --func 'encrypt|sign' crypto.py

# JSON output for CI
uv run {baseDir}/ct_analyzer/analyzer.py --json crypto.py
```

## Dangerous Operations

### Bytecodes (Errors)

**Python < 3.11:**

| Bytecode | Issue |
|----------|-------|
| BINARY_TRUE_DIVIDE | Variable-time execution |
| BINARY_FLOOR_DIVIDE | Variable-time execution |
| BINARY_MODULO | Variable-time execution |
| INPLACE_TRUE_DIVIDE | Variable-time execution |
| INPLACE_FLOOR_DIVIDE | Variable-time execution |
| INPLACE_MODULO | Variable-time execution |

**CPython 3.11 baseline (check `dis` for the exact target release; opcode arguments are implementation details):**

| BINARY_OP Oparg | Operation | Issue |
|-----------------|-----------|-------|
| 11 | `/` | Variable-time execution |
| 2 | `//` | Variable-time execution |
| 6 | `%` | Variable-time execution |
| 24 | `/=` | Variable-time execution |
| 15 | `//=` | Variable-time execution |
| 19 | `%=` | Variable-time execution |

### Functions (Errors)

| Function | Issue | Safe Alternative |
|----------|-------|------------------|
| `random.random()` | Predictable | `secrets.token_bytes()` |
| `random.randint()` | Predictable | `secrets.randbelow()` |
| `random.randrange()` | Predictable | `secrets.randbelow()` |
| `random.choice()` | Predictable | `secrets.choice()` |
| `random.shuffle()` | Predictable | Custom with `secrets` |
| `random.sample()` | Predictable | Custom with `secrets` |
| `math.sqrt()` | Variable latency | Avoid in crypto |
| `math.pow()` | Variable latency | Avoid in crypto |
| `eval()` | Unpredictable timing | Avoid entirely |
| `exec()` | Unpredictable timing | Avoid entirely |

### Functions (Warnings)

| Function | Issue | Safe Alternative |
|----------|-------|------------------|
| `str.find()` | Early-terminating | Constant-time search |
| `str.index()` | Early-terminating | Constant-time search |
| `str.startswith()` | Early-terminating | `hmac.compare_digest()` |
| `str.endswith()` | Early-terminating | `hmac.compare_digest()` |
| `in` (strings) | Early-terminating | Constant-time search |
| `json.dumps()` | Variable-length output | Fixed-length padding |
| `json.loads()` | Variable-time | Fixed-length input |
| `base64.b64encode()` | Variable-length output | Fixed-length padding |
| `pickle.dumps()` | Variable-length output | Avoid for secrets |
| `pickle.loads()` | Variable-time, security risk | Avoid for secrets |

## Safe Patterns

### String Comparison

```python
# VULNERABLE: Early exit on mismatch
if user_token == stored_token:
    ...

# SAFE: Constant-time comparison
import hmac
if hmac.compare_digest(user_token, stored_token):
    ...

# SAFE: For bytes
import secrets
if secrets.compare_digest(user_bytes, stored_bytes):
    ...
```

### Random Number Generation

```python
# VULNERABLE: Predictable
import random
token = random.randint(0, 2**128)

# SAFE: Cryptographically secure
import secrets
token = secrets.token_bytes(16)
token_int = secrets.randbits(128)
random_index = secrets.randbelow(len(items))
```

### Division Operations

A division involving secrets is a review candidate, not automatically an exploitable leak. Do not replace it with a truncated reciprocal-multiply sketch: signedness, overflow, operand bounds and correction steps determine arithmetic correctness. Use a reviewed cryptographic implementation with a documented input domain, then inspect generated native code on the deployment CPU. Python/Ruby integers and JavaScript arithmetic do not become constant-time merely by replacing division with multiplication or masking.

## Python Version Notes

### Python 3.11+ Changes

Python 3.11 introduced the `BINARY_OP` bytecode that replaces individual binary operation bytecodes. The analyzer detects division/modulo by checking the oparg:

```
BINARY_OP               11 (/)    # True division
BINARY_OP                2 (//)   # Floor division
BINARY_OP                6 (%)    # Modulo
```

### Python 3.10 and Earlier

Uses separate bytecodes:
```
BINARY_TRUE_DIVIDE
BINARY_FLOOR_DIVIDE
BINARY_MODULO
```

## Cryptography Library Considerations

When using the `cryptography` library:

```python
# Use the library primitive within its documented contract; this is not whole-program timing proof
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

# Never reuse a nonce with the same AES-GCM key
aesgcm = AESGCM(key)
ciphertext = aesgcm.encrypt(nonce, plaintext, associated_data)
```

For custom cryptographic code, ensure you:
1. Use `hmac.compare_digest()` for comparisons
2. Use `secrets` module for randomness
3. Avoid division/modulo on secret-derived values
4. Use fixed-length data representations

## Limitations

### CPython Bytecode Only

The analyzer targets CPython bytecode. Alternative implementations (PyPy, Jython, etc.) have different bytecode formats and timing characteristics.

### JIT Compilation

PyPy and Numba can JIT-compile Python to native code with potentially different timing behavior. Consider additional analysis for JIT-compiled code paths.
