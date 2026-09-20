---
name: sbom-supply-chain
description: Generate, sign, and verify SBOMs and provenance attestations to secure
  the software supply chain. Use when implementing SLSA controls, artifact trust policies,
  or compliance evidence for releases.
category: security
risk: safe
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

# SBOM & Supply Chain Security

Improve release trust with reproducible metadata and verification gates.

## When to Use This Skill

Use this skill when:
- Producing SBOMs for container images or application builds
- Verifying dependencies before deploy
- Enforcing signed artifact and provenance policies
- Preparing for SOC2, ISO 27001, or customer security reviews
- Implementing SLSA framework requirements
- Responding to supply chain vulnerabilities (e.g., Log4Shell-style events)

## Prerequisites

- `syft` installed for SBOM generation
- `cdxgen` installed for CycloneDX SBOM generation
- `grype` for vulnerability matching against SBOMs
- `cosign` v2+ for signing and attestation
- Container registry with OCI artifact support
- CI/CD pipeline with OIDC identity for keyless signing

## SBOM Formats

### CycloneDX vs SPDX Comparison

```yaml
comparison:
  cyclonedx:
    standard: "OWASP CycloneDX"
    focus: "Application security, vulnerability tracking"
    formats: ["JSON", "XML", "Protocol Buffers"]
    strengths:
      - Vulnerability references (VEX support)
      - Service and API dependency tracking
      - Hardware BOM support
    best_for: "Security-focused SBOM, vulnerability management"

  spdx:
    standard: "Linux Foundation SPDX (ISO/IEC 5962:2021)"
    focus: "License compliance, legal review"
    formats: ["JSON", "RDF/XML", "Tag-Value", "YAML"]
    strengths:
      - ISO standard
      - License expression language
      - Relationship modeling
    best_for: "License compliance, regulatory requirements"
```

## Syft SBOM Generation

```bash
# Generate SBOM for a container image (CycloneDX JSON)
syft ghcr.io/acme/api:v1.2.3 -o cyclonedx-json > sbom-cyclonedx.json

# Generate SBOM in SPDX format
syft ghcr.io/acme/api:v1.2.3 -o spdx-json > sbom-spdx.json

# Generate SBOM from a local directory (source code)
syft dir:. -o cyclonedx-json > sbom-source.json

# Generate SBOM from a Dockerfile/built image
syft docker:my-local-image:latest -o cyclonedx-json > sbom-local.json

# Generate SBOM for a specific package ecosystem
syft dir:. --catalogers python -o cyclonedx-json > sbom-python.json

# Include file hashes for deeper analysis
syft ghcr.io/acme/api:v1.2.3 -o cyclonedx-json --file-metadata > sbom-with-hashes.json

# Multiple output formats simultaneously
syft ghcr.io/acme/api:v1.2.3 \
  -o cyclonedx-json=sbom-cdx.json \
  -o spdx-json=sbom-spdx.json \
  -o table=sbom-summary.txt
```

## cdxgen SBOM Generation

```bash
# Install cdxgen
npm install -g @cyclonedx/cdxgen

# Generate CycloneDX SBOM for a project directory
cdxgen -o sbom.json .

# Specify project type
cdxgen -t python -o sbom-python.json .
cdxgen -t java -o sbom-java.json .
cdxgen -t node -o sbom-node.json .
cdxgen -t go -o sbom-go.json .

# Generate SBOM with evidence (call stacks, file occurrences)
cdxgen --evidence -o sbom-with-evidence.json .

# Generate for a container image
cdxgen -t docker -o sbom-container.json ghcr.io/acme/api:v1.2.3

# Generate with deep analysis (slower but more accurate)
cdxgen --deep -o sbom-deep.json .

# Output in different formats
cdxgen -o sbom.xml --format xml .
```

## Vulnerability Matching

```bash
# Scan SBOM for vulnerabilities with Grype
grype sbom:sbom-cyclonedx.json

# Fail on critical/high vulnerabilities
grype sbom:sbom-cyclonedx.json --fail-on high

# Output as JSON for CI processing
grype sbom:sbom-cyclonedx.json -o json > vulnerability-report.json

# Scan container image directly
grype ghcr.io/acme/api:v1.2.3

# Use Trivy with SBOM input
trivy sbom sbom-cyclonedx.json

# Trivy scan with severity filter
trivy sbom sbom-cyclonedx.json --severity CRITICAL,HIGH --exit-code 1
```

## Cosign Signing and Attestation

### Image Signing

```bash
# Keyless signing (recommended - uses OIDC identity from CI)
cosign sign ghcr.io/acme/api@sha256:abc123...

# Sign with a key pair
cosign generate-key-pair
cosign sign --key cosign.key ghcr.io/acme/api@sha256:abc123...

# Verify keyless signature
cosign verify \
  --certificate-identity=https://github.com/acme/api/.github/workflows/build.yml@refs/heads/main \
  --certificate-oidc-issuer=https://token.actions.githubusercontent.com \
  ghcr.io/acme/api@sha256:abc123...

# Verify with key
cosign verify --key cosign.pub ghcr.io/acme/api@sha256:abc123...
```

### SBOM Attestation

```bash
# Attach SBOM as an in-toto attestation to a container image
cosign attest --predicate sbom-cyclonedx.json \
  --type cyclonedx \
  ghcr.io/acme/api@sha256:abc123...

# Attach SPDX SBOM
cosign attest --predicate sbom-spdx.json \
  --type spdx \
  ghcr.io/acme/api@sha256:abc123...

# Verify SBOM attestation
cosign verify-attestation \
  --type cyclonedx \
  --certificate-identity=https://github.com/acme/api/.github/workflows/build.yml@refs/heads/main \
  --certificate-oidc-issuer=https://token.actions.githubusercontent.com \
  ghcr.io/acme/api@sha256:abc123...

# Extract the SBOM from attestation
cosign verify-attestation --type cyclonedx \
  --certificate-identity=... --certificate-oidc-issuer=... \
  ghcr.io/acme/api@sha256:abc123... | jq -r '.payload' | base64 -d | jq '.predicate' <!-- security-allowlist: documented payload decoding technique reference, do not execute outside authorized scope -->
```

### In-toto Provenance Attestation

```bash
# Create a custom provenance attestation
cat > provenance.json << 'EOF'
{
  "buildType": "https://github.com/acme/build-system@v1",
  "builder": {
    "id": "https://github.com/acme/api/.github/workflows/build.yml@refs/heads/main"
  },
  "invocation": {
    "configSource": {
      "uri": "git+https://github.com/acme/api@refs/heads/main",
      "digest": { "sha1": "abc123def456" },
      "entryPoint": ".github/workflows/build.yml"
    }
  },
  "metadata": {
    "buildStartedOn": "2025-01-15T10:00:00Z",
    "buildFinishedOn": "2025-01-15T10:05:00Z",
    "completeness": {
      "parameters": true,
      "environment": true,
      "materials": true
    }
  },
  "materials": [
    {
      "uri": "git+https://github.com/acme/api@refs/heads/main",
      "digest": { "sha1": "abc123def456" }
    },
    {
      "uri": "pkg:docker/python@3.11-slim",
      "digest": { "sha256": "def456..." }
    }
  ]
}
EOF

# Attach provenance attestation
cosign attest --predicate provenance.json \
  --type slsaprovenance \
  ghcr.io/acme/api@sha256:abc123...
```

## CI/CD Pipeline Integration

```yaml
# .github/workflows/sbom-supply-chain.yml
name: Build with SBOM and Signing
on:
  push:
    tags: ['v*']

permissions:
  contents: read
  packages: write
  id-token: write  # Required for keyless signing

jobs:
  build-sign-attest:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push image
        id: build
        uses: docker/build-push-action@v5
        with:
          push: true
          tags: ghcr.io/${{ github.repository }}:${{ github.ref_name }}

      - name: Install tools
        run: |
          curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh -o /tmp/install-syft.sh && sh /tmp/install-syft.sh && rm /tmp/install-syft.sh -s -- -b /usr/local/bin
          curl -sSfL https://raw.githubusercontent.com/anchore/grype/main/install.sh -o /tmp/install-grype.sh && sh /tmp/install-grype.sh && rm /tmp/install-grype.sh -s -- -b /usr/local/bin

      - name: Generate SBOM
        run: |
          syft ghcr.io/${{ github.repository }}@${{ steps.build.outputs.digest }} \
            -o cyclonedx-json=sbom-cdx.json \
            -o spdx-json=sbom-spdx.json

      - name: Scan SBOM for vulnerabilities
        run: |
          grype sbom:sbom-cdx.json --fail-on critical -o json > vuln-report.json

      - name: Install cosign
        uses: sigstore/cosign-installer@v3

      - name: Sign image (keyless)
        run: |
          cosign sign ghcr.io/${{ github.repository }}@${{ steps.build.outputs.digest }}

      - name: Attach SBOM attestation
        run: |
          cosign attest --predicate sbom-cdx.json \
            --type cyclonedx \
            ghcr.io/${{ github.repository }}@${{ steps.build.outputs.digest }}

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: sbom-and-reports
          path: |
            sbom-cdx.json
            sbom-spdx.json
            vuln-report.json
```

## Policy Enforcement

### Kyverno Policy: Require Signed Images with SBOM

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-signed-images-with-sbom
spec:
  validationFailureAction: Enforce
  webhookTimeoutSeconds: 30
  rules:
    - name: verify-signature
      match:
        any:
          - resources:
              kinds: ["Pod"]
      verifyImages:
        - imageReferences: ["ghcr.io/acme/*"]
          attestors:
            - entries:
                - keyless:
                    subject: "https://github.com/acme/*"
                    issuer: "https://token.actions.githubusercontent.com"
                    rekor:
                      url: "https://rekor.sigstore.dev"
          attestations:
            - type: cyclonedx
              conditions:
                - all:
                    - key: "{{ components[].name }}"
                      operator: AllNotIn
                      value: ["log4j-core"]
```

### OPA Policy: Verify SBOM Before Deploy

```rego
package sbom.verify

import rego.v1

default allow := false

allow if {
    sbom_present
    no_critical_vulns
    signed_by_ci
}

sbom_present if {
    input.attestations.cyclonedx != null
    count(input.attestations.cyclonedx.components) > 0
}

no_critical_vulns if {
    not any_critical
}

any_critical if {
    some vuln in input.vulnerability_report.matches
    vuln.vulnerability.severity == "Critical"
    vuln.vulnerability.fix.state == "fixed"
}

signed_by_ci if {
    input.signature.issuer == "https://token.actions.githubusercontent.com"
    startswith(input.signature.subject, "https://github.com/acme/")
}
```

## Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| Syft misses dependencies | Unsupported package manager or format | Check syft catalogers list; use `cdxgen` for deeper analysis; contribute upstream |
| Cosign sign fails with "no identity token" | Missing OIDC provider in CI | Ensure `id-token: write` permission in GitHub Actions; check OIDC provider config |
| Grype reports false positives | Package version detection incorrect | Verify SBOM accuracy; report to grype GitHub; add ignore rules for confirmed FPs |
| SBOM attestation too large | Large image with many dependencies | Compress SBOM; use SPDX compact format; consider splitting per layer |
| Verification fails in admission controller | Wrong identity or issuer URL | Check exact `--certificate-identity` and `--certificate-oidc-issuer` values |
| cdxgen produces empty SBOM | Project type not detected | Specify type explicitly with `-t`; ensure manifest files (package.json, etc.) exist |

## Best Practices

- Generate SBOMs in both CycloneDX and SPDX for maximum compatibility
- Sign all release artifacts with keyless signing (Sigstore/Fulcio)
- Attach SBOMs as in-toto attestations to container images
- Scan SBOMs for vulnerabilities in CI and block on critical findings
- Archive SBOMs for every release for audit and incident response
- Enforce signature verification in admission controllers (Kyverno, OPA)
- Monitor for new CVEs against stored SBOMs continuously
- Include SBOM generation in every build pipeline, not just releases
- Track SBOM completeness metrics (percentage of deps captured)
- Establish a VEX (Vulnerability Exploitability eXchange) process for false positives

## Related Skills

- dependency-scanning (`dependency-scanning`) - Library vulnerability triage
- container-scanning (`container-scanning`) - Container CVE scanning
- policy-as-code (`policy-as-code`) - Policy enforcement
- model-supply-chain-security (`model-supply-chain-security`) - ML artifact trust

## Limitations

- Apply guidance only within authorized scope; test destructive steps in non-production first.
- Docs-only import: upstream scripts and templates not bundled.

### Example

```bash
# Read-only first: inventory before any active step.
which <tool> && <tool> --help | head -n 20
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.
