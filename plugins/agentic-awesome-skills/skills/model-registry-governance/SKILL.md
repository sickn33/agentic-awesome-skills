---
name: model-registry-governance
description: Establish model registry standards, governance controls, metadata schemas,
  approvals, and lifecycle policies for enterprise AI deployments.
category: devops
risk: critical
source: https://github.com/BagelHole/DevOps-Security-Agent-Skills
source_repo: BagelHole/DevOps-Security-Agent-Skills
source_type: community
date_added: '2026-09-20'
license: MIT
license_source: https://github.com/BagelHole/DevOps-Security-Agent-Skills/blob/main/LICENSE
compatibility: Requires the relevant platform CLIs (kubectl, helm, terraform, git,
  CI runners) and authorized access to the target environment. Docs-only; helper scripts
  and templates not bundled.
metadata:
  author: devops-skills
  version: '1.0'
---

# Model Registry Governance

Create a trustworthy system of record for model artifacts, prompts, adapters, and evaluation evidence.

## When to Use This Skill

- Setting up a centralized model registry for your organization
- Defining metadata standards for model artifacts
- Building approval workflows for model promotion to production
- Implementing lifecycle policies for model retirement
- Preparing for compliance audits of AI systems

## Prerequisites

- MLflow Tracking Server or Weights & Biases instance deployed
- Object storage for model artifacts (S3, GCS, or MinIO)
- CI/CD pipeline with access to the registry API
- OPA or similar policy engine for governance checks
- Git repository for policy definitions and promotion scripts

## Core Principles

- **Traceability**: every production model maps to source code, data snapshot, and evaluation results.
- **Reproducibility**: builds are deterministic with pinned dependencies.
- **Policy-driven promotion**: no manual bypass for critical safety checks.
- **Lifecycle hygiene**: stale, vulnerable, or unowned models are retired automatically.

## MLflow Registry Setup

```bash
# Install MLflow with required backends
pip install mlflow[extras] psycopg2-binary boto3

# Start MLflow tracking server with PostgreSQL backend and S3 artifact store
mlflow server \
  --backend-store-uri postgresql://mlflow:password@db:5432/mlflow \
  --default-artifact-root s3://mlflow-artifacts/models \
  --host 0.0.0.0 \
  --port 5000 \
  --serve-artifacts
```

```yaml
# docker-compose.yaml for MLflow
services:
  mlflow:
    image: ghcr.io/mlflow/mlflow:2.12.0
    command: >
      mlflow server
      --backend-store-uri postgresql://mlflow:${DB_PASSWORD}@db:5432/mlflow
      --default-artifact-root s3://mlflow-artifacts/models
      --host 0.0.0.0
      --port 5000
      --serve-artifacts
    ports:
      - "5000:5000"
    environment:
      AWS_ACCESS_KEY_ID: ${AWS_ACCESS_KEY_ID}
      AWS_SECRET_ACCESS_KEY: ${AWS_SECRET_ACCESS_KEY}
    depends_on:
      - db

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: mlflow
      POSTGRES_USER: mlflow
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

## Required Metadata Schema

```python
# model_metadata_schema.py
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from enum import Enum

class LifecycleState(str, Enum):
    DRAFT = "draft"
    CANDIDATE = "candidate"
    APPROVED = "approved"
    DEPRECATED = "deprecated"
    RETIRED = "retired"

class RiskRating(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class ModelMetadata(BaseModel):
    """Required metadata for every registered model."""
    # Identity
    name: str = Field(description="Model name matching registry key")
    version: str = Field(description="Semantic version")
    checksum: str = Field(description="SHA-256 of model artifact")
    storage_uri: str = Field(description="Artifact store path")

    # Lineage
    base_model: str = Field(description="Parent model identifier")
    fine_tune_method: Optional[str] = Field(default=None)
    training_dataset: Optional[str] = Field(default=None)
    training_date: Optional[datetime] = Field(default=None)
    source_commit: str = Field(description="Git SHA of training code")

    # Evaluation
    eval_datasets: List[str] = Field(description="Evaluation dataset IDs")
    eval_report_uri: str = Field(description="Path to evaluation results")
    quality_score: float = Field(ge=0, le=1)
    safety_score: float = Field(ge=0, le=1)

    # Governance
    license: str = Field(description="SPDX license identifier")
    allowed_use_cases: List[str]
    prohibited_use_cases: List[str]
    risk_rating: RiskRating
    security_controls: List[str]

    # Ownership
    owner: str = Field(description="Primary owner email")
    backup_owner: str = Field(description="Backup owner email")
    escalation_contact: str
    team: str

    # Lifecycle
    state: LifecycleState = LifecycleState.DRAFT
    created_at: datetime = Field(default_factory=datetime.utcnow)
    approved_at: Optional[datetime] = None
    approved_by: Optional[str] = None
    expires_at: Optional[datetime] = None
```

## Model Registration Script

```python
# register_model.py
import mlflow
from mlflow.tracking import MlflowClient
import json
import hashlib

def register_model(
    model_path: str,
    model_name: str,
    metadata: dict,
    mlflow_uri: str = "http://mlflow:5000"
):
    """Register a model with full metadata and governance tags."""
    mlflow.set_tracking_uri(mlflow_uri)
    client = MlflowClient()

    # Compute artifact checksum
    with open(model_path, "rb") as f:
        checksum = hashlib.sha256(f.read()).hexdigest()
    metadata["checksum"] = checksum

    # Log model with metadata
    with mlflow.start_run(run_name=f"register-{model_name}-{metadata['version']}") as run:
        # Log all metadata as params
        mlflow.log_params({
            "model_name": model_name,
            "version": metadata["version"],
            "base_model": metadata["base_model"],
            "risk_rating": metadata["risk_rating"],
            "owner": metadata["owner"],
            "license": metadata["license"],
        })

        # Log quality metrics
        mlflow.log_metrics({
            "quality_score": metadata["quality_score"],
            "safety_score": metadata["safety_score"],
        })

        # Log full metadata as artifact
        with open("metadata.json", "w") as f:
            json.dump(metadata, f, indent=2, default=str)
        mlflow.log_artifact("metadata.json")

        # Log model artifact
        mlflow.log_artifact(model_path)

        # Register in model registry
        model_uri = f"runs:/{run.info.run_id}/model"
        result = mlflow.register_model(model_uri, model_name)

        # Set lifecycle tags
        client.set_model_version_tag(
            model_name, result.version, "state", "draft"
        )
        client.set_model_version_tag(
            model_name, result.version, "risk_rating", metadata["risk_rating"]
        )
        client.set_model_version_tag(
            model_name, result.version, "checksum", checksum
        )

    return result
```

## Approval Workflow

1. Registration request created from CI.
2. Security checks (artifact scan, dependency scan, provenance).
3. Evaluation package uploaded (quality, toxicity, jailbreak, bias, latency, cost).
4. Required approvals: platform + product + security (as policy dictates).
5. Promotion to stage/prod based on signed decision record.

## Promotion Script

```python
# promote_model.py
import mlflow
from mlflow.tracking import MlflowClient
from datetime import datetime
import sys

def promote_model(
    model_name: str,
    version: str,
    target_stage: str,
    approver: str,
    mlflow_uri: str = "http://mlflow:5000"
):
    """Promote a model version after governance checks pass."""
    mlflow.set_tracking_uri(mlflow_uri)
    client = MlflowClient()

    # Verify current state allows promotion
    mv = client.get_model_version(model_name, version)
    current_state = mv.tags.get("state", "draft")

    valid_transitions = {
        "draft": ["candidate"],
        "candidate": ["approved", "draft"],
        "approved": ["deprecated"],
        "deprecated": ["retired"],
    }

    if target_stage not in valid_transitions.get(current_state, []):
        raise ValueError(
            f"Invalid transition: {current_state} -> {target_stage}. "
            f"Allowed: {valid_transitions.get(current_state, [])}"
        )

    # Verify required eval scores for production promotion
    if target_stage == "approved":
        run = client.get_run(mv.run_id)
        quality = float(run.data.metrics.get("quality_score", 0))
        safety = float(run.data.metrics.get("safety_score", 0))

        if quality < 0.85:
            raise ValueError(f"Quality score {quality} below threshold 0.85")
        if safety < 0.95:
            raise ValueError(f"Safety score {safety} below threshold 0.95")

    # Record promotion
    now = datetime.utcnow().isoformat()
    client.set_model_version_tag(model_name, version, "state", target_stage)
    client.set_model_version_tag(model_name, version, f"promoted_to_{target_stage}_at", now)
    client.set_model_version_tag(model_name, version, f"promoted_to_{target_stage}_by", approver)

    # Transition MLflow stage alias
    stage_map = {
        "candidate": "Staging",
        "approved": "Production",
        "deprecated": "Archived",
    }
    if target_stage in stage_map:
        client.transition_model_version_stage(
            model_name, version, stage_map[target_stage]
        )

    print(f"Model {model_name} v{version}: {current_state} -> {target_stage}")
    print(f"Approved by: {approver} at {now}")

if __name__ == "__main__":
    promote_model(
        model_name=sys.argv[1],
        version=sys.argv[2],
        target_stage=sys.argv[3],
        approver=sys.argv[4],
    )
```

## Lifecycle States

| State | Description | Serving Allowed | New Usage |
|-------|-------------|-----------------|-----------|
| `draft` | Internal experimentation | Dev only | Dev only |
| `candidate` | Passed baseline tests | Staging | Staging |
| `approved` | Authorized for production | All environments | Yes |
| `deprecated` | Replacement announced | Existing only | Blocked |
| `retired` | Archived for audit | None | None |

## Lifecycle Automation

```python
# lifecycle_policy.py
from mlflow.tracking import MlflowClient
from datetime import datetime, timedelta

def enforce_lifecycle_policies(mlflow_uri: str = "http://mlflow:5000"):
    """Run periodic lifecycle enforcement."""
    client = MlflowClient()

    for rm in client.search_registered_models():
        for mv in client.search_model_versions(f"name='{rm.name}'"):
            tags = mv.tags
            state = tags.get("state", "draft")

            # Auto-deprecate models with expired approvals (90 days)
            if state == "approved":
                approved_at = tags.get("promoted_to_approved_at")
                if approved_at:
                    approved_date = datetime.fromisoformat(approved_at)
                    if datetime.utcnow() - approved_date > timedelta(days=90):
                        print(f"Auto-deprecating {rm.name} v{mv.version}: approval expired")
                        client.set_model_version_tag(rm.name, mv.version, "state", "deprecated")
                        client.set_model_version_tag(
                            rm.name, mv.version, "auto_deprecated_reason", "approval_expired"
                        )

            # Auto-retire deprecated models after 30 days
            if state == "deprecated":
                deprecated_at = tags.get("promoted_to_deprecated_at")
                if deprecated_at:
                    deprecated_date = datetime.fromisoformat(deprecated_at)
                    if datetime.utcnow() - deprecated_date > timedelta(days=30):
                        print(f"Auto-retiring {rm.name} v{mv.version}")
                        client.set_model_version_tag(rm.name, mv.version, "state", "retired")
                        client.transition_model_version_stage(
                            rm.name, mv.version, "Archived"
                        )

            # Flag drafts with no activity for 14 days
            if state == "draft":
                created = datetime.fromisoformat(mv.creation_timestamp / 1000)
                if datetime.utcnow() - created > timedelta(days=14):
                    print(f"Stale draft: {rm.name} v{mv.version}")
```

## Governance Policies (OPA/Rego)

```rego
# policy/model_governance.rego
package model.governance

# Reject artifacts without SBOM
deny[msg] {
    not input.metadata.sbom_uri
    msg := "Model must include SBOM artifact URI"
}

# Block promotion if critical CVEs remain
deny[msg] {
    input.target_state == "approved"
    input.security_scan.critical_cves > 0
    msg := sprintf("Cannot promote: %d critical CVEs unresolved", [input.security_scan.critical_cves])
}

# Require refreshed evals after prompt changes
deny[msg] {
    input.target_state == "approved"
    input.prompt_changed
    not input.eval_refreshed_after_prompt_change
    msg := "Evaluation must be re-run after prompt template changes"
}

# Require minimum eval scores for production
deny[msg] {
    input.target_state == "approved"
    input.metadata.quality_score < 0.85
    msg := sprintf("Quality score %.2f below threshold 0.85", [input.metadata.quality_score])
}

# Require dual approval for high-risk models
deny[msg] {
    input.target_state == "approved"
    input.metadata.risk_rating == "high"
    count(input.approvals) < 2
    msg := "High-risk models require at least 2 approvals"
}
```

## Audit Readiness

Maintain immutable records of:

- Who approved and when
- Which policy checks executed
- Which exceptions were granted
- What model/version served each customer request window

## Troubleshooting

| Issue | Diagnosis | Resolution |
|-------|-----------|------------|
| Model registration fails | Check MLflow server connectivity and artifact store permissions | Verify S3/GCS credentials and bucket policy |
| Promotion blocked by policy | Review OPA deny messages in CI output | Fix metadata gaps or request policy exception |
| Stale models not auto-retiring | Lifecycle cron job not running | Check CronJob status in Kubernetes |
| Duplicate model versions | Race condition in CI pipeline | Add locking via registry API or database |
| Missing eval evidence | Eval pipeline skipped or failed | Re-run eval suite and re-register |

## Related Skills

- sbom-supply-chain (`sbom-supply-chain`) - Provenance and signing
- policy-as-code (`policy-as-code`) - Enforce governance with policy engines
- llm-fine-tuning (`llm-fine-tuning`) - Version adapters and training outputs
- llmops-platform-engineering (`llmops-platform-engineering`) - Platform CI/CD and promotion workflows
- ai-sre-incident-response (`ai-sre-incident-response`) - Incident response for model issues

## Limitations

- Guidance executes against real environments: confirm target, blast radius, and rollback plan before applying anything.
- Never deploy to production without explicit approval. Docs-only import: upstream scripts and templates not bundled.

### Example

```bash
git status && git diff --stat
kubectl diff -f manifest.yaml
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.
