# Authentication & Session Footguns

> Catalog correction (CC-BY-SA-4.0 adaptation; original attribution/license in UPSTREAM-NOTICE.md): snippets are isolated teaching fragments, not production implementations or an assertion of exploitability. Confirm the installed language/library version, trust boundary, reachable input and impact. Use inert local fixtures only; do not execute the intentionally unsafe snippets, untrusted audited code or destructive payloads. No network attack or configuration change is authorized by this guide.


Patterns that make authentication and session management error-prone.

## Password Handling

### Comparison Vulnerabilities

```python
# DANGEROUS: Short-circuit evaluation
def check_password(user_input, stored):
    return user_input == stored  # Timing attack

# DANGEROUS: Empty password bypass
def check_password(user_input, stored):
    if not stored:
        return True  # No password set = access granted?
    return constant_time_compare(user_input, stored)

# DANGEROUS: Null bypass
def authenticate(username, password):
    user = get_user(username)
    if user is None:
        return None  # No user = return None
    if password == user.password:  # None == None if both None
        return user
```

### Length Limits That Truncate

```python
# DANGEROUS: Password truncated before hashing
def hash_password(password: str) -> str:
    password = password[:72]  # bcrypt limit
    return bcrypt.hash(password)

# User sets: "password123" + 64 more characters + "IMPORTANT_ENTROPY"
# Stored: hash of just "password123" + first 61 characters
# Attacker only needs to brute force truncated version
```

**Fix**: Reject passwords over limit; don't silently truncate.

### Validation Ordering

```python
# DANGEROUS: Username enumeration
def login(username, password):
    user = db.get_user(username)
    if not user:
        return "User not found"  # Reveals user doesn't exist
    if not verify_password(password, user.password_hash):
        return "Wrong password"  # Reveals user DOES exist
    return create_session(user)

# SECURE: Uniform error
def login(username, password):
    user = db.get_user(username)
    # dummy_hash has the same reviewed work factor; avoid a fast unknown-user path.
    candidate_hash = user.password_hash if user else dummy_hash
    valid = verify_password(password, candidate_hash)
    if not user or not valid:
        return "Invalid credentials"
    return create_session(user)
```

## Session Management

### Session Fixation Enablers

```python
# DANGEROUS: Session ID accepted from request
def login(request):
    session_id = request.cookies.get("session") or generate_session_id()
    # Attacker gives victim a known session ID before login
    # After login, attacker knows victim's session
    sessions[session_id] = user
```

**Fix**: Always generate new session ID on authentication state change.

### Token Generation Weakness

```python
# DANGEROUS: Predictable tokens
import time
session_id = hashlib.md5(str(time.time()).encode()).hexdigest()
# Attacker knows approximate login time = can guess session

# DANGEROUS: Insufficient entropy
session_id = ''.join(random.choice('abcdef') for _ in range(8))
# Only 6^8 = 1.6M possibilities

# SECURE: Cryptographic randomness
session_id = secrets.token_urlsafe(32)
```

### Session Timeout Footguns

```python
# DANGEROUS: Timeout of 0 means "never"?
class SessionConfig:
    timeout_seconds: int = 3600  # 1 hour
    # What if someone sets 0? Infinite session?

# DANGEROUS: Negative timeout
if current_time - session_created > timeout:
    # For non-negative elapsed time and negative timeout this is immediately True.
    # Reject invalid configuration; test actual signed/unsigned arithmetic.
```

## Token/OTP Handling

### OTP Lifetime Issues

```python
# DANGEROUS: lifetime=0 accepts all
def verify_otp(code, user, lifetime=300):
    if lifetime == 0:
        return True  # Skip expiry check entirely

# DANGEROUS: Negative lifetime
    if otp.created_at + lifetime > current_time:
        return True
    # If lifetime is negative, always expired? Or underflow?

# DANGEROUS: No rate limiting
def verify_otp(code, user):
    return code == user.current_otp
    # Attacker can try all 1,000,000 6-digit codes
```

### Token Reuse

```python
# DANGEROUS: OTP valid until next OTP generated
def verify_otp(code, user):
    return code == user.otp

# DANGEROUS: Reset token valid forever
def verify_reset_token(token):
    return token in valid_tokens
    # Never expires, never invalidated on use

# SECURE: Single-use, time-limited
def verify_reset_token(token):
    record = db.get_token(token)
    if not record:
        return False
    if record.used or record.expired:
        return False
    # Must atomically check unused/unexpired and mark used in one transaction.
    return db.consume_token_if_valid(record.id)
```

## Authorization Footguns

### Role/Permission Accumulation

```python
# DANGEROUS: String-based permissions
user.permissions = "read,write"
user.permissions += ",admin"  # Too easy

# DANGEROUS: Any-match logic
def has_permission(user, required):
    return any(p in user.permissions for p in required.split(","))
# has_permission(user, "admin,readonly") - matches if ANY is present

# DANGEROUS: Substring matching
if "admin" in user.role:
    grant_admin_access()
# "readonly_admin_viewer" contains "admin"
```

### Missing Authorization Checks

```python
# DANGEROUS: Auth check in one place, not others
@require_login
def list_documents(request):
    return Document.objects.all()

def get_document(request, doc_id):
    # Developer forgot @require_login
    return Document.objects.get(id=doc_id)

def delete_document(request, doc_id):
    # Developer also forgot authorization check
    Document.objects.get(id=doc_id).delete()
```

**Fix**: Centralized authorization; deny-by-default.

### IDOR Enablers

```python
# DANGEROUS: User ID from request
def get_profile(request):
    user_id = request.GET["user_id"]  # Attacker changes this
    return User.objects.get(id=user_id)

# DANGEROUS: Sequential IDs
user = User.objects.create(...)  # Gets ID 12345
# Attacker tries 12344, 12346, etc.
```

## Multi-Factor Authentication

### Bypassable MFA

```python
# DANGEROUS: MFA check in frontend only
# API directly accessible without MFA

# DANGEROUS: "Remember this device" with weak token
device_token = hashlib.md5(user_agent.encode()).hexdigest()
# Attacker spoofs User-Agent to bypass MFA

# DANGEROUS: MFA disabled by user preference
if user.preferences.get("mfa_enabled", True):
    require_mfa()
# Preference stored in same session = attacker disables it
```

### Recovery Code Issues

```python
# DANGEROUS: Predictable recovery codes
recovery_code = str(user.id).zfill(8)  # Just the user ID

# DANGEROUS: Unlimited recovery attempts
for _ in range(1000000):
    try_recovery_code(guess)

# DANGEROUS: Recovery codes don't invalidate
if code in user.recovery_codes:
    login(user)
    # Code still valid for reuse
```

## Auth API Design Checklist

For authentication APIs, verify:

- [ ] **Password verification**: Use a password-hashing library verifier; fixed-length secret MAC/token bytes use appropriate constant-time comparison
- [ ] **Empty value rejection**: Empty passwords/tokens explicitly rejected
- [ ] **Uniform errors**: No user enumeration via different error messages
- [ ] **Session regeneration**: New session ID on auth state changes
- [ ] **Cryptographic tokens**: secrets module, not random or time-based
- [ ] **Positive timeouts**: Zero/negative values rejected or have safe meaning
- [ ] **Single-use tokens**: OTPs/reset tokens invalidated on use
- [ ] **Rate limiting**: Brute force protection on all auth endpoints
- [ ] **Authorization centralized**: Not scattered across endpoints
- [ ] **MFA in backend**: Not bypassable by skipping frontend
