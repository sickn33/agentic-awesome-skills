---
name: object-storage
description: Configure object storage with S3, GCS, and MinIO. Implement lifecycle
  policies and access controls. Use when managing object storage.
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

# Object Storage

Configure and manage object storage solutions including AWS S3, MinIO (self-hosted), and compatible providers. Covers CLI operations, bucket policies, lifecycle rules, versioning, encryption, and the MinIO client (mc).

## When to Use

- Storing application assets, backups, logs, or media files
- Setting up an S3-compatible object store on-premises with MinIO
- Configuring lifecycle rules to transition or expire objects automatically
- Implementing access control with bucket policies and IAM
- Syncing data between local filesystems and object storage
- Serving static content from S3 or MinIO

## Prerequisites

- AWS CLI v2 installed and configured (`aws configure`) for S3 operations
- Docker installed for MinIO self-hosted setup
- MinIO client (`mc`) installed for MinIO management
- IAM credentials with appropriate S3 permissions
- Network access to the object storage endpoint

## AWS S3 CLI Operations

### Bucket Management

```bash
# Create a new bucket
aws s3 mb s3://my-app-assets-prod

# Create a bucket in a specific region
aws s3 mb s3://my-app-assets-eu --region eu-west-1

# List all buckets
aws s3 ls

# List objects in a bucket (with sizes)
aws s3 ls s3://my-app-assets-prod --recursive --human-readable --summarize

# Delete an empty bucket
aws s3 rb s3://my-old-bucket

# Delete a bucket and ALL its contents (destructive)
aws s3 rb s3://my-old-bucket --force
```

### Upload and Download

```bash
# Upload a single file
aws s3 cp ./report.pdf s3://my-app-assets-prod/reports/

# Upload with a specific storage class
aws s3 cp ./archive.tar.gz s3://my-app-assets-prod/archives/ --storage-class GLACIER

# Upload with server-side encryption (AES-256)
aws s3 cp ./sensitive.dat s3://my-app-assets-prod/data/ --sse AES256

# Download a file
aws s3 cp s3://my-app-assets-prod/reports/report.pdf ./downloads/

# Sync a local directory to S3 (upload only changed files)
aws s3 sync ./build/ s3://my-app-assets-prod/static/ --delete

# Sync from S3 to local
aws s3 sync s3://my-app-assets-prod/static/ ./local-copy/

# Sync with exclusion patterns
aws s3 sync ./logs/ s3://my-app-logs/ --exclude "*.tmp" --exclude ".git/*"

# Copy between buckets
aws s3 sync s3://source-bucket/ s3://destination-bucket/ --source-region us-east-1 --region eu-west-1

# Generate a pre-signed URL (temporary access, 1 hour)
aws s3 presign s3://my-app-assets-prod/reports/report.pdf --expires-in 3600

# Recursive delete of a prefix
aws s3 rm s3://my-app-assets-prod/old-data/ --recursive
```

### Versioning

```bash
# Enable versioning on a bucket
aws s3api put-bucket-versioning \
  --bucket my-app-assets-prod \
  --versioning-configuration Status=Enabled

# Check versioning status
aws s3api get-bucket-versioning --bucket my-app-assets-prod

# List object versions
aws s3api list-object-versions --bucket my-app-assets-prod --prefix reports/

# Restore a previous version (copy old version to current)
aws s3api copy-object \
  --bucket my-app-assets-prod \
  --copy-source "my-app-assets-prod/reports/report.pdf?versionId=abc123" \
  --key reports/report.pdf

# Delete a specific version permanently
aws s3api delete-object \
  --bucket my-app-assets-prod \
  --key reports/old-report.pdf \
  --version-id abc123
```

### Bucket Policies

```bash
# Apply a bucket policy from a JSON file
aws s3api put-bucket-policy --bucket my-app-assets-prod --policy file://policy.json
```

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadForStaticSite",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::my-app-assets-prod/static/*"
    },
    {
      "Sid": "DenyUnencryptedUploads",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::my-app-assets-prod/*",
      "Condition": {
        "StringNotEquals": {
          "s3:x-amz-server-side-encryption": "AES256"
        }
      }
    },
    {
      "Sid": "RestrictToVPC",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::my-app-assets-prod",
        "arn:aws:s3:::my-app-assets-prod/*"
      ],
      "Condition": {
        "StringNotEquals": {
          "aws:sourceVpce": "vpce-abc123"
        }
      }
    }
  ]
}
```

### Lifecycle Rules

```bash
# Apply lifecycle configuration
aws s3api put-bucket-lifecycle-configuration \
  --bucket my-app-assets-prod \
  --lifecycle-configuration file://lifecycle.json
```

```json
{
  "Rules": [
    {
      "ID": "TransitionLogsToIA",
      "Filter": { "Prefix": "logs/" },
      "Status": "Enabled",
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "STANDARD_IA"
        },
        {
          "Days": 90,
          "StorageClass": "GLACIER"
        }
      ],
      "Expiration": {
        "Days": 365
      }
    },
    {
      "ID": "CleanupIncompleteUploads",
      "Filter": { "Prefix": "" },
      "Status": "Enabled",
      "AbortIncompleteMultipartUpload": {
        "DaysAfterInitiation": 7
      }
    },
    {
      "ID": "ExpireOldVersions",
      "Filter": { "Prefix": "" },
      "Status": "Enabled",
      "NoncurrentVersionExpiration": {
        "NoncurrentDays": 30
      }
    }
  ]
}
```

```bash
# View current lifecycle rules
aws s3api get-bucket-lifecycle-configuration --bucket my-app-assets-prod

# Enable S3 access logging
aws s3api put-bucket-logging --bucket my-app-assets-prod --bucket-logging-status '{
  "LoggingEnabled": {
    "TargetBucket": "my-app-logs",
    "TargetPrefix": "s3-access-logs/"
  }
}'
```

## MinIO Self-Hosted Setup

### Docker Deployment

```bash
# Single-node MinIO with persistent storage
docker run -d \
  --name minio \
  --restart unless-stopped \
  -p 9000:9000 \
  -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minio-secret-key-change-me \
  -v /data/minio:/data \
  minio/minio server /data --console-address ":9001"
```

### Docker Compose (Multi-Drive)

```yaml
# docker-compose.yml
version: "3.8"
services:
  minio:
    image: minio/minio:latest
    command: server /data{1...4} --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minio-secret-key-change-me
      MINIO_BROWSER_REDIRECT_URL: https://minio-console.example.com
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio-data1:/data1
      - minio-data2:/data2
      - minio-data3:/data3
      - minio-data4:/data4
    healthcheck:
      test: ["CMD", "mc", "ready", "local"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped

volumes:
  minio-data1:
  minio-data2:
  minio-data3:
  minio-data4:
```

```bash
# Start the stack
docker compose up -d

# Check health
docker compose ps
curl -s http://localhost:9000/minio/health/live
```

### MinIO Client (mc) Commands

```bash
# Install mc
curl -O https://dl.min.io/client/mc/release/linux-amd64/mc
chmod +x mc && mv mc /usr/local/bin/

# Configure an alias for the MinIO server
mc alias set myminio http://localhost:9000 minioadmin minio-secret-key-change-me

# Configure an alias for AWS S3
mc alias set aws https://s3.amazonaws.com AKIAEXAMPLE SECRETKEYEXAMPLE

# Bucket operations
mc mb myminio/app-data
mc mb myminio/backups
mc ls myminio/

# Upload and download
mc cp ./backup.tar.gz myminio/backups/
mc cp myminio/backups/backup.tar.gz ./restore/

# Sync a directory (mirror)
mc mirror ./static/ myminio/app-data/static/
mc mirror --watch ./static/ myminio/app-data/static/   # Continuous sync

# Set bucket policy (download = public read)
mc anonymous set download myminio/app-data/static

# Set a specific policy from JSON
mc anonymous set-json policy.json myminio/app-data

# Enable versioning
mc version enable myminio/app-data

# Set lifecycle rule: expire objects in tmp/ after 7 days
mc ilm rule add --expiry-days 7 --prefix "tmp/" myminio/app-data

# List lifecycle rules
mc ilm rule ls myminio/app-data

# Create a service account (for applications)
mc admin user svcacct add myminio minioadmin --access-key myapp-key --secret-key myapp-secret

# View server info and disk usage
mc admin info myminio

# Check bucket disk usage
mc du myminio/app-data

# Set a notification target (webhook on object creation)
mc event add myminio/app-data arn:minio:sqs::myqueue:webhook --event put
mc event ls myminio/app-data
```

## Troubleshooting

| Symptom | Diagnostic Command | Common Fix |
|---|---|---|
| Access Denied on S3 | `aws s3api get-bucket-policy --bucket name` | Check IAM policy, bucket policy, and block public access settings |
| Slow uploads | `aws s3 cp --debug` | Use multipart: `aws configure set s3.multipart_threshold 64MB` |
| 403 on pre-signed URL | Check clock skew, URL expiry | Sync system clock with NTP; regenerate URL |
| MinIO unhealthy | `mc admin info myminio` | Check disk space, container logs, port availability |
| Lifecycle rules not applying | `aws s3api get-bucket-lifecycle-configuration` | Rules run once per day; check Filter prefix matches |
| Objects not versioned | `aws s3api get-bucket-versioning` | Enable versioning; it does not apply retroactively |
| mc: connection refused | `mc alias ls` | Verify endpoint URL, port, and credentials |
| Large sync is slow | Monitor with `mc mirror --watch` | Use `--multi-thread` flag, increase bandwidth |

## Related Skills

- `block-storage` -- Underlying disk storage for MinIO data volumes
- `backup-recovery` -- Using S3/MinIO as a backup destination with restic
- `nfs-storage` -- Alternative shared storage for file-level access
- `linux-administration` -- Server setup and maintenance for MinIO hosts

## Limitations

- Infrastructure commands can disrupt services: confirm target host/scope and have backups/snapshots before mutating state.
- Docs-only import: upstream scripts and templates not bundled.

