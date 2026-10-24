# Configuration Security Patterns

> Catalog correction (CC-BY-SA-4.0 adaptation; original attribution/license in UPSTREAM-NOTICE.md): snippets are isolated teaching fragments, not production implementations or an assertion of exploitability. Confirm the installed language/library version, trust boundary, reachable input and impact. Use inert local fixtures only; do not execute the intentionally unsafe snippets, untrusted audited code or destructive payloads. No network attack or configuration change is authorized by this guide.


Dangerous configuration patterns that enable security failures.

## Zero/Empty/Null Semantics

### The Lifetime Zero Problem

```yaml
# What does 0 mean?
session_timeout: 0    # Infinite timeout? Immediate expiry? Disabled?
token_lifetime: 0     # Never expires? Already expired? Use default?
max_attempts: 0       # No attempts allowed? Unlimited attempts?
```

**Real-world failures:**
- OTP libraries where `lifetime=0` means "accept any OTP regardless of age"
- Rate limiters where `max_attempts=0` disables rate limiting
- Session managers where `timeout=0` means "session never expires"

**Detection**: Any numeric security parameter that accepts 0.

**Fix**: Explicit constants, validation, or separate enable/disable flag.

```python
# BAD
def verify_otp(code: str, lifetime: int = 300):
    if lifetime <= 0:
        return True  # What??

# GOOD
def verify_otp(code: str, lifetime: int = 300):
    if lifetime <= 0:
        raise ValueError("lifetime must be positive")
```

### Empty String Bypass

```python
# Passwords
if user_password == stored_hash:  # What if stored_hash is ""?

# API keys
if api_key == config.api_key:  # What if config is empty?
    grant_access()

# The empty string equals the empty string
"" == ""  # True - authentication bypassed
```

**Detection**: String comparisons for authentication without empty checks.

### Null as "Skip"

```javascript
// DANGEROUS: null means "skip verification"
function verifySignature(data, signature, publicKey) {
    if (!publicKey) return true;  // No key = trust everything?
    return crypto.verify(data, signature, publicKey);
}

// DANGEROUS: null means "any value"
function checkRole(user, requiredRole) {
    if (!requiredRole) return true;  // No requirement = allow all?
    return user.roles.includes(requiredRole);
}
```

## Boolean Traps

### Security-Disabling Flags

```yaml
# Every one of these has caused real vulnerabilities
verify_ssl: false
validate_certificate: false
check_signature: false
require_auth: false
enable_csrf_protection: false
sanitize_input: false
```

**Pattern**: Any boolean that disables a security control.

**The typo problem:**
```yaml
verify_ssl: fasle   # Typo - what does the parser do?
verify_ssl: "false" # String "false" - truthy in many languages!
verify_ssl: 0       # Integer 0 - falsy, but is it valid?
```

### Double Negatives

```yaml
# Confusing
disable_auth: false      # Auth enabled? Let me re-read...
skip_validation: false   # Validation runs? Think carefully...

# Clear
auth_enabled: true
validate_input: true
```

## Magic Values

### Sentinel Values in Security Parameters

```yaml
# What do these mean?
max_retries: -1      # Infinite? Error? Use default?
cache_ttl: -1        # Never expire? Disabled?
timeout_seconds: -1  # Wait forever? Use system default?

# Real vulnerability: connection pool with max_connections: -1
# meant "unlimited" - enabled DoS via connection exhaustion
```

### Special String Values

```yaml
# Dangerous patterns
allowed_origins: "*"       # CORS wildcard
allowed_hosts: "any"       # Bypass host validation
log_level: "none"          # Disable security logging
password_policy: "disabled" # No password requirements
```

**Detection**: String configs that accept wildcards or "disable" keywords.

## Combination Hazards

### Conflicting Settings

```yaml
# Both true - which wins?
require_authentication: true
allow_anonymous_access: true

# Both specified - conflict
session_cookie_secure: true
force_http: true  # HTTP can't use Secure cookies

# Mutually exclusive
encryption_key: "..."
encryption_disabled: true
```

### Precedence Confusion

```yaml
# In config file
verify_ssl: true

# But overrideable by environment?
VERIFY_SSL=false  # Which wins?

# And command line?
--no-verify-ssl   # Now there are three sources
```

**Fix**: Document precedence clearly; warn on conflicts; fail on contradictions.

## Environment Variable Hazards

### Sensitive Values in Environment

```bash
# Common but problematic
export DATABASE_PASSWORD="secret"
export API_KEY="sk_live_xxx"

# Risks:
# - May be exposed by privileged process inspection, dumps or platform-specific tools; ordinary ps aux typically lists arguments, not all environment variables
# - Inherited by child processes
# - Logged in error dumps
# - Visible in container inspection
```

### Override Attacks

```python
# Application trusts environment
debug = os.environ.get("DEBUG", "false") == "true"

# Attacker with environment access:
export DEBUG=true  # Enables verbose logging of secrets
```

**Detection**: Security settings controllable via environment without validation.

## Path Traversal via Config

### Unrestricted Path Configuration

```yaml
# User-controlled paths
log_file: "../../../etc/passwd"
upload_dir: "/etc/nginx/conf.d/"
template_dir: "../../../etc/shadow"

# Even "read-only" paths can leak secrets
config_include: "/etc/shadow"
certificate_file: "/proc/self/environ"
```

**Fix**: Validate paths; restrict to allowed directories; resolve and check.

## Unvalidated Constructor Parameters

Configuration/parameter classes that accept security-relevant values without validation create "time bombs" - the insecure value is accepted silently at construction, then explodes later during use.

### Algorithm Selection Without Allowlist

```php
// DANGEROUS: Accepts any string including weak algorithms
readonly class ServerConfig {
    public function __construct(
        public string $hashAlgo = 'sha256',  // Accepts 'md5', 'crc32', 'adler32'
        public string $cipher = 'aes-256-gcm', // Accepts 'des', 'rc4'
    ) {}
}

// Caller can pass insecure values:
new ServerConfig(hashAlgo: 'md5');  // Silently accepted!
```

**Detection**: Constructor parameters named `algo`, `algorithm`, `hash*`, `cipher`, `mode`, `*_type` that accept strings without validation.

**Fix**: Validate against an explicit allowlist at construction:

```php
public function __construct(public string $hashAlgo = 'sha256') {
    if (!in_array($hashAlgo, ['sha256', 'sha384', 'sha512'], true)) {
        throw new InvalidArgumentException("Disallowed hash algorithm: $hashAlgo");
    }
}
```

### Timing Parameters Without Bounds

```php
// DANGEROUS: No minimum or maximum bounds
readonly class AuthConfig {
    public function __construct(
        public int $otpLifetime = 120,     // Accepts 0 (immediate expiry? infinite?)
        public int $sessionTimeout = 3600, // Accepts -1 (what does this mean?)
        public int $maxRetries = 5,        // Accepts 0 (no retries? unlimited?)
    ) {}
}

// All of these are silently accepted:
new AuthConfig(otpLifetime: 0);      // OTP always expired or never expires?
new AuthConfig(otpLifetime: 999999); // ~11 days - replay attacks!
new AuthConfig(maxRetries: -1);      // Unlimited retries = brute force
```

**Detection**: Numeric constructor parameters for `*lifetime`, `*timeout`, `*ttl`, `*duration`, `max_*`, `min_*`, `*_seconds`, `*_attempts` without range validation.

**Fix**: Enforce both minimum AND maximum bounds:

```php
public function __construct(public int $otpLifetime = 120) {
    if ($otpLifetime < 2) {
        throw new InvalidArgumentException("OTP lifetime too short (min: 2 seconds)");
    }
    if ($otpLifetime > 300) {
        throw new InvalidArgumentException("OTP lifetime too long (max: 300 seconds)");
    }
}
```

### Hostname/URL Parameters Without Validation

```php
// DANGEROUS: No format validation
readonly class NetworkConfig {
    public function __construct(
        public string $hostname = 'localhost',  // Accepts anything
        public string $callbackUrl = '',        // Accepts malformed URLs
    ) {}
}

// Silently accepted:
new NetworkConfig(hostname: '../../../etc/passwd');
new NetworkConfig(hostname: 'localhost; rm -rf /');
new NetworkConfig(callbackUrl: 'javascript:alert(1)');
```

**Detection**: String constructor parameters named `host`, `hostname`, `domain`, `*_url`, `*_uri`, `endpoint`, `callback*` without validation.

**Fix**: Validate format at construction; this alone does not authorize a network destination or prevent SSRF. Enforce approved schemes/hosts, DNS/IP policy, redirects and egress controls at request time:

```php
public function __construct(public string $hostname = 'localhost') {
    if (!filter_var($hostname, FILTER_VALIDATE_DOMAIN, FILTER_FLAG_HOSTNAME)) {
        throw new InvalidArgumentException("Invalid hostname: $hostname");
    }
}
```

### The "Sensible Default" Trap

Having a secure default does NOT protect you - callers can override it:

```php
// Default is secure...
public function __construct(
    public string $hashAlgo = 'sha256'  // Good default!
) {}

// ...but callers can still shoot themselves
$config = new Config(hashAlgo: 'md5');  // Oops
```

**The rule**: If a parameter affects security, validate it. Defaults only help developers who don't specify a value; validation protects everyone.

## Configuration Validation Checklist

For configuration schemas, verify:

- [ ] **Zero/empty rejected**: Numeric security params require positive values
- [ ] **No empty passwords/keys**: Empty string authentication forbidden
- [ ] **No security-disabling booleans**: Or require confirmation/separate config
- [ ] **No magic values**: -1 and wildcards have defined, safe meanings
- [ ] **Conflict detection**: Contradictory settings produce errors
- [ ] **Precedence documented**: Clear order when multiple sources exist
- [ ] **Path validation**: User-provided paths restricted to safe directories
- [ ] **Type strictness**: "false" string not silently converted to boolean
- [ ] **Deprecation warnings**: Insecure legacy options warn loudly
- [ ] **Algorithm allowlist**: Crypto algorithm params validated against safe options
- [ ] **Timing bounds**: Lifetime/timeout params have both min AND max limits
- [ ] **Hostname/URL validation**: Network addresses validated at construction
- [ ] **Constructor validation**: All security params validated, not just defaulted
