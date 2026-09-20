# Details (moved from SKILL.md)

> Extended reference content for `gcp-secret-manager`, kept under `references/` so the entrypoint stays within the audit budget.

## Secret Rotation with Cloud Functions

```python
"""cloud_function_rotation.py - Triggered by Pub/Sub on secret rotation events."""

import functions_framework
from google.cloud import secretmanager
import secrets
import string

@functions_framework.cloud_event
def rotate_secret(cloud_event):
    """Handle secret rotation events from Pub/Sub."""
    data = cloud_event.data
    secret_name = data.get("name", "")

    if "db-password" not in secret_name:
        print(f"Skipping non-DB secret: {secret_name}")
        return

    client = secretmanager.SecretManagerServiceClient()

    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    new_password = ''.join(secrets.choice(alphabet) for _ in range(32))

    parent = "/".join(secret_name.split("/")[:4])
    client.add_secret_version(
        request={
            "parent": parent,
            "payload": {"data": new_password.encode("UTF-8")},
        }
    )
    print(f"Rotated secret: {parent}")
```

### Rotation Schedule with Cloud Scheduler

```bash
# Create a Pub/Sub topic for rotation events
gcloud pubsub topics create secret-rotation

# Configure secret to publish rotation events
gcloud secrets update db-password \
  --add-topics="projects/my-project/topics/secret-rotation" \
  --event-types="SECRET_ROTATE"

# Set up rotation schedule
gcloud secrets update db-password \
  --next-rotation-time="2025-04-01T00:00:00Z" \
  --rotation-period="2592000s"  # 30 days
```


## Terraform Configuration

```hcl
resource "google_secret_manager_secret" "db_password" {
  project   = var.project_id
  secret_id = "db-password"

  replication {
    auto {}
  }

  labels = {
    env  = "production"
    team = "platform"
  }

  rotation {
    next_rotation_time = "2025-04-01T00:00:00Z"
    rotation_period    = "2592000s"
  }

  topics {
    name = google_pubsub_topic.secret_rotation.id
  }
}

resource "google_secret_manager_secret_version" "db_password" {
  secret      = google_secret_manager_secret.db_password.id
  secret_data = var.db_password
}

resource "google_secret_manager_secret_iam_member" "app_accessor" {
  project   = var.project_id
  secret_id = google_secret_manager_secret.db_password.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.app.email}"
}
```


## Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| "Secret Manager API not enabled" | API not activated in project | Run `gcloud services enable secretmanager.googleapis.com` |
| "Permission denied" on access | Missing `secretAccessor` role | Grant `roles/secretmanager.secretAccessor` on the specific secret |
| Workload Identity not working | K8s SA not bound to GCP SA | Verify annotation on K8s SA; check IAM binding with `workloadIdentityUser` |
| "Secret version is in DISABLED state" | Version was disabled | Enable with `gcloud secrets versions enable VERSION --secret=SECRET` |
| High latency on secret access | No client-side caching | Cache secrets in memory with TTL; use CSI driver for GKE |
| CMEK decrypt fails | KMS key permissions missing | Grant `roles/cloudkms.cryptoKeyEncrypterDecrypter` to Secret Manager SA |
| Rotation function not triggered | Pub/Sub topic not configured | Verify topic is attached to secret; check Cloud Function subscription |


## Best Practices

- Use Workload Identity for GKE instead of exported service account keys
- Implement IAM least-privilege at the individual secret level, not project level
- Enable audit logging for all secret access (Cloud Audit Logs)
- Use secret versions for safe rollback during rotation issues
- Set expiration dates or TTLs on temporary secrets
- Integrate with Cloud KMS for customer-managed encryption keys
- Use labels consistently for organization and automation
- Monitor secret access patterns with Cloud Monitoring
- Implement rotation schedules for all long-lived credentials
- Use conditional IAM bindings to restrict access by resource name pattern


## Related Skills

- hashicorp-vault (`hashicorp-vault`) - Multi-cloud secrets
- gcp-gke (`gcp-gke`) - GKE integration
- aws-secrets-manager (`aws-secrets-manager`) - AWS secret management
- azure-keyvault (`azure-keyvault`) - Azure secret management

