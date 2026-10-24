# Severity Decision Matrix

> **AAS adaptation:** Read the authorization gate in [the skill](../SKILL.md) before any target request, credential use, or data collection. These are reference examples, not an instruction to run a sweep. Select only explicitly approved targets and techniques; set request, time, byte and concurrency limits and stop on errors or scope changes. Preserve TLS verification. Treat discoveries, pattern matches and historical provider claims as leads, not verified ownership, permission or severity. Minimize personal data and redact credentials before reports; do not send private evidence to public services. Prices, quotas, API shapes and tool availability require current official documentation. Changes and original source hashes are recorded in [the notice](../UPSTREAM-NOTICE.md).


> Reference content for the `offensive-osint` skill. Originally §40 of the monolithic SKILL.md (refactored 2026-05-02 for size/load efficiency).

## 40. Severity Decision Matrix — Worked Examples

These upstream examples are historical triage prompts, not measured AAS findings. Assess intended exposure, authentication, exact affected version, data sensitivity and demonstrable impact first. No testing has been performed by this document. A port, login page, public function, schema, source map, CORS/header setting, mobile manifest flag, CVE association or breach count alone does not establish a vulnerability or its severity.

In the table, severity labels are possible impact ceilings if the described harmful capability is actually demonstrated on an approved fixture; they are not default severities for discovery. Rows corrected to “Review lead” require evidence before severity can be assigned.

| Finding | Severity | Why |
|---|---|---|
| `/.git/config` reachable on prod webapp | Review lead | Confirm intended access, affected version/configuration and actual impact; discovery alone is insufficient. |
| `/.env` reachable on prod webapp | Review lead | Confirm intended access, affected version/configuration and actual impact; discovery alone is insufficient. |
| Open Firebase RTDB returning data | Review lead | Confirm intended access, affected version/configuration and actual impact; discovery alone is insufficient. |
| Listable S3 bucket containing PII | **CRITICAL** | Direct data exfil. |
| Listable S3 bucket containing logs only | HIGH | Internal hostnames + paths in logs; pivot data. |
| Spring Boot `/actuator/env` reachable | Review lead | Values may be masked; confirm minimum approved unintended sensitive disclosure. |
| Spring Boot `/actuator/heapdump` reachable | Review lead | Potential memory disclosure; do not download without explicit sensitive-data and byte-budget approval. |
| Open Elasticsearch (`/_cat/indices` returns) | Review lead | Confirm intended access, affected version/configuration and actual impact; discovery alone is insufficient. |
| Open MongoDB (no auth) | Review lead | Confirm intended access, affected version/configuration and actual impact; discovery alone is insufficient. |
| Open Redis (no AUTH) | Review lead | Confirm intended access, affected version/configuration and actual impact; discovery alone is insufficient. |
| Open Docker API (port 2375) | Review lead | Confirm intended access, affected version/configuration and actual impact; discovery alone is insufficient. |
| Public PMAK accepted by identity endpoint | Review lead | Identity acceptance does not establish access to all workspaces or collections. |
| Public AWS root access key validated live | **CRITICAL** | Full account compromise. |
| Live AWS IAM-user key found on GitHub | HIGH | Limited scope (depends on IAM policy); often elevatable. |
| Live GitHub PAT found in JS bundle | HIGH | Repo write access (depends on scope). |
| Live Slack token in pastebin | HIGH | Workspace data + history; sometimes channel post. |
| Sourcemap (`.js.map`) accessible on prod | Review lead | Confirm intended access, affected version/configuration and actual impact; discovery alone is insufficient. |
| Open GraphQL introspection on prod | Review lead | Confirm intended access, affected version/configuration and actual impact; discovery alone is insufficient. |
| Subdomain takeover possible (Heroku / GitHub Pages / etc.) | HIGH | Takeover → phishing on trusted domain. |
| Reflected CORS with credentials on `/api/billing` | Review lead | Confirm browser-readable unintended sensitive data under an owned approved origin; CORS and CSRF are distinct controls. |
| Verb tampering: DELETE allowed on documented-GET-only endpoint | Review lead | Confirm intended access, affected version/configuration and actual impact; discovery alone is insufficient. |
| `phpinfo.php` reachable on prod | HIGH | Discloses paths, env vars, modules → vuln-version pivot. |
| Tomcat `/manager/html` reachable | Review lead | Confirm intended access, affected version/configuration and actual impact; discovery alone is insufficient. |
| Jenkins script console accessible | HIGH | Groovy script execution = RCE. |
| Missing HSTS on `/login` | Review lead | Confirm intended access, affected version/configuration and actual impact; discovery alone is insufficient. |
| Missing HSTS on standard pages | Review lead | Confirm intended access, affected version/configuration and actual impact; discovery alone is insufficient. |
| Missing CSP | Review lead | Confirm intended access, affected version/configuration and actual impact; discovery alone is insufficient. |
| Internal IP / K8s service DNS in JS | MEDIUM | Internal topology disclosure. |
| Apache `/server-status` reachable | MEDIUM | Live request visibility. |
| `android:debuggable=true` on prod app | Review lead | Confirm intended access, affected version/configuration and actual impact; discovery alone is insufficient. |
| `android:allowBackup=true` (no whitelist) | Review lead | Confirm intended access, affected version/configuration and actual impact; discovery alone is insufficient. |
| `android:usesCleartextTraffic=true` | Review lead | Confirm intended access, affected version/configuration and actual impact; discovery alone is insufficient. |
| Sensitive deep-link handler (`myapp://reset-password`) | Review lead | Confirm intended access, affected version/configuration and actual impact; discovery alone is insufficient. |
| Exported Android component without permission | Review lead | Confirm intended access, affected version/configuration and actual impact; discovery alone is insufficient. |
| Slack webhook URL leaked | MEDIUM | Send to channel; can be used for social-eng. |
| Twilio Account SID leaked (no auth token) | Review lead | Confirm intended access, affected version/configuration and actual impact; discovery alone is insufficient. |
| Wildcard CORS on data-returning API | Review lead | Confirm intended access, affected version/configuration and actual impact; discovery alone is insufficient. |
| Missing `X-Frame-Options` | Review lead | Check effective CSP frame-ancestors and an actual sensitive framing impact. |
| `.DS_Store` exposed | Review lead | May reveal names from the represented directory; not a full machine directory listing. |
| Stripe **test** key leaked | Review lead | Assess test-data exposure and allowed actions; test mode does not make credentials harmless. |
| Firebase URL exposed (no open RTDB) | LOW | Project-ID disclosure only. |
| Cert pinning missing in mobile app | Review lead | Confirm intended access, affected version/configuration and actual impact; discovery alone is insufficient. |
| Outdated WordPress install detected | LOW | Pending CVE confirmation. |
| Missing `Referrer-Policy` / `Permissions-Policy` | INFO | Hardening, not an exposure. |
| `/.well-known/security.txt` discovered | INFO | Useful contact info only. |
| Domain in breach with 0 named accounts | INFO | Contextual only. |
| Private bucket exists (HEAD 403) | INFO | Asset only, no finding. |
| Open kubelet on 10250 | Review lead | Confirm intended access, affected version/configuration and actual impact; discovery alone is insufficient. |
| Open etcd on 2379 | Review lead | Confirm intended access, affected version/configuration and actual impact; discovery alone is insufficient. |
| K8s API on 6443 with anonymous-auth | Review lead | Confirm intended access, affected version/configuration and actual impact; discovery alone is insufficient. |
| K8s dashboard exposed without auth | Review lead | Confirm intended access, affected version/configuration and actual impact; discovery alone is insufficient. |
| Helm Tiller (Helm 2) on 44134 | Review lead | Confirm configured service-account permissions; port reachability does not establish cluster-admin. |
| Citrix Netscaler with KEV CVE | Review lead | Confirm intended access, affected version/configuration and actual impact; discovery alone is insufficient. |
| F5 BIG-IP TMUI accessible | Review lead | Confirm intended access, affected version/configuration and actual impact; discovery alone is insufficient. |
| Pulse Secure with CVE-2024-21887 | Review lead | Confirm intended access, affected version/configuration and actual impact; discovery alone is insufficient. |
| FortiGate with CVE-2024-21762 | Review lead | Confirm intended access, affected version/configuration and actual impact; discovery alone is insufficient. |
| PaloAlto GlobalProtect with CVE-2024-3400 | Review lead | Confirm intended access, affected version/configuration and actual impact; discovery alone is insufficient. |
| VMware vCenter with CVE-2021-21972 | Review lead | Confirm intended access, affected version/configuration and actual impact; discovery alone is insufficient. |
| VMware ESXi exposed without VPN | Review lead | Confirm intended access, affected version/configuration and actual impact; discovery alone is insufficient. |
| MS Exchange with ProxyShell/Logon/NotShell unpatched | Review lead | Confirm intended access, affected version/configuration and actual impact; discovery alone is insufficient. |
| AWS Lambda Function URL accessible anonymously | Review lead | Confirm intended access, affected version/configuration and actual impact; discovery alone is insufficient. |
| Public Cloud Run / Cloud Function unauthenticated | Review lead | Confirm intended access, affected version/configuration and actual impact; discovery alone is insufficient. |
| Public Docker registry (anonymous catalog) | Review lead | Catalogs may be intentionally public; sensitive layer access requires separate bounded acquisition approval. |
| GitHub Actions secrets echoed in workflow logs | HIGH | Secret-in-log = full secret disclosure. |
| GitHub Actions `pull_request_target` checkout of fork code | Review lead | Check whether untrusted code actually executes with privileged credentials and effective workflow permissions. |
| GitLab self-hosted with CVE-2021-22205 | Review lead | Confirm intended access, affected version/configuration and actual impact; discovery alone is insufficient. |
| Jenkins with `pull_request_target`-equivalent misconfig | HIGH | Build secrets accessible to PRs. |
| Public Notion page with internal SOPs | MEDIUM | Operational intel; sometimes credentials. |
| Public Trello board with credentials in cards | HIGH | Often plaintext API keys. |
| Public Confluence space with onboarding docs | MEDIUM | Seed creds + tech-stack reveal. |
| Public Miro board with architecture diagrams | LOW | Internal-host disclosure. |
| DMARC policy `p=none` on production sending domain | Review lead | Confirm intended access, affected version/configuration and actual impact; discovery alone is insufficient. |
| SPF `~all` (softfail) without strict DMARC | Review lead | Confirm intended access, affected version/configuration and actual impact; discovery alone is insufficient. |
| MX server allows open relay (test with 250 OK to RCPT TO foreign domain) | Review lead | Confirm intended access, affected version/configuration and actual impact; discovery alone is insufficient. |
| Live Anthropic / OpenAI API key with broad scope | Context-dependent | Owner-confirmed spending/data permissions; model access alone does not expose past responses. |
| Live npm token with `publish` scope | **CRITICAL** | Potential supply-chain impact depends on package selection, token permissions, publishing controls and actual exposure. |
| Live PyPI / Docker Hub / GHCR token with publish scope | **CRITICAL** | Supply-chain compromise. |
| Atlassian token with admin scope | HIGH | Workspace-wide read; sometimes write. |
| Subdomain takeover candidate confirmed | HIGH | Trusted-domain phishing surface. |
| Sensitive CI/CD wordlist hits (Jenkinsfile, .gitlab-ci.yml on public repo) | MEDIUM | Build-script intel; often references secret names. |
| Public Postman workspace with internal API endpoints | MEDIUM | API attack surface mapped. |
| WAF/CDN trivially bypassable (origin discoverable via §16.15) | Review lead | Confirm intended access, affected version/configuration and actual impact; discovery alone is insufficient. |
| TLS 1.0/1.1 supported on prod | Review lead | Confirm intended access, affected version/configuration and actual impact; discovery alone is insufficient. |
| RC4 / 3DES cipher accepted | Review lead | Confirm intended access, affected version/configuration and actual impact; discovery alone is insufficient. |
| Cert about to expire (<30 days) | LOW | Operational risk; not exploitable. |
| Self-signed cert on prod | Review lead | Confirm intended access, affected version/configuration and actual impact; discovery alone is insufficient. |
| Heartbleed (CVE-2014-0160) detected | **CRITICAL** | Memory disclosure including session tokens + keys. |
| Public Slack invite link discoverable | Review lead | Confirm intended access, affected version/configuration and actual impact; discovery alone is insufficient. |
| Public procurement portal plus historical vendor breach matches | Review lead | Historical associations do not establish current account control, impersonation or a transaction failure. |
| Job-application / careers portal collects PII over plain HTTP (no TLS) | **HIGH** | Cleartext PII at scale; regulatory exposure under GDPR / CCPA / India DPDP Act / LGPD. |
| Decommissioned legacy mail (NXDOMAIN today) + breach corpus has historical employee URLs against it + cloud SSO migration confirmed via autodiscover IPs | Review lead | Confirm intended access, affected version/configuration and actual impact; discovery alone is insufficient. |
| Public-facing intranet (`intranet.<domain>` resolves and returns content without VPN) | Review lead | Confirm intended access, affected version/configuration and actual impact; discovery alone is insufficient. |
| Staging / preprod / UAT / sandbox subdomain publicly resolvable | Review lead | Confirm intended access, affected version/configuration and actual impact; discovery alone is insufficient. |
| `vpn.<domain>` resolves but vendor + version unknown | INFO | Asset lead only; a fingerprint/CVE association needs exact affected-version and prerequisite corroboration. |
| DMARC RUA points to a third-party reporting vendor (kdmarc / dmarcian / Valimail / Agari / EasyDMARC) | Review lead | Confirm intended access, affected version/configuration and actual impact; discovery alone is insufficient. |

---
