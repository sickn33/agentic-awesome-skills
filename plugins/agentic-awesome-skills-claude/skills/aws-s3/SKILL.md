---
name: aws-s3
description: Configure S3 buckets, policies, and lifecycle rules. Implement versioning,
  replication, and security. Use when managing object storage on AWS.
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

# AWS S3

Manage Amazon S3 object storage with production-grade security, lifecycle policies, replication, and access controls.

## When to Use This Skill

- Creating S3 buckets with security hardening (encryption, public access block, versioning)
- Writing bucket policies to enforce HTTPS, restrict IP ranges, or grant cross-account access
- Setting up lifecycle rules to transition objects between storage classes
- Configuring cross-region replication for disaster recovery
- Generating presigned URLs for temporary access to private objects
- Setting up static website hosting or CloudFront origins
- Troubleshooting access denied errors or policy conflicts

## Prerequisites

- AWS CLI v2 installed and configured
- IAM permissions: `s3:*`, `s3-object-lambda:*`, `kms:*` (for SSE-KMS)
- For replication: IAM role with replication permissions and destination bucket in target region
- For logging: a separate logging bucket with appropriate ACL

## Create and Secure a Bucket

```bash
# Create a bucket (us-east-1 does not need LocationConstraint)
aws s3api create-bucket \
  --bucket my-app-data-prod \
  --region us-east-1

# Create a bucket in another region
aws s3api create-bucket \
  --bucket my-app-data-dr \
  --region us-west-2 \
  --create-bucket-configuration LocationConstraint=us-west-2

# Block ALL public access (always do this first)
aws s3api put-public-access-block \
  --bucket my-app-data-prod \
  --public-access-block-configuration '{
    "BlockPublicAcls": true,
    "IgnorePublicAcls": true,
    "BlockPublicPolicy": true,
    "RestrictPublicBuckets": true
  }'

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket my-app-data-prod \
  --versioning-configuration Status=Enabled

# Enable server-side encryption with SSE-KMS
aws s3api put-bucket-encryption \
  --bucket my-app-data-prod \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "aws:kms",
        "KMSMasterKeyID": "alias/s3-key"
      },
      "BucketKeyEnabled": true
    }]
  }'

# Enable access logging
aws s3api put-bucket-logging \
  --bucket my-app-data-prod \
  --bucket-logging-status '{
    "LoggingEnabled": {
      "TargetBucket": "my-access-logs-bucket",
      "TargetPrefix": "s3-logs/my-app-data-prod/"
    }
  }'

# Add tags
aws s3api put-bucket-tagging \
  --bucket my-app-data-prod \
  --tagging '{
    "TagSet": [
      {"Key": "Environment", "Value": "production"},
      {"Key": "Team", "Value": "platform"},
      {"Key": "DataClassification", "Value": "confidential"}
    ]
  }'
```

## Bucket Policies

```bash
# Apply a bucket policy (enforce HTTPS and restrict to VPC endpoint)
aws s3api put-bucket-policy \
  --bucket my-app-data-prod \
  --policy '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Sid": "DenyInsecureTransport",
        "Effect": "Deny",
        "Principal": "*",
        "Action": "s3:*",
        "Resource": [
          "arn:aws:s3:::my-app-data-prod",
          "arn:aws:s3:::my-app-data-prod/*"
        ],
        "Condition": {
          "Bool": {"aws:SecureTransport": "false"}
        }
      },
      {
        "Sid": "RestrictToVPCEndpoint",
        "Effect": "Deny",
        "Principal": "*",
        "Action": "s3:*",
        "Resource": [
          "arn:aws:s3:::my-app-data-prod",
          "arn:aws:s3:::my-app-data-prod/*"
        ],
        "Condition": {
          "StringNotEquals": {
            "aws:sourceVpce": "vpce-abc123"
          }
        }
      }
    ]
  }'
```

Cross-account access policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "CrossAccountRead",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::987654321098:role/DataAnalystRole"
      },
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::my-app-data-prod",
        "arn:aws:s3:::my-app-data-prod/shared/*"
      ]
    }
  ]
}
```

## Lifecycle Rules

```bash
# Apply a comprehensive lifecycle configuration
aws s3api put-bucket-lifecycle-configuration \
  --bucket my-app-data-prod \
  --lifecycle-configuration '{
    "Rules": [
      {
        "ID": "TierDownOldData",
        "Status": "Enabled",
        "Filter": {"Prefix": "data/"},
        "Transitions": [
          {"Days": 30, "StorageClass": "STANDARD_IA"},
          {"Days": 90, "StorageClass": "GLACIER_IR"},
          {"Days": 180, "StorageClass": "GLACIER"},
          {"Days": 365, "StorageClass": "DEEP_ARCHIVE"}
        ]
      },
      {
        "ID": "ExpireLogs",
        "Status": "Enabled",
        "Filter": {"Prefix": "logs/"},
        "Expiration": {"Days": 90},
        "Transitions": [
          {"Days": 7, "StorageClass": "STANDARD_IA"},
          {"Days": 30, "StorageClass": "GLACIER"}
        ]
      },
      {
        "ID": "CleanupOldVersions",
        "Status": "Enabled",
        "Filter": {"Prefix": ""},
        "NoncurrentVersionTransitions": [
          {"NoncurrentDays": 30, "StorageClass": "STANDARD_IA"},
          {"NoncurrentDays": 90, "StorageClass": "GLACIER"}
        ],
        "NoncurrentVersionExpiration": {"NoncurrentDays": 180}
      },
      {
        "ID": "AbortIncompleteUploads",
        "Status": "Enabled",
        "Filter": {"Prefix": ""},
        "AbortIncompleteMultipartUpload": {"DaysAfterInitiation": 7}
      },
      {
        "ID": "ExpireDeleteMarkers",
        "Status": "Enabled",
        "Filter": {"Prefix": ""},
        "Expiration": {"ExpiredObjectDeleteMarker": true}
      }
    ]
  }'
```

## Cross-Region Replication

```bash
# Enable replication (requires versioning on both buckets)
aws s3api put-bucket-replication \
  --bucket my-app-data-prod \
  --replication-configuration '{
    "Role": "arn:aws:iam::123456789012:role/S3ReplicationRole",
    "Rules": [
      {
        "ID": "ReplicateAll",
        "Status": "Enabled",
        "Priority": 1,
        "Filter": {"Prefix": ""},
        "Destination": {
          "Bucket": "arn:aws:s3:::my-app-data-dr",
          "StorageClass": "STANDARD_IA",
          "EncryptionConfiguration": {
            "ReplicaKmsKeyID": "arn:aws:kms:us-west-2:123456789012:key/dr-key-id"
          },
          "Metrics": {"Status": "Enabled", "EventThreshold": {"Minutes": 15}},
          "ReplicationTime": {"Status": "Enabled", "Time": {"Minutes": 15}}
        },
        "DeleteMarkerReplication": {"Status": "Enabled"},
        "SourceSelectionCriteria": {
          "SseKmsEncryptedObjects": {"Status": "Enabled"}
        }
      }
    ]
  }'

# Check replication status
aws s3api head-object \
  --bucket my-app-data-prod \
  --key data/important-file.json \
  --query "ReplicationStatus"
```

## Presigned URLs

```bash
# Generate a presigned URL for downloading (valid 1 hour)
aws s3 presign s3://my-app-data-prod/reports/quarterly.pdf \
  --expires-in 3600

# Generate a presigned URL for uploading
aws s3 presign s3://my-app-data-prod/uploads/user-file.zip \
  --expires-in 3600

# Presigned URL with specific content type (using the API directly)
aws s3api generate-presigned-url \
  --client-method put_object \
  --params '{"Bucket":"my-app-data-prod","Key":"uploads/photo.jpg","ContentType":"image/jpeg"}' \
  --expires-in 3600
```

## Common S3 Operations

```bash
# Sync a local directory to S3
aws s3 sync ./build s3://my-app-data-prod/static/ \
  --delete \
  --exclude "*.tmp" \
  --cache-control "max-age=31536000" \
  --content-encoding "gzip"

# Copy with storage class
aws s3 cp large-archive.tar.gz s3://my-app-data-prod/archives/ \
  --storage-class GLACIER_IR

# List objects with size summary
aws s3 ls s3://my-app-data-prod/ --recursive --summarize --human-readable

# Remove all objects with a prefix
aws s3 rm s3://my-app-data-prod/temp/ --recursive

# Get bucket size via CloudWatch (most efficient for large buckets)
aws cloudwatch get-metric-statistics \
  --namespace AWS/S3 \
  --metric-name BucketSizeBytes \
  --dimensions Name=BucketName,Value=my-app-data-prod Name=StorageType,Value=StandardStorage \
  --start-time "$(date -u -d '2 days ago' +%Y-%m-%dT%H:%M:%SZ)" \
  --end-time "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --period 86400 \
  --statistics Average \
  --output table
```

## Terraform S3 Bucket

```hcl
resource "aws_s3_bucket" "main" {
  bucket = "my-app-data-prod"

  tags = {
    Environment        = "production"
    DataClassification = "confidential"
  }
}

resource "aws_s3_bucket_versioning" "main" {
  bucket = aws_s3_bucket.main.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_public_access_block" "main" {
  bucket = aws_s3_bucket.main.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "main" {
  bucket = aws_s3_bucket.main.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.s3.arn
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "main" {
  bucket = aws_s3_bucket.main.id

  rule {
    id     = "tier-down"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    noncurrent_version_transition {
      noncurrent_days = 30
      storage_class   = "GLACIER"
    }

    noncurrent_version_expiration {
      noncurrent_days = 180
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

resource "aws_s3_bucket_policy" "enforce_https" {
  bucket = aws_s3_bucket.main.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "DenyInsecureTransport"
      Effect    = "Deny"
      Principal = "*"
      Action    = "s3:*"
      Resource  = [
        aws_s3_bucket.main.arn,
        "${aws_s3_bucket.main.arn}/*"
      ]
      Condition = {
        Bool = { "aws:SecureTransport" = "false" }
      }
    }]
  })
}
```

## Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| Access Denied on GetObject | Bucket policy or IAM denies access | Check bucket policy, IAM policy, and public access block |
| Access Denied on PutObject | Missing encryption header when required | Add SSE header; check bucket policy encryption conditions |
| 403 on presigned URL | URL expired or wrong region | Regenerate; ensure region matches bucket region |
| Replication not working | Versioning disabled on source or dest | Enable versioning on both buckets |
| Lifecycle not transitioning | Rule filter does not match objects | Verify prefix and tag filters; check rule status |
| Bucket delete fails | Bucket not empty or has versioned objects | Delete all objects and versions first; disable versioning |
| Slow uploads for large files | Single-part upload | Use `aws s3 cp` (auto multipart) or set multipart threshold |
| Cross-account access denied | Both bucket policy AND IAM policy needed | Grant in bucket policy and in caller's IAM policy |
| Object Lock prevents deletion | Governance or compliance mode active | Use governance bypass (with permission) or wait for retention |

## Related Skills

- aws-iam (`aws-iam`) - Bucket and object access policies
- aws-vpc (`aws-vpc`) - VPC endpoints for private S3 access
- aws-cost-optimization (`aws-cost-optimization`) - Storage class optimization
- terraform-aws (`terraform-aws`) - IaC deployment for S3
- cloudformation (`cloudformation`) - AWS-native S3 templates

## Limitations

- Infrastructure commands can disrupt services: confirm target host/scope and have backups/snapshots before mutating state.
- Docs-only import: upstream scripts and templates not bundled.

