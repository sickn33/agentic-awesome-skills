---
name: supply-chain-attack-response
description: Detect, respond to, and prevent software supply chain attacks on package
  registries, container images, and CI/CD pipelines with lockfile auditing, provenance
  verification
category: security
risk: offensive
source: https://github.com/BagelHole/DevOps-Security-Agent-Skills
source_repo: BagelHole/DevOps-Security-Agent-Skills
source_type: community
date_added: '2026-09-20'
license: MIT
license_source: https://github.com/BagelHole/DevOps-Security-Agent-Skills/blob/main/LICENSE
compatibility: Requires the relevant security tooling (scanners, vault CLIs) and an
  authorized scope for any active assessment. Docs-only; helper scripts and templates
  not bundled.
metadata:
  author: devops-skills
  version: '1.0'
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

# Supply Chain Attack Response

Software supply chain attacks target the dependencies, build systems, and distribution channels that developers trust implicitly. When a package on PyPI, npm, or crates.io is compromised, every downstream consumer inherits the malicious payload. This skill provides detection techniques, emergency response playbooks, and hardening strategies to protect your software supply chain end to end.

---

## 2. Detection

### 2.1 npm Audit

```bash
# Full audit of installed packages
npm audit

# JSON output for programmatic processing
npm audit --json | jq '.vulnerabilities | to_entries[] | select(.value.severity == "critical")'

# Fix automatically where possible
npm audit fix

# Check for known malicious packages via Socket.dev CLI
npx socket scan --package-lock package-lock.json
```

### 2.2 pip Audit

```bash
# Install pip-audit (maintained by Google/OSSF)
pip install pip-audit

# Audit current environment against OSV.dev
pip-audit

# Audit a requirements file directly
pip-audit -r requirements.txt --output json

# Check for typosquatting with bandersnatch or custom script
pip-audit --strict --desc on
```

### 2.3 Cargo Audit

```bash
# Install cargo-audit
cargo install cargo-audit

# Run audit against RustSec Advisory Database
cargo audit

# JSON output for CI integration
cargo audit --json

# Check for yanked crates
cargo audit --deny yanked
```

### 2.4 Sigstore / Cosign Verification

```bash
# Verify a container image signature with cosign
cosign verify \
  --certificate-identity "https://github.com/myorg/myrepo/.github/workflows/build.yml@refs/heads/main" \
  --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
  ghcr.io/myorg/myimage:latest

# Verify an artifact with sigstore-python
pip install sigstore
python -m sigstore verify identity \
  --cert-identity "release@example.com" \
  --cert-oidc-issuer "https://accounts.google.com" \
  artifact.tar.gz
```

### 2.5 SLSA Provenance Checks

```bash
# Install slsa-verifier
go install github.com/slsa-framework/slsa-verifier/v2/cli/slsa-verifier@latest

# Verify provenance of a binary
slsa-verifier verify-artifact my-binary \
  --provenance-path my-binary.intoto.jsonl \
  --source-uri github.com/myorg/myrepo \
  --source-tag v1.2.3
```

---

## 3. Emergency Response Playbook

When a dependency is confirmed compromised, execute these steps in order.

### Step 1: Contain -- Pin and Freeze

```bash
# Pin the last known-good version immediately in package.json
npm install <package>@<safe-version> --save-exact

# For pip, pin with hash verification
pip download <package>==<safe-version> --require-hashes -d ./vendor/

# For cargo, pin in Cargo.toml
# Replace: some_crate = "^1.2" with:
# some_crate = "=1.2.3"
cargo update -p some_crate --precise 1.2.3
```

### Step 2: Audit Exposure

```bash
# Determine which versions you pulled and when
# npm
npm ls <compromised-package>
cat package-lock.json | jq '.packages | to_entries[] | select(.key | contains("<compromised-package>"))'

# pip
pip show <compromised-package>
pip cache list <compromised-package>

# Check git history for when the dependency version changed
git log --all -p -- package-lock.json | grep -A2 -B2 "<compromised-package>"
```

### Step 3: Scan for Indicators of Compromise

```bash
# Search for known IOCs from the advisory
grep -r "suspicious-domain.com" ./node_modules/<compromised-package>/
grep -r "eval(atob" ./node_modules/<compromised-package>/ <!-- security-allowlist: documented payload technique reference, do not execute outside authorized scope -->

# Check for unexpected post-install scripts
cat node_modules/<compromised-package>/package.json | jq '.scripts'

# For Python packages, inspect setup.py and __init__.py
find ~/.local/lib/python*/site-packages/<compromised-package>/ -name "*.py" \
  | xargs grep -l "subprocess\|os.system\|exec(\|eval(" <!-- security-allowlist: documented payload technique reference, do not execute outside authorized scope -->
```

### Step 4: Notify Stakeholders

```text
SUBJECT: [SECURITY INCIDENT] Compromised dependency: <package-name>

SEVERITY: Critical
IMPACT: <package-name> versions <affected-range> contain malicious code.
AFFECTED SYSTEMS: <list of repos/services consuming this dependency>
STATUS: Contained -- pinned to safe version <safe-version>

ACTIONS TAKEN:
1. Pinned all repositories to last known-good version
2. Initiated audit of all systems that pulled affected versions
3. Scanning for indicators of compromise

RECOMMENDED ACTIONS:
- Do NOT deploy any build that consumed affected versions
- Review CI/CD logs for the timeframe <start> to <end>
- Rotate any secrets that were accessible to the build environment
```

### Step 5: Replace or Fork

```bash
# If the package maintainer account was compromised, fork the last safe version
git clone https://github.com/original-author/<package>.git
cd <package>
git checkout v<safe-version>
# Publish to your private registry or vendor directly

# For npm, point to your fork via package.json
# "dependencies": { "<package>": "git+https://github.com/yourorg/<package>.git#v1.2.3" }
```

---

## 4. Lockfile Auditing

Lockfiles are your first line of defense. Tampered or inconsistent lockfiles indicate something is wrong.

### 4.1 Verify Lockfile Integrity

```bash
# npm: ensure lockfile matches package.json (fails CI if out of sync)
npm ci

# Yarn: check lockfile integrity
yarn install --frozen-lockfile

# pip: generate a hash-locked requirements file
pip-compile --generate-hashes requirements.in -o requirements.txt

# Verify no unexpected changes in lockfile during PR
git diff --name-only origin/main...HEAD | grep -E "(package-lock|yarn.lock|Cargo.lock|requirements.txt)"
```

### 4.2 Detect Typosquatting

```bash
# Use the socket CLI to check for typosquatting risk
npx socket scan --package-lock package-lock.json

# Python: check package names against popular packages
pip-audit -r requirements.txt 2>&1 | grep -i "typosquat"

# Custom check: compare package names to known popular packages
# Flag anything with edit distance <= 2 from a top-1000 package
python3 -c "
import json, sys
from difflib import SequenceMatcher
with open('package-lock.json') as f:
    lock = json.load(f)
popular = ['express','lodash','react','axios','chalk','debug','commander','inquirer']
for pkg in lock.get('packages', {}):
    name = pkg.split('node_modules/')[-1] if 'node_modules/' in pkg else pkg
    for p in popular:
        ratio = SequenceMatcher(None, name, p).ratio()
        if 0.75 < ratio < 1.0 and name != p:
            print(f'WARNING: {name} is suspiciously similar to {p} (similarity: {ratio:.2f})')
"
```

### 4.3 Lockfile Diff in CI

```yaml
# .github/workflows/lockfile-check.yml
name: Lockfile Audit
on: pull_request
jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Check for lockfile changes
        run: |
          LOCKFILES="package-lock.json yarn.lock pnpm-lock.yaml Cargo.lock requirements.txt poetry.lock"
          for f in $LOCKFILES; do
            if git diff --name-only origin/main...HEAD | grep -q "$f"; then
              echo "::warning::Lockfile $f was modified -- review dependency changes carefully"
              git diff origin/main...HEAD -- "$f" | head -100
            fi
          done
      - name: Run npm audit
        if: hashFiles('package-lock.json') != ''
        run: npm audit --audit-level=high
```

---

## 5. Package Pinning and Verification

### 5.1 pip Hash Checking

```text
# requirements.txt with hashes (generated by pip-compile --generate-hashes)
requests==2.31.0 \
    --hash=sha256:58cd2187c01e70e6e26505bca751777aa9f2ee0b7f4300988b709f44e013003eb \
    --hash=sha256:942c5a758f98d790eaed1a29cb6eefc7f0edf3fcb0fce8afe0f44546e1
```

```bash
# Install with mandatory hash verification
pip install --require-hashes -r requirements.txt

# Generate hashes for existing requirements
pip-compile --generate-hashes requirements.in
```

### 5.2 npm Package Integrity

```bash
# npm automatically verifies integrity hashes in package-lock.json
# Ensure your lockfile contains integrity fields:
cat package-lock.json | jq '.packages | to_entries[] | select(.value.integrity == null) | .key'

# Enable strict engine and audit checks in .npmrc
cat >> .npmrc << 'EOF'
engine-strict=true
audit=true
audit-level=high
EOF
```

### 5.3 cargo-vet for Rust

```bash
# Install cargo-vet
cargo install cargo-vet

# Initialize in your project
cargo vet init

# Certify a crate after review
cargo vet certify serde 1.0.193

# Import audit results from trusted organizations
cargo vet trust --all mozilla
cargo vet trust --all google

# Run verification in CI
cargo vet check
```

---

## 6. Container Image Verification

### 6.1 Cosign Sign and Verify

```bash
# Sign an image (keyless via Sigstore/Fulcio in CI)
cosign sign ghcr.io/myorg/myimage@sha256:abc123...

# Verify with expected identity
cosign verify \
  --certificate-identity-regexp "https://github.com/myorg/.*" \
  --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
  ghcr.io/myorg/myimage:latest

# Verify and extract attestations
cosign verify-attestation \
  --type slsaprovenance \
  --certificate-identity-regexp "https://github.com/myorg/.*" \
  --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
  ghcr.io/myorg/myimage:latest | jq '.payload' | base64 -d | jq . <!-- security-allowlist: documented payload decoding technique reference, do not execute outside authorized scope -->
```

### 6.2 Kyverno Policy -- Require Signed Images

```yaml
# kyverno-require-signed-images.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-signed-images
spec:
  validationFailureAction: Enforce
  background: false
  rules:
    - name: verify-image-signature
      match:
        any:
          - resources:
              kinds:
                - Pod
      verifyImages:
        - imageReferences:
            - "ghcr.io/myorg/*"
          attestors:
            - entries:
                - keyless:
                    subject: "https://github.com/myorg/*"
                    issuer: "https://token.actions.githubusercontent.com"
                    rekor:
                      url: https://rekor.sigstore.dev
```

```bash
# Apply the policy
kubectl apply -f kyverno-require-signed-images.yaml

# Test: this unsigned image should be rejected
kubectl run test --image=ghcr.io/myorg/unsigned-image:latest
# Expected: admission webhook denies the request
```

---


## Contents

- [7. CI/CD Pipeline Hardening](references/details.md)
- [8. SLSA Framework Implementation](references/details.md)
- [9. Dependency Firewall](references/details.md)
- [10. Monitoring and Alerting](references/details.md)
- [11. Post-Incident Response](references/details.md)
- [Quick Reference](references/details.md)

## When to Use This Skill

Invoke this skill when any of the following apply:

- A dependency you consume has been flagged as compromised (e.g., advisories on OSV.dev, GitHub Advisory Database, or vendor disclosure).
- You observe suspicious behavior from a dependency: unexpected network calls, file system writes outside its scope, or new post-install scripts.
- You are conducting a periodic supply chain security audit.
- A CI/CD pipeline is behaving unexpectedly after a dependency update.
- You are onboarding a new third-party dependency and want to verify its provenance.
- You need to respond to an incident such as a typosquatted package or registry account takeover.
- You are implementing SLSA compliance or need to generate build provenance.

---

## Limitations

- Apply guidance only within authorized scope; test destructive steps in non-production first.
- Docs-only import: upstream scripts and templates not bundled.

### Example

```bash
# Read-only first: inventory before any active step.
which <tool> && <tool> --help | head -n 20
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.
