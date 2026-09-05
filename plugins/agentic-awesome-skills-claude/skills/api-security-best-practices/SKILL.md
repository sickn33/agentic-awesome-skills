---
name: api-security-best-practices
description: "Implement secure API design patterns including authentication, authorization, input validation, rate limiting, and protection against common API vulnerabilities"
risk: critical
source: community
date_added: "2026-02-27"
---

# API Security Best Practices

Review the request boundary from caller identity through authorization, validated
input, storage and observable response. Preserve the application's actual identity
provider and data model rather than introducing a second authentication system.

## When to Use

Use when adding a protected endpoint, reviewing object access, replacing permissive
request parsing, or investigating an API abuse path. For a concrete defect, start
with the failing route and its callers; do not deploy unrelated security infrastructure.

## Inputs and prerequisites

Record the routes, caller/tenant model, identity provider, token contract, runtime and
locked dependency versions, database schema, proxy topology and authorized test scope.
Use synthetic identities in a test environment. Existing task authorization carries
forward; production scans, account writes and message sends need their own authority.
The Node examples below are integration sketches for Express, jsonwebtoken and Zod;
application/database adapters are deliberately named rather than presented as a full
runnable service. Confirm APIs against the installed versions before integrating.

## 1. Authenticate the exact token contract

Prefer the established provider/session middleware. When the service owns an HMAC
JWT contract, require a strong server-owned key, a fixed algorithm, exact issuer and
audience, and required runtime claims. Do not infer permissions from a decoded token
before signature verification. Never accept a caller-selected verification algorithm.

```javascript
const jwt = require('jsonwebtoken');

// Illustrative first-party access-token contract; not a third-party OAuth adapter.
const ACCESS_POLICY = {
  algorithms: ['HS256'], issuer: 'example-auth', audience: 'example-api'
};
function verifyAccessToken(token, signingKey) {
  const claims = jwt.verify(token, signingKey, ACCESS_POLICY);
  if (!claims || typeof claims !== 'object' ||
      typeof claims.sub !== 'string' || !claims.sub ||
      typeof claims.tenantId !== 'string' || !claims.tenantId ||
      !Number.isSafeInteger(claims.exp) || !Number.isSafeInteger(claims.iat) ||
      claims.exp <= claims.iat) {
    throw new Error('Invalid access claims');
  }
  return { subject: claims.sub, tenantId: claims.tenantId };
}
function readBearer(header) {
  if (typeof header !== 'string' || header.length > 8192) return null;
  const match = /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/i.exec(header);
  return match ? match[1] : null;
}
```

Issue access tokens with the same issuer/audience/algorithm and a short application-
approved expiration. Handle verification failure as a generic 401 without echoing the
token or exception. Expiration alone does not revoke a token; define revocation or
short-lived sessions according to the actual threat model. A service using asymmetric
provider keys needs the provider's discovery/JWKS validation and key-rotation policy,
not this HMAC example. Never reuse an access token as a refresh token.

### Refresh sessions

Use the provider's supported session flow or a server-side opaque refresh design:
store only a digest, expiry, user/session family and revocation state. In one atomic
transaction consume the old active token and create the replacement. Concurrent reuse
must not issue two successors; defined reuse handling revokes the affected family.
Check current user status and permissions when issuing new access tokens. Bind refresh
to the intended client/session and protect cookie-based requests against CSRF. Do not
log tokens, store them plaintext in a database, or return a refresh token through a URL.
Test simultaneous refresh, expiry, replay, revocation and transaction failure before
calling the flow complete. No database transaction adapter is bundled here.

## 2. Authorize the resource and operation

Authentication identifies the caller; authorization decides the exact operation on
an object and tenant. A role name does not automatically grant cross-tenant access.
Apply the owner/tenant predicate in the database mutation to avoid a check-then-write
race, and allowlist writable properties. Use 404/403 consistently with the product's
resource-disclosure policy.

```javascript
// Prisma-style sketch; id and tenant types must match your actual schema.
async function deleteOwnedPost(prisma, postId, principal) {
  const result = await prisma.post.deleteMany({
    where: { id: postId, userId: principal.subject, tenantId: principal.tenantId }
  });
  return result.count === 1;
}
```

An administrator path needs an explicit separate policy and audit event; do not add
an implicit admin bypass to every owner check. Test a valid user accessing another
user's object, the same ID in another tenant, deleted memberships and bulk endpoints.

## 3. Parse once, then use the validated value

Reject partial numeric parses (`12abc` is not ID 12), unsafe integers, unexpected
properties and oversized requests. Use parameterized database queries. An ORM does
not provide business authorization or make unsafe raw SQL safe.

```javascript
function parsePositiveId(raw) {
  if (typeof raw !== 'string' || !/^[1-9][0-9]{0,15}$/.test(raw)) return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

const { z } = require('zod');
const profileUpdate = z.object({
  displayName: z.string().trim().min(1).max(100)
}).strict();
function validateBody(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request' });
    }
    req.validatedBody = parsed.data; // Defaults/transforms must reach the handler.
    next();
  };
}
// Handler uses req.validatedBody, never the original body or an arbitrary spread.
```

Set body limits before parsing. Zod shape validation is only one layer: check current
ownership, allowed transitions and uniqueness in the transaction. For HTML allow only
needed tags/attributes with a maintained sanitizer, then render with the destination's
safe output API. For plain comments prefer plain text; sanitizing a string does not
make it safe in every JavaScript, URL or HTML context. Validate upstream API responses
as untrusted input too.

For outbound URLs, define the allowed scheme/hosts, redirect behavior, resolved IP
ranges, credentials policy, timeout and response size. A regex or a URL parser alone
does not prevent SSRF or DNS rebinding. File uploads likewise need type/content checks,
size limits, isolated storage and authorization on reads.

## 4. Control abuse without claiming DDoS protection

Use the existing gateway and maintained rate-limit store. Authenticate before deriving
an authenticated-user key, and never trust a user-supplied tier. For anonymous traffic,
use the library's supported IPv6-aware IP key handling and configure Express trust
proxy to the actual trusted hops; do not blindly enable it for all callers.

For a distributed quota, use an atomic counter-plus-expiration implementation with
defined store-outage behavior. Avoid a handwritten `INCR` followed by `EXPIRE`: a crash
between them can leave a permanent key. Distinguish per-user quotas, per-IP abuse
controls, concurrency limits and upstream service budgets. Record actual window/reset
semantics and send an accurate Retry-After rather than a hardcoded full-window value.
An in-memory limiter is per-process unless a shared store is configured.

Test concurrent requests, IPv4/IPv6, forged forwarding headers, unknown tiers, absent
identity, Redis failure and expiration. Application rate limits cannot absorb network
saturation. Helmet configures HTTP response headers; it is not DDoS protection, access
control or a substitute for upstream capacity controls. Roll out CSP/HSTS against the
actual deployment and subdomain policy; do not copy preload settings blindly.

## 5. Passwords, secrets and logging

Use the established identity provider where possible. For stored passwords, use a
maintained password-hashing scheme with calibrated parameters (prefer Argon2id for
new designs). Check breached/common passwords and support passphrases. Do not impose
arbitrary uppercase/symbol composition rules or silently truncate long passwords.
Legacy bcrypt has an input-byte limit that must be accounted for explicitly during
migration; password length in characters and UTF-8 bytes are different.

Keep secrets in the approved secret mechanism, check required configuration at startup
without printing values, and rotate exposed credentials. Never include raw tokens,
passwords, request bodies or complete database exceptions in routine logs. Log bounded
event names, request correlation and safe status/error classes under an appropriate
retention/access policy. Sanitized errors should not return mass-assigned user objects.
CORS controls browser cross-origin access; it is not API authentication or CSRF protection.

## Worked example: a profile update boundary

Given `PATCH /users/:id` with a string ID and an editable display name:

1. Record the authorized caller/tenant and current endpoint behavior in fixtures.
2. Check missing/expired/wrong-audience tokens return 401 before storage access.
3. Send `12abc`, an unsafe integer, an empty name and an extra `role` field; expect 400
   and no database mutation. Send a padded valid name; confirm only the parsed trimmed
   value reaches the owner-and-tenant-scoped update.
4. Try a different user's valid ID and a cross-tenant ID; expect the documented denial
   and no mutation. A valid owner request updates only the allowed property.
5. Exercise quota/store failure and confirm logs contain no request token or name.

Return the route policy, reproduced failure cases, exact test command/output and
remaining gaps. These are expected checks to execute in the target application, not
claims that this repository has tested a deployed API.

## Limitations

This guide is not a full identity service, certified security audit or penetration
test. Snippets omit application adapters and integration error middleware. Unit tests
of a parser do not verify database transactions, proxy behavior or provider sessions.
Report any untested route, tenant path and failure mode explicitly. Do not infer a
clean security posture from passing structural checks or from a risk metadata label.

## References

- [OWASP API Security](https://owasp.org/www-project-api-security/)
- [JWT best current practices, RFC 8725](https://www.rfc-editor.org/rfc/rfc8725)
- [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [Express production security](https://expressjs.com/en/advanced/best-practice-security.html)
- [Zod basic parsing](https://zod.dev/basics)
- Related skills: `auth-implementation-patterns`, `api-patterns`, `systematic-debugging`.
