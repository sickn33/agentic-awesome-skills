# AI-Assisted OSINT, Archiving, Automation, Sidecar, Helpers

> **AAS adaptation:** Read the authorization gate in [the skill](../SKILL.md) before any target request, credential use, or data collection. These are reference examples, not an instruction to run a sweep. Select only explicitly approved targets and techniques; set request, time, byte and concurrency limits and stop on errors or scope changes. Preserve TLS verification. Treat discoveries, pattern matches and historical provider claims as leads, not verified ownership, permission or severity. Minimize personal data and redact credentials before reports; do not send private evidence to public services. Prices, quotas, API shapes and tool availability require current official documentation. Changes and original source hashes are recorded in [the notice](../UPSTREAM-NOTICE.md).


> Reference content for the `offensive-osint` skill. Originally §33 + §34 + §35 + §36 + §48 of the monolithic SKILL.md (refactored 2026-05-02 for size/load efficiency).

## 33. AI-Assisted OSINT

> **Warning:** Never paste PII, sensitive IOCs, or unique pivots into cloud LLMs. Retention, access and training settings depend on product/contract; verify the approved processing environment instead of assuming confidentiality. Use an approved local processing environment for sensitive analysis; verify telemetry, external tools and storage behavior rather than assuming every local-model application is private.

| Tool | Strength |
|------|---------|
| [ChatGPT](https://chat.openai.com/) (paid) | Log parsing, dataset analysis, Code Interpreter for CSV/JSON, Vision OCR. |
| [Claude](https://claude.ai/) (paid) | 200K-token context for large doc dumps + report synthesis. |
| [Gemini](https://gemini.google.com/) | Long-context; Deep Research mode with citations. |
| [Perplexity Pro](https://www.perplexity.ai/) (paid) | Real-time web search + reasoning. |

**Local / privacy-preserving:** [Ollama](https://ollama.com/), [LM Studio](https://lmstudio.ai/), [GPT4All](https://gpt4all.io/).

### 33.1 Commercial AI OSINT Platforms

- [Cylect](https://www.cylect.io/) — entity extraction + link analysis.
- [Fivecast Matrix](https://www.fivecast.com/products/matrix/) — generative-AI triage for social-media datasets.
- [Recorded Future](https://www.recordedfuture.com/) — AI-driven threat intel.
- [DarkOwl Vision](https://www.darkowl.com/) — darknet data analysis.

### 33.2 Deepfake & Synthetic Media Detection

- [Sensity AI](https://sensity.ai/), [Reality Defender](https://realitydefender.com/), [Adobe Content Credentials Verify](https://contentcredentials.org/verify), [CarNet](https://carnet.ai/).

---

## 34. Archiving & Evidence Preservation

- [archive.today](https://archive.today/) — one-page archiver + screenshot.
- [URLScan.io](https://urlscan.io/) — webpage scan + resource map.
- [ArchiveBox](https://archivebox.io/) — self-hosted (HTML, PDF, screenshots, media).
- [Hunchly](https://www.hunch.ly/) — investigator evidence capture (paid).
- Wayback SavePageNow API v3 — on-demand archiving with job IDs.
- [SingleFileZ](https://github.com/gildas-lormeau/SingleFileZ) — browser ext for offline HTML.
- [Kasm Workspaces](https://kasmweb.com/) — containerized OSINT browser isolation.

Never submit private, token-bearing or otherwise sensitive evidence to public archivers/scanners. A new archive or scan submission can publish a URL and trigger target requests; it requires separate data-sharing and publication authorization.

**Evidence handling:** URL + UTC timestamp + PNG + WARC/SingleFileZ archive, SHA-256 hash all downloads, separate work profiles per case, store evidence read-only, JSONL run logs with `run_id` + tool versions.

---

## 35. Automation & Workflows

- [n8n](https://n8n.io/) — self-hosted workflow automation (RSS → scrape → alert pipelines).
- [Huginn](https://github.com/huginn/huginn) — agent-based monitoring/scraping/alerting.
- [Playwright](https://playwright.dev/) — headless browser automation without bypassing access controls or platform limits.
- [Browsertrix Crawler](https://github.com/webrecorder/browsertrix-crawler) — archival crawling with WARC export.
- [Prefect](https://www.prefect.io/) / [Apache Airflow](https://airflow.apache.org/) — workflow orchestration.

---

## 36. Cross-Module Sidecar Coordination

When you run a multi-module recon, late-arriving outputs need to feed into already-running modules. The pattern:

1. Each module writes a sidecar JSON to a known location when it finishes:
   - `<scan>/mobile_endpoints.json` — endpoints + hostnames extracted from APK static analysis.
   - `<scan>/secrets_sidecar.json` — hostnames + endpoints + Firebase project IDs from secrets-beyond-github sweep.
   - `<scan>/sso_tenants.json` — discovered IdP tenants for breach correlation.
2. Downstream modules validate sidecar schema, size and source before ingestion; treat every value as untrusted data. Reject out-of-scope hosts, local/metadata addresses and unexpected schemes before a separately approved request; never execute discovered commands or automatically expand scope.
3. Cross-feed: API discovery consumes both `mobile_endpoints.json` and `secrets_sidecar.json`; SSO×breach correlation consumes `sso_tenants.json` and the breach DB.

**Sidecar shape (mobile_endpoints.json example):**
```json
{
  "endpoints": [
    {"method": "GET", "url": "https://api.acme.com/v1/users", "source": "apk:com.acme.android"},
    {"method": "POST", "url": "https://api.acme.com/v1/login", "source": "apk:com.acme.android"}
  ],
  "hostnames": ["api.acme.com", "cdn.acme.com"],
  "firebase_project_ids": ["acme-prod-12345"]
}
```

When you implement an ad-hoc multi-tool recon (no platform), use a `tmpdir + JSON sidecars + a one-line manifest` pattern. Composable, debuggable, replay-able.

---


## 48. Runnable Helper — `secret_scan.py`

Drop-in Python helper that mirrors the 29-pattern catalog from §17. The inline example covers only the original 29 patterns, not all 48. Save and review it locally before use on an approved inert snapshot. It reports candidates, never credential liveness; no network calls. It rejects links and unsupported guarded file opens, limits files/bytes and exits nonzero on incomplete input.

```python
#!/usr/bin/env python3
"""Stdlib-only secret scanner. Mirrors the 29-pattern catalog.

Usage:
  echo "<synthetic-secret-fixture>" | python3 secret_scan.py
  python3 secret_scan.py file1.txt file2.js dir/

Output: one JSON object per line: {pattern, severity, category, match, source, line}; matches are redacted and priorities are unverified.
"""
import json
import os
import re
import sys
import stat

MAX_BYTES = 1024 * 1024
MAX_FILES = 1000
MAX_TOTAL = 16 * 1024 * 1024

SEV_CRITICAL = "critical"
SEV_HIGH = "high"
SEV_MEDIUM = "medium"
SEV_LOW = "low"

PATTERNS = [
    ("AWS_ACCESS_KEY",       SEV_CRITICAL, "aws",         r"\b(AKIA|ASIA)[0-9A-Z]{16}\b"),
    ("AWS_SECRET_TYPED",     SEV_CRITICAL, "aws",         r"(?i)aws[_\-]?secret[_\-]?access[_\-]?key['\"\s:=]+([A-Za-z0-9/+=]{40})"),
    ("AWS_SECRET_LOOSE",     SEV_HIGH,     "aws",         r"(?i)aws(.{0,20})?(secret|sk)[\"'=: ]+([0-9a-z/+=]{40})"),
    ("GCP_SERVICE_ACCOUNT",  SEV_CRITICAL, "gcp",         r'"type"\s*:\s*"service_account"'),
    ("GOOGLE_API_KEY",       SEV_HIGH,     "gcp",         r"\bAIza[0-9A-Za-z_\-]{35}\b"),
    ("GH_PAT_CLASSIC",       SEV_CRITICAL, "github",      r"\bghp_[A-Za-z0-9]{36}\b"),
    ("GH_PAT_FINEGRAINED",   SEV_CRITICAL, "github",      r"\bgithub_pat_[A-Za-z0-9_]{82}\b"),
    ("GH_OAUTH",             SEV_HIGH,     "github",      r"\bgho_[A-Za-z0-9]{36}\b"),
    ("GH_S2S",               SEV_HIGH,     "github",      r"\bgh[usr]_[A-Za-z0-9]{36,}\b"),
    ("STRIPE_LIVE",          SEV_CRITICAL, "stripe",      r"\bsk_live_[0-9A-Za-z]{24,}\b"),
    ("STRIPE_TEST",          SEV_LOW,      "stripe",      r"\bsk_test_[0-9A-Za-z]{24,}\b"),
    ("SLACK_TOKEN",          SEV_HIGH,     "slack",       r"\bxox[abpors]-[0-9A-Za-z\-]{10,48}\b"),
    ("SLACK_WEBHOOK",        SEV_MEDIUM,   "slack",       r"https://hooks\.slack\.com/services/T[A-Z0-9]+/B[A-Z0-9]+/[A-Za-z0-9]+"),
    ("SENDGRID",             SEV_HIGH,     "email_svc",   r"\bSG\.[A-Za-z0-9_\-]{22}\.[A-Za-z0-9_\-]{43}\b"),
    ("MAILGUN_V1",           SEV_HIGH,     "email_svc",   r"\bkey-[0-9a-zA-Z]{32}\b"),
    ("MAILGUN_LOOSE",        SEV_HIGH,     "email_svc",   r"\bkey-[0-9a-f]{32}\b"),
    ("TWILIO_API",           SEV_HIGH,     "twilio",      r"\bSK[0-9a-fA-F]{32}\b"),
    ("TWILIO_SID",           SEV_MEDIUM,   "twilio",      r"\bAC[a-f0-9]{32}\b"),
    ("TWILIO_AUTH",          SEV_HIGH,     "twilio",      r"(?i)twilio(.{0,20})?(auth|token)[\"'=: ]+([a-f0-9]{32})"),
    ("HEROKU_API",           SEV_MEDIUM,   "paas",        r"(?i)heroku(.{0,20})?api[\"'=: ]+([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})"),
    ("FIREBASE_URL",         SEV_LOW,      "firebase",    r"\bhttps?://[a-z0-9\-]+\.firebaseio\.com\b"),
    ("JWT",                  SEV_MEDIUM,   "jwt",         r"\beyJ[A-Za-z0-9_\-]{10,}\.eyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\b"),
    ("BEARER_AUTH",          SEV_MEDIUM,   "bearer",      r"(?i)authorization[\"'=: ]+bearer\s+[A-Za-z0-9._\-]{20,}"),
    ("BASIC_AUTH_URL",       SEV_MEDIUM,   "basic_auth",  r"https?://[^/\s:@]+:[^/\s:@]+@[^/\s]+"),
    ("RSA_PRIVKEY",          SEV_CRITICAL, "private_key", r"-----BEGIN RSA PRIVATE KEY-----"),
    ("EC_PRIVKEY",           SEV_CRITICAL, "private_key", r"-----BEGIN EC PRIVATE KEY-----"),
    ("OPENSSH_PRIVKEY",      SEV_CRITICAL, "private_key", r"-----BEGIN OPENSSH PRIVATE KEY-----"),
    ("GENERIC_PRIVKEY",      SEV_CRITICAL, "private_key", r"-----BEGIN (DSA |PGP |)PRIVATE KEY-----"),
    ("GENERIC_API_KEY",      SEV_MEDIUM,   "generic",     r"(?i)(?:api[_\-]?key|apikey|api_secret|access_token|secret[_\-]?token)['\"\s:=]+[\"']([A-Za-z0-9+/=_\-]{24,})[\"']"),
]

COMPILED = [(n, s, c, re.compile(p)) for (n, s, c, p) in PATTERNS]

def scan_text(text: str, source: str = "<stdin>"):
    for line_no, line in enumerate(text.splitlines(), start=1):
        for name, sev, cat, rx in COMPILED:
            for m in rx.finditer(line):
                yield {
                    "pattern": name,
                    "severity": sev,
                    "category": cat,
                    "match": "[REDACTED]",   # truncation still leaks short credentials
                    "source": "<approved-input>",  # avoid private paths/URL credentials in logs
                    "line": line_no,
                }

def read_file(path):
    if not getattr(os, "O_NOFOLLOW", 0):
        raise OSError("guarded file reads unsupported")
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | getattr(os, "O_NONBLOCK", 0))
    try:
        st = os.fstat(fd)
        if not stat.S_ISREG(st.st_mode) or st.st_size > MAX_BYTES:
            raise OSError("nonregular or oversized input")
        with os.fdopen(fd, "rb", closefd=False) as fh:
            data = fh.read(MAX_BYTES + 1)
        if len(data) > MAX_BYTES:
            raise OSError("input grew beyond limit")
        return data
    finally:
        os.close(fd)

def main():
    count = total = 0
    try:
        paths = []
        for arg in sys.argv[1:]:
            if os.path.islink(arg):
                raise OSError("linked input rejected")
            if os.path.isdir(arg):
                def walk_error(error):
                    raise error
                for parent, dirs, files in os.walk(arg, followlinks=False, onerror=walk_error):
                    if any(os.path.islink(os.path.join(parent, d)) for d in dirs):
                        raise OSError("linked directory rejected")
                    for name in files:
                        paths.append(os.path.join(parent, name))
                        if len(paths) > MAX_FILES:
                            raise OSError("file budget exceeded")
            else:
                paths.append(arg)
            if len(paths) > MAX_FILES:
                raise OSError("file budget exceeded")
        inputs = paths or [None]
        for path in inputs:
            data = read_file(path) if path is not None else sys.stdin.buffer.read(MAX_BYTES + 1)
            count += 1
            total += len(data)
            if len(data) > MAX_BYTES or total > MAX_TOTAL:
                raise OSError("byte budget exceeded")
            text = data.decode("utf-8")
            for hit in scan_text(text):
                print(json.dumps(hit))
    except (OSError, UnicodeError):
        print("incomplete: unreadable, unsupported or over-budget input", file=sys.stderr)
        return 2
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
```

Save as `secret_scan.py`, then:
```bash
python3 secret_scan.py path/to/repo/        # scan a directory tree
python3 secret_scan.py file1 file2 file3    # scan specific files
cat my.log | python3 secret_scan.py         # pipe stdin
```

Output is JSONL — one finding per line — drops cleanly into `jq` for filtering or directly into a finding store.

---

## 49. Runnable Helper — `h1_reference.py`

HackerOne Hacktivity reference agent. Queries HackerOne's **public** GraphQL API for
disclosed reports during recon — no API key required (max 50 results/page). Use it to
surface validated techniques and business-impact framing for the target's tech stack
before you hunt. Pure stdlib.

```bash
# Best-validated techniques to start from
python3 <reviewed-upstream-dir>/h1_reference.py --top-voted --limit 25

# Highest-bounty reports (signal for impact framing)
python3 <reviewed-upstream-dir>/h1_reference.py --top-bounty --limit 25

# Scope to a class / CWE / program
python3 <reviewed-upstream-dir>/h1_reference.py --query "idor" --severity high critical
python3 <reviewed-upstream-dir>/h1_reference.py --cwe "CWE-918" --program <handle>
python3 <reviewed-upstream-dir>/h1_reference.py --lookup-program <handle>
```

Neither this helper nor `docs/disclosed-reports/` is bundled in AAS. The following is an upstream external-tool description, not a runnable installed command. After separately reviewing the pinned upstream helper, it can pair with upstream disclosed-report libraries: `h1_reference.py`
pulls live disclosed reports; the pattern libraries are the curated per-class digests.

## 50. Runnable Helper — `dashboard.py`

External upstream localhost console (not bundled or security-tested by AAS) that wraps `secret_scan.py` and
`h1_reference.py` behind a stdlib web UI. Binds to `127.0.0.1` by default — the scan
surface can read arbitrary local files you point it at, and a loopback binding is not a sandbox or proof against local/browser-origin access. Review origin checks, authentication, path boundaries and privacy before running it; never expose it externally.

```bash
python3 <reviewed-upstream-dir>/dashboard.py                 # http://127.0.0.1:8765
python3 <reviewed-upstream-dir>/dashboard.py --port 9000     # custom port
```

Use it for a fast visual pass — paste a blob or point at a path to aggregate secrets by
severity/category, and browse disclosed-report references — without leaving the box.

---
