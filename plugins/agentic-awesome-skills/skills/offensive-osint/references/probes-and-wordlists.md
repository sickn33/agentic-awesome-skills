# Probes & Wordlists

> **AAS adaptation:** Read the authorization gate in [the skill](../SKILL.md) before any target request, credential use, or data collection. These are reference examples, not an instruction to run a sweep. Select only explicitly approved targets and techniques; set request, time, byte and concurrency limits and stop on errors or scope changes. Preserve TLS verification. Treat discoveries, pattern matches and historical provider claims as leads, not verified ownership, permission or severity. Minimize personal data and redact credentials before reports; do not send private evidence to public services. Prices, quotas, API shapes and tool availability require current official documentation. Changes and original source hashes are recorded in [the notice](../UPSTREAM-NOTICE.md).


> Reference content for the `offensive-osint` skill. Originally §16 of the monolithic SKILL.md (refactored 2026-05-02 for size/load efficiency).

## 16. Pre-built Wordlists & Probe Paths

Select individual reference entries after scope confirmation. Listed severity labels are historical review priorities, not automatic findings; intended public behavior and actual impact must be verified.

### 16.1 Swagger / OpenAPI discovery — 28 paths

Probe only approved host/path combinations within a finite request budget; HEAD is not a way around provider limits. Public API specifications may be intentional.

```
swagger.json
swagger.yaml
swagger/v1/swagger.json
swagger/v2/swagger.json
swagger-ui.html
swagger-ui/
swagger-resources
api-docs
api-docs.json
api/swagger
api/swagger.json
api/swagger-ui.html
api/v1/swagger.json
api/v2/swagger.json
api/v3/api-docs
v2/api-docs
v3/api-docs
openapi.json
openapi.yaml
openapi/v1
openapi/v3
docs
redoc
rapidoc
api/docs
api/documentation
.well-known/openapi
```

**Severity:**
- Reachable Swagger/OpenAPI without auth → review intended publication and actual restricted information; public documentation alone is not a vulnerability.
- Authenticated specification access → assess the intended audience and any demonstrated authorization failure.

### 16.2 GraphQL discovery — 13 paths

```
graphql
graphiql
api/graphql
v1/graphql
v2/graphql
query
api/query
gql
altair
playground
subscriptions
graphql/console
api/v1/graphql
```

**Standard introspection POST body:**
```json
{
  "operationName": "IntrospectionQuery",
  "query": "query IntrospectionQuery { __schema { types { name kind fields { name type { name kind } } } queryType { name } mutationType { name } subscriptionType { name } } }"
}
```

**Severity:**
- Introspection without auth → schema-discovery observation; assess intended disclosure.
- Field suggestions → schema-discovery lead; no automatic severity.
- Batched-query support → capability observation; no rate-limit or authorization bypass without an approved demonstration.

UI markers (lower severity but still discoverable):
- HTML response contains `graphiql`, `playground`, `apollo studio`, `altair` → GraphiQL UI exposed (often shipped accidentally on prod).

### 16.3 High-risk ports — 35 services

Record open ports as asset observations. The service and historical severity columns are hypotheses; confirm the actual protocol, authentication, configuration and affected version before creating a finding. Source for the open-port observation: Shodan InternetDB (free, 1 req/sec) is the recommended starting point.

| Port | Service | Severity | Why it matters |
|---|---|---|---|
| 21 | FTP | HIGH | Anonymous read often enabled; cleartext creds. |
| 22 | SSH | LOW | Banner discloses version; brute-force surface. |
| 23 | Telnet | HIGH | Cleartext protocol; should never be exposed. |
| 25 | SMTP | LOW | Open relay risk; version banner. |
| 53 | DNS | LOW | Recursion = DDoS amplifier; AXFR opportunism. |
| 80 | HTTP | INFO | Standard. |
| 110 | POP3 | LOW | Cleartext if no STARTTLS. |
| 111 | rpcbind | MEDIUM | NFS exports enumeration. |
| 135 | MS RPC | HIGH | Enum via Impacket. |
| 139 | NetBIOS-SSN | HIGH | File/printer enum. |
| 143 | IMAP | LOW | Cleartext if no STARTTLS. |
| 161 | SNMP | HIGH | Community strings often `public`/`private`; full device enum. |
| 389 | LDAP | HIGH | Anonymous bind = full directory dump. |
| 443 | HTTPS | INFO | Standard. |
| 445 | SMB | **CRITICAL** | EternalBlue, SMB relay, anonymous shares. |
| 465 | SMTPS | LOW | Banner. |
| 514 | rsyslog | MEDIUM | Log injection / DoS. |
| 587 | SMTP-MSA | LOW | Banner. |
| 631 | IPP/CUPS | MEDIUM | Print server enum / RCE in old CUPS. |
| 873 | rsync | HIGH | Modules often listable; backup data exposure. |
| 1433 | MSSQL | HIGH | Brute-force; xp_cmdshell. |
| 1521 | Oracle TNS | HIGH | Brute-force; SID enum. |
| 2049 | NFS | HIGH | World-readable exports. |
| 2375 | Docker API (unencrypted) | **CRITICAL** | Unauthenticated container/host takeover. |
| 2376 | Docker API (TLS) | HIGH | Cert validation bypass risk. |
| 3000 | Common dev / Grafana | MEDIUM | Often Grafana / Express dev with default creds. |
| 3306 | MySQL | HIGH | Brute-force; default `root:""`. |
| 3389 | RDP | **CRITICAL** | BlueKeep / DejaBlue / NLA bypass. |
| 5432 | PostgreSQL | HIGH | Brute-force; default `postgres:postgres`. |
| 5601 | Kibana | HIGH | Often unauthenticated; Elasticsearch pivot. |
| 5900 | VNC | HIGH | Often unauthenticated or weak password. |
| 5984 | CouchDB | HIGH | Default no auth; admin party. |
| 6379 | Redis | **CRITICAL** | No auth default; write `authorized_keys` for SSH. |
| 7001 | WebLogic | HIGH | Frequent CVEs (CVE-2020-14882, etc.). |
| 8000 | Common dev | MEDIUM | Django, common dev servers. |
| 8080 | HTTP-alt | MEDIUM | Tomcat, Jenkins, common proxy. |
| 8443 | HTTPS-alt | MEDIUM | Same as 8080. |
| 8888 | Common dev / Jupyter | HIGH | Jupyter often exposes interactive shell. |
| 9090 | Cockpit / Prometheus | HIGH | Server admin UI / metrics scraping. |
| 9200 | Elasticsearch | **CRITICAL** | Typically no auth. |
| 9300 | Elasticsearch transport | HIGH | Cluster join + RCE. |
| 11211 | memcached | MEDIUM | UDP DDoS amp; data dump. |
| 27017 | MongoDB | **CRITICAL** | No auth by default. |
| 50070 | Hadoop NameNode | HIGH | HDFS browse. |

When Shodan InternetDB returns `vulns[]` for a port, record a dated external CVE lead and verify affected versions and prerequisites; never escalate severity from a provider tag alone.

### 16.4 Missing security headers — 6 findings

For every alive webapp, audit response headers. Evaluate applicability and effective replacements first (for example CSP frame-ancestors); a missing header alone is a hardening observation, not an automatic finding.

| Header | Severity (default) | Severity (sensitive path) | Notes |
|---|---|---|---|
| `Strict-Transport-Security` | MEDIUM | **HIGH** | Sensitive paths: `/login`, `/signin`, `/sso`, `/admin`, `/auth`. |
| `Content-Security-Policy` | MEDIUM | MEDIUM | XSS impact mitigation gone. |
| `X-Frame-Options` | LOW | LOW | Clickjacking. (CSP `frame-ancestors` is the modern replacement.) |
| `X-Content-Type-Options` | LOW | LOW | MIME-sniff XSS. |
| `Referrer-Policy` | INFO | INFO | Outbound link leakage. |
| `Permissions-Policy` | INFO | INFO | Feature-policy hardening. |

### 16.5 Always-on HTTP checks — 15 paths

Use only selected approved paths with a request/response budget. Do not fetch heap dumps, private environments or sensitive content to manufacture evidence.

| Path | Finding | Severity | Match logic |
|---|---|---|---|
| `/.git/config` | Exposed `.git` repo | **CRITICAL** | Body contains `[core]`, `[remote`, `repositoryformatversion` |
| `/.git/HEAD` | Exposed `.git/HEAD` | HIGH | Body matches `^ref:\s` |
| `/.env` | Exposed `.env` | **CRITICAL** | Multiline regex `^\s*[A-Z_][A-Z0-9_]*\s*=` |
| `/server-status` | Apache server-status | MEDIUM | Body contains `Apache Server Status` or matching title |
| `/server-info` | Apache mod_info | MEDIUM | Body contains `Apache Server Information` |
| `/.DS_Store` | Exposed `.DS_Store` | LOW | Byte signature `\x00\x00\x00\x01Bud1` |
| `/phpinfo.php` | phpinfo() leak | HIGH | Body contains `phpinfo()`, `PHP Version`, or matching title |
| `/info.php` | phpinfo() (alt path) | HIGH | Same as above |
| `/actuator/env` | Spring Boot `/actuator/env` | **CRITICAL** | Body contains `"propertySources"`, `systemProperties`, `systemEnvironment` |
| `/actuator/heapdump` | Spring Boot heapdump | **CRITICAL** | HPROF magic bytes / large binary download |
| `/_cat/indices` | Elasticsearch open | HIGH | Returns index list |
| `/console` | Jenkins script console | HIGH | Body contains `Jenkins`/`Script Console` |
| `/manager/html` | Tomcat Manager | HIGH | Body contains `Tomcat Web Application Manager` |
| `/wp-admin/install.php` | Orphaned WP install | LOW | Body contains `WordPress Installation` |
| `/.well-known/security.txt` | Disclosure policy info | INFO | Parse contact + policy fields |

Plus parse `/robots.txt` for `Disallow:` paths — those become the next-tier wordlist for that target.

### 16.6 SAML metadata — 5 paths

```
/saml/metadata
/FederationMetadata/2007-06/FederationMetadata.xml
/federationmetadata/2007-06/federationmetadata.xml
/simplesaml/saml2/idp/metadata.php
/auth/saml2/metadata
```

Public SAML metadata can be intentionally published for federation. Reachable metadata reveals: `EntityID`, signing certs (often pinned → cert-reuse pivot), `SingleSignOnService` URL, `NameIDFormat`. Record intended-public metadata as informational. Signing certificates contain public keys; they are not private-key exposure. Assign severity only for demonstrated unintended sensitive information.

### 16.7 SSO subdomain prefixes — 8 prefixes

Probe each against root domain + every sibling brand domain:
```
auth.{domain}
login.{domain}
sso.{domain}
idp.{domain}
iam.{domain}
identity.{domain}
accounts.{domain}
oauth.{domain}
```

Plus probe `/.well-known/openid-configuration` on every alive subdomain (regardless of prefix).

### 16.8 Cloud bucket permutation arsenal

**6 prefixes:**
```
""           # bare candidate
backup-
assets-
static-
dev-
prod-
```

**15 suffixes:**
```
""           # bare candidate
-backup
-assets
-static
-media
-data
-uploads
-dev
-prod
-staging
-logs
-private
-public
-dump
-archive
```

**47 generic stems** (filter unless combined with target-identifying token):
```
www, mail, email, app, apps, web, webmail, ftp, cdn, static, assets, media, img, images,
videos, download, downloads, upload, uploads, data, files, docs, support, help, kb,
blog, news, dev, test, staging, stg, qa, uat, sandbox, preprod, preview, vpn,
mx, smtp, imap, pop, dns, ns, ns1, ns2, mx1, mx2
```

**Provider URL templates:**

S3:
```
https://{candidate}.s3.amazonaws.com/
https://{candidate}.s3-{region}.amazonaws.com/      # try us-east-1, us-west-2, eu-west-1, ap-southeast-1 first
https://s3.{region}.amazonaws.com/{candidate}/
```

GCS:
```
https://{candidate}.storage.googleapis.com/
https://storage.googleapis.com/{candidate}/
```

Azure Blob:
```
https://{candidate}.blob.core.windows.net/
```

**Probe technique:** HEAD first → status codes depend on provider, redirects and policy and do not alone prove existence, ownership or private/public access. An approved minimal listing/read is an observation; intended-public content is not a vulnerability. Assign severity only from unintended sensitive exposure, without bulk downloads.

### 16.9 JS guess-paths for endpoint discovery

Probe these paths on every alive webapp (in addition to scraped `<script src=...>`):

```
/main.js
/app.js
/bundle.js
/runtime.js
/index.js
/vendor.js
/_next/static/_buildManifest.js
/_next/static/_ssgManifest.js
/static/js/main.js
/static/js/bundle.js
/assets/index.js
/static/js/main.<hash>.js                 # try hash discovery via 404 patterns
```

For approved JS resources, a map URL is a candidate. A public source map is not inherently a high-severity leak; inspect minimum content for unintended sensitive material.

### 16.10 Endpoint extraction regex tiers

Three tiers, run in order on every JS body + every sourcesContent[] blob:

**Tier 1 — generic quoted paths:**
```regex
['"`](/[A-Za-z0-9_\-./{}\[\]?=&%:]+)['"`]
```
Match group: the path. High recall, lots of false positives — apply allowlist downstream.

**Tier 2 — API-ish paths (biased filter on tier 1):**
```regex
['"`](/(?:api|graphql|gql|v\d+|swagger|openapi|rest|services|internal|admin|auth|oauth|user|users|account|accounts|search|export|upload|file|files|download|webhook|hooks|callback|admin)/[A-Za-z0-9_\-./{}\[\]?=&%:]+)['"`]
```

**Tier 3 — fully-qualified URLs:**
```regex
\bhttps?://[A-Za-z0-9.\-]+\.[A-Za-z]{2,}(?::\d+)?[/A-Za-z0-9_\-./{}\[\]?=&%:#]*
```

Dedup on `(method, normalized-path-template)` where the template replaces `/123/` with `/{id}/` etc.

### 16.11 Internal-host leakage regexes

Run on every JS body + sourcesContent + APK strings + manifest:

**Private/loopback IPv4 candidates (127/8 is loopback, not RFC1918; validate octets with an IP parser):**
```regex
\b(?:10\.(?:\d{1,3}\.){2}\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.(?:\d{1,3})\.(?:\d{1,3})|192\.168\.(?:\d{1,3})\.(?:\d{1,3})|127\.(?:\d{1,3}\.){2}\d{1,3})\b
```

**Internal DNS suffixes:**
```regex
\b[A-Za-z0-9][A-Za-z0-9\-]{0,62}\.(?:internal|corp|lan|intranet|local|prod|staging|dev|qa|test)\b
```

**Kubernetes service DNS:**
```regex
\b[A-Za-z0-9\-]+\.[A-Za-z0-9\-]+\.svc(?:\.cluster\.local)?\b
```

Each match → candidate internal-reference disclosure; verify sensitivity, context and intended publication before severity. Aggregate per host: if many matches share the same internal subdomain, that's a recon seed for any future internal phase.

### 16.12 Subdomain-takeover provider fingerprints (summary, 27 providers)

Watch for these CNAME targets + the corresponding "available for claim" response signature:

| Provider | CNAME pattern | Takeover signature |
|---|---|---|
| GitHub Pages | `*.github.io` | `There isn't a GitHub Pages site here.` |
| Heroku | `*.herokuapp.com` | `No such app` |
| AWS S3 | `*.s3*.amazonaws.com` | `NoSuchBucket` |
| AWS CloudFront | `*.cloudfront.net` | `Bad request` w/ specific X-Amz error |
| Azure (multiple) | `*.azurewebsites.net`, `*.blob.core.windows.net`, `*.cloudapp.net`, `*.trafficmanager.net` | Various per-product 404 patterns |
| Shopify | `shops.myshopify.com` | `Sorry, this shop is currently unavailable.` |
| Squarespace | `*.squarespace.com` | `No Such Account` |
| Tumblr | `*.tumblr.com` | `Whatever you were looking for doesn't currently exist.` |
| WordPress | `*.wordpress.com` | `Do you want to register *.wordpress.com?` |
| Fastly | various | Fastly-specific 404 |
| Pantheon | `*.pantheonsite.io` | `The gods are wise, but do not know of the site...` |
| Surge.sh | `*.surge.sh` | `project not found` |
| Bitbucket Pages | `*.bitbucket.io` | Repository not found |
| Tilda | `*.tilda.ws` | `Please renew your subscription` |
| Strikingly | `*.s.strikinglydns.com` | `PAGE NOT FOUND` |
| Smartling | `*.smartling.com` | Domain is not configured |
| Ngrok | `*.ngrok.io` | Tunnel not found |
| Webflow | `*.webflow.io` | Site not found |
| Zendesk | `*.zendesk.com` | `Help Center Closed` |
| Cargo | `*.cargocollective.com` | `404 Not Found` (with cargo branding) |
| Statuspage | `*.statuspage.io` | Not found |
| Intercom | `*.intercom.help` | Not found |
| Helpjuice | `*.helpjuice.com` | Not found |
| Helpscout | `*.helpscoutdocs.com` | Not found |
| Tictail | `*.tictail.com` | Not found |
| Brightcove | `*.brightcovegallery.com` | Not found |
| Smugmug | various | Not found |

For provider-specific detection signatures, review and pin an exact fingerprint-database revision. Error signatures are leads; current domain-verification controls may prevent takeover. Do not claim resources during reconnaissance.

---

### 16.13 Copy-Paste Probes (curl one-liners)

Selected §16.1–16.12 examples; placeholders must be replaced with approved values and individually confirmed before execution. Examples use `-sS` (show errors, preserve TLS verification) and `-m 10` (10s max). Before any approved capture, set `umask 077`, create a fresh private case directory and use exclusive output paths there; fixed `/tmp` names below are historical placeholders, not safe destinations, `-w '%{http_code}\n'` (print status code), `-A "Mozilla/5.0"` (UA — change per persona).

**Always-on HTTP checks (§16.5):**

```bash
T="https://target.example"

# .git/config (CRITICAL)
curl -sS -m 10 "$T/.git/config" | grep -E '\[core\]|\[remote|repositoryformatversion'

# .git/HEAD (HIGH)
curl -sS -m 10 "$T/.git/HEAD" | grep -E '^ref:'

# .env (CRITICAL)
curl -sS -m 10 --max-filesize 1048576 "$T/.env" | grep -qE '^[[:space:]]*[A-Z_][A-Z0-9_]*[[:space:]]*='

# Apache /server-status (MEDIUM)
curl -sS -m 10 "$T/server-status" | grep -i 'Apache Server Status'

# Apache /server-info (MEDIUM)
curl -sS -m 10 "$T/server-info" | grep -i 'Apache Server Information'

# .DS_Store (LOW)
curl -sS -m 10 "$T/.DS_Store" -o "${PRIVATE_CASE_DIR}/dsstore" && file "${PRIVATE_CASE_DIR}/dsstore" | grep -i 'data'

# phpinfo.php (HIGH)
curl -sS -m 10 "$T/phpinfo.php" | grep -E 'phpinfo\(\)|PHP Version'

# info.php (HIGH)
curl -sS -m 10 "$T/info.php" | grep -E 'phpinfo\(\)|PHP Version'

# Spring Boot /actuator/env (CRITICAL)
curl -sS -m 10 "$T/actuator/env" | grep -E '"propertySources"|systemProperties|systemEnvironment'

# Spring Boot /actuator/heapdump (CRITICAL — saves binary; check size)
# No heap download by default: require explicit sensitive-data and byte-budget approval.
# Confirm the endpoint from approved metadata or an owner-provided fixture.

# Elasticsearch open (HIGH)
curl -sS -m 10 "$T/_cat/indices?v"

# Jenkins script console (HIGH)
curl -sS -m 10 "$T/script" | grep -iE 'Jenkins|Script Console'

# Tomcat manager (HIGH)
curl -sS -m 10 "$T/manager/html" -w '%{http_code}\n' | tail -1     # HTTP status alone does not establish access to protected manager operations

# WordPress orphan installer (LOW)
curl -sS -m 10 "$T/wp-admin/install.php" | grep -i 'WordPress Installation'

# security.txt (INFO)
curl -sS -m 10 "$T/.well-known/security.txt"
```

**SSO subdomain prefixes (§16.7):**

```bash
D="target.example"
for prefix in auth login sso idp iam identity accounts oauth; do
  echo "=== ${prefix}.${D} ==="
  curl -sS -m 10 "https://${prefix}.${D}/.well-known/openid-configuration" -o /dev/null -w '%{http_code}\n'
done

# Generic OIDC discovery on any host:
curl -sS -m 10 "https://${HOST}/.well-known/openid-configuration" | jq .
```

**SAML metadata paths (§16.6):**

```bash
H="target.example.com"
for p in /saml/metadata \
         /FederationMetadata/2007-06/FederationMetadata.xml \
         /federationmetadata/2007-06/federationmetadata.xml \
         /simplesaml/saml2/idp/metadata.php \
         /auth/saml2/metadata; do
  echo "=== $p ==="
  curl -sS -m 10 "https://${H}${p}" -o /dev/null -w '%{http_code} %{size_download}\n'
done
```

**Cloud bucket probes (§16.8):**

```bash
B="candidate-bucket-name"

# S3 (us-east-1 first)
curl -sS -m 10 -I "https://${B}.s3.amazonaws.com/" -w 'STATUS:%{http_code}\n' | head -20
# A status is not ownership or permission. Only after separate approved listing scope:
curl -sS -m 10 "https://${B}.s3.amazonaws.com/?list-type=2&max-keys=1" | head -50

# S3 region-specific
for r in us-east-1 us-west-2 eu-west-1 ap-southeast-1; do
  curl -sS -m 10 -I "https://${B}.s3-${r}.amazonaws.com/" -w "${r}: %{http_code}\n"
done

# GCS
curl -sS -m 10 -I "https://${B}.storage.googleapis.com/"
curl -sS -m 10 "https://storage.googleapis.com/${B}/"

# Azure Blob
curl -sS -m 10 -I "https://${B}.blob.core.windows.net/"
curl -sS -m 10 "https://${B}.blob.core.windows.net/?comp=list"
```

**GraphQL introspection POST (§16.2):**

```bash
H="https://target.example/graphql"

curl -sS -m 15 -X POST "$H" \
  -H 'Content-Type: application/json' \
  -d '{
    "operationName":"IntrospectionQuery",
    "query":"query IntrospectionQuery { __schema { types { name kind fields { name type { name kind } } } queryType { name } mutationType { name } subscriptionType { name } } }"
  }' | jq '.data.__schema.types | length'
```

**Read-only secret validators (§23):**

```bash
# Postman PMAK
curl -sS -m 10 -H "X-Api-Key: PMAK-..." https://api.getpostman.com/me | jq .

# AWS (use boto3 instead of curl — pre-signing complexity)
python3 -c "import boto3; print(boto3.client('sts', aws_access_key_id='AKIA...', aws_secret_access_key='...').get_caller_identity())"

# GitHub PAT (note scope header)
curl -sS -m 10 -H "Authorization: token ghp_..." https://api.github.com/user -D "${PRIVATE_CASE_DIR}/h" | jq -r '.login,.email'
grep -i 'X-OAuth-Scopes' "${PRIVATE_CASE_DIR}/h"

# Slack
curl -sS -m 10 -H "Authorization: Bearer xoxb-..." -X POST https://slack.com/api/auth.test | jq .

# Anthropic (read-only validation)
curl -sS -m 10 -H "x-api-key: sk-ant-..." -H "anthropic-version: 2023-06-01" https://api.anthropic.com/v1/models | jq '.data | length'

# OpenAI
curl -sS -m 10 -H "Authorization: Bearer sk-..." https://api.openai.com/v1/models | jq '.data | length'

# npm
curl -sS -m 10 -H "Authorization: Bearer npm_..." https://registry.npmjs.org/-/whoami | jq .

# Atlassian (account)
curl -sS -m 10 -u "email:ATATT3xFfGF0_..." https://your-domain.atlassian.net/rest/api/3/myself | jq .

# DataDog (API-key validator; does not validate the application key)
curl -sS -m 10 -H "DD-API-KEY: ..." https://api.datadoghq.com/api/v1/validate | jq .
```

**Bulk webapp triage (httpx, faster than curl loop):**

```bash
# Install: go install github.com/projectdiscovery/httpx/cmd/httpx@<reviewed-version>
echo "target.example" | httpx -sc -title -tech-detect -web-server -ip -cdn  # Do not follow redirects until each destination is separately approved

# With probe list
cat approved-subdomains.txt | httpx -sc -title -tech-detect -path /actuator/env,/.git/config,/.env -mc 200,301,403
```

**Save responses for evidence:**

```bash
mkdir -p evidence/$(date -u +%Y%m%d)
T="https://target.example"
P="/actuator/env"
TS=$(date -u +%Y%m%dT%H%M%SZ)
SAFE_NAME=$(echo "${T}${P}" | tr '/:' '_')
curl -sS -m 10 "$T$P" -o "evidence/$(date -u +%Y%m%d)/${TS}_${SAFE_NAME}.body" \
  -D "evidence/$(date -u +%Y%m%d)/${TS}_${SAFE_NAME}.headers"
sha256sum "evidence/$(date -u +%Y%m%d)/${TS}_${SAFE_NAME}".* > "evidence/$(date -u +%Y%m%d)/${TS}_${SAFE_NAME}.sha256"
```

---

### 16.14 Email Security Analysis (SPF/DMARC/DKIM/BIMI/MTA-STS/DNSSEC)

Spoof feasibility + SaaS tenant inference from a target's email DNS.

**SPF lookup + parsing:**

```bash
D="target.example"
dig +short TXT "$D" | grep -i 'v=spf1'
```

**Common SPF parsing checklist:**
- `-all` requests an SPF fail for unmatched senders; receivers still apply their own policy and DMARC alignment.
- `~all` requests softfail; it does not guarantee spam-folder delivery.
- `?all` requests neutral; no matching mechanism normally yields neutral. Neither predicts accepted impersonation.
- Includes (`include:`) reveal SaaS tenants:
  - `include:_spf.google.com` → Google Workspace.
  - `include:spf.protection.outlook.com` → Microsoft 365.
  - `include:_spf.salesforce.com` → Salesforce.
  - `include:mail.zendesk.com` → Zendesk customer.
  - `include:sendgrid.net` → SendGrid customer.
  - `include:mailgun.org` → Mailgun customer.
  - `include:_spf.atlassian.net` → Atlassian Cloud.
  - `include:amazonses.com` → AWS SES.
  - `include:mktomail.com` → Marketo.
  - `include:_spf.intuit.com` → Intuit (QuickBooks/Mailchimp).
  - `include:spf.mandrillapp.com` → Mandrill.
  - `include:_spf.workday.com` → Workday.

SPF permits at most ten DNS-lookup terms across recursive evaluation; exactly ten is allowed, and `all`/`ip4`/`ip6` do not consume that budget. Exceeding the limit yields permerror, not automatic accepted spoofing. See [RFC 7208 §4.6.4](https://www.rfc-editor.org/rfc/rfc7208#section-4.6.4). Tools: `spfquery`, `spftools` (online), `dig +trace`.

**DMARC policy + alignment:**

```bash
dig +short TXT "_dmarc.${D}"
```

Parse for:
- `p=` → primary policy (`none`, `quarantine`, `reject`).
- `sp=` → subdomain policy (defaults to `p=`).
- `aspf=` / `adkim=` → alignment mode (`r`=relaxed, `s`=strict).
- `pct=` → percentage of mail to which policy applies.
- `rua=` / `ruf=` → reporting addresses (often reveals SaaS DMARC vendors: dmarcian, valimail, Agari, easydmarc).

**Severity:**
- `p=none` → monitoring policy; evaluate authentication alignment, sender inventory and receiver behavior, without claiming successful impersonation.
- `p=quarantine pct<100` → partial enforcement → LOW.
- `p=reject` + `aspf=s` + `adkim=s` → well-postured → no finding.

**DKIM key discovery:**

DKIM selectors aren't well-known; common patterns:
```bash
for selector in default google selector1 selector2 mail email k1 dkim s1 s2 mta1 mta2 \
                amazonses 20240101 20230101 mailchimp sendgrid mxvault; do
  echo "=== ${selector} ==="
  dig +short TXT "${selector}._domainkey.${D}"
done
```

If a key returns: extract `p=<base64>` and check key length. Evaluate the current applicable DKIM standard and key policy. Missing guesses do not prove absent DKIM; inspect selectors from an approved signed message. Rotation cannot be inferred from one DNS observation.

**BIMI (Brand Indicators for Message Identification):**

```bash
dig +short TXT "default._bimi.${D}"
```

If present + `p=reject` DMARC → brand-impersonation defense in inbox UI. Absence is not a vulnerability by itself.

**MTA-STS (Mail Transfer Agent Strict Transport Security):**

```bash
dig +short TXT "_mta-sts.${D}"
curl -sS -m 10 "https://mta-sts.${D}/.well-known/mta-sts.txt"
```

Absent MTA-STS records alone do not establish exploitable mail transport; consider DANE, sender policy and actual approved transport evidence. If `mode=enforce` present and policy file matches → well-postured.

**TLS-RPT (TLS Reporting):**
```bash
dig +short TXT "_smtp._tls.${D}"
```

**DNSSEC validation:**

```bash
dig +dnssec "${D}" SOA | grep -E 'flags|RRSIG'
delv "${D}" 2>&1 | grep -i 'fully validated\|insecur'
```

If `delv` returns "insecure" → DNSSEC not enabled (LOW finding; doesn't enable spoof but is hardening gap).

**MX → IdP / mail-host inference:**

```bash
dig +short MX "${D}"
```

| MX pattern | IdP / hosting |
|---|---|
| `aspmx.l.google.com`, `*.googlemail.com` | Google Workspace |
| `*.mail.protection.outlook.com` | Microsoft 365 |
| `*.mail.eo.outlook.com` | Microsoft 365 (older) |
| `*.zoho.com` | Zoho Mail |
| `*.yandex.net` | Yandex 360 |
| `*.fastmail.com` | Fastmail |
| `*.proofpoint.com`, `*.pphosted.com` | Proofpoint (M365 user with Proofpoint inbound) |
| `*.mimecast.com`, `*.mimecast-eu.com` | Mimecast |
| `*.barracudanetworks.com` | Barracuda |
| Self-hosted IPs in target ASN | On-prem mail server (often Exchange) |

**DMARC reporting-vendor inference (parse `rua=` / `ruf=`):**

| RUA/RUF host | Vendor | Implication |
|---|---|---|
| `*.dmarcian.com` | dmarcian | DMARC reporting customer |
| `*.valimail.com`, `*.dmarc-rua.com` | Valimail | DMARC reporting customer |
| `*.kdmarc.com` | Kratikal kDMARC | Indian DMARC vendor; common in IN orgs |
| `*.agari.com` | Agari (Fortra) | Email security vendor |
| `*.easydmarc.com` | EasyDMARC | DMARC reporting customer |
| `*.dmarcanalyzer.com` | DMARC Analyzer | Reporting customer |
| `*.postmarkapp.com` | Postmark | DMARC reporting addon |
| `<addr>@<target-domain>` | Self-hosted reporting | Internal mailbox; sometimes leaks team-name (`itg@`, `secops@`, `dmarc@`) |

Capture the vendor + the internal RUA mailbox. A reporting destination is an association, not evidence that compromising it bypasses DMARC. Treat contact details as personal/organizational data; do not contact them automatically.

**Windows / PowerShell parallel for the entire §16.14 audit:**

PS 5.1 `Resolve-DnsName` does **not** accept `-Type CAA` (use PowerShell 7+ or `nslookup -type=CAA <domain>`). Otherwise:

```powershell
$D = "target.example"
"=== SPF ==="; (Resolve-DnsName $D -Type TXT -EA SilentlyContinue | ? { $_.Strings -match 'v=spf1' }).Strings
"=== DMARC ==="; (Resolve-DnsName "_dmarc.$D" -Type TXT -EA SilentlyContinue).Strings
"=== MTA-STS ==="; (Resolve-DnsName "_mta-sts.$D" -Type TXT -EA SilentlyContinue).Strings
"=== TLS-RPT ==="; (Resolve-DnsName "_smtp._tls.$D" -Type TXT -EA SilentlyContinue).Strings
"=== BIMI ==="; (Resolve-DnsName "default._bimi.$D" -Type TXT -EA SilentlyContinue).Strings
"=== MX ==="; Resolve-DnsName $D -Type MX -EA SilentlyContinue | Select NameExchange,Preference
"=== DKIM common selectors ==="
foreach ($s in @("default","google","selector1","selector2","mail","email","k1","dkim","s1","s2","amazonses","mailchimp","sendgrid","mxvault","20240101","zoho","zmail","outlook","o365")) {
  $r = Resolve-DnsName "$s._domainkey.$D" -Type TXT -EA SilentlyContinue
  if ($r) { "${s}: FOUND" }
}
"=== CAA (PS 5.1 fallback) ==="; nslookup -type=CAA $D 2>$null
```

### 16.15 Origin Discovery / CDN Bypass

If the target is behind Cloudflare/Akamai/Fastly/CloudFront, their CDN IPs are well-defined. Find IPs **not** in those ranges that serve the same site = origin.

**Cloudflare IPv4 ranges:**
```
https://www.cloudflare.com/ips-v4
```
**Akamai ASNs:** AS16625, AS20940, AS21342, AS21357.
**Fastly:** AS54113.
**AWS CloudFront:** published in `https://ip-ranges.amazonaws.com/ip-ranges.json` filter `service:CLOUDFRONT`.

**Origin discovery via DNS history:**

```bash
# SecurityTrails (paid)
curl -sS -m 15 -H "APIKEY: ..." \
  "https://api.securitytrails.com/v1/history/${D}/dns/a" | jq '.records[] | {ip:.values[].ip, first_seen, last_seen}'
```

Free alternatives:
```bash
# Validin
curl -sS -m 15 "https://app.validin.com/api/axon/${D}/dns" | jq .

# RiskIQ Community (free tier; auth required)
curl -sS -m 15 -u "user:apikey" "https://api.riskiq.net/pt/v2/dns/passive?query=${D}" | jq .
```

Filter the result: any historical A record IP **not** in current CDN ranges = origin candidate.

**Origin via certificate SAN pivot (Censys):**

```bash
# Censys (free 250 queries/month with key)
censys search "services.tls.certificates.leaf_data.subject.common_name:${D} AND NOT services.tls.certificates.leaf_data.issuer.common_name:'Cloudflare'"
```

Or via crt.sh + manual IP check:
```bash
curl -sS -m 15 "https://crt.sh/?q=%25.${D}&output=json" | jq -r '.[].name_value' | sort -u
```

**Origin via favicon hash (Shodan):**

```bash
# Compute favicon mmh3
python3 -c "
import urllib.request, codecs, mmh3
data = urllib.request.urlopen('https://target.example/favicon.ico').read()
b64 = codecs.encode(data, 'base64')
print(mmh3.hash(b64))"

# Search Shodan
shodan search "http.favicon.hash:<computed-hash>" --fields ip_str,port,org
```

Cross-reference with CDN ranges; non-CDN matches = origin candidates.

**Origin via JARM:**

```bash
# Compute JARM
python3 -c "
import jarm
print(jarm.scan('target.example'))
" 2>/dev/null || echo "Review an exact pyjarm release in an isolated environment first"

# Search Shodan for matching JARM
shodan search "ssl.jarm:<jarm-hash>" --fields ip_str,port
```

**Origin via Host-header probe (validate candidate):**

```bash
CANDIDATE_IP="203.0.113.42"
curl -sS -m 10 --resolve "target.example.com:443:${CANDIDATE_IP}" "https://target.example.com/" -o "${PRIVATE_CASE_DIR}/candidate.html"
diff <(curl -sS -m 10 https://target.example.com/) "${PRIVATE_CASE_DIR}/candidate.html" | head -50
```

Matching content is only a candidate correlation (shared hosting, copies and caches exist). Independently confirm ownership and scope; origin reachability does not prove all CDN controls bypassed.

**Origin via auxiliary subdomains (often skip CDN):**

```bash
for sub in mail smtp ftp sftp cpanel webmail direct origin direct-connect noproxy \
           dev staging stg uat preprod sandbox preview origin-www old-www legacy \
           server srv host1 host2 vps server1; do
  echo "=== ${sub}.${D} ==="
  dig +short A "${sub}.${D}"
done | grep -vE '^(===|$)' | sort -u
```

Cross-reference any returned IP against CDN ranges.

**Historical email-header technique — separate communication approval required:**

Do not send unsolicited messages during reconnaissance. If the owner supplies an approved test message/bounce, its `Received:` headers showing the inbound mail server's actual IP — sometimes co-located with web origin.

**CDN error-page analysis — use existing captures or an approved lab:**

Some historical CDN error pages leaked upstream details. Error-triggering and oversized-header probes require separate load/disruption approval; do not run them as default origin discovery:
```bash
# Trigger CDN-side 5xx (oversized request, malformed Host)
curl -sS -m 10 -H "Host: " "https://target.example/" -o "${PRIVATE_CASE_DIR}/err.html"
curl -sS -m 10 -H "X-Forwarded-For: $(python3 -c 'print("a"*8000)')" "https://target.example/"
grep -iE 'origin|upstream|server|backend|cf-ray' "${PRIVATE_CASE_DIR}/err.html"
```

### 16.16 Vendor Product Fingerprints

Common edge appliances / products on the target's perimeter, with fingerprint paths and notes on common CVEs.

| Product | Fingerprint paths | Notes |
|---|---|---|
| **Citrix Netscaler / Gateway** | `/vpn/index.html`, `/logon/LogonPoint/tmindex.html`, `/citrix/` | Version in HTML; CVE-2023-3519 (RCE), CVE-2019-19781 (path traversal RCE) — both KEV-listed. |
| **F5 BIG-IP TMUI** | `/tmui/login.jsp`, `/mgmt/tm/sys/` | Banner reveals version; CVE-2022-1388 (auth bypass), CVE-2023-46747 — KEV-listed. |
| **Cisco ASA / AnyConnect** | `/+CSCOE+/`, `/CSCOE/index.html`, `/webvpn.html`, `/+CSCOE+/portal.html` | CVE-2020-3452 (file read), CVE-2018-0101 (RCE). |
| **Pulse Secure / Ivanti Connect** | `/dana-na/`, `/dana-na/auth/url_default/welcome.cgi`, `/api/v1/` | CVE-2024-21887 (KEV), CVE-2023-46805 (KEV) — chained command injection. |
| **FortiGate / FortiOS** | `/remote/login`, `/remote/info`, `/api/v2/` | CVE-2022-42475 (RCE, KEV), CVE-2024-21762 (RCE, KEV). |
| **PaloAlto GlobalProtect** | `/global-protect/`, `/global-protect/portal/css/login.css`, `/api/?type=keygen` | CVE-2024-3400 (RCE, KEV), CVE-2019-1579. |
| **VMware Horizon** | `/portal/info.jsp`, `/broker/xml`, `/login.jsp` | log4shell exposure (CVE-2021-44228, KEV). |
| **VMware vCenter** | `/sdk`, `/ui/`, `/vsphere-client/`, `/websso/SAML2/` | CVE-2021-21972 (RCE, KEV), CVE-2021-22005. |
| **VMware ESXi** | `/sdk`, `/ui/`, `/folder` | CVE-2021-21974 (heap overflow → ESXiArgs ransomware, KEV). |
| **Microsoft Exchange OWA** | `/owa/`, `/ews/exchange.asmx`, `/ecp/` | ProxyShell (CVE-2021-34473), ProxyLogon (CVE-2021-26855), ProxyNotShell (CVE-2022-41040) — all KEV. |
| **WatchGuard Firebox** | `/auth/`, `/wgcgi.cgi` | CVE-2022-26318 (CGI). |
| **SonicWall SMA** | `/cgi-bin/welcome`, `/__api__/v1/`, `/diagnostics/` | CVE-2021-20016, CVE-2024-40766 (KEV). |
| **Sophos UTM/XG/XGS** | `/userportal/`, `/webconsole/`, `/cgi-bin/` | CVE-2022-1040 (RCE, KEV). |
| **Check Point R80/R81** | `/sslvpn/portal/`, `/clients/` | CVE-2024-24919 (KEV). |
| **Zoho ManageEngine** | `/RestAPI/Login`, `/api/json/v2/` | Multiple RCE CVEs; check version. |
| **Atlassian Confluence** | `/confluence/`, `/login.action`, `/rest/api/space` | CVE-2022-26134 (OGNL RCE, KEV), CVE-2023-22515 (KEV). |
| **Atlassian Jira** | `/secure/Dashboard.jspa`, `/rest/api/2/serverInfo` | Multiple CVEs; check version. |
| **GitLab self-hosted** | `/users/sign_in`, `/-/oauth/applications`, `/help` | Version in HTML footer; CVE-2021-22205 (RCE, KEV). |
| **Telerik UI** | `/Telerik.Web.UI.WebResource.axd?type=rau` | CVE-2017-9248, CVE-2019-18935 — old but still found. |
| **ConnectWise ScreenConnect** | `/SetupWizard.aspx`, `/Bin/SetupWizard.aspx` | CVE-2024-1709 (auth bypass, KEV). |
| **SolarWinds Orion** | `/Orion/Login.aspx` | CVE-2020-10148 authentication bypass; distinct from the SUNBURST supply-chain incident. |
| **Kaseya VSA** | `/dl.asp`, `/userFilterTableRpt.asp` | CVE-2021-30116 (REvil supply-chain). |
| **Microsoft IIS / OWA misc** | `Server: Microsoft-IIS/<version>` | Old versions = old CVEs; check. |
| **Cisco Smart Install** | port 4786 open | CVE-2018-0171 (smart install client mode RCE). |

**Per-vendor probe pattern:**

```bash
T="https://target.example"
# Citrix
curl -sS -m 10 "$T/vpn/index.html" -o "${PRIVATE_CASE_DIR}/c1" -w '%{http_code}\n'
grep -iE 'NetScaler|Citrix|version' "${PRIVATE_CASE_DIR}/c1"
# F5
curl -sS -m 10 "$T/tmui/login.jsp" -o "${PRIVATE_CASE_DIR}/c2" -w '%{http_code}\n'
grep -iE 'BIG-IP|version' "${PRIVATE_CASE_DIR}/c2"
# (etc — repeat per product)
```

**Auto-fingerprint with Nuclei:**

```bash
nuclei -u "$T" -t http/technologies/ -severity info,low,medium,high,critical
# CVE templates can exploit or alter state: review each exact template and obtain separate authorization.
# No automatic broad CVE-template sweep in reconnaissance.
```

### 16.17 Cloud-Native Service Fingerprints

Modern apps deploy on serverless / managed services. Fingerprint the platform from the URL pattern.

| Provider | URL pattern | Notes |
|---|---|---|
| **AWS Lambda Function URL** | `*.lambda-url.<region>.on.aws` | Direct invocation; check IAM auth posture. |
| **AWS App Runner** | `*.<region>.awsapprunner.com` | Managed container; usually behind auth. |
| **AWS API Gateway** | `*.execute-api.<region>.amazonaws.com` | REST/HTTP/WebSocket; check authorizer config. |
| **AWS CloudFront** | `d{14}\.cloudfront\.net` | Distribution; origin behind it (see §16.15). |
| **AWS ALB / ELB** | `*.elb.<region>.amazonaws.com` | Behind = EC2 / ECS. |
| **AWS Amplify** | `*.amplifyapp.com` | Static + Lambda backend. |
| **Google Cloud Run** | `*.run.app` (and `*.<region>.run.app`) | Container; check public-vs-IAM auth. |
| **Google Cloud Functions** | `*.cloudfunctions.net`, `*.<region>-<project>.cloudfunctions.net` | Serverless. |
| **Google App Engine** | `*.appspot.com` | Older serverless. |
| **Azure Functions** | `*.azurewebsites.net` (also App Service) | Function App behind same domain pattern. |
| **Azure Container Apps** | `*.azurecontainerapps.io` | Containers. |
| **Azure Static Web Apps** | `*.azurestaticapps.net` | Static + Functions. |
| **Vercel** | `*.vercel.app`, `*.now.sh` (legacy) | Frontend + serverless. |
| **Netlify** | `*.netlify.app`, `*.netlify.com` | Frontend + functions. |
| **Cloudflare Workers** | `*.workers.dev` | Edge functions. |
| **Cloudflare Pages** | `*.pages.dev` | Static + functions. |
| **Heroku** | `*.herokuapp.com` | Dynos. |
| **Render** | `*.onrender.com` | Container/static. |
| **Fly.io** | `*.fly.dev` | Edge containers. |
| **Railway** | `*.railway.app` | App platform. |
| **DigitalOcean App Platform** | `*.ondigitalocean.app` | Static + container. |

**For each pattern:**
- Confirm public vs auth-required (HEAD / GET).
- Check CORS posture.
- For Lambda Function URLs / Cloud Run / Cloud Functions: check whether IAM auth is enforced (intentional public invocation is not a finding; unintended sensitive behavior determines severity).
- For static + functions hybrids (Vercel/Netlify/Cloudflare Pages): the function paths are usually `/api/*`; enumerate via JS extraction.

### 16.18 Container & Kubernetes Exposure

Increasingly common; often forgotten when behind a NAT.

| Target | Port | Probe | Severity if exposed |
|---|---|---|---|
| **Docker API (unencrypted)** | 2375 | `curl -sS -m 5 http://${IP}:2375/v1.40/info` | CRITICAL (container/host takeover) |
| **Docker API (TLS)** | 2376 | `curl -sS -m 5 https://${IP}:2376/v1.40/info` | HIGH (cert validation bypass possible) |
| **Kubernetes API server** | 6443 / 8443 | `curl -sS -m 5 https://${IP}:6443/api` | Review actual anonymous permissions; public API discovery can be intentional |
| **Kubernetes Dashboard** | 8001 / 9090 / 30000+ | `curl -sS -m 5 http://${IP}:8001/api/v1/namespaces/kube-system/services/kubernetes-dashboard` | Reachability is an asset observation, not authorization bypass |
| **kubelet** | 10250 (HTTPS), 10255 (HTTP, deprecated) | `curl -sS -m 5 https://${IP}:10250/pods` | CRITICAL (no auth = pod exec) |
| **etcd** | 2379 (client), 2380 (peer) | `curl -sS -m 5 https://${IP}:2379/v2/keys/` (v2) or `etcdctl --endpoints=${IP}:2379 get /` (v3) | CRITICAL (cluster state + secrets) |
| **kube-proxy** | 10256 | `curl -sS -m 10 http://${IP}:10256/healthz` | INFO |
| **kube-controller-manager** | 10257 | `curl -sS -m 10 https://${IP}:10257/metrics` | MEDIUM |
| **kube-scheduler** | 10259 | `curl -sS -m 10 https://${IP}:10259/metrics` | MEDIUM |
| **cAdvisor** | 4194 (deprecated) | `curl -sS -m 10 http://${IP}:4194/metrics` | LOW (resource metrics) |
| **Helm Tiller** (Helm 2 — deprecated but found) | 44134 | `helm --host ${IP}:44134 list` | HIGH (Tiller had cluster-admin) |

**Public container registries to check for leaks:**

| Registry | Search pattern |
|---|---|
| Docker Hub | `https://hub.docker.com/search?q=<target-keyword>&type=image` |
| Quay (Red Hat) | `https://quay.io/search?q=<target-keyword>` |
| GitHub Container Registry (GHCR) | enumerable via GitHub API: `https://api.github.com/orgs/<org>/packages?package_type=container` |
| Amazon ECR Public | `https://gallery.ecr.aws/?searchTerm=<keyword>` |
| Azure Container Registry (public) | varies; check for `*.azurecr.io` |
| Google Container Registry (public) | `https://console.cloud.google.com/gcr/images/<project>?project=<project>` |

**Per-image scan workflow:**
1. `docker pull <registry>/<image>:<tag>` (or `skopeo inspect`).
2. `docker save <image> -o "${PRIVATE_CASE_DIR}/img.tar"`.
3. Extract layers; scan with secret catalog (§17).
4. Inspect `Dockerfile` history (`docker history <image>`) — sometimes reveals build args or COPY of secrets.

### 16.19 CI/CD Platform Exposure

| Platform | Common exposure | Probe |
|---|---|---|
| **Jenkins** | `/script` (Groovy console = RCE if no auth), `/asynchPeople/`, `/jnlpJars/jenkins-cli.jar`, `/computer/`, `/job/<name>/api/json` | `curl -sS -m 10 "${T}/script"` and `curl -sS -m 10 "${T}/asynchPeople/api/json"` |
| **GitLab self-hosted** | `/users/sign_in` (version in HTML), `/-/oauth/applications` (auth-required), `/api/v4/version`, `/-/snippets/<id>/raw` | `curl -sS -m 10 "${T}/api/v4/version"` |
| **GitHub Actions workflow files** | `.github/workflows/*.yml` in any public repo | Search via GitHub code search: `path:.github/workflows extension:yml secrets` |
| **CircleCI config** | `.circleci/config.yml` in any repo | Search: `path:.circleci/config.yml` |
| **TeamCity** | `/login.html`, `/agent.html?agentId=*`, `/admin/admin.html` | `curl -sS -m 10 "${T}/login.html" \| grep -i 'TeamCity'` — version disclosure. CVE-2024-27198 (KEV). |
| **Bamboo (Atlassian)** | `/userlogin.action`, `/rest/api/latest/info` | `curl -sS -m 10 "${T}/rest/api/latest/info"` |
| **Drone CI** | `/api/info`, `/login` | `curl -sS -m 10 "${T}/api/info"` |
| **Travis CI (legacy)** | `.travis.yml` in repos; `https://api.travis-ci.com/repos/<owner>/<repo>` | API often exposes build env. |
| **Argo CD** | `/api/version`, `/applications` | `curl -sS -m 10 "${T}/api/version"`. Check anonymous-auth posture. |
| **Tekton** | `/apis/tekton.dev/v1beta1/pipelineruns` (K8s native) | Enumerate via K8s API. |
| **Spinnaker** | `/gate/info`, `/applications` | `curl -sS -m 10 "${T}/gate/info"` |
| **Buildkite** | per-org dashboards; usually behind auth. | Check public agents page. |

**GitHub Actions secret-leak patterns to look for in workflows:**

```yaml
# Anti-pattern: secret echoed to log
run: echo "${{ secrets.MY_API_KEY }}"

# Anti-pattern: secret in environment without mask
env:
  KEY: ${{ secrets.MY_API_KEY }}
run: ./deploy.sh   # script may echo $KEY

# Anti-pattern: pull_request_target with checkout of fork code (CVE class)
on: pull_request_target
jobs:
  test:
    steps:
      - uses: actions/checkout@v3
        with:
          ref: ${{ github.event.pull_request.head.sha }}   # checks out fork code with secrets in env
```

### 16.20 Documentation / Wiki Leak Paths

Public-share features on collaboration platforms regularly leak.

| Platform | URL pattern | What's exposed |
|---|---|---|
| **Notion (publish page)** | `*.notion.site/<slug>` or `notion.so/<workspace>/<page-id>` | Public page; sometimes whole workspaces published by accident. |
| **Confluence Cloud (anonymous)** | `<target>.atlassian.net/wiki/spaces/` | Public spaces; check `/wiki/display/<SPACE>/`. |
| **Atlassian Service Desk** | `<target>.atlassian.net/servicedesk/customer/portal/<N>` | Sometimes lists all internal request types. |
| **Trello board** | `https://trello.com/b/<id>/<slug>` | Public board with cards; check via Google `site:trello.com "${target}"`. |
| **Asana public project** | `https://app.asana.com/0/<id>/<id>` | Public project view. |
| **ReadTheDocs** | `<project>.readthedocs.io` | Hosted docs; "private builds" sometimes default to public. |
| **GitBook** | `<workspace>.gitbook.io/<book>/` | Published docs; sometimes contain internal SOPs. |
| **MkDocs / Docusaurus on subdomain** | `docs.<target>` | Often contains internal architecture diagrams + setup notes. |
| **Slab** | `<workspace>.slab.com/posts/<id>` | Published posts. |
| **Coda** | `coda.io/d/<doc-id>` | Public docs. |
| **Miro** | `https://miro.com/app/board/<id>/` | Public boards (often architecture diagrams). |
| **Lucidchart** | `https://lucid.app/lucidchart/<id>/view` | Public diagrams. |
| **Figma** | `https://www.figma.com/file/<key>/` | Public design files; sometimes leak product spec. |
| **GitHub Wiki** | `github.com/<org>/<repo>/wiki` | Public wikis; check stale ones. |
| **Linear** | `linear.app/<workspace>/issue/<id>` | Public issues (rare but happens). |
| **Confluence anonymous server** | `<target>/confluence/`, `<target>/wiki/` (self-hosted) | Anonymous read sometimes left on. |
| **Monday.com** | `view.monday.com/<id>` | Shared boards. |
| **Wrike** | `app.wrike.com/external/<id>` | External-shared spaces. |

**Dork-driven discovery:**
```
site:notion.site "{target}"
site:notion.so "{target}"
site:atlassian.net "{target}"
site:trello.com "{target}"
site:miro.com "{target}"
site:lucid.app "{target}"
site:figma.com "{target}"
site:asana.com "{target}"
site:gitbook.io "{target}"
site:readthedocs.io "{target}"
```

### 16.21 WHOIS / RDAP / Historical

WHOIS gives current registrant; RDAP is the structured replacement; historical WHOIS is the pivot gold.

**Current WHOIS:**

```bash
whois target.example                              # standard CLI
curl -sS -m 10 "https://www.whois.com/whois/${D}"  # web fallback
```

**RDAP (RFC 7480, structured JSON):**

```bash
# IANA bootstrap → returns the registry RDAP server
curl -sS -m 15 "https://rdap.org/domain/${D}" | jq .
curl -sS -m 10 "https://data.iana.org/rdap/dns.json" | jq .   # DNS bootstrap JSON
```

What to extract from WHOIS / RDAP:
- Registrant: name, org, email, phone, address (often redacted post-GDPR but not always for non-EU registrants).
- Registrar: enables registrar-account pivot for related domains.
- Created / updated / expiry dates: pattern of bulk registrations = same registrant.
- Nameservers: NS reuse pivot.
- Status flags (`clientHold`, `clientTransferProhibited`, etc.) = posture indicators.
- Abuse contact: useful for responsible disclosure (§30).

**Historical WHOIS:**

Pre-GDPR records often have unredacted contact info. Sources:

| Source | Notes |
|---|---|
| **DomainTools** | Paid; gold-standard; full WHOIS history. |
| **WhoisXML API** | Paid; bulk + history. |
| **SecurityTrails** | Paid; WHOIS + DNS history. |
| **viewdns.info** | Free WHOIS history (limited). |
| **whoisology.com** | Paid; reverse WHOIS by registrant email. |

**Reverse-WHOIS pivots:**

If you have a registrant email, search "every domain registered by this email":
```bash
# DomainTools (paid)
curl -sS -m 15 -H "X-API-Username: ..." -H "X-API-Key: ..." \
  "https://api.domaintools.com/v1/reverse-whois/?terms=admin@target.example"
```

This finds adjacent corporate assets (subsidiary domains, brand variations, employee personal projects on corp email).

### 16.22 DNS Record Catalog (TXT verification tokens, MX→IdP)

For every target domain, dump all common record types:

```bash
D="target.example"
for rtype in A AAAA MX TXT NS SOA CAA SRV CNAME PTR; do
  echo "=== ${rtype} ==="
  dig +short "${D}" "${rtype}"
done
```

**Historical TXT verification-marker catalog** (candidate service association; stale or unrelated records do not prove a current tenancy):

| TXT pattern | SaaS / service | Implication |
|---|---|---|
| `google-site-verification=<token>` | Google Workspace / Search Console / Analytics | Google tenancy. |
| `MS=ms<digits>` | Microsoft 365 (older) | M365 tenancy. |
| `apple-domain-verification=<token>` | Apple Business Manager / iCloud Calendar | Apple ecosystem. |
| `atlassian-domain-verification=<token>` | Atlassian Cloud (Jira/Confluence/etc.) | Atlassian customer. |
| `facebook-domain-verification=<token>` | Facebook Business / Pixel | FB Business. |
| `adobe-idp-site-verification=<token>` | Adobe Sign / Creative Cloud | Adobe customer. |
| `docusign=<token>` | DocuSign | DocuSign customer. |
| `dropbox-domain-verification=<token>` | Dropbox Business | Dropbox customer. |
| `box-verification=<token>` | Box | Box customer. |
| `webexdomainverification.<id>` | Webex | Cisco Webex. |
| `zoom_verify_<id>` | Zoom | Zoom customer (admin domain). |
| `notion=<token>` (rare) | Notion workspace | Notion enterprise. |
| `slack-domain-verification=<token>` | Slack Enterprise Grid | Slack EG. |
| `asana-domain-verification=<token>` | Asana Enterprise | Asana customer. |
| `mongodb-site-verification=<token>` | MongoDB Atlas | DB tenant. |
| `_acme-challenge.<domain>` TXT record name | ACME DNS-01 validation | Candidate challenge record; stale values do not prove an active issuance. |
| `pinterest-site-verification=<token>` | Pinterest Business | Marketing surface. |
| `cisco-ci-domain-verification=<token>` | Cisco Spark / Webex | Cisco. |
| `_globalsign-domain-verification=<token>` | GlobalSign cert authority | Cert provider. |
| `mailru-verification:<token>` | Mail.ru | RU presence. |
| `yandex-verification:<token>` | Yandex services | RU presence. |
| `zscaler-verification-<id>-<date>-<random>` | Zscaler (ZIA / ZPA / ZDX) | **Web SSE / SASE customer**; the date suffix is the verification-issued date. |
| `cloudflare-verify=<token>` | Cloudflare (Zero Trust / Access / WARP) | Cloudflare org-tier customer. |
| `autosect-site-verification=<token>` | AutoSect (security tooling) | Security vendor on tenant. |
| `cisco-site-verification=<token>` | Cisco (various products) | Cisco vendor. |
| `mscid=<token>` | Microsoft (newer M365 verification) | M365 tenancy (newer format). |
| `_amazonses=<token>` | AWS SES sender verification | SES sender. |
| `salesforce-domain-verification=<token>` | Salesforce | SF customer. |
| `workday-domain-verification=<token>` | Workday | Workday customer (HR + Finance). |
| `shopify-domain-verification=<token>` | Shopify | E-commerce customer. |
| `klaviyo-domain-verification=<token>` | Klaviyo | Marketing automation. |
| `mailchimp-domain-verification=<token>` | Mailchimp | Marketing email. |
| `hubspot-domain-verification=<token>` | HubSpot | CRM / marketing. |
| `zendesk-verification=<token>` | Zendesk | Support tenancy (also see §43). |
| `freshworks-verification=<token>` | Freshworks | Support / CRM customer. |
| `intercom-verification=<token>` | Intercom | Messaging tenancy. |
| `loom-site-verification=<token>` | Loom | Video. |
| `miro-site-verification=<token>` | Miro | Whiteboard tenancy. |
| `gitlab-domain-verification=<token>` | GitLab | Self-hosted or cloud verification. |

Corroborate each service association with current organization-controlled evidence before calling it a tenancy or adding it to scope.

**Autodiscover-as-confirmation pattern:**

`autodiscover.<domain>` resolving to Microsoft IP space (`40.96.0.0/13`, `52.96.0.0/14`, `13.107.0.0/16`) is a hosting lead, not proof of M365 Exchange Online tenancy — even when MX records are obscured by Mimecast/Proofpoint/Barracuda inbound filtering. Probe:

```powershell
Resolve-DnsName "autodiscover.$D" -Type A | Select Name,IPAddress
```

If IPs are in Microsoft ranges, corroborate with current tenant metadata and organization-controlled records; do not emit `M365_CONFIRMED` from IP space alone. Use the approved OIDC metadata issuer (§22.1) to corroborate a tenant GUID; getuserrealm routing is a separate signal.

**CAA records:**
```bash
dig +short CAA "${D}"
```
Lists which CAs are allowed to issue certs. Absence is not a vulnerability verdict; CAA restricts issuance policy but does not itself prove or prevent every CA compromise. Presence + restrictive list = good posture.

**SOA serial pattern analysis:**
```bash
dig +short SOA "${D}"
```
An SOA serial is a sequence number. A date-like `YYYYMMDDNN` value may follow an operator convention, but does not prove a last-edit date or common ownership.

### 16.23 Wayback CDX Deep Usage

The Wayback Machine has a structured query API.

**Basic CDX query:**
```bash
D="target.example"
curl -sS -m 15 "https://web.archive.org/cdx/search/cdx?url=${D}/*&output=json&fl=timestamp,original&limit=10000"
```

Returns JSON array of `[timestamp, original_url]` tuples.

**Useful filters:**
- `&from=20200101&to=20231231` — date range.
- `&filter=mimetype:application/json` — only JSON responses (often APIs).
- `&filter=mimetype:application/javascript` — JS bundles.
- `&filter=statuscode:200` — only successful captures.
- `&filter=urlkey:.*api.*` — only URLs containing "api".
- `&collapse=urlkey` — dedup by URL.
- `&collapse=digest` — dedup by content (catches identical pages re-archived).

**Get specific snapshot:**
```bash
TS="20231215120000"
URL="https://target.example/admin/dashboard"
curl -sS -m 15 "https://web.archive.org/web/${TS}/${URL}"
```

**Diff snapshot vs live:**
```bash
LIVE=$(curl -sS -m 10 "${URL}")
ARCHIVED=$(curl -sS -m 10 "https://web.archive.org/web/${TS}/${URL}")
diff <(echo "$LIVE") <(echo "$ARCHIVED") | head -100
```

**Public archive submission requires explicit publication approval:**
```bash
# Do not submit private or token-bearing URLs to an external archiver.
# Verify a currently supported official archive API and approved visibility before submission.
```

**Find every archived JS:**
```bash
curl -sS -m 15 "https://web.archive.org/cdx/search/cdx?url=${D}/*.js&output=json&fl=timestamp,original&filter=statuscode:200" | \
  jq -r '.[1:][] | "\(.[0]) \(.[1])"'
```

For each, fetch the archived JS and run the secret catalog (§17). Old JS often had hard-coded keys later removed.

**Legacy-app pivot (when `*.js` returns empty):**

Static brochure-ware sites (older corporate sites, especially pre-2015) often have **zero archived JS** because the frontend was server-rendered. Pivot to legacy file extensions:

```bash
# ASP / ASP.NET classic
curl -sS -m 15 "https://web.archive.org/cdx/search/cdx?url=${D}/*.asp&output=json&fl=timestamp,original&filter=statuscode:200&collapse=urlkey&limit=500"

# PHP
curl -sS -m 15 "https://web.archive.org/cdx/search/cdx?url=${D}/*.php&output=json&fl=timestamp,original&filter=statuscode:200&collapse=urlkey&limit=500"

# JSP / .NET aspx / CGI / Coldfusion
for ext in aspx jsp cgi cfm; do
  echo "=== .$ext ==="
  curl -sS -m 15 "https://web.archive.org/cdx/search/cdx?url=${D}/*.${ext}&output=json&fl=timestamp,original&filter=statuscode:200&collapse=urlkey&limit=200"
done

# JSON / XML config (sometimes leaks endpoints + creds)
for ext in json xml yml yaml ini conf; do
  echo "=== .$ext ==="
  curl -sS -m 15 "https://web.archive.org/cdx/search/cdx?url=${D}/*.${ext}&output=json&fl=timestamp,original&filter=statuscode:200&collapse=urlkey&limit=100"
done

# Anything indexed (broad sweep — useful for legacy enumeration)
curl -sS -m 15 "https://web.archive.org/cdx/search/cdx?url=${D}/*&output=json&fl=timestamp,original&filter=statuscode:200&collapse=urlkey&limit=10000"
```

Legacy `.asp` / `.cfm` / `.jsp` URLs often reveal: forgotten admin panels, old user-enum endpoints, legacy auth flows, SQL-injection-prone parameters. Cross-reference with current DNS — many legacy hosts now NXDOMAIN but the URL paths sometimes survive on a renamed host.

### 16.24 Common-Prefix Subdomain Sweep (active, low-detectability)

Empirically: **passive cert-transparency enumeration (crt.sh / VirusTotal / Subfinder) can miss hosts; the upstream 20–40% claim is unverified and must not be used as a coverage guarantee** because (a) many internal hosts use wildcard certs that don't expose the FQDN, (b) some hosts have never been issued public certs (HTTP-only or self-signed), (c) very-recently-provisioned hosts haven't propagated to CT log mirrors yet.

**Active prefix probing is optional and requires separate scope confirmation and a finite DNS request budget.** Detectability: low (single A-record query per host; no port scan, no HTTP).

**The high-yield prefix list (ordered by hit-rate from real engagements):**

```
www, mail, webmail, smtp, imap, pop, owa, autodiscover, ftp, sftp,
vpn, sslvpn, gateway, gp, globalprotect, citrix, fortinet, anyconnect,
api, app, apps, mobile, m,
portal, login, sso, idp, iam, identity, accounts, oauth, auth, adfs,
admin, manage, console, dashboard, cp, cpanel,
intranet, internal, hr, payroll, finance, sap, erp, crm, helpdesk, servicedesk,
support, help, kb, status, monitoring, grafana, kibana, prometheus,
docs, wiki, confluence, jira, bitbucket, gitlab, jenkins, sonar, nexus,
git, svn, repo, code,
dev, test, staging, stg, qa, uat, sandbox, preprod, preview, demo,
careers, jobs, vacancies, recruit, eapps,
shop, store, ecommerce, checkout, payments, pay, billing,
old, legacy, archive, backup, beta, v1, v2, classic,
cdn, static, assets, media, img, files, downloads, public,
ns, ns1, ns2, dns, mx, mx1, mx2,
zoom, teams, slack, lync, sip, voice, meet,
eproc, tender, tenders, suppliers, vendor, vendors, procurement, purchase
```

**One-liner (PowerShell):**
```powershell
$D = "target.example"
$prefixes = @("www","mail","webmail","owa","autodiscover","ftp","vpn","sslvpn","gateway","api","app","portal","login","sso","idp","iam","identity","accounts","oauth","auth","adfs","admin","intranet","hr","sap","erp","crm","support","help","status","grafana","kibana","docs","wiki","jira","jenkins","gitlab","dev","test","staging","stg","qa","uat","sandbox","preprod","preview","careers","jobs","eapps","old","legacy","beta","tender","suppliers","procurement")
foreach ($p in $prefixes) {
  $r = Resolve-DnsName "$p.$D" -Type A -ErrorAction SilentlyContinue
  if ($r) {
    $ips = ($r | ? {$_.IPAddress}).IPAddress -join ","
    "$p.$D -> $ips"
  }
}
```

**One-liner (bash + dig):**
```bash
D="target.example"
for p in www mail webmail owa autodiscover ftp vpn sslvpn gateway api app portal login sso idp iam identity accounts oauth auth adfs admin intranet hr sap erp crm support help status grafana kibana docs wiki jira jenkins gitlab dev test staging stg qa uat sandbox preprod preview careers jobs eapps old legacy beta tender suppliers procurement; do
  IP=$(dig +short A "$p.$D" | head -1)
  [ -n "$IP" ] && echo "$p.$D -> $IP"
done
```

**Mass DNS approach (faster for large prefix lists):**
```bash
# Generate candidate FQDNs from a wordlist; resolve in parallel via puredns
puredns resolve <(awk -v d="$D" '{print $1"."d}' assetnote-best-dns-wordlist.txt) -r resolvers.txt
```

**What to extract from each hit:**
- IP / IP block → ASN lookup (§28.1) → association lead; ASN membership does not prove target ownership or testing permission.
- For `vpn.*` / `gateway.*` / `gp.*` / `globalprotect.*` / `citrix.*` → flag for active vendor fingerprint (§16.16) under separate engagement scope.
- For `api.*` / `app.*` → seed for §16.1–16.10 webapp probes.
- For `staging.*` / `dev.*` / `uat.*` → seed for §16.5 always-on HTTP checks (often weaker auth + debug endpoints).
- For `intranet.*` / `eapps.*` / `eproc.*` / similar internal-app shortnames → public-intranet finding (often MEDIUM; per §40).

**Real-engagement validation:** in an internal smoke test, prefix-sweep found `vpn.`, `api.`, `intranet.`, `staging.`, `support.`, `eapps.`, `eproc.`, `autodiscover.` — all of which crt.sh missed (or returned 502 for). Treat passive + active as **complementary, not alternatives**.

---
