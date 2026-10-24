---
name: gcp-cloud-run
description: Specialized skill for building production-ready serverless
  applications on GCP. Covers Cloud Run services (containerized), Cloud Run
  Functions (event-driven), cold start optimization, and event-driven
  architecture with Pub/Sub.
risk: critical
source: vibeship-spawner-skills (Apache 2.0)
date_added: 2026-02-27
---

# GCP Cloud Run

Specialized skill for building production-ready serverless applications on GCP.
Covers Cloud Run services (containerized), Cloud Run Functions (event-driven),
cold start optimization, and event-driven architecture with Pub/Sub.

<!-- Modified 2026-10-23: scoped deployment and reliability limits. -->

## Deployment prerequisites

Examples are incomplete integration sketches: application helpers, IAM roles, queues, regions and health/startup probes must be supplied. Select an authorized project/service and budget, private ingress/auth by default, versioned Artifact Registry image and rollback revision. Historical nodejs20/GCR examples require supported-runtime and registry migration checks. Bound max instances and aggregate DB connections; minimum instances and boosts incur costs. A 2xx response must follow completed or durably enqueued work, with idempotency for retries. psutil host-memory readings may not reflect the container cgroup limit; use Cloud Monitoring/container metrics.

## Detailed Guide

Read [the detailed guide](references/detailed-guide.md) before executing this skill. It retains the complete procedure and reference material. Treat its safety, prerequisites, and validation requirements as mandatory. For focused work, load the relevant sections; for end-to-end work, read the guide completely.

## Calculate memory including /tmp usage

```yaml
# cloudbuild.yaml
steps:
  - name: 'gcr.io/cloud-builders/gcloud'
    args:
      - 'run'
      - 'deploy'
      - 'my-service'
      - '--memory=1Gi'  # Include /tmp overhead
      - '--image=gcr.io/$PROJECT_ID/my-service'
```

## Monitor memory usage

```python
import psutil
import logging

def log_memory():
    memory = psutil.virtual_memory()
    logging.info(f"Memory: {memory.percent}% used, "
                f"{memory.available / 1024 / 1024:.0f}MB available")
```

### Concurrency=1 Causes Scaling Bottlenecks

Severity: HIGH

Situation: Setting concurrency to 1 for request isolation

Symptoms:
Auto-scaling creates many container instances.
High latency during traffic spikes.
Increased cold starts.
Higher costs from more instances.

Why this breaks:
Setting concurrency to 1 means each container handles only one
request at a time. During traffic spikes:

- 100 simultaneous in-flight requests may need up to 100 instances, subject to capacity, queuing and limits
- Each instance has cold start overhead
- More instances = higher costs
- Scaling takes time, requests queue up

This should only be used when:
- Processing is truly single-threaded
- Memory-heavy per-request processing
- Using thread-unsafe libraries

Recommended fix: Load-test a concurrency matching handler thread safety, peak memory, latency and downstream connection limits; concurrency 1 can be appropriate.

## When to Use
Use this skill when the request clearly matches the capabilities and patterns described above.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
