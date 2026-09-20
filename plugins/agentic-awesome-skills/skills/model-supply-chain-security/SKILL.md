---
name: model-supply-chain-security
description: Secure the AI model supply chain with artifact signing, provenance attestation,
  SBOM workflows, dependency controls, and trusted model promotion.
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

# Model Supply Chain Security

Protect models and inference components from tampering, dependency compromise, and untrusted artifact promotion.

## When to Use This Skill

Use this skill when:
- Pulling pretrained models from public registries (Hugging Face, TensorFlow Hub)
- Building model-serving containers for production deployment
- Establishing trust policies for ML artifact promotion across environments
- Responding to supply chain incidents affecting ML dependencies
- Meeting SLSA or SOC2 compliance requirements for AI systems

## Prerequisites

- `cosign` v2+ installed for signing and verification
- `syft` for SBOM generation of model-serving images
- `crane` or `skopeo` for OCI image inspection
- Container registry with signature support (GHCR, ECR, ACR, Artifact Registry)
- CI/CD pipeline with provenance generation capability

## Threats

- Poisoned pretrained weights or adapters
- Malicious model conversion tools or loaders
- Compromised build pipelines and registries
- Insecure runtime images with critical CVEs
- Typosquatting on model registries
- Deserialization attacks via pickle or custom loaders

## Control Objectives

- Verify artifact integrity end-to-end
- Prove provenance for every promoted model
- Detect vulnerable dependencies before deploy
- Restrict execution to trusted signed artifacts

## Model Signing with Cosign

### Sign a Model Artifact

```bash
# Generate a keypair (store private key securely)
cosign generate-key-pair

# Sign an OCI-packaged model image
cosign sign --key cosign.key ghcr.io/acme/ml-models/sentiment:v2.1.0

# Keyless signing with Sigstore (uses OIDC identity)
cosign sign ghcr.io/acme/ml-models/sentiment:v2.1.0

# Verify the signature
cosign verify --key cosign.pub ghcr.io/acme/ml-models/sentiment:v2.1.0

# Keyless verification (requires certificate identity)
cosign verify \
  --certificate-identity=ci-bot@acme.iam.gserviceaccount.com \
  --certificate-oidc-issuer=https://accounts.google.com \
  ghcr.io/acme/ml-models/sentiment:v2.1.0
```

### Sign Model Weight Files Directly

```bash
# For model files stored as blobs (not OCI images)
# Compute digest and sign
sha256sum model-weights.safetensors > model-weights.sha256
cosign sign-blob --key cosign.key model-weights.safetensors \
  --output-signature model-weights.sig \
  --output-certificate model-weights.crt

# Verify blob signature
cosign verify-blob --key cosign.pub \
  --signature model-weights.sig \
  model-weights.safetensors
```

## SLSA for ML Pipelines

### SLSA Level Requirements for Model Builds

```yaml
# slsa-requirements.yaml
slsa_levels:
  level_1:
    - Build process is scripted (not manual)
    - Provenance document generated automatically
  level_2:
    - Build runs on hosted CI service
    - Provenance is authenticated (signed)
    - Source is version controlled
  level_3:
    - Build environment is ephemeral and isolated
    - Provenance is non-falsifiable (hardened builder)
    - Source integrity verified (two-person review)
```

### Generate SLSA Provenance for Model Training

```yaml
# .github/workflows/model-build-slsa.yml
name: Model Build with SLSA Provenance
on:
  push:
    tags: ['model-v*']

jobs:
  train-and-package:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4

      - name: Train model
        run: python train.py --config configs/production.yaml

      - name: Package model as OCI artifact
        run: |
          oras push ghcr.io/acme/ml-models/sentiment:${{ github.ref_name }} \
            model-weights.safetensors:application/vnd.acme.model.safetensors \
            model-config.json:application/json

      - name: Generate SBOM for training environment
        run: |
          syft dir:. -o cyclonedx-json > training-sbom.json

      - name: Sign and attest
        run: |
          cosign sign ghcr.io/acme/ml-models/sentiment:${{ github.ref_name }}
          cosign attest --predicate training-sbom.json \
            --type cyclonedx \
            ghcr.io/acme/ml-models/sentiment:${{ github.ref_name }}

      - name: Generate provenance
        uses: slsa-framework/slsa-github-generator/.github/workflows/generator_container_slsa3.yml@v2.0.0
        with:
          image: ghcr.io/acme/ml-models/sentiment
          digest: ${{ steps.push.outputs.digest }}
```

## Model Cards for Provenance

```yaml
# model-card.yaml
model_details:
  name: "sentiment-classifier-v2.1.0"
  version: "2.1.0"
  type: "text-classification"
  framework: "pytorch"
  license: "Apache-2.0"

provenance:
  training_data:
    source: "s3://acme-datasets/sentiment-v3/"
    hash: "sha256:abc123..."
    data_card_ref: "https://internal.acme.com/data-cards/sentiment-v3"
  training_config:
    source: "git://github.com/acme/ml-models@abc123"
    hyperparameters:
      learning_rate: 0.00005
      epochs: 10
      batch_size: 32
  build_environment:
    builder: "github-actions"
    runner: "ubuntu-22.04"
    python: "3.11.7"
    torch: "2.1.2"
    cuda: "12.1"
  build_id: "gh-actions-12345"
  commit_sha: "abc123def456"
  build_timestamp: "2025-01-15T10:30:00Z"
  signed_by: "ci-bot@acme.iam.gserviceaccount.com"

performance:
  accuracy: 0.94
  f1_score: 0.93
  evaluation_dataset: "s3://acme-datasets/sentiment-eval-v3/"
  evaluation_hash: "sha256:def456..."

security:
  vulnerability_scan: "clean"
  sbom_ref: "ghcr.io/acme/ml-models/sentiment:v2.1.0.sbom"
  last_security_review: "2025-01-10"
  known_limitations:
    - "May produce biased outputs for underrepresented languages"
    - "Not evaluated for adversarial robustness"
```

## Registry Scanning

```bash
# Scan model-serving image for CVEs
trivy image ghcr.io/acme/ml-models/sentiment-serving:v2.1.0

# Generate SBOM for the serving container
syft ghcr.io/acme/ml-models/sentiment-serving:v2.1.0 -o spdx-json > serving-sbom.json

# Scan SBOM for vulnerabilities
grype sbom:serving-sbom.json --fail-on critical

# Check for known-malicious model files (pickle scanning)
pip install fickling
fickling --check model.pkl
```

### Automated Registry Scan Pipeline

```yaml
# .github/workflows/registry-scan.yml
name: Nightly Registry Scan
on:
  schedule:
    - cron: '0 2 * * *'

jobs:
  scan:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        image:
          - ghcr.io/acme/ml-models/sentiment-serving:latest
          - ghcr.io/acme/ml-models/embedding-serving:latest
          - ghcr.io/acme/ml-models/rag-api:latest
    steps:
      - name: Scan image
        run: |
          trivy image --severity CRITICAL,HIGH \
            --exit-code 1 \
            --format json \
            --output scan-$(echo ${{ matrix.image }} | tr '/:' '-').json \
            ${{ matrix.image }}

      - name: Verify signatures are still valid
        run: |
          cosign verify \
            --certificate-identity=ci-bot@acme.iam.gserviceaccount.com \
            --certificate-oidc-issuer=https://accounts.google.com \
            ${{ matrix.image }}
```

## Promotion Policy Enforcement

```python
#!/usr/bin/env python3
"""model_promotion_gate.py - Verify model meets all promotion criteria."""

import subprocess
import json
import sys

def check_signature(image: str) -> bool:
    result = subprocess.run(
        ["cosign", "verify", "--certificate-identity=ci-bot@acme.iam.gserviceaccount.com",
         "--certificate-oidc-issuer=https://accounts.google.com", image],
        capture_output=True, text=True,
    )
    return result.returncode == 0

def check_vulnerabilities(image: str) -> bool:
    result = subprocess.run(
        ["trivy", "image", "--severity", "CRITICAL", "--exit-code", "1",
         "--quiet", image],
        capture_output=True, text=True,
    )
    return result.returncode == 0

def check_sbom_exists(image: str) -> bool:
    result = subprocess.run(
        ["cosign", "verify-attestation", "--type", "cyclonedx",
         "--certificate-identity=ci-bot@acme.iam.gserviceaccount.com",
         "--certificate-oidc-issuer=https://accounts.google.com", image],
        capture_output=True, text=True,
    )
    return result.returncode == 0

def check_model_card(image: str) -> bool:
    result = subprocess.run(
        ["cosign", "verify-attestation", "--type", "custom",
         "--certificate-identity=ci-bot@acme.iam.gserviceaccount.com",
         "--certificate-oidc-issuer=https://accounts.google.com", image],
        capture_output=True, text=True,
    )
    return result.returncode == 0

def main():
    image = sys.argv[1]
    checks = {
        "signature_valid": check_signature(image),
        "no_critical_cves": check_vulnerabilities(image),
        "sbom_attached": check_sbom_exists(image),
        "model_card_present": check_model_card(image),
    }
    all_passed = all(checks.values())
    for name, passed in checks.items():
        status = "PASS" if passed else "FAIL"
        print(f"  [{status}] {name}")
    if not all_passed:
        print("Promotion BLOCKED: not all checks passed.")
        sys.exit(1)
    print("Promotion APPROVED: all checks passed.")

if __name__ == "__main__":
    main()
```

## Runtime Hardening

- Run inference containers as non-root.
- Apply egress restrictions to prevent unauthorized downloads.
- Mount model volumes read-only when possible.
- Alert on unsigned artifact pull attempts.
- Use `safetensors` format instead of pickle to prevent deserialization attacks.

```yaml
# kubernetes deployment hardening
apiVersion: apps/v1
kind: Deployment
metadata:
  name: model-serving
spec:
  template:
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000
      containers:
        - name: inference
          image: ghcr.io/acme/ml-models/sentiment-serving:v2.1.0
          securityContext:
            readOnlyRootFilesystem: true
            allowPrivilegeEscalation: false
            capabilities:
              drop: ["ALL"]
          volumeMounts:
            - name: model-weights
              mountPath: /models
              readOnly: true
          resources:
            limits:
              memory: "4Gi"
              nvidia.com/gpu: "1"
      volumes:
        - name: model-weights
          persistentVolumeClaim:
            claimName: model-weights-pvc
            readOnly: true
```

## Kyverno Policy for Admission Control

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-signed-model-images
spec:
  validationFailureAction: Enforce
  rules:
    - name: verify-model-image-signature
      match:
        any:
          - resources:
              kinds: ["Pod"]
              namespaces: ["ml-serving"]
      verifyImages:
        - imageReferences: ["ghcr.io/acme/ml-models/*"]
          attestors:
            - entries:
                - keyless:
                    subject: "ci-bot@acme.iam.gserviceaccount.com"
                    issuer: "https://accounts.google.com"
```

## Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| `cosign verify` fails with "no matching signatures" | Image was pushed without signing | Re-run the signing step; check CI pipeline logs |
| Provenance attestation missing | SLSA generator not configured | Add slsa-github-generator to the build workflow |
| Trivy reports CVEs in base image | Stale base image | Update `FROM` image in Dockerfile; rebuild and re-sign |
| Pickle deserialization warning | Model saved in unsafe format | Convert to safetensors: `model.save_pretrained(".", safe_serialization=True)` |
| Keyless verification fails | Wrong OIDC issuer or identity | Check `--certificate-identity` and `--certificate-oidc-issuer` flags |
| Model card not found for artifact | Attestation not attached to digest | Attach with `cosign attest --predicate model-card.yaml --type custom IMAGE` |

## Related Skills

- sbom-supply-chain (`sbom-supply-chain`) - Generate SBOM and provenance evidence
- container-hardening (`container-hardening`) - Harden runtime container posture
- model-registry-governance (`model-registry-governance`) - Controlled lifecycle and approvals

## Limitations

- Apply guidance only within authorized scope; test destructive steps in non-production first.
- Docs-only import: upstream scripts and templates not bundled.

### Example

```bash
# Read-only first: inventory before any active step.
which <tool> && <tool> --help | head -n 20
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.
