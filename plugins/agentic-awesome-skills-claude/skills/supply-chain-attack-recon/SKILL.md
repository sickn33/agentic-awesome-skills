---
name: supply-chain-attack-recon
description: Authorized read-only review of public software supply-chain exposure
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
sources: alex-birsan-dependency-confusion, supply-chain-research, github-actions-security,
  cisa-advisories, mandiant-tag, github-security-blog, snyk-research
report_count: 12
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

## When to use

Trigger when:
- Target has a public GitHub organization (find via OSINT)
- JS bundles reference internal-looking package names (`@target-internal/...`, `target-utils`, `target-shared`)
- Build logs, SBOMs, or `package-lock.json` files are publicly accessible
- Target uses CI/CD that's partially public (GitHub Actions, GitLab CI, Bitrise)
- Docker images on Docker Hub/GHCR/Quay belong to target org
- Findings include `npmrc`/`pip.conf`/`gradle.properties` with internal registry URLs
- `.github/workflows/*.yml` files reference internal tooling

Do NOT use for:
- Internal-network artifact registries (out of scope per external boundary)
- Actually publishing typosquats / dep-confusion packages without explicit OK
- Compromising upstream open-source projects (massive blast radius — illegal in most jurisdictions without authorization)

---

## The supply-chain attack surface map

```
Target Org
├── Public GitHub Org → workflow files → secrets exfil opportunities
├── Internal package names in JS/Android bundles → dependency confusion
├── Docker images on public registries → secrets in layers, RCE on pull
├── SBOM / artifact metadata → exact dep versions for known-vuln chaining
├── npmrc / pip.conf in repos → internal registry URL disclosure
├── External package dependencies → typosquat name candidates
└── Build/release pipelines → injection if pull_request_target etc.
```

---

## Evidence and scope

Default to static review of supplied repositories/artifacts. Public availability is not authorization to test credentials, trigger workflows, publish packages or contact employees. Use a bounded owner-approved inventory, preserve source revision/digest and separate candidate exposure from demonstrated impact. Redact discovered secrets and coordinate rotation through the owner; do not test their validity or include them in reports. Treat repositories, logs, SBOMs and packages as inert untrusted data. Do not install/run suspected packages or container entrypoints.

## Step 1 — GitHub org discovery

```bash
TARGET="<brand>"  # set to target brand name

# Direct guesses
for guess in $TARGET "${TARGET}-tech" "${TARGET}corp" "${TARGET}-io" "${TARGET}-eng"; do
  curl -sI "https://github.com/$guess" | grep -E "HTTP|status" | head -1
done

# Via WHOIS / email-domain → GitHub search
# Use GitHub organization search in the web UI; verify ownership from an official link.
# The gh search users subcommand shown in the original import is not a standard gh command.

# Via employees → reverse from social media + GitHub profile
# Many employees list their employer org on their GitHub profile
```

---

## Step 2 — Enumerate public repos for sensitive artifacts

```bash
ORG="targetorg"

# List public repos
gh repo list "$ORG" --limit 100 --json name,description,visibility,defaultBranchRef

# Look for high-signal repo names
gh repo list "$ORG" --limit 100 --json name | jq -r '.[].name' | grep -iE "internal|infra|deploy|config|secret|setup|sdk|api"

# Clone all (small org) or selectively
gh repo clone "$ORG/$repo_name"
```

---

## Step 3 — Internal package-name discovery

### From JS bundles

```bash
# JS bundles are the easiest source of internal npm names
curl --fail --silent --show-error https://target.example/main.js | grep -oE '@[a-z-]+/[a-z-]+' | sort -u
curl --fail --silent --show-error https://target.example/main.js | grep -oE 'require\("[^"]+"\)' | sort -u

# Look for scoped names that are NOT public on npm
for pkg in @target/utils @target-internal/api @companybrand/sdk; do
  status=$(curl -sI "https://registry.npmjs.org/$pkg" | head -1 | awk '{print $2}')
  echo "  $pkg → $status"
  # A missing response is only a discovery clue, not scope ownership or exploitability.
done
```

### From GitHub repo package.json files

```bash
# Public repos with package.json that reference internal scopes
for repo in $(gh repo list "$ORG" --limit 50 --json name --jq '.[].name'); do
  pkg=$(gh api "repos/$ORG/$repo/contents/package.json" --jq '.content' 2>/dev/null | base64 -d 2>/dev/null)
  echo "$pkg" | jq -r '.dependencies // {} | keys[]' 2>/dev/null | grep -E '^@[a-z-]+/'
done | sort -u
```

### From Python projects

```bash
# Internal pip package names
for repo in $(gh repo list "$ORG" --limit 50 --json name --jq '.[].name'); do
  gh api "repos/$ORG/$repo/contents/requirements.txt" --jq '.content' 2>/dev/null | base64 -d 2>/dev/null
done | sort -u | grep -vE '^(requests|django|flask|numpy|pandas|...common)'
```

---

## Step 4 — Dependency-confusion vulnerability check

For each internal-looking package name discovered:

```bash
NAME="@target-internal/utils"   # example

# npm check
curl -sI "https://registry.npmjs.org/$NAME" | head -1
# 404 does not prove namespace ownership, registerability or vulnerable resolution.

# pypi check (no scopes, just name)
NAME="target_utils"
curl -sI "https://pypi.org/project/$NAME/" | head -1
# 404 does not prove registerability.

# rubygems
curl -sI "https://rubygems.org/api/v1/gems/$NAME.json" | head -1

# Go modules — slightly different, since module names are URLs
# Check if module path is reachable
curl -sI "https://proxy.golang.org/github.com/$ORG/$NAME/@latest" | head -1
```

**Severity calibration:** An absent public package alone is not a vulnerability. Establish the package manager/version, effective registry mapping and credentials, lockfile/integrity behavior and actual dependency reachability. These conditions must form one coherent resolution path; they are not independent OR proofs. Scoped npm packages require ownership of the scope. Use an owner-supplied sanitized build configuration or local fixture rather than publishing a package to establish the mechanism. [npm configuration documentation](https://docs.npmjs.com/cli/v11/configuring-npm/npmrc/) describes the configuration layers and scoped registry settings.

---

## Step 5 — Typosquat candidates (around external dependencies)

For each external public dependency the target uses:

```bash
# Common typosquat patterns:
# Original: "react-router-dom"
# Typos: 
#   "react-router-doms" (extra s)
#   "react-routter-dom" (double t)
#   "react-rotuer-dom" (transposed)
#   "react--router-dom" (double dash)
#   "react-router-dorn" (m→rn)
#   "reactrouterdom" (no dashes)

# Generate candidates
python3 -c "
import sys
name='react-router-dom'
for i in range(len(name)):
    print(name[:i] + name[i+1:])   # delete
    if i < len(name)-1:
        print(name[:i] + name[i+1] + name[i] + name[i+2:])  # transpose
"

# Check which candidates are UNCLAIMED on the registry
for candidate in ...; do
  status=$(curl -sI "https://registry.npmjs.org/$candidate" | head -1 | awk '{print $2}')
  [ "$status" = "404" ] && echo "  UNCLAIMED: $candidate"
done
```

**⚠ EXTERNAL-OFFENSIVE NOTE:** publishing a typosquat package to a public registry is an attack on the wider ecosystem. NEVER do this without explicit, written, scope-clarified sign-off. It can affect users outside your engagement and may be illegal.

---

## Step 6 — GitHub Actions workflow injection scan

For each public repo with `.github/workflows/`:

```bash
for repo in $(gh repo list "$ORG" --limit 50 --json name --jq '.[].name'); do
  workflows=$(gh api "repos/$ORG/$repo/contents/.github/workflows" --jq '.[].name' 2>/dev/null)
  for wf in $workflows; do
    content=$(gh api "repos/$ORG/$repo/contents/.github/workflows/$wf" --jq '.content' 2>/dev/null | base64 -d 2>/dev/null)
    echo "=== $repo/$wf ==="
    
    # High-risk patterns:
    # 1. pull_request_target (runs with secrets on PR from forks)
    echo "$content" | grep -E 'pull_request_target'
    
    # 2. Untrusted context interpolation
    echo "$content" | grep -E '\$\{\{[^}]*github\.(event|head_ref|pull_request)[^}]*\}\}'
    
    # 3. ${{ github.event.* }} into shell run blocks
    echo "$content" | grep -B1 -A2 'run:' | grep -E '\$\{\{ ?github\.event\.'
    
    # 4. checkout of PR head with elevated perms
    echo "$content" | grep -E 'ref:.*pull_request|head_ref'
    
    # 5. Self-hosted runner without isolation
    echo "$content" | grep -E 'runs-on:.*self-hosted'

    # 6. Unpinned third-party actions — mutable tag (@v1, @main) vs pinned (@<40-char sha>)
    #    Mutable tags can be repointed by a compromised action repo (see case #9, tj-actions/changed-files).
    echo "$content" | grep -E 'uses: *[^ ]+/[^ ]+@(v?[0-9]+([.][0-9]+)*|main|master|latest)\b' | grep -v '@[0-9a-f]\{40\}'
  done
done
```

### Injection patterns to flag (severity guide)

| Pattern | Severity |
|---|---|
| `pull_request_target` + `actions/checkout` with `ref: pull_request.head.sha` + uses repo secrets | **Critical** — RCE on runner with org secrets |
| Untrusted PR title interpolated into shell source | Candidate script injection; severity depends on reachability, permissions and available assets |
| Third-party action pinned to a mutable tag (`uses: org/repo@v1` / `@main`) instead of a commit SHA | **High** — repointable supply-chain vector (see case #9) |
| Self-hosted runner reachable from public repo workflows | **High** — persistent attacker pivot |
| Issue-comment-triggered workflow that runs `gh` with token | **High** |
| Workflow downloads from URL that target controls | **Medium** |

### Validate injection findings without secret exfiltration

Trace untrusted event data into shell source, checkout paths, permissions and secret availability at the exact revision. Validate a candidate with an isolated, owner-approved workflow fixture using a harmless fixed marker and synthetic inputs; never print environment variables or send tokens to a network endpoint. Opening a PR or triggering CI needs separate specific authorization. Prefer intermediate environment variables with quoted shell expansion or a structured action input. See [GitHub secure-use guidance](https://docs.github.com/en/actions/reference/security/secure-use).

### Public GitHub Actions run logs (leaks secrets)

Actions logs are public by default on public repos. Look for:

```bash
# List all Action runs for a repo
gh api repos/OWNER/REPO/actions/runs --jq '.workflow_runs[] | {id, name, head_branch, status, conclusion}'

# Download an authorized run's logs as a ZIP, not JSON/base64.
gh api "repos/OWNER/REPO/actions/runs/RUN_ID/logs" > run-logs.zip
# Inspect in a restricted disposable directory using an archive-aware tool.
# Bound file counts/uncompressed bytes and reject traversal, links and device paths.
# Redact scanner output; never publish secret values or verify credentials.

```

Secret-looking log text is a potential exposure. Validity, privileges and scope require owner verification; do not classify a keyword match as confirmed credential theft.

### Static detection of Actions injection sinks with zizmor

For high-confidence automated flagging, run the `zizmor` analyzer on all workflow files:

```bash
# Install zizmor (Rust-based, from https://github.com/woodruffw/zizmor)
cargo install zizmor

# Scan all workflows
zizmor .github/workflows/*.yml

# Output includes: pull_request_target, mutable-tag uses, context interpolation, etc.
# Sort findings by risk tier
```

Zizmor saves manual regex work and catches edge cases (e.g., indirect context interpolation via variable references).

---

## Step 7 — Docker / container image registry mining

```bash
# Docker Hub
curl -s "https://hub.docker.com/v2/repositories/$ORG/?page_size=100" | jq -r '.results[].name'

# GHCR (GitHub Container Registry) — public images visible in repo packages tab
gh api "users/$ORG/packages?package_type=container" 2>/dev/null
gh api "orgs/$ORG/packages?package_type=container" 2>/dev/null

# For each image, list tags
for img in image1 image2; do
  curl -s "https://hub.docker.com/v2/repositories/$ORG/$img/tags?page_size=20" | jq -r '.results[].name'
done

# Pin an owner-approved image digest and inspect metadata without executing it.
# Treat exported image/layer archives as hostile: use an isolated non-root analyzer,
# bounded extraction and path/link/device checks. Do not unpack with unrestricted
# tar into a shared /tmp directory or run the image to inspect it.
# Configure secret scanners offline: disable live credential verification and redact output.

```

---

## Step 8 — SBOM / artifact metadata leakage

```bash
# Look for SBOMs published as releases (SPDX, CycloneDX format)
gh api "repos/$ORG/$REPO/releases" --jq '.[] | .assets[] | select(.name | test("sbom|cyclonedx|spdx"; "i")) | .browser_download_url'

# JSON dependency lockfiles in releases
gh api "repos/$ORG/$REPO/releases" --jq '.[] | .assets[] | select(.name | test("lock|deps"; "i")) | .browser_download_url'

# Exact-version-pinned deps → known-CVE chaining
# Compare versions to nuclei nvd templates or osv.dev for known vulns
curl -s "https://api.osv.dev/v1/query" -d '{"package": {"name": "lodash", "ecosystem": "npm"}, "version": "4.17.10"}'
```

---

## Step 9 — Internal registry URL leakage

```bash
# .npmrc patterns
grep -r "registry=" .                                            # in cloned repos
grep -r "_authToken=" .                                          # leaked npm token!
grep -r "@.*registry=" .                                          # scoped registry

# pip config
grep -r "extra-index-url" .
grep -r "index-url" .

# Gradle / Maven
grep -rE "(mavenCentral|maven\s*\{)" .
grep -r "url.*\(.*nexus" .

# Each leaked internal URL is intel — flag the URL itself even if not directly exploitable
```

---

## Step 10 — npm/PyPI organizational presence

```bash
# Some orgs maintain a public npm scope mirroring their brand
curl -s "https://registry.npmjs.org/-/v1/search?text=scope:$ORG&size=50" | jq '.objects[].package.name'

# Public PyPI presence
curl -s "https://pypi.org/simple/" | grep "$ORG" | head -20

# Check if scope is taken — if it's NOT, an attacker could register
# (relevant for any internal package using that scope)
curl -sI "https://registry.npmjs.org/-/org/$ORG"
```

---

## Step 11 — Frontend and third-party dependency checks

### Compromised CDN detection (polyfill.io, etc.)

Known-compromised CDNs and analytics services have been weaponized. Check target's public HTML/JS:

```bash
# Detect usage of polyfill.io and similar historically-compromised services
curl -s https://target.com | grep -i polyfill
curl -s https://target.com | grep -iE '(polyfill\.io|cdn\.jsdelivr\.net.*polyfill|babel\.min\.js)'

# Check JavaScript bundles
for bundle in public/*.js main.*.js app.*.js; do
  grep -i polyfill "$bundle" && echo "FOUND: $bundle"
done
```

Reference: polyfill.io was compromised in 2024 to serve malicious payloads. A dependency reference is a review lead. Distinguish the exact domain, version, cached content, integrity check and time window; a generic polyfill or Babel reference is not proof of compromise.

---

## Tooling

| Tool | Purpose |
|---|---|
| **`trufflehog`** | Filesystem/git/docker secret scan |
| **`gitleaks`** | Git history secret scan |
| **`dependency-confusion`** (Confused) | npm scope/PyPI checks |
| **`packj`** | Package risk score (PyPI/npm/RubyGems) |
| **`Lift / Snyk vuln-db`** | Known CVE lookup by package version |
| **`actionlint`** | GitHub Actions static analyzer |
| **`zizmor`** | GitHub Actions injection & security antipattern detection |
| **`OSSGadget`** | Microsoft's package metadata toolkit |
| **`semgrep`** + supply-chain rules | Workflow injection detection |
| **`osv-scanner`** | Match versions to known vulns |

---


## Contents

- [Severity scoring guidance](references/details.md)
- [Anti-patterns](references/details.md)
- [What constitutes a deliverable finding](references/details.md)
- [Bridge to neighboring skills](references/details.md)
- [External-only boundary check](references/details.md)
- [Real-world references](references/details.md)
- [Disclosed-case catalogue (citations)](references/details.md)
- [Related Skills & Chains](references/details.md)

## Limitations

- Authorized scope only: the confirmation gate above is mandatory before any probing, exploitation, or credential-access command.
- Docs-only import: upstream helper scripts, commands, engine, and research assets are not bundled; do not assume neighboring skill routes or tool commands exist. Install only independently verified tools under the approved plan.
- Validate every finding (see `triage-validation`) before reporting; report via `report-writing`. Prefer a sandbox, disposable VM, or controlled lab.

### Example

```bash
# Read-only first step; confirm scope before anything active.
cat scope.txt  # target list from the authorized engagement brief
```

> Adapted from [elementalsouls/Claude-BugHunter](https://github.com/elementalsouls/Claude-BugHunter) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: executable helpers, commands, engine, and research assets not bundled.
