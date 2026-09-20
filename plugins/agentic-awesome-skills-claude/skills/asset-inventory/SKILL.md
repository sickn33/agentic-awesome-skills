---
name: asset-inventory
description: Maintain IT asset inventory and configuration management database. Track
  hardware, software, and cloud resources. Use when managing IT assets.
category: security
risk: safe
source: https://github.com/BagelHole/DevOps-Security-Agent-Skills
source_repo: BagelHole/DevOps-Security-Agent-Skills
source_type: community
date_added: '2026-09-20'
license: MIT
license_source: https://github.com/BagelHole/DevOps-Security-Agent-Skills/blob/main/LICENSE
compatibility: Checklist and framework guidance; no privileged tooling required. Apply
  controls through your own change process.
metadata:
  author: devops-skills
  version: '1.0'
---

# Asset Inventory

Maintain comprehensive IT asset inventory using automated discovery, AWS Config rules, cloud asset discovery scripts, CMDB integration, and tagging enforcement for compliance and operational visibility.

## Asset Categories and Schema

```yaml
asset_categories:
  compute:
    cloud:
      - EC2 instances / Azure VMs / GCE instances
      - Lambda functions / Azure Functions / Cloud Functions
      - ECS/EKS clusters and tasks
      - Container images in registries
    on_premise:
      - Physical servers
      - Virtual machines (VMware, Hyper-V)

  storage:
    - S3 buckets / Azure Storage / GCS buckets
    - EBS volumes / Managed Disks / Persistent Disks
    - RDS instances / Azure SQL / Cloud SQL
    - DynamoDB tables / Cosmos DB / Firestore
    - EFS / Azure Files / Filestore

  network:
    - VPCs / VNets / VPC Networks
    - Load balancers (ALB, NLB, Azure LB, GCP LB)
    - DNS zones and records
    - VPN gateways and connections
    - CDN distributions

  security:
    - IAM users, roles, and policies
    - KMS keys / Key Vault keys
    - Certificates (ACM, Key Vault, Certificate Manager)
    - Security groups / NSGs / Firewall rules
    - WAF configurations

  applications:
    - SaaS subscriptions
    - Licensed software
    - Custom applications
    - APIs and integrations

  endpoints:
    - Laptops and desktops
    - Mobile devices
    - Printers and peripherals

asset_record_schema:
  required_fields:
    asset_id: "Unique identifier (auto-generated)"
    name: "Human-readable name"
    type: "Category from above taxonomy"
    provider: "AWS / Azure / GCP / On-Premise / SaaS"
    account_or_subscription: "Cloud account ID"
    region: "Deployment region/location"
    owner: "Team or individual responsible"
    data_classification: "Public / Internal / Confidential / Restricted"
    environment: "Production / Staging / Development / Sandbox"
    status: "Active / Decommissioning / Retired"
    created_date: "When the asset was provisioned"
    last_seen: "Last automated discovery timestamp"

  optional_fields:
    cost_center: "For cost allocation"
    compliance_scope: "SOC2 / HIPAA / PCI / None"
    backup_policy: "Backup schedule reference"
    dr_tier: "Critical / Essential / Standard / Non-essential"
    expiration_date: "For time-limited resources"
    tags: "Key-value pairs from cloud provider"
    dependencies: "Upstream and downstream services"
```

## AWS Resource Discovery Script

```bash
#!/usr/bin/env bash
# aws-asset-discovery.sh - Discover and inventory all AWS resources

OUTPUT_DIR="./asset-inventory/aws/$(date +%Y-%m-%d)"
mkdir -p "$OUTPUT_DIR"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "=== AWS Asset Discovery for Account $ACCOUNT_ID ==="

# EC2 Instances
echo "--- EC2 Instances ---"
aws ec2 describe-instances \
  --query 'Reservations[*].Instances[*].{
    InstanceId:InstanceId,
    Type:InstanceType,
    State:State.Name,
    AZ:Placement.AvailabilityZone,
    VpcId:VpcId,
    PrivateIP:PrivateIpAddress,
    PublicIP:PublicIpAddress,
    LaunchTime:LaunchTime,
    Name:Tags[?Key==`Name`].Value|[0],
    Owner:Tags[?Key==`Owner`].Value|[0],
    Environment:Tags[?Key==`Environment`].Value|[0]
  }' --output json | jq 'flatten' > "$OUTPUT_DIR/ec2-instances.json"

# RDS Databases
echo "--- RDS Instances ---"
aws rds describe-db-instances \
  --query 'DBInstances[*].{
    DBInstanceId:DBInstanceIdentifier,
    Engine:Engine,
    EngineVersion:EngineVersion,
    Class:DBInstanceClass,
    Status:DBInstanceStatus,
    MultiAZ:MultiAZ,
    Encrypted:StorageEncrypted,
    Endpoint:Endpoint.Address,
    BackupRetention:BackupRetentionPeriod
  }' --output json > "$OUTPUT_DIR/rds-instances.json"

# S3 Buckets
echo "--- S3 Buckets ---"
aws s3api list-buckets --query 'Buckets[*].{Name:Name,Created:CreationDate}' --output json | \
  jq -c '.[]' | while read -r bucket; do
    name=$(echo "$bucket" | jq -r '.Name')
    region=$(aws s3api get-bucket-location --bucket "$name" --query 'LocationConstraint' --output text 2>/dev/null)
    encryption=$(aws s3api get-bucket-encryption --bucket "$name" 2>/dev/null | jq -r '.ServerSideEncryptionConfiguration.Rules[0].ApplyServerSideEncryptionByDefault.SSEAlgorithm' 2>/dev/null)
    versioning=$(aws s3api get-bucket-versioning --bucket "$name" --query 'Status' --output text 2>/dev/null)
    echo "{\"Name\":\"$name\",\"Region\":\"${region:-us-east-1}\",\"Encryption\":\"${encryption:-none}\",\"Versioning\":\"${versioning:-Disabled}\"}"
  done | jq -s '.' > "$OUTPUT_DIR/s3-buckets.json"

# Lambda Functions
echo "--- Lambda Functions ---"
aws lambda list-functions \
  --query 'Functions[*].{
    Name:FunctionName,
    Runtime:Runtime,
    MemorySize:MemorySize,
    Timeout:Timeout,
    LastModified:LastModified,
    CodeSize:CodeSize
  }' --output json > "$OUTPUT_DIR/lambda-functions.json"

# VPCs and Security Groups
echo "--- VPCs ---"
aws ec2 describe-vpcs \
  --query 'Vpcs[*].{
    VpcId:VpcId,
    CidrBlock:CidrBlock,
    State:State,
    IsDefault:IsDefault,
    Name:Tags[?Key==`Name`].Value|[0]
  }' --output json > "$OUTPUT_DIR/vpcs.json"

echo "--- Security Groups ---"
aws ec2 describe-security-groups \
  --query 'SecurityGroups[*].{
    GroupId:GroupId,
    GroupName:GroupName,
    VpcId:VpcId,
    Description:Description,
    IngressRuleCount:length(IpPermissions),
    EgressRuleCount:length(IpPermissionsEgress)
  }' --output json > "$OUTPUT_DIR/security-groups.json"

# IAM Users and Roles
echo "--- IAM Users ---"
aws iam list-users \
  --query 'Users[*].{UserName:UserName,Created:CreateDate,PasswordLastUsed:PasswordLastUsed}' \
  --output json > "$OUTPUT_DIR/iam-users.json"

echo "--- IAM Roles ---"
aws iam list-roles \
  --query 'Roles[*].{RoleName:RoleName,Created:CreateDate,LastUsed:RoleLastUsed.LastUsedDate}' \
  --output json > "$OUTPUT_DIR/iam-roles.json"

# EKS Clusters
echo "--- EKS Clusters ---"
aws eks list-clusters --query 'clusters' --output json | jq -r '.[]' | while read -r cluster; do
  aws eks describe-cluster --name "$cluster" \
    --query 'cluster.{Name:name,Version:version,Status:status,Endpoint:endpoint,Created:createdAt}'
done | jq -s '.' > "$OUTPUT_DIR/eks-clusters.json" 2>/dev/null

# KMS Keys
echo "--- KMS Keys ---"
aws kms list-keys --query 'Keys[*].KeyId' --output text | tr '\t' '\n' | while read -r key_id; do
  aws kms describe-key --key-id "$key_id" \
    --query 'KeyMetadata.{KeyId:KeyId,Description:Description,State:KeyState,Created:CreationDate,Manager:KeyManager}' 2>/dev/null
done | jq -s '.' > "$OUTPUT_DIR/kms-keys.json"

# Generate summary
echo "=== Inventory Summary ==="
echo "EC2 Instances: $(jq 'length' "$OUTPUT_DIR/ec2-instances.json")"
echo "RDS Instances: $(jq 'length' "$OUTPUT_DIR/rds-instances.json")"
echo "S3 Buckets: $(jq 'length' "$OUTPUT_DIR/s3-buckets.json")"
echo "Lambda Functions: $(jq 'length' "$OUTPUT_DIR/lambda-functions.json")"
echo "VPCs: $(jq 'length' "$OUTPUT_DIR/vpcs.json")"
echo "Security Groups: $(jq 'length' "$OUTPUT_DIR/security-groups.json")"
echo "IAM Users: $(jq 'length' "$OUTPUT_DIR/iam-users.json")"
echo "IAM Roles: $(jq 'length' "$OUTPUT_DIR/iam-roles.json")"

echo "Inventory saved to $OUTPUT_DIR"
```

## AWS Config Rules for Inventory Compliance

```bash
# Enable AWS Config recorder
aws configservice put-configuration-recorder \
  --configuration-recorder name=default,roleARN=arn:aws:iam::123456789012:role/aws-config-role \
  --recording-group allSupported=true,includeGlobalResourceTypes=true

# Start recording
aws configservice start-configuration-recorder --configuration-recorder-name default

# Enable required-tags Config rule
aws configservice put-config-rule --config-rule '{
  "ConfigRuleName": "required-tags",
  "Source": {
    "Owner": "AWS",
    "SourceIdentifier": "REQUIRED_TAGS"
  },
  "InputParameters": "{\"tag1Key\":\"Owner\",\"tag2Key\":\"Environment\",\"tag3Key\":\"CostCenter\",\"tag4Key\":\"DataClassification\"}",
  "Scope": {
    "ComplianceResourceTypes": [
      "AWS::EC2::Instance",
      "AWS::RDS::DBInstance",
      "AWS::S3::Bucket",
      "AWS::Lambda::Function"
    ]
  }
}'

# Config rule for encryption compliance
aws configservice put-config-rule --config-rule '{
  "ConfigRuleName": "encrypted-volumes",
  "Source": {
    "Owner": "AWS",
    "SourceIdentifier": "ENCRYPTED_VOLUMES"
  }
}'

aws configservice put-config-rule --config-rule '{
  "ConfigRuleName": "rds-storage-encrypted",
  "Source": {
    "Owner": "AWS",
    "SourceIdentifier": "RDS_STORAGE_ENCRYPTED"
  }
}'

aws configservice put-config-rule --config-rule '{
  "ConfigRuleName": "s3-bucket-server-side-encryption-enabled",
  "Source": {
    "Owner": "AWS",
    "SourceIdentifier": "S3_BUCKET_SERVER_SIDE_ENCRYPTION_ENABLED"
  }
}'

# Query AWS Config for all resources of a type
aws configservice list-discovered-resources --resource-type AWS::EC2::Instance
aws configservice list-discovered-resources --resource-type AWS::RDS::DBInstance

# Advanced query with AWS Config SQL
aws configservice select-resource-config \
  --expression "SELECT resourceId, resourceType, tags, configuration.instanceType
                WHERE resourceType = 'AWS::EC2::Instance'
                AND tags.tag('Environment') = 'production'"

# Get compliance summary
aws configservice get-compliance-summary-by-config-rule
aws configservice get-compliance-summary-by-resource-type
```

## Tagging Enforcement

```yaml
# AWS Tag Policy (applied via AWS Organizations)
tag_policy:
  tags:
    Owner:
      tag_key:
        "@@assign": "Owner"
      enforced_for:
        "@@assign":
          - "ec2:instance"
          - "rds:db"
          - "s3:bucket"
          - "lambda:function"

    Environment:
      tag_key:
        "@@assign": "Environment"
      tag_value:
        "@@assign":
          - "production"
          - "staging"
          - "development"
          - "sandbox"

    DataClassification:
      tag_key:
        "@@assign": "DataClassification"
      tag_value:
        "@@assign":
          - "public"
          - "internal"
          - "confidential"
          - "restricted"

    CostCenter:
      tag_key:
        "@@assign": "CostCenter"
```

```hcl
# Terraform - Enforce tags on all resources with default_tags
provider "aws" {
  region = "us-east-1"

  default_tags {
    tags = {
      ManagedBy          = "terraform"
      Environment        = var.environment
      Owner              = var.team_name
      CostCenter         = var.cost_center
      DataClassification = var.data_classification
    }
  }
}
```

## Multi-Cloud Discovery

```bash
#!/usr/bin/env bash
# multi-cloud-discovery.sh - Discover assets across AWS, Azure, and GCP

OUTPUT_DIR="./asset-inventory/multi-cloud/$(date +%Y-%m-%d)"
mkdir -p "$OUTPUT_DIR"

echo "=== Multi-Cloud Asset Discovery ==="

# AWS - using Resource Groups Tagging API
echo "--- AWS Resources ---"
aws resourcegroupstaggingapi get-resources \
  --query 'ResourceTagMappingList[*].{ARN:ResourceARN,Tags:Tags}' \
  --output json > "$OUTPUT_DIR/aws-all-resources.json"
echo "AWS resources: $(jq 'length' "$OUTPUT_DIR/aws-all-resources.json")"

# Azure - using Resource Graph
echo "--- Azure Resources ---"
az graph query -q "Resources | project name, type, location, resourceGroup, subscriptionId, tags" \
  --output json > "$OUTPUT_DIR/azure-all-resources.json" 2>/dev/null

# GCP - using Cloud Asset Inventory
echo "--- GCP Resources ---"
gcloud asset search-all-resources \
  --scope="organizations/ORG_ID" \
  --format=json > "$OUTPUT_DIR/gcp-all-resources.json" 2>/dev/null

# Find untagged resources
echo "=== Untagged Resources ==="
jq '[.[] | select(.Tags == null or .Tags == [])] | length' "$OUTPUT_DIR/aws-all-resources.json"

echo "Discovery complete. Results in $OUTPUT_DIR"
```


## Contents

- [CMDB Integration](references/details.md)
- [Asset Inventory Checklist](references/details.md)
- [Best Practices](references/details.md)

## When to Use

- Building or maintaining an IT asset inventory for compliance frameworks (ISO 27001, SOC 2, FedRAMP)
- Implementing automated cloud resource discovery across accounts and regions
- Enforcing tagging standards for cost allocation, ownership, and data classification
- Integrating asset data with a CMDB for operational workflows
- Preparing for audits that require a complete system component inventory

## Limitations

- Guidance and checklists only; not legal advice and not a substitute for a qualified auditor.
- Docs-only import: upstream templates and scripts not bundled.

### Example

```markdown
Map this skill's control checklist to our current evidence and list gaps.
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.
