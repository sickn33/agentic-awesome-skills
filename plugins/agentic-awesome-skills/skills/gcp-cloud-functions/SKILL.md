---
name: gcp-cloud-functions
description: Deploy serverless functions on Google Cloud Functions. Configure triggers
  and manage deployments. Use when implementing serverless workloads on GCP.
category: devops
risk: critical
source: https://github.com/BagelHole/DevOps-Security-Agent-Skills
source_repo: BagelHole/DevOps-Security-Agent-Skills
source_type: community
date_added: '2026-09-20'
license: MIT
license_source: https://github.com/BagelHole/DevOps-Security-Agent-Skills/blob/main/LICENSE
compatibility: Requires the relevant OS/platform tooling and privileged access where
  noted. Docs-only; helper scripts and templates not bundled.
metadata:
  author: devops-skills
  version: '1.0'
---

# GCP Cloud Functions

Build and deploy event-driven serverless applications with Google Cloud Functions (Gen1 and Gen2).

## When to Use

- Processing webhooks, API endpoints, or lightweight HTTP backends
- Reacting to events from Pub/Sub, Cloud Storage, Firestore, or Eventarc
- Running scheduled tasks (cron) without maintaining a server
- Building data-processing pipelines triggered by file uploads
- Prototyping microservices before committing to Cloud Run or GKE

## Prerequisites

- Google Cloud SDK (`gcloud`) installed and authenticated
- APIs enabled: Cloud Functions, Cloud Build, Artifact Registry, Cloud Run (Gen2)
- IAM role `roles/cloudfunctions.developer` (or `roles/run.developer` for Gen2)

```bash
gcloud services enable cloudfunctions.googleapis.com cloudbuild.googleapis.com \
  artifactregistry.googleapis.com run.googleapis.com eventarc.googleapis.com
```

## Gen1 vs Gen2 Comparison

| Feature | Gen1 | Gen2 (recommended) |
|---------|------|---------------------|
| Runtime | Cloud Functions infra | Built on Cloud Run |
| Max timeout | 9 minutes | 60 minutes |
| Max memory | 8 GB | 32 GB |
| Concurrency | 1 request/instance | Up to 1000/instance |
| Traffic splitting | No | Yes |
| Eventarc triggers | No | Yes |

## Deploy an HTTP Function (Gen2)

```bash
# Python HTTP function
gcloud functions deploy hello-http \
  --gen2 --region=us-central1 --runtime=python312 \
  --trigger-http --allow-unauthenticated \
  --entry-point=hello_http \
  --memory=256Mi --timeout=60s \
  --min-instances=0 --max-instances=100 \
  --set-env-vars=APP_ENV=production --source=.

# Node.js HTTP function
gcloud functions deploy hello-node \
  --gen2 --region=us-central1 --runtime=nodejs20 \
  --trigger-http --allow-unauthenticated \
  --entry-point=helloNode --memory=256Mi --source=.
```

## Deploy a Pub/Sub Triggered Function

```bash
gcloud pubsub topics create order-events

gcloud functions deploy process-order \
  --gen2 --region=us-central1 --runtime=python312 \
  --trigger-topic=order-events \
  --entry-point=process_order \
  --memory=512Mi --timeout=120s --retry \
  --service-account=order-processor@${PROJECT_ID}.iam.gserviceaccount.com \
  --source=.
```

## Deploy a Cloud Storage Triggered Function

```bash
gcloud functions deploy process-upload \
  --gen2 --region=us-central1 --runtime=python312 \
  --trigger-event-filters="type=google.cloud.storage.object.v1.finalized" \
  --trigger-event-filters="bucket=my-upload-bucket" \
  --entry-point=process_upload \
  --memory=1Gi --timeout=300s --source=.
```

## Deploy a Scheduled Function

```bash
gcloud functions deploy daily-cleanup \
  --gen2 --region=us-central1 --runtime=python312 \
  --trigger-http --no-allow-unauthenticated \
  --entry-point=daily_cleanup --source=.

gcloud scheduler jobs create http daily-cleanup-job \
  --schedule="0 2 * * *" \
  --uri="https://us-central1-${PROJECT_ID}.cloudfunctions.net/daily-cleanup" \
  --http-method=POST \
  --oidc-service-account-email=scheduler-sa@${PROJECT_ID}.iam.gserviceaccount.com \
  --location=us-central1
```

## Python Function Examples

```python
# main.py
import functions_framework
import base64, json
from flask import jsonify
from google.cloud import firestore

@functions_framework.http
def hello_http(request):
    """HTTP Cloud Function."""
    name = request.args.get("name", "World")
    return jsonify({"message": f"Hello, {name}!", "status": "ok"}), 200

@functions_framework.cloud_event
def process_order(cloud_event):
    """Triggered by a Pub/Sub message."""
    data = base64.b64decode(cloud_event.data["message"]["data"]).decode("utf-8")
    order = json.loads(data)
    db = firestore.Client()
    db.collection("orders").document(order["id"]).set({
        "status": "processing", "items": order["items"], "total": order["total"],
    })

@functions_framework.cloud_event
def process_upload(cloud_event):
    """Triggered when a file is uploaded to Cloud Storage."""
    data = cloud_event.data
    bucket_name, file_name = data["bucket"], data["name"]
    if not file_name.lower().endswith((".png", ".jpg", ".jpeg")):
        return
    from google.cloud import vision
    client = vision.ImageAnnotatorClient()
    image = vision.Image(source=vision.ImageSource(
        gcs_image_uri=f"gs://{bucket_name}/{file_name}"))
    labels = [l.description for l in client.label_detection(image=image).label_annotations]
    print(f"Labels for {file_name}: {labels}")
```

```
# requirements.txt
functions-framework==3.*
google-cloud-firestore==2.*
google-cloud-storage==2.*
google-cloud-vision==3.*
flask>=2.0
```

## Node.js Function Examples

```javascript
// index.js
const functions = require("@google-cloud/functions-framework");

functions.http("helloNode", (req, res) => {
  const name = req.query.name || "World";
  res.json({ message: `Hello, ${name}!`, status: "ok" });
});

functions.cloudEvent("processMessage", (cloudEvent) => {
  const data = Buffer.from(cloudEvent.data.message.data, "base64").toString();
  console.log(`Processing: ${JSON.parse(data)}`);
});
```

## Managing Deployed Functions

```bash
gcloud functions list --gen2 --region=us-central1
gcloud functions describe hello-http --gen2 --region=us-central1
gcloud functions logs read hello-http --gen2 --region=us-central1 --limit=50
gcloud functions delete hello-http --gen2 --region=us-central1 --quiet

# Update env vars without redeploying code
gcloud functions deploy hello-http --gen2 --region=us-central1 \
  --update-env-vars=APP_ENV=staging

# Test locally before deploying
functions-framework --target=hello_http --port=8080
```

## Terraform Configuration

```hcl
resource "google_cloudfunctions2_function" "api" {
  name     = "hello-http"
  location = "us-central1"

  build_config {
    runtime     = "python312"
    entry_point = "hello_http"
    source {
      storage_source {
        bucket = google_storage_bucket.source.name
        object = google_storage_bucket_object.source.name
      }
    }
  }

  service_config {
    min_instance_count    = 0
    max_instance_count    = 100
    available_memory      = "256Mi"
    timeout_seconds       = 60
    service_account_email = google_service_account.fn.email
    environment_variables = { APP_ENV = "production" }
  }
}

resource "google_cloud_run_service_iam_member" "invoker" {
  location = google_cloudfunctions2_function.api.location
  service  = google_cloudfunctions2_function.api.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloudfunctions2_function" "processor" {
  name     = "process-order"
  location = "us-central1"

  build_config {
    runtime     = "python312"
    entry_point = "process_order"
    source {
      storage_source {
        bucket = google_storage_bucket.source.name
        object = google_storage_bucket_object.source.name
      }
    }
  }

  service_config {
    max_instance_count    = 50
    available_memory      = "512Mi"
    timeout_seconds       = 120
    service_account_email = google_service_account.fn.email
  }

  event_trigger {
    trigger_region = "us-central1"
    event_type     = "google.cloud.pubsub.topic.v1.messagePublished"
    pubsub_topic   = google_pubsub_topic.orders.id
    retry_policy   = "RETRY_POLICY_RETRY"
  }
}
```

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `PERMISSION_DENIED` on deploy | Missing Cloud Build or Artifact Registry perms | Grant `roles/cloudbuild.builds.builder` to Cloud Build SA |
| Function deploys but returns 403 | Missing `roles/run.invoker` for Gen2 | Add `--allow-unauthenticated` or grant invoker role |
| Cold start latency > 5s | Large dependencies or no min instances | Set `--min-instances=1`; reduce deps; use lazy imports |
| Pub/Sub messages redelivered | Function errors or times out | Increase `--timeout`; fix error handling; add dead-letter topic |
| `Build failed` during deploy | Syntax error or missing dependency | Check `gcloud builds log`; verify requirements.txt |
| Cannot connect to VPC resource | Function not on VPC connector | Add `--vpc-connector=my-connector` to deploy |

## Related Skills

- **gcp-networking** - VPC connectors for accessing private resources from functions
- **gcp-cloud-sql** - Connecting Cloud Functions to managed databases
- **terraform-gcp** - Deploy Cloud Functions with Infrastructure as Code
- **gcp-gke** - When workloads outgrow serverless and need Kubernetes

## Limitations

- Infrastructure commands can disrupt services: confirm target host/scope and have backups/snapshots before mutating state.
- Docs-only import: upstream scripts and templates not bundled.

