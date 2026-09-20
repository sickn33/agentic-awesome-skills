---
name: gcp-secret-manager
description: Secure secrets in Google Cloud Secret Manager. Configure IAM policies,
  integrate with GKE, and manage secret versions. Use when managing secrets in GCP
  environments.
category: security
risk: critical
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

# GCP Secret Manager

Store and manage secrets securely in Google Cloud Platform.

## Prerequisites

- GCP project with billing enabled
- `gcloud` CLI installed and authenticated
- Secret Manager API enabled (`secretmanager.googleapis.com`)
- IAM permissions: `roles/secretmanager.admin` for management, `roles/secretmanager.secretAccessor` for reading
- For GKE: Workload Identity configured on the cluster

## Enable the API

```bash
# Enable Secret Manager API
gcloud services enable secretmanager.googleapis.com

# Verify it's enabled
gcloud services list --enabled --filter="name:secretmanager"
```

## Secret Creation and Management

```bash
# Create a secret (creates the secret resource, not the value)
gcloud secrets create db-password \
  --replication-policy="automatic" \
  --labels="env=production,team=platform"

# Add the secret value (first version)
echo -n "S3cur3P@ssw0rd!" | gcloud secrets versions add db-password --data-file=-

# Create secret with value in one command
echo -n '{"username":"dbadmin","password":"S3cur3P@ss!","host":"10.0.1.5","port":5432}' | \
  gcloud secrets create db-credentials --data-file=- \
  --replication-policy="automatic" \
  --labels="env=production,team=platform"

# Create with specific region replication
gcloud secrets create regional-secret \
  --replication-policy="user-managed" \
  --locations="us-central1,us-east1"

# Create with customer-managed encryption key (CMEK)
gcloud secrets create sensitive-secret \
  --replication-policy="user-managed" \
  --locations="us-central1" \
  --kms-key-name="projects/my-project/locations/us-central1/keyRings/my-ring/cryptoKeys/my-key"

# Access the latest version
gcloud secrets versions access latest --secret=db-password

# Access a specific version
gcloud secrets versions access 3 --secret=db-password

# Add a new version (rotation)
echo -n "N3wS3cur3P@ss!" | gcloud secrets versions add db-password --data-file=-

# List all secrets
gcloud secrets list --format="table(name, createTime, labels)"

# List versions of a secret
gcloud secrets versions list db-password --format="table(name, state, createTime)"

# Disable a version (makes it inaccessible but recoverable)
gcloud secrets versions disable 1 --secret=db-password

# Enable a disabled version
gcloud secrets versions enable 1 --secret=db-password

# Destroy a version (permanent)
gcloud secrets versions destroy 1 --secret=db-password

# Delete the entire secret
gcloud secrets delete db-password

# Set expiration on a secret
gcloud secrets update db-password \
  --expire-time="2026-06-01T00:00:00Z"

# Set TTL-based expiration
gcloud secrets update temp-token \
  --ttl="2592000s"  # 30 days

# Update labels
gcloud secrets update db-password \
  --update-labels="rotation=enabled,last-rotated=2025-01-15"

# Add version aliases
gcloud secrets versions update 5 --secret=db-password --set-aliases="production"
```

## IAM Bindings

```bash
# Grant secret accessor role to a service account
gcloud secrets add-iam-policy-binding db-password \
  --member="serviceAccount:myapp-sa@my-project.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Grant access to a specific secret version
gcloud secrets add-iam-policy-binding db-password \
  --member="serviceAccount:myapp-sa@my-project.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretVersionAccessor" \
  --condition='expression=resource.name.endsWith("versions/latest"),title=latest-only'

# Grant admin to security team
gcloud secrets add-iam-policy-binding db-password \
  --member="group:security-team@example.com" \
  --role="roles/secretmanager.admin"

# View IAM policy for a secret
gcloud secrets get-iam-policy db-password

# Remove access
gcloud secrets remove-iam-policy-binding db-password \
  --member="serviceAccount:old-sa@my-project.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Project-level IAM for all secrets
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:myapp-sa@my-project.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --condition='expression=resource.name.startsWith("projects/my-project/secrets/myapp-"),title=myapp-secrets-only'
```

## Workload Identity for GKE

```bash
# Enable Workload Identity on cluster (if not already)
gcloud container clusters update my-cluster \
  --zone us-central1-a \
  --workload-pool=my-project.svc.id.goog

# Create GCP service account for the workload
gcloud iam service-accounts create myapp-gke-sa \
  --display-name="MyApp GKE Service Account"

# Grant secret accessor role
gcloud secrets add-iam-policy-binding db-password \
  --member="serviceAccount:myapp-gke-sa@my-project.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Bind Kubernetes SA to GCP SA
gcloud iam service-accounts add-iam-policy-binding \
  myapp-gke-sa@my-project.iam.gserviceaccount.com \
  --role="roles/iam.workloadIdentityUser" \
  --member="serviceAccount:my-project.svc.id.goog[production/myapp-sa]"
```

### Kubernetes Manifests

```yaml
# Kubernetes service account annotated with GCP SA
apiVersion: v1
kind: ServiceAccount
metadata:
  name: myapp-sa
  namespace: production
  annotations:
    iam.gke.io/gcp-service-account: "myapp-gke-sa@my-project.iam.gserviceaccount.com"
---
# Secrets Store CSI Driver for GCP
apiVersion: secrets-store.csi.x-k8s.io/v1
kind: SecretProviderClass
metadata:
  name: gcp-secrets
  namespace: production
spec:
  provider: gcp
  parameters:
    secrets: |
      - resourceName: "projects/my-project/secrets/db-password/versions/latest"
        path: "db-password"
      - resourceName: "projects/my-project/secrets/db-credentials/versions/latest"
        path: "db-credentials"
      - resourceName: "projects/my-project/secrets/api-key/versions/latest"
        path: "api-key"
  secretObjects:
    - secretName: myapp-secrets
      type: Opaque
      data:
        - objectName: db-password
          key: DB_PASSWORD
        - objectName: api-key
          key: API_KEY
---
# Deployment using the secrets
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      serviceAccountName: myapp-sa
      containers:
        - name: myapp
          image: gcr.io/my-project/myapp:v1.0.0
          env:
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: myapp-secrets
                  key: DB_PASSWORD
          volumeMounts:
            - name: secrets
              mountPath: "/var/secrets"
              readOnly: true
      volumes:
        - name: secrets
          csi:
            driver: secrets-store.csi.k8s.io
            readOnly: true
            volumeAttributes:
              secretProviderClass: "gcp-secrets"
```

## Application SDK Examples

### Python

```python
from google.cloud import secretmanager
from google.api_core import exceptions
import json

def get_secret(project_id: str, secret_id: str, version: str = "latest") -> str:
    """Access a secret version from GCP Secret Manager."""
    client = secretmanager.SecretManagerServiceClient()
    name = f"projects/{project_id}/secrets/{secret_id}/versions/{version}"

    try:
        response = client.access_secret_version(request={"name": name})
        return response.payload.data.decode("UTF-8")
    except exceptions.NotFound:
        raise ValueError(f"Secret {secret_id} version {version} not found")
    except exceptions.PermissionDenied:
        raise PermissionError(f"No access to secret {secret_id}")

def get_json_secret(project_id: str, secret_id: str) -> dict:
    """Access and parse a JSON secret."""
    raw = get_secret(project_id, secret_id)
    return json.loads(raw)

def create_secret(project_id: str, secret_id: str, value: str, labels: dict = None) -> str:
    """Create a new secret with an initial version."""
    client = secretmanager.SecretManagerServiceClient()
    parent = f"projects/{project_id}"

    secret_config = {
        "replication": {"automatic": {}},
    }
    if labels:
        secret_config["labels"] = labels

    secret = client.create_secret(
        request={"parent": parent, "secret_id": secret_id, "secret": secret_config}
    )

    client.add_secret_version(
        request={"parent": secret.name, "payload": {"data": value.encode("UTF-8")}}
    )
    return secret.name

def rotate_secret(project_id: str, secret_id: str, new_value: str) -> str:
    """Add a new version to rotate the secret."""
    client = secretmanager.SecretManagerServiceClient()
    parent = f"projects/{project_id}/secrets/{secret_id}"

    version = client.add_secret_version(
        request={"parent": parent, "payload": {"data": new_value.encode("UTF-8")}}
    )
    return version.name

def list_secrets(project_id: str, filter_str: str = "") -> list:
    """List all secrets in a project."""
    client = secretmanager.SecretManagerServiceClient()
    parent = f"projects/{project_id}"

    secrets = []
    for secret in client.list_secrets(request={"parent": parent, "filter": filter_str}):
        secrets.append({
            "name": secret.name.split("/")[-1],
            "created": secret.create_time.isoformat(),
            "labels": dict(secret.labels),
        })
    return secrets

# Usage
creds = get_json_secret("my-project", "db-credentials")
connection_string = (
    f"postgresql://{creds['username']}:{creds['password']}"
    f"@{creds['host']}:{creds['port']}/mydb"
)
```

### Go

```go
package main

import (
    "context"
    "fmt"
    "log"

    secretmanager "cloud.google.com/go/secretmanager/apiv1"
    secretmanagerpb "cloud.google.com/go/secretmanager/apiv1/secretmanagerpb"
)

func getSecret(projectID, secretID, version string) (string, error) {
    ctx := context.Background()
    client, err := secretmanager.NewClient(ctx)
    if err != nil {
        return "", fmt.Errorf("failed to create client: %w", err)
    }
    defer client.Close()

    name := fmt.Sprintf("projects/%s/secrets/%s/versions/%s", projectID, secretID, version)
    result, err := client.AccessSecretVersion(ctx, &secretmanagerpb.AccessSecretVersionRequest{
        Name: name,
    })
    if err != nil {
        return "", fmt.Errorf("failed to access secret: %w", err)
    }

    return string(result.Payload.Data), nil
}

func main() {
    secret, err := getSecret("my-project", "db-password", "latest")
    if err != nil {
        log.Fatalf("Error: %v", err)
    }
    fmt.Printf("Secret: %s\n", secret)
}
```

### Node.js

```javascript
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

const client = new SecretManagerServiceClient();

async function getSecret(projectId, secretId, version = 'latest') {
  const name = `projects/${projectId}/secrets/${secretId}/versions/${version}`;
  const [response] = await client.accessSecretVersion({ name });
  return response.payload.data.toString('utf8');
}

async function main() {
  const password = await getSecret('my-project', 'db-password');
  console.log(`Secret retrieved, length: ${password.length}`);
}

main().catch(console.error);
```


## Contents

- [Secret Rotation with Cloud Functions](references/details.md)
- [Terraform Configuration](references/details.md)
- [Troubleshooting](references/details.md)
- [Best Practices](references/details.md)
- [Related Skills](references/details.md)

## When to Use This Skill

Use this skill when:
- Managing secrets in GCP environments
- Integrating secrets with GKE workloads via Workload Identity
- Storing API keys, database credentials, or TLS certificates
- Implementing secret versioning and rotation
- Meeting compliance requirements for centralized secret management

## Limitations

- Apply guidance only within authorized scope; test destructive steps in non-production first.
- Docs-only import: upstream scripts and templates not bundled.

### Example

```bash
# Read-only first: inventory before any active step.
which <tool> && <tool> --help | head -n 20
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.
