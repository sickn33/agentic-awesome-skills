# Mobile Backend Patterns

> **This file covers backend/API patterns SPECIFIC to mobile clients.**
> Generic backend patterns are in `nodejs-best-practices` and `api-patterns`.
> **Mobile backend is NOT the same as web backend. Different constraints, different patterns.**

---

## 🧠 MOBILE BACKEND MINDSET

```
Mobile clients are DIFFERENT from web clients:
├── Unreliable network (2G, subway, elevator)
├── Battery constraints (minimize wake-ups)
├── Limited storage (can't cache everything)
├── Interrupted sessions (calls, notifications)
├── Diverse devices (old phones to flagships)
└── Binary updates are slow (App Store review)
```

**Your backend must compensate for ALL of these.**

---

## 🚫 AI MOBILE BACKEND ANTI-PATTERNS

### These are common AI mistakes when building mobile backends:

| ❌ AI Default | Why It's Wrong | ✅ Mobile-Correct |
|---------------|----------------|-------------------|
| Same API for web and mobile | Mobile needs compact responses | Separate mobile endpoints OR field selection |
| Full object responses | Wastes bandwidth, battery | Partial responses, pagination |
| No offline consideration | App crashes without network | Offline-first design, sync queues |
| WebSocket for everything | Battery drain | Push notifications + polling fallback |
| No app versioning | Can't force updates, breaking changes | Version headers, minimum version check |
| Generic error messages | Users can't fix issues | Mobile-specific error codes + recovery actions |
| Session-based auth | Mobile apps restart | Token-based with refresh |
| Ignore device info | Can't debug issues | Device ID, app version in headers |

---

## 1. Push Notifications

### Platform Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    YOUR BACKEND                                  │
├─────────────────────────────────────────────────────────────────┤
│                         │                                        │
│              ┌──────────┴──────────┐                            │
│              ▼                     ▼                            │
│    ┌─────────────────┐   ┌─────────────────┐                    │
│    │   FCM (Google)  │   │  APNs (Apple)   │                    │
│    │   Firebase      │   │  Direct or FCM  │                    │
│    └────────┬────────┘   └────────┬────────┘                    │
│             │                     │                              │
│             ▼                     ▼                              │
│    ┌─────────────────┐   ┌─────────────────┐                    │
│    │ Android Device  │   │   iOS Device    │                    │
│    └─────────────────┘   └─────────────────┘                    │
└─────────────────────────────────────────────────────────────────┘
```

### Push Types

| Type | Use Case | User Sees |
|------|----------|-----------|
| **Display** | New message, order update | Notification banner |
| **Silent** | Background sync, content update | Nothing (background) |
| **Data** | Custom handling by app | Depends on app logic |

### Anti-Patterns

| ❌ NEVER | ✅ ALWAYS |
|----------|----------|
| Send sensitive data in push | Push says "New message", app fetches content |
| Overload with pushes | Batch, dedupe, respect quiet hours |
| Same message to all | Segment by user preference, timezone |
| Ignore failed tokens | Clean up invalid tokens regularly |
| Skip APNs for iOS | FCM alone doesn't guarantee iOS delivery |

### Token Management

```
TOKEN LIFECYCLE:
├── App registers → Get token → Send to backend
├── Token can change → App must re-register on start
├── Provider reports token invalid/unregistered → remove or refresh its binding
├── User uninstalls → Token becomes invalid (detect via error)
└── Multiple devices → Store multiple tokens per user
```

---

## 2. Offline Sync & Conflict Resolution

### Sync Strategy Selection

```
WHAT TYPE OF DATA?
        │
        ├── Read-only (news, catalog)
        │   └── Simple cache + TTL
        │       └── ETag/Last-Modified for invalidation
        │
        ├── User-owned (notes, todos)
        │   └── Last-write-wins (simple)
        │       └── Or timestamp-based merge
        │
        ├── Collaborative (shared docs)
        │   └── Choose CRDT, OT, locking or explicit merge according to collaboration semantics
        │       └── Consider Firebase/Supabase
        │
        └── Critical (payments, inventory)
            └── Server is source of truth
                └── Optimistic UI + server confirmation
```

### Conflict Resolution Strategies

| Strategy | How It Works | Best For |
|----------|--------------|----------|
| **Last-write-wins** | Latest timestamp overwrites | Simple data, single user |
| **Server-wins** | Server always authoritative | Critical transactions |
| **Client-wins** | Offline changes prioritized | Offline-heavy apps |
| **Merge** | Combine changes field-by-field | Documents, rich content |
| **CRDT** | Mathematically conflict-free | Real-time collaboration |

### Sync Queue Pattern

```
CLIENT SIDE:
├── User makes change → Write to local DB
├── Add to sync queue → { action, data, timestamp, retries }
├── Network available → Process queue FIFO
├── Success → Remove from queue
├── Failure → Retry with backoff (max 5 retries)
└── Conflict → Apply resolution strategy

SERVER SIDE:
├── Accept change with client timestamp
├── Compare with server version
├── Apply conflict resolution
├── Return merged state
└── Client updates local with server response
```

---

## 3. Mobile API Optimization

### Response Size Reduction

| Technique | Savings | Implementation |
|-----------|---------|----------------|
| **Field selection** | 30-70% | `?fields=id,name,thumbnail` |
| **Compression** | 60-80% | gzip/brotli (automatic) |
| **Pagination** | Varies | Cursor-based for mobile |
| **Image variants** | 50-90% | `/image?w=200&q=80` |
| **Delta sync** | 80-95% | Only changed records since timestamp |

### Pagination: Cursor vs Offset

```
OFFSET (Bad for mobile):
├── Page 1: OFFSET 0 LIMIT 20
├── Page 2: OFFSET 20 LIMIT 20
├── Problem: New item added → duplicates!
└── Problem: Large offset = slow query

CURSOR (Good for mobile):
├── First: ?limit=20
├── Next: ?limit=20&after=cursor_abc123
├── Cursor = encoded (id + sort values)
├── Stable ordering and snapshot semantics still need design; cursor alone cannot guarantee no duplicates
└── Consistent performance
```

### Batch Requests

```
Instead of:
GET /users/1
GET /users/2  
GET /users/3
(3 round trips, 3x latency)

Use:
POST /batch
{ requests: [
    { method: "GET", path: "/users/1" },
    { method: "GET", path: "/users/2" },
    { method: "GET", path: "/users/3" }
]}
(1 round trip)
```

---

## 4. App Versioning

### Version Check Endpoint

```
GET /api/app-config
Headers:
  X-App-Version: 2.1.0
  X-Platform: ios
  X-Device-ID: abc123

Response:
{
  "minimum_version": "2.0.0",
  "latest_version": "2.3.0",
  "force_update": false,
  "update_url": "https://apps.apple.com/...",
  "feature_flags": {
    "new_player": true,
    "dark_mode": true
  },
  "maintenance": false,
  "maintenance_message": null
}
```

### Version Comparison Logic

```
CLIENT VERSION vs MINIMUM VERSION:
├── client >= minimum → Continue normally
├── client < minimum → Show force update screen
│   └── Block app usage until updated
└── client < latest → Show optional update prompt

FEATURE FLAGS:
├── Enable/disable features without app update
├── A/B testing by version/device
└── Gradual rollout (10% → 50% → 100%)
```

---

## 5. Authentication for Mobile

### Token Strategy

```
ACCESS TOKEN:
├── Short-lived (15 min - 1 hour)
├── Stored in memory (not persistent)
├── Used for API requests
└── Refresh when expired

REFRESH TOKEN:
├── Long-lived (30-90 days)
├── Stored in SecureStore/Keychain
├── Used only to get new access token
└── Rotate on each use (security)

DEVICE TOKEN:
├── Identifies this device
├── Allows "log out all devices"
├── Stored alongside refresh token
└── Server tracks active devices
```

### Silent Re-authentication

```
REQUEST FLOW:
├── Make request with access token
├── 401 Unauthorized? (single-flight refresh; at most one retry)
│   ├── Have refresh token?
│   │   ├── Yes → Call /auth/refresh
│   │   │   ├── Success → Retry original request
│   │   │   └── Network failure → preserve recoverable session; invalid/revoked refresh → reauthenticate
│   │   └── No → Force logout
│   └── Token just expired (not invalid)
│       └── Auto-refresh, user doesn't notice
└── Success → Continue
```

---

## 6. Error Handling for Mobile

### Mobile-Specific Error Format

```json
{
  "error": {
    "code": "PAYMENT_DECLINED",
    "message": "Your payment was declined",
    "user_message": "Please check your card details or try another payment method",
    "action": {
      "type": "navigate",
      "destination": "payment_methods"
    },
    "retry": {
      "allowed": true,
      "after_seconds": 5
    }
  }
}
```

### Error Categories

| Code Range | Category | Mobile Handling |
|------------|----------|-----------------|
| 400-499 | Client error | Show message, user action needed |
| 401 | Auth expired | Silent refresh or re-login |
| 403 | Forbidden | Explain denied access; do not assume a paid upgrade is appropriate |
| 404 | Not found | Apply endpoint-specific semantics; avoid destructive cache deletion on a transient/masked response |
| 409 | Conflict | Show sync conflict UI |
| 429 | Rate limit | Retry after header, backoff |
| 500-599 | Server error | Retry with backoff, show "try later" |
| Network | No connection | Use cached data, queue for sync |

---

## 7. Media & Binary Handling

### Image Optimization

```
CLIENT REQUEST:
GET /images/{id}?w=400&h=300&q=80&format=webp

SERVER RESPONSE:
├── Resize on-the-fly OR use CDN
├── WebP for Android (smaller)
├── HEIC for iOS 14+ (if supported)
├── JPEG fallback
└── Cache-Control: max-age=31536000
```

### Chunked Upload (Large Files)

```
UPLOAD FLOW:
1. POST /uploads/init
   { filename, size, mime_type }
   → { upload_id, chunk_size }

2. PUT /uploads/{upload_id}/chunks/{n}
   → Upload each chunk (1-5 MB)
   → Can resume if interrupted

3. POST /uploads/{upload_id}/complete
   → Server assembles chunks
   → Return final file URL
```

### Streaming Audio/Video

```
REQUIREMENTS:
├── HLS (HTTP Live Streaming) for iOS
├── DASH or HLS for Android
├── Multiple quality levels (adaptive bitrate)
├── Range request support (seeking)
└── Offline download chunks

ENDPOINTS:
GET /media/{id}/manifest.m3u8  → HLS manifest
GET /media/{id}/segment_{n}.ts → Video segment
GET /media/{id}/download       → Full file for offline
```

---

## 8. Security for Mobile

### Device Attestation

```
VERIFY REAL DEVICE (not emulator/bot):
├── iOS: DeviceCheck API
│   └── Server verifies with Apple
├── Android: Play Integrity API (replaces SafetyNet)
│   └── Server verifies with Google
└── Define an explicit threat/availability policy; a missing verdict is not proof of compromise
```

### Request authenticity and replay

Do not embed a shared HMAC backend secret in a mobile binary or build-time env
variable: it can be extracted. Use platform TLS plus server-side user/session
validation. When a threat model needs request proof, use reviewed per-device
nonexportable key provisioning and server validation, including user binding,
method/path/body canonicalization, expiry and one-use nonce/replay controls.
A timestamp alone does not prevent replay inside its accepted window. Device
attestation is a risk signal, not proof a person/device is trustworthy or a
replacement for authorization. Availability failures need an explicit policy.

### Rate Limiting

```
MOBILE-SPECIFIC LIMITS:
├── Per device (X-Device-ID)
├── Per user (after auth)
├── Per endpoint (stricter for sensitive)
└── Sliding window preferred

HEADERS:
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1609459200
Retry-After: 60 (when 429)
```

---

## 9. Monitoring & Analytics

### Minimal diagnostics metadata

Send app/platform version and per-request correlation ID only when needed. A
persistent device identifier, model, timezone or user ID can identify or profile
people; do not require or log them universally. Define consent/notice, purpose,
retention and access controls. Never log authorization, push tokens, payloads or
all request headers. Treat every client-supplied field as untrusted.

### What to Log

```
FOR EACH REQUEST:
├── Explicitly allowlisted sanitized diagnostic fields only
├── Endpoint, method, status
├── Response time
├── Error details (if any)
└── User ID (if authenticated)

ALERTS:
├── Error rate > 5% per version
├── P95 latency > 2 seconds
├── Specific version crash spike
├── Auth failure spike (attack?)
└── Push delivery failure spike
```

---

## 📝 MOBILE BACKEND CHECKLIST

### Before API Design
- [ ] Identified mobile-specific requirements?
- [ ] Planned offline behavior?
- [ ] Designed sync strategy?
- [ ] Considered bandwidth constraints?

### For Every Endpoint
- [ ] Response as small as possible?
- [ ] Pagination cursor-based?
- [ ] Proper caching headers?
- [ ] Mobile error format with actions?

### Authentication
- [ ] Token refresh implemented?
- [ ] Silent re-auth flow?
- [ ] Multi-device logout?
- [ ] Secure token storage guidance?

### Push Notifications
- [ ] FCM + APNs configured?
- [ ] Token lifecycle managed?
- [ ] Silent vs display push defined?
- [ ] Sensitive data NOT in push payload?

### Release
- [ ] Version check endpoint ready?
- [ ] Feature flags configured?
- [ ] Force update mechanism?
- [ ] Monitoring headers required?

---

> **Remember:** Mobile backend must be resilient to bad networks, respect battery life, and handle interrupted sessions gracefully. The client cannot be trusted, but it also cannot be hung up—provide offline capabilities and clear error recovery paths.

## Sync, retries and push limitations

Use server-controlled revisions/ETags for concurrency, not an untrusted client
clock as authority. Queue writes with a stable idempotency key and bounded retries;
a payment network error is an unknown outcome, not permission to repeat the charge.
Reconcile status before retrying. Realtime transport alone does not implement CRDT,
OT, conflict resolution or offline persistence. Push/silent background delivery is
best-effort and cannot be the sole synchronization or safety-critical mechanism.
Illustrative bandwidth savings and token lifetimes above are not measured guarantees.
