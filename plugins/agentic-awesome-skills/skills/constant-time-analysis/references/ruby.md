# Constant-Time Analysis: Ruby

Analysis guidance for Ruby scripts. Uses YARV (Yet Another Ruby VM) instruction sequence dump to analyze bytecode for timing-unsafe operations.

## Prerequisites

- Ruby 2.0+ (uses `ruby --dump=insns`)

## Running the Analyzer

```bash
# Analyze Ruby file
uv run {baseDir}/ct_analyzer/analyzer.py crypto.rb

# Include warning-level violations
uv run {baseDir}/ct_analyzer/analyzer.py --warnings crypto.rb

# Filter to specific functions
uv run {baseDir}/ct_analyzer/analyzer.py --func 'encrypt|sign' crypto.rb

# JSON output for CI
uv run {baseDir}/ct_analyzer/analyzer.py --json crypto.rb
```

## Dangerous Operations

### Bytecodes (Errors)

| Bytecode | Issue |
|----------|-------|
| opt_div | Variable-time execution based on operand values |
| opt_mod | Variable-time execution based on operand values |

### Bytecodes (Warnings)

| Bytecode | Issue |
|----------|-------|
| opt_eq | May early-terminate on secret data |
| opt_neq | May early-terminate on secret data |
| opt_lt, opt_le, opt_gt, opt_ge | Comparison may leak timing |
| branchif, branchunless | Conditional branch on secrets |
| opt_aref | Array access may leak timing via cache |
| opt_aset | Array store may leak timing via cache |
| opt_lshift, opt_rshift | Bit shift timing may vary |

### Functions (Errors)

| Function | Issue | Safe Alternative |
|----------|-------|------------------|
| `rand()` | Predictable | `SecureRandom.random_bytes()` |
| `Random.new` | Predictable | `SecureRandom` |
| `srand()` | Sets predictable seed | `SecureRandom` |
| `Math.sqrt()` | Variable latency | Avoid in crypto |

### Functions (Warnings)

| Function | Issue | Safe Alternative |
|----------|-------|------------------|
| `include?()` | Early-terminating | Constant-time search |
| `index()` | Early-terminating | Constant-time search |
| `start_with?()` | Early-terminating | `Rack::Utils.secure_compare()` |
| `end_with?()` | Early-terminating | `Rack::Utils.secure_compare()` |
| `match()` | Variable-time | Avoid on secrets |
| `=~` | Variable-time regex | Avoid on secrets |
| `to_json()` | Variable-length output | Fixed-length padding |
| `Marshal.dump()` | Variable-length output | Avoid for secrets |
| `Marshal.load()` | Variable-time, security risk | Avoid for secrets |

## Safe Patterns

### String Comparison

```ruby
# VULNERABLE: Early exit on mismatch
if user_token == stored_token
  # ...
end

# SAFE: Constant-time comparison (Rails/Rack)
require 'rack/utils'
if Rack::Utils.secure_compare(user_token, stored_token)
  # ...
end

# SAFE: ActiveSupport (Rails)
require 'active_support/security_utils'
if ActiveSupport::SecurityUtils.secure_compare(user_token, stored_token)
  # ...
end

# SAFE: OpenSSL (stdlib)
require 'openssl'
if OpenSSL.secure_compare(user_token, stored_token)
  # ...
end
```

### Random Number Generation

```ruby
# VULNERABLE: Predictable
token = rand(2**128)
random_bytes = Random.new.bytes(16)

# SAFE: Cryptographically secure
require 'securerandom'
token = SecureRandom.random_bytes(16)
token_hex = SecureRandom.hex(16)
token_base64 = SecureRandom.base64(16)
random_number = SecureRandom.random_number(2**128)
```

### Division Operations

A division involving secrets is a review candidate, not automatically an exploitable leak. Do not replace it with a truncated reciprocal-multiply sketch: signedness, overflow, operand bounds and correction steps determine arithmetic correctness. Use a reviewed cryptographic implementation with a documented input domain, then inspect generated native code on the deployment CPU. Python/Ruby integers and JavaScript arithmetic do not become constant-time merely by replacing division with multiplication or masking.

## Rails/Rack Integration

### Secure Compare

Rails and Rack provide constant-time comparison:

```ruby
# Rack (standalone)
Rack::Utils.secure_compare(a, b)

# Rails/ActiveSupport
ActiveSupport::SecurityUtils.secure_compare(a, b)

# OpenSSL (Ruby 2.5+)
OpenSSL.secure_compare(a, b)
```

### CSRF Token Comparison

```ruby
# Rails automatically uses secure_compare for CSRF tokens
# For custom token validation:
class ApplicationController < ActionController::Base
  def verify_api_token
    provided = request.headers['X-API-Token']
    expected = current_user.api_token

    # SAFE: Constant-time comparison
    unless ActiveSupport::SecurityUtils.secure_compare(provided, expected)
      head :unauthorized
    end
  end
end
```

## YARV Bytecode Notes

The analyzer uses `ruby --dump=insns` to get YARV instruction sequences. Example output:

```
== disasm: #<ISeq:vulnerable_function@test.rb:1 (1,0)-(5,3)>
local table (size: 2, argc: 2)
[ 2] value@0    [ 1] modulus@1
0000 getlocal_WC_0     value@0
0002 getlocal_WC_0     modulus@1
0004 opt_div           <calldata!mid:/, argc:1>
0006 leave
```

The `opt_div` instruction at offset 0004 is flagged as a timing vulnerability.

## Limitations

### MRI Ruby Only

The analyzer targets MRI (Matz's Ruby Interpreter) YARV bytecode. Alternative implementations (JRuby, TruffleRuby) have different bytecode formats:

- **JRuby**: Compiles to JVM bytecode
- **TruffleRuby**: Uses GraalVM intermediate representation

### Method Caching

Ruby's method dispatch involves caching that can affect timing. Even with constant-time operations, method lookup timing may leak information about code paths.

### Gem Dependencies

When auditing gems:
1. Check if the gem uses `SecureRandom` instead of `rand`
2. Verify string comparisons use `secure_compare`
3. Look for division/modulo operations on sensitive data
