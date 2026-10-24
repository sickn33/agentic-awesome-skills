# Details (moved from SKILL.md)

> Extended reference content for `gcp-secret-manager`, kept under `references/` so the entrypoint stays within the audit budget.

## Secret Rotation with Cloud Functions

Rotation notifications do not rotate an external credential by themselves. A
production handler needs these explicit steps:

1. Authenticate the delivery and parse its documented Pub/Sub envelope/attributes;
   match the exact allowed secret resource and SECRET_ROTATE event. The CloudEvent
   does not supply a top-level name field as assumed by a generic handler.
2. Acquire an idempotency/rotation lock keyed to the event ID and secret. Pub/Sub
   can redeliver; retries must not create uncontrolled versions.
3. Generate a secret using the target system's accepted policy and update that
   system through a supported rotation mechanism with overlap/rollback support.
4. Store the new version, verify access and health with staging consumers, then
   roll out a pinned numeric version. Revoke the old target credential only after
   successful adoption. Record metadata/status without secret payloads.
5. Alert and retain an auditable pending/failed state when any step fails; no
   success message can substitute for verified target-system rotation.

### Secret Manager rotation notification schedule (not a Cloud Scheduler job)

```bash
# Create a Pub/Sub topic for rotation events
gcloud pubsub topics create secret-rotation

# Configure secret to publish rotation events
gcloud secrets update db-password \
  --add-topics="projects/my-project/topics/secret-rotation"

# Set up rotation schedule
gcloud secrets update db-password \
  --next-rotation-time="2030-04-01T00:00:00Z" \
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
    next_rotation_time = "2030-04-01T00:00:00Z"
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


Primary references: [rotation recommendations](https://cloud.google.com/secret-manager/docs/rotation-recommendations), [version aliases](https://cloud.google.com/secret-manager/docs/assign-alias-to-secret-version), [IAM](https://cloud.google.com/secret-manager/docs/access-control). Rotation topics require the Secret Manager service agent to publish and a configured subscriber; this guide does not deploy them. Date placeholders must be replaced with valid future RFC3339 values before CLI/Terraform validation. Labels do not enable rotation or prove a password changed.
