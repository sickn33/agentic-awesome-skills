---
name: gcp-cloud-run
description: Specialized skill for building production-ready serverless
  applications on GCP. Covers Cloud Run services (containerized), Cloud Run
  Functions (event-driven), cold start optimization, and event-driven
  architecture with Pub/Sub.
risk: unknown
source: vibeship-spawner-skills (Apache 2.0)
date_added: 2026-02-27
---

# GCP Cloud Run

Specialized skill for building production-ready serverless applications on GCP.
Covers Cloud Run services (containerized), Cloud Run Functions (event-driven),
cold start optimization, and event-driven architecture with Pub/Sub.

## Principles

- Cloud Run for containers, Functions for simple event handlers
- Optimize for cold starts with startup CPU boost and min instances
- Set concurrency based on workload (start with 8, adjust)
- Memory includes /tmp filesystem - plan accordingly
- Use VPC Connector only when needed (adds latency)
- Containers should start fast and be stateless
- Handle signals gracefully for clean shutdown

## Patterns

### Cloud Run Service Pattern

Containerized web service on Cloud Run

**When to use**: Web applications and APIs,Need any runtime or library,Complex services with multiple endpoints,Stateless containerized workloads

```dockerfile
# Dockerfile - Multi-stage build for smaller image
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-slim
WORKDIR /app

# Copy only production dependencies
COPY --from=builder /app/node_modules ./node_modules
COPY src ./src
COPY package.json ./

# Cloud Run uses PORT env variable
ENV PORT=8080
EXPOSE 8080

# Run as non-root user
USER node

CMD ["node", "src/index.js"]
```

```javascript
// src/index.js
const express = require('express');
const app = express();

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// API routes
app.get('/api/items/:id', async (req, res) => {
  try {
    const item = await getItem(req.params.id);
    res.json(item);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

const PORT = process.env.PORT || 8080;
const server = app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
```

```yaml
# cloudbuild.yaml
steps:
  # Build the container image
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/my-service:$COMMIT_SHA', '.']

  # Push the container image
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/my-service:$COMMIT_SHA']

  # Deploy to Cloud Run
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'my-service'
      - '--image=gcr.io/$PROJECT_ID/my-service:$COMMIT_SHA'
      - '--region=us-central1'
      - '--platform=managed'
      - '--allow-unauthenticated'
      - '--memory=512Mi'
      - '--cpu=1'
      - '--min-instances=1'
      - '--max-instances=100'
      - '--concurrency=80'
      - '--cpu-boost'

images:
  - 'gcr.io/$PROJECT_ID/my-service:$COMMIT_SHA'
```

### Structure

project/
├── Dockerfile
├── .dockerignore
├── src/
│   ├── index.js
│   └── routes/
├── package.json
└── cloudbuild.yaml

### Gcloud_deploy

# Direct gcloud deployment
gcloud run deploy my-service \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 1 \
  --max-instances 100 \
  --concurrency 80 \
  --cpu-boost

### Cloud Run Functions Pattern

Event-driven functions (formerly Cloud Functions)

**When to use**: Simple event handlers,Pub/Sub message processing,Cloud Storage triggers,HTTP webhooks

```javascript
// HTTP Function
// index.js
const functions = require('@google-cloud/functions-framework');

functions.http('helloHttp', (req, res) => {
  const name = req.query.name || req.body.name || 'World';
  res.send(`Hello, ${name}!`);
});
```

```javascript
// Pub/Sub Function
const functions = require('@google-cloud/functions-framework');

functions.cloudEvent('processPubSub', (cloudEvent) => {
  // Decode Pub/Sub message
  const message = cloudEvent.data.message;
  const data = message.data
    ? JSON.parse(Buffer.from(message.data, 'base64').toString())
    : {};

  console.log('Received message:', data);

  // Process message
  processMessage(data);
});
```

```javascript
// Cloud Storage Function
const functions = require('@google-cloud/functions-framework');

functions.cloudEvent('processStorageEvent', async (cloudEvent) => {
  const file = cloudEvent.data;

  console.log(`Event: ${cloudEvent.type}`);
  console.log(`Bucket: ${file.bucket}`);
  console.log(`File: ${file.name}`);

  if (cloudEvent.type === 'google.cloud.storage.object.v1.finalized') {
    await processUploadedFile(file.bucket, file.name);
  }
});
```

```bash
# Deploy HTTP function
gcloud functions deploy hello-http \
  --gen2 \
  --runtime nodejs20 \
  --trigger-http \
  --allow-unauthenticated \
  --region us-central1

# Deploy Pub/Sub function
gcloud functions deploy process-messages \
  --gen2 \
  --runtime nodejs20 \
  --trigger-topic my-topic \
  --region us-central1

# Deploy Cloud Storage function
gcloud functions deploy process-uploads \
  --gen2 \
  --runtime nodejs20 \
  --trigger-event-filters="type=google.cloud.storage.object.v1.finalized" \
  --trigger-event-filters="bucket=my-bucket" \
  --region us-central1
```

### Cold Start Optimization Pattern

Minimize cold start latency for Cloud Run

**When to use**: Latency-sensitive applications,User-facing APIs,High-traffic services

## 1. Enable Startup CPU Boost

```bash
gcloud run deploy my-service \
  --cpu-boost \
  --region us-central1
```

## 2. Set Minimum Instances

```bash
gcloud run deploy my-service \
  --min-instances 1 \
  --region us-central1
```

## 3. Optimize Container Image

```dockerfile
# Use distroless for minimal image
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM gcr.io/distroless/nodejs20-debian12
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY src ./src
CMD ["src/index.js"]
```

## 4. Lazy Initialize Heavy Dependencies

```javascript
// Lazy load heavy libraries
let bigQueryClient = null;

function getBigQueryClient() {
  if (!bigQueryClient) {
    const { BigQuery } = require('@google-cloud/bigquery');
    bigQueryClient = new BigQuery();
  }
  return bigQueryClient;
}

// Only initialize when needed
app.get('/api/analytics', async (req, res) => {
  const client = getBigQueryClient();
  const results = await client.query({...});
  res.json(results);
});
```

## 5. Increase Memory (More CPU)

```bash
# Higher memory = more CPU during startup
gcloud run deploy my-service \
  --memory 1Gi \
  --cpu 2 \
  --region us-central1
```

### Optimization_impact

- Startup_cpu_boost: 50% faster cold starts
- Min_instances: Eliminates cold starts for traffic spikes
- Distroless_image: Smaller attack surface, faster pull
- Lazy_init: Defers heavy loading to first request

### Concurrency Configuration Pattern

Proper concurrency settings for Cloud Run

**When to use**: Need to optimize instance utilization,Handle traffic spikes efficiently,Reduce cold starts

## Understanding Concurrency

```bash
# Default concurrency is 80
# Adjust based on your workload

# For I/O-bound workloads (most web apps)
gcloud run deploy my-service \
  --concurrency 80 \
  --cpu 1

# For CPU-bound workloads
gcloud run deploy my-service \
  --concurrency 1 \
  --cpu 1

# For memory-intensive workloads
gcloud run deploy my-service \
  --concurrency 10 \
  --memory 2Gi
```

## Node.js Concurrency

```javascript
// Node.js is single-threaded but handles I/O concurrently
// Use async/await for all I/O operations

// GOOD - async I/O
app.get('/api/data', async (req, res) => {
  const [users, products] = await Promise.all([
    fetchUsers(),
    fetchProducts()
  ]);
  res.json({ users, products });
});

// BAD - blocking operation
app.get('/api/compute', (req, res) => {
  const result = heavyCpuOperation(); // Blocks other requests!
  res.json(result);
});
```

## Python Concurrency with Gunicorn

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

# 4 workers for concurrency
CMD exec gunicorn --bind :$PORT --workers 4 --threads 2 main:app
```

```python
# main.py
from flask import Flask
app = Flask(__name__)

@app.route('/api/data')
def get_data():
    return {'status': 'ok'}
```

### Concurrency_guidelines

- Concurrency=1: Only for CPU-bound or unsafe code
- Concurrency=8 20: Memory-intensive workloads
- Concurrency=80: Default, good for I/O-bound
- Concurrency=250: Maximum, for very lightweight handlers

### Pub/Sub Integration Pattern

Event-driven processing with Cloud Pub/Sub

**When to use**: Asynchronous message processing,Decoupled microservices,Event-driven architecture

## Push Subscription to Cloud Run

```bash
# Create topic
gcloud pubsub topics create orders

# Create push subscription to Cloud Run
gcloud pubsub subscriptions create orders-push \
  --topic orders \
  --push-endpoint https://my-service-xxx.run.app/pubsub \
  --ack-deadline 600
```

```javascript
// Handle Pub/Sub push messages
const express = require('express');
const app = express();
app.use(express.json());

app.post('/pubsub', async (req, res) => {
  // Verify the request is from Pub/Sub
  if (!req.body.message) {
    return res.status(400).send('Invalid Pub/Sub message');
  }

  try {
    // Decode message data
    const message = req.body.message;
    const data = message.data
      ? JSON.parse(Buffer.from(message.data, 'base64').toString())
      : {};

    console.log('Processing order:', data);

    await processOrder(data);

    // Return 200 to acknowledge
    res.status(200).send('OK');
  } catch (error) {
    console.error('Processing failed:', error);
    // Return 500 to trigger retry
    res.status(500).send('Processing failed');
  }
});
```

## Publishing Messages

```javascript
const { PubSub } = require('@google-cloud/pubsub');
const pubsub = new PubSub();

async function publishOrder(order) {
  const topic = pubsub.topic('orders');
  const messageBuffer = Buffer.from(JSON.stringify(order));

  const messageId = await topic.publishMessage({
    data: messageBuffer,
    attributes: {
      type: 'order_created',
      priority: 'high'
    }
  });

  console.log(`Published message ${messageId}`);
  return messageId;
}
```

## Dead Letter Queue

```bash
# Create DLQ topic
gcloud pubsub topics create orders-dlq

# Update subscription with DLQ
gcloud pubsub subscriptions update orders-push \
  --dead-letter-topic orders-dlq \
  --max-delivery-attempts 5
```

### Cloud SQL Connection Pattern

Connect Cloud Run to Cloud SQL securely

**When to use**: Need relational database,Migrating existing applications,Complex queries and transactions

```bash
# Deploy with Cloud SQL connection
gcloud run deploy my-service \
  --add-cloudsql-instances PROJECT:REGION:INSTANCE \
  --set-env-vars INSTANCE_CONNECTION_NAME="PROJECT:REGION:INSTANCE" \
  --set-env-vars DB_NAME="mydb" \
  --set-env-vars DB_USER="myuser"
```

```javascript
// Using Unix socket connection
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  // Cloud SQL connector uses Unix socket
  host: `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`,
  max: 5,  // Connection pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

app.get('/api/users', async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM users LIMIT 100');
    res.json(result.rows);
  } finally {
    client.release();
  }
});
```

```python
# Python with SQLAlchemy
import os
from sqlalchemy import create_engine

def get_engine():
    instance_connection_name = os.environ["INSTANCE_CONNECTION_NAME"]
    db_user = os.environ["DB_USER"]
    db_pass = os.environ["DB_PASS"]
    db_name = os.environ["DB_NAME"]

    engine = create_engine(
        f"postgresql+pg8000://{db_user}:{db_pass}@/{db_name}",
        connect_args={
            "unix_sock": f"/cloudsql/{instance_connection_name}/.s.PGSQL.5432"
        },
        pool_size=5,
        max_overflow=2,
        pool_timeout=30,
        pool_recycle=1800,
    )
    return engine
```

### Best_practices

- Use connection pooling (max 5-10 per instance)
- Set appropriate idle timeouts
- Handle connection errors gracefully
- Consider Cloud SQL Proxy for local development

### Secret Manager Integration

Securely manage secrets in Cloud Run

**When to use**: API keys, database passwords,Service account keys,Any sensitive configuration

```bash
# Create secret
echo -n "my-secret-value" | gcloud secrets create my-secret --data-file=-

# Mount as environment variable
gcloud run deploy my-service \
  --update-secrets=API_KEY=my-secret:latest

# Mount as file volume
gcloud run deploy my-service \
  --update-secrets=/secrets/api-key=my-secret:latest
```

```javascript
// Access mounted as environment variable
const apiKey = process.env.API_KEY;

// Access mounted as file
const fs = require('fs');
const apiKey = fs.readFileSync('/secrets/api-key', 'utf8');

// Access via Secret Manager API (when not mounted)
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const client = new SecretManagerServiceClient();

async function getSecret(name) {
  const [version] = await client.accessSecretVersion({
    name: `projects/${projectId}/secrets/${name}/versions/latest`
  });
  return version.payload.data.toString();
}
```

## Sharp Edges

### /tmp Filesystem Counts Against Memory

Severity: HIGH

Situation: Writing files to /tmp directory in Cloud Run

Symptoms:
Container killed with OOM error.
Memory usage spikes unexpectedly.
File operations cause container restarts.
"Container memory limit exceeded" in logs.

Why this breaks:
Cloud Run uses an in-memory filesystem for /tmp. Any files written
to /tmp consume memory from your container's allocation.

Common scenarios:
- Downloading files temporarily
- Creating temp processing files
- Libraries caching to /tmp
- Large log buffers

A 512MB container that downloads a 200MB file to /tmp only has
~300MB left for the application.

Recommended fix:

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

## Stream instead of buffering

```python
# BAD - buffers entire file in /tmp
def process_large_file(bucket_name, blob_name):
    blob = bucket.blob(blob_name)
    blob.download_to_filename('/tmp/large_file')
    with open('/tmp/large_file', 'rb') as f:
        process(f.read())

# GOOD - stream processing
def process_large_file(bucket_name, blob_name):
    blob = bucket.blob(blob_name)
    with blob.open('rb') as f:
        for chunk in iter(lambda: f.read(8192), b''):
            process_chunk(chunk)
```

## Use Cloud Storage for large files

```python
from google.cloud import storage

def process_with_gcs(bucket_name, input_blob, output_blob):
    client = storage.Client()
    bucket = client.bucket(bucket_name)

    # Process directly to/from GCS
    input_blob = bucket.blob(input_blob)
    output_blob = bucket.blob(output_blob)

    with input_blob.open('rb') as reader:
        with output_blob.open('wb') as writer:
            for chunk in iter(lambda: reader.read(65536), b''):
                processed = transform(chunk)
                writer.write(processed)
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

- 100 concurrent requests = 100 container instances
- Each instance has cold start overhead
- More instances = higher costs
- Scaling takes time, requests queue up

This should only be used when:
- Processing is truly single-threaded
- Memory-heavy per-request processing
- Using thread-unsafe libraries

Recommended fix:

## Set appropriate concurrency

```bash
# For I/O-bound workloads (most web apps)
gcloud run deploy my-service \
  --concurrency=80 \
  --max-instances=100

# For CPU-bound workloads
gcloud run deploy my-service \
  --concurrency=4 \
  --cpu=2

# Only use 1 when absolutely necessary
gcloud run deploy my-service \
  --concurrency=1 \
  --max-instances=1000  # Be prepared for many instances
```

## Node.js - use async properly

```javascript
// With high concurrency, ensure async operations
const express = require('express');
const app = express();

app.get('/api/data', async (req, res) => {
  // All I/O should be async
  const data = await fetchFromDatabase();
  const enriched = await enrichData(data);
  res.json(enriched);
});

// Concurrency 80+ is safe for async I/O workloads
```

## Python - use async framework

```python
from fastapi import FastAPI
import asyncio
import httpx

app = FastAPI()

@app.get("/api/data")
async def get_data():
    # Async I/O allows high concurrency
    async with httpx.AsyncClient() as client:
        response = await client.get("https://api.example.com/data")
        return response.json()

# Concurrency 80+ safe with async framework
```

## Calculate concurrency

```
concurrency = memory_limit / per_request_memory

Example:
- 512MB container
- 20MB per request overhead
- Safe concurrency: ~25
```

### CPU Throttled When Not Handling Requests

Severity: HIGH

Situation: Running background tasks or processing between requests

Symptoms:
Background tasks run extremely slowly.
Scheduled work doesn't complete.
Metrics collection fails.
Connection keep-alive breaks.

Why this breaks:
By default, Cloud Run throttles CPU to near-zero when not actively
handling a request. This is "CPU only during requests" mode.

Affected operations:
- Background threads
- Connection pool maintenance
- Metrics/telemetry emission
- Scheduled tasks within container
- Cleanup operations after response

Recommended fix:

## Enable CPU always allocated

```bash
# CPU allocated even outside requests
gcloud run deploy my-service \
  --cpu-throttling=false \
  --min-instances=1

# Note: This increases costs but enables background work
```

## Use startup CPU boost for initialization

```bash
# Boost CPU during cold start only
gcloud run deploy my-service \
  --cpu-boost \
  --cpu-throttling=true  # Default, throttle after request
```

## Move background work to Cloud Tasks

```python
from google.cloud import tasks_v2
import json

def create_background_task(payload):
    client = tasks_v2.CloudTasksClient()
    parent = client.queue_path(
        "my-project", "us-central1", "my-queue"
    )

    task = {
        "http_request": {
            "http_method": tasks_v2.HttpMethod.POST,
            "url": "https://my-service.run.app/process",
            "body": json.dumps(payload).encode(),
            "headers": {"Content-Type": "application/json"}
        }
    }

    client.create_task(parent=parent, task=task)

# Handle response immediately, background via Cloud Tasks
@app.post("/api/order")
async def create_order(order: Order):
    order_id = await save_order(order)

    # Queue background processing
    create_background_task({"order_id": order_id})

    return {"order_id": order_id, "status": "processing"}
```

## Use Pub/Sub for async processing

```yaml
# Move heavy processing to separate service
steps:
  # Main service - responds quickly
  - name: 'gcr.io/cloud-builders/gcloud'
    args: ['run', 'deploy', 'api-service',
           '--cpu-throttling=true']

  # Worker service - processes messages
  - name: 'gcr.io/cloud-builders/gcloud'
    args: ['run', 'deploy', 'worker-service',
           '--cpu-throttling=false',
           '--min-instances=1']
```

### VPC Connector 10-Minute Idle Timeout

Severity: MEDIUM

Situation: Cloud Run service connecting to VPC resources

Symptoms:
Connection errors after period of inactivity.
"Connection reset" or "Connection refused" errors.
Sporadic failures to VPC resources.
Database connections drop unexpectedly.

Why this breaks:
Cloud Run's VPC connector has a 10-minute idle timeout on connections.
If a connection is idle for 10 minutes, it's silently closed.

Affects:
- Database connection pools
- Redis connections
- Internal API connections
- Any persistent VPC connection

Recommended fix:

## Configure connection pool with keep-alive

```python
# SQLAlchemy with connection recycling
from sqlalchemy import create_engine

engine = create_engine(
    DATABASE_URL,
    pool_size=5,
    max_overflow=2,
    pool_recycle=300,  # Recycle connections every 5 minutes
    pool_pre_ping=True  # Validate connection before use
)
```

## TCP keep-alive for custom connections

```python
import socket

sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
sock.setsockopt(socket.SOL_SOCKET, socket.SO_KEEPALIVE, 1)
sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_KEEPIDLE, 60)
sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_KEEPINTVL, 60)
sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_KEEPCNT, 5)
```

## Redis with connection validation

```python
import redis

pool = redis.ConnectionPool(
    host=REDIS_HOST,
    port=6379,
    socket_keepalive=True,
    socket_keepalive_options={
        socket.TCP_KEEPIDLE: 60,
        socket.TCP_KEEPINTVL: 60,
        socket.TCP_KEEPCNT: 5
    },
    health_check_interval=30
)
client = redis.Redis(connection_pool=pool)
```

## Use Cloud SQL Proxy sidecar

```yaml
# Use Cloud SQL connector which handles reconnection
# requirements.txt
cloud-sql-python-connector[pg8000]
```

```python
from google.cloud.sql.connector import Connector
import sqlalchemy

connector = Connector()

def getconn():
    return connector.connect(
        "project:region:instance",
        "pg8000",
        user="user",
        password="password",
        db="database"
    )

engine = sqlalchemy.create_engine(
    "postgresql+pg8000://",
    creator=getconn
)
```

### Container Startup Timeout (4 minutes max)

Severity: HIGH

Situation: Deploying containers with slow initialization

Symptoms:
Deployment fails with "Container failed to start".
Service never becomes healthy.
"Revision failed to become ready" errors.
Works locally but fails on Cloud Run.

Why this breaks:
Cloud Run expects your container to start listening on PORT within
4 minutes (240 seconds). If it doesn't, the instance is killed.

Common causes:
- Heavy framework initialization (ML models, etc.)
- Waiting for external dependencies at startup
- Large dependency loading
- Database migrations on startup

Recommended fix:

## Enable startup CPU boost

```bash
gcloud run deploy my-service \
  --cpu-boost \
  --startup-cpu-boost
```

## Lazy initialization

```python
from functools import lru_cache
from fastapi import FastAPI

app = FastAPI()

# Don't load at import time
model = None

@lru_cache()
def get_model():
    global model
    if model is None:
        # Load on first request, not at startup
        model = load_heavy_model()
    return model

@app.get("/predict")
async def predict(data: dict):
    model = get_model()  # Loads on first call only
    return model.predict(data)

# Startup is fast - model loads on first request
```

## Start listening immediately

```python
import asyncio
from fastapi import FastAPI
import uvicorn

app = FastAPI()

# Global state for async initialization
initialized = asyncio.Event()

@app.on_event("startup")
async def startup():
    # Start background initialization
    asyncio.create_task(async_init())

async def async_init():
    # Heavy initialization happens after server starts
    await load_models()
    await warm_up_connections()
    initialized.set()

@app.get("/ready")
async def ready():
    if not initialized.is_set():
        raise HTTPException(503, "Still initializing")
    return {"status": "ready"}

@app.get("/health")
async def health():
    # Always respond - health check passes
    return {"status": "healthy"}
```

## Use multi-stage builds

```dockerfile
# Build stage - slow
FROM python:3.11 as builder
WORKDIR /app
COPY requirements.txt .
RUN pip wheel --no-cache-dir --wheel-dir /wheels -r requirements.txt

# Runtime stage - fast startup
FROM python:3.11-slim
WORKDIR /app
COPY --from=builder /wheels /wheels
RUN pip install --no-cache /wheels/* && rm -rf /wheels
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
```

## Run migrations separately

```bash
# Don't migrate on startup - use Cloud Build
steps:
  # Run migrations first
  - name: 'gcr.io/cloud-builders/gcloud'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        gcloud run jobs execute migrate-job --wait

  # Then deploy
  - name: 'gcr.io/cloud-builders/gcloud'
    args: ['run', 'deploy', 'my-service', ...]
```

### Second Generation Execution Environment Differences

Severity: MEDIUM

Situation: Migrating to or using Cloud Run second-gen execution environment

Symptoms:
Network behavior changes.
Different syscall support.
File system behavior differences.
Container behaves differently than in first-gen.

Why this breaks:
Cloud Run's second-generation execution environment uses a different
sandbox (gVisor) with different characteristics:

- More Linux syscalls supported
- Full /proc and /sys access
- Different network stack
- No automatic HTTPS redirect
- Different tmp filesystem behavior

Recommended fix:

## Explicitly set execution environment

```bash
# First generation (legacy)
gcloud run deploy my-service \
  --execution-environment=gen1

# Second generation (recommended for most)
gcloud run deploy my-service \
  --execution-environment=gen2
```

## Handle network differences

```python
# Second-gen doesn't auto-redirect HTTP to HTTPS
from fastapi import FastAPI, Request
from fastapi.responses import RedirectResponse

app = FastAPI()

@app.middleware("http")
async def redirect_https(request: Request, call_next):
    # Check X-Forwarded-Proto header
    if request.headers.get("X-Forwarded-Proto") == "http":
        url = request.url.replace(scheme="https")
        return RedirectResponse(url, status_code=301)
    return await call_next(request)
```

## GPU access (second-gen only)

```bash
# GPUs only available in second-gen
gcloud run deploy ml-service \
  --execution-environment=gen2 \
  --gpu=1 \
  --gpu-type=nvidia-l4
```

## Check execution environment

```python
import os

def get_execution_environment():
    # Second-gen has different /proc structure
    try:
        with open('/proc/version', 'r') as f:
            version = f.read()
            if 'gVisor' in version:
                return 'gen2'
    except:
        pass
    return 'gen1'
```

### Request Timeout Configuration Mismatch

Severity: MEDIUM

Situation: Long-running requests or background processing

Symptoms:
Requests terminated before completion.
504 Gateway Timeout errors.
Processing stops unexpectedly.
Inconsistent timeout behavior.

Why this breaks:
Cloud Run has multiple timeout configurations that must align:
- Request timeout (default 300s, max 3600s for HTTP, 60m for gRPC)
- Client timeout
- Downstream service timeouts
- Load balancer timeout (for external access)

Recommended fix:

## Set consistent timeouts

```bash
# Increase request timeout (max 3600s for HTTP)
gcloud run deploy my-service \
  --timeout=900  # 15 minutes
```

## Handle long-running with webhooks

```python
from fastapi import FastAPI, BackgroundTasks
import httpx

app = FastAPI()

@app.post("/process")
async def process(data: dict, background_tasks: BackgroundTasks):
    task_id = create_task_id()

    # Start background processing
    background_tasks.add_task(
        long_running_process,
        task_id,
        data,
        data.get("callback_url")
    )

    # Return immediately
    return {"task_id": task_id, "status": "processing"}

async def long_running_process(task_id, data, callback_url):
    result = await heavy_computation(data)

    # Callback when done
    if callback_url:
        async with httpx.AsyncClient() as client:
            await client.post(callback_url, json={
                "task_id": task_id,
                "result": result
            })
```

## Use Cloud Tasks for reliable long-running

```python
from google.cloud import tasks_v2

def create_long_running_task(data):
    client = tasks_v2.CloudTasksClient()
    parent = client.queue_path(PROJECT, REGION, "long-tasks")

    task = {
        "http_request": {
            "http_method": tasks_v2.HttpMethod.POST,
            "url": "https://worker.run.app/process",
            "body": json.dumps(data).encode(),
            "headers": {"Content-Type": "application/json"}
        },
        "dispatch_deadline": {"seconds": 1800}  # 30 min
    }

    return client.create_task(parent=parent, task=task)
```

## Streaming for long responses

```python
from fastapi import FastAPI
from fastapi.responses import StreamingResponse

@app.get("/large-report")
async def large_report():
    async def generate():
        for chunk in process_large_data():
            yield chunk

    return StreamingResponse(generate(), media_type="text/plain")
```

## Validation Checks

### Hardcoded GCP Credentials

Severity: ERROR

GCP credentials must never be hardcoded in source code

Message: Hardcoded GCP service account credentials. Use Secret Manager or Workload Identity.

### GCP API Key in Source Code

Severity: ERROR

API keys should use Secret Manager

Message: Hardcoded GCP API key. Use Secret Manager.

### Credentials JSON File in Repository

Severity: ERROR

Service account JSON files should not be in source control

Message: Credentials file detected. Add to .gitignore and use Secret Manager.

### Running as Root User

Severity: WARNING

Containers should not run as root for security

Message: Dockerfile runs as root. Add USER directive for security.

### Missing Health Check in Dockerfile

Severity: INFO

Cloud Run uses HTTP health checks, Dockerfile HEALTHCHECK is optional

Message: No HEALTHCHECK in Dockerfile. Cloud Run uses its own health checks.

### Hardcoded Port in Application

Severity: WARNING

Port should come from PORT environment variable

Message: Hardcoded port. Use PORT environment variable for Cloud Run.

### Large File Writes to /tmp

Severity: WARNING

/tmp uses container memory, large writes can cause OOM

Message: /tmp writes consume memory. Consider Cloud Storage for large files.

### Synchronous File Operations

Severity: WARNING

Sync file ops block the event loop in async apps

Message: Synchronous file operations. Use async versions for better concurrency.

### Global Mutable State

Severity: WARNING

Global state issues with concurrent requests

Message: Global mutable state may cause issues with concurrent requests.

### Thread-Unsafe Singleton Pattern

Severity: WARNING

Singletons need thread safety for concurrency > 1

Message: Singleton pattern - ensure thread safety if using concurrency > 1.

## Collaboration

### Delegation Triggers

- user needs AWS serverless -> aws-serverless (Lambda, API Gateway, SAM)
- user needs Azure containers -> azure-functions (Azure Container Apps, Functions)
- user needs database design -> postgres-wizard (Cloud SQL design, AlloyDB)
- user needs authentication -> auth-specialist (Firebase Auth, Identity Platform)
- user needs AI integration -> llm-architect (Vertex AI, Cloud Run + LLM)
- user needs workflow orchestration -> workflow-automation (Cloud Workflows, Eventarc)

## When to Use
Use this skill when the request clearly matches the capabilities and patterns described above.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
