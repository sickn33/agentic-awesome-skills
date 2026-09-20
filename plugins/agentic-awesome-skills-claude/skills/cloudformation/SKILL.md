---
name: cloudformation
description: Deploy AWS resources with CloudFormation templates. Create stacks, use
  nested stacks, and implement drift detection. Use when deploying AWS-native IaC.
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

# CloudFormation

Deploy AWS infrastructure with native CloudFormation templates, change sets, nested stacks, and drift detection.

## When to Use This Skill

- Deploying AWS resources using AWS-native Infrastructure as Code
- Creating repeatable, parameterized infrastructure templates
- Managing multi-environment deployments (dev, staging, prod) with the same template
- Implementing safe deployments with change sets and rollback protection
- Detecting and remediating configuration drift
- Organizing large infrastructure into nested stacks
- Exporting/importing values between stacks

## Prerequisites

- AWS CLI v2 installed and configured
- IAM permissions: `cloudformation:*`, plus permissions for all resources in the template
- (Optional) `cfn-lint` installed for template validation (`pip install cfn-lint`)
- S3 bucket for storing templates larger than 51,200 bytes

## Template Structure

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: Production web application infrastructure

Metadata:
  AWS::CloudFormation::Interface:
    ParameterGroups:
      - Label: { default: "Environment" }
        Parameters: [Environment, InstanceType]
      - Label: { default: "Network" }
        Parameters: [VpcId, SubnetIds]

Parameters:
  Environment:
    Type: String
    AllowedValues: [dev, staging, prod]
    Default: dev

  InstanceType:
    Type: String
    Default: t3.micro
    AllowedValues: [t3.micro, t3.small, t3.medium, t3.large]

  VpcId:
    Type: AWS::EC2::VPC::Id
    Description: VPC to deploy into

  SubnetIds:
    Type: List<AWS::EC2::Subnet::Id>
    Description: Subnets for the application

Conditions:
  IsProd: !Equals [!Ref Environment, prod]
  CreateReadReplica: !Equals [!Ref Environment, prod]

Mappings:
  RegionAMI:
    us-east-1:
      AL2023: ami-0abcdef1234567890
    us-west-2:
      AL2023: ami-0fedcba9876543210

Resources:
  SecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: !Sub '${Environment}-web-sg'
      VpcId: !Ref VpcId
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 443
          ToPort: 443
          CidrIp: 0.0.0.0/0
      Tags:
        - Key: Name
          Value: !Sub '${Environment}-web-sg'

  LaunchTemplate:
    Type: AWS::EC2::LaunchTemplate
    Properties:
      LaunchTemplateName: !Sub '${Environment}-web'
      LaunchTemplateData:
        ImageId: !FindInMap [RegionAMI, !Ref 'AWS::Region', AL2023]
        InstanceType: !If [IsProd, t3.large, !Ref InstanceType]
        MetadataOptions:
          HttpTokens: required
        SecurityGroupIds:
          - !Ref SecurityGroup

  AutoScalingGroup:
    Type: AWS::AutoScaling::AutoScalingGroup
    Properties:
      AutoScalingGroupName: !Sub '${Environment}-web-asg'
      LaunchTemplate:
        LaunchTemplateId: !Ref LaunchTemplate
        Version: !GetAtt LaunchTemplate.LatestVersionNumber
      MinSize: !If [IsProd, 2, 1]
      MaxSize: !If [IsProd, 10, 3]
      DesiredCapacity: !If [IsProd, 4, 1]
      VPCZoneIdentifier: !Ref SubnetIds
      TargetGroupARNs:
        - !Ref TargetGroup
      HealthCheckType: ELB
      HealthCheckGracePeriod: 300
      Tags:
        - Key: Name
          Value: !Sub '${Environment}-web'
          PropagateAtLaunch: true
    UpdatePolicy:
      AutoScalingRollingUpdate:
        MinInstancesInService: !If [IsProd, 2, 0]
        MaxBatchSize: 1
        PauseTime: PT5M
        WaitOnResourceSignals: true
        SuspendProcesses:
          - HealthCheck
          - ReplaceUnhealthy
          - AZRebalance
          - AlarmNotification
          - ScheduledActions

  TargetGroup:
    Type: AWS::ElasticLoadBalancingV2::TargetGroup
    Properties:
      Name: !Sub '${Environment}-web-tg'
      Port: 8080
      Protocol: HTTP
      VpcId: !Ref VpcId
      TargetType: instance
      HealthCheckPath: /health
      HealthCheckIntervalSeconds: 30
      HealthyThresholdCount: 2
      UnhealthyThresholdCount: 3

Outputs:
  SecurityGroupId:
    Description: Web security group ID
    Value: !Ref SecurityGroup
    Export:
      Name: !Sub '${Environment}-WebSecurityGroup'

  AutoScalingGroupName:
    Description: ASG name
    Value: !Ref AutoScalingGroup
    Export:
      Name: !Sub '${Environment}-WebASG'
```

## Stack Operations

```bash
# Validate a template
aws cloudformation validate-template --template-body file://template.yaml

# Lint with cfn-lint (catches more issues)
cfn-lint template.yaml

# Create a stack
aws cloudformation create-stack \
  --stack-name production-web \
  --template-body file://template.yaml \
  --parameters \
    ParameterKey=Environment,ParameterValue=prod \
    ParameterKey=VpcId,ParameterValue=vpc-abc123 \
    ParameterKey=SubnetIds,ParameterValue="subnet-aaa\\,subnet-bbb" \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
  --tags Key=Environment,Value=production Key=Team,Value=platform \
  --enable-termination-protection \
  --on-failure ROLLBACK

# Wait for stack creation
aws cloudformation wait stack-create-complete --stack-name production-web

# Describe stack status and outputs
aws cloudformation describe-stacks \
  --stack-name production-web \
  --query "Stacks[0].{Status:StackStatus,Outputs:Outputs}" \
  --output table

# List stack resources
aws cloudformation list-stack-resources --stack-name production-web \
  --query "StackResourceSummaries[].{Logical:LogicalResourceId,Physical:PhysicalResourceId,Type:ResourceType,Status:ResourceStatus}" \
  --output table

# Delete a stack
aws cloudformation delete-stack --stack-name dev-web
aws cloudformation wait stack-delete-complete --stack-name dev-web
```

## Change Sets (Safe Updates)

```bash
# Create a change set to preview changes before applying
aws cloudformation create-change-set \
  --stack-name production-web \
  --change-set-name update-instance-type \
  --template-body file://template.yaml \
  --parameters \
    ParameterKey=Environment,ParameterValue=prod \
    ParameterKey=InstanceType,ParameterValue=t3.large \
    ParameterKey=VpcId,UsePreviousValue=true \
    ParameterKey=SubnetIds,UsePreviousValue=true \
  --capabilities CAPABILITY_IAM

# Describe the change set to review planned changes
aws cloudformation describe-change-set \
  --stack-name production-web \
  --change-set-name update-instance-type \
  --query "Changes[].{Action:ResourceChange.Action,Resource:ResourceChange.LogicalResourceId,Type:ResourceChange.ResourceType,Replacement:ResourceChange.Replacement}" \
  --output table

# Execute the change set (apply changes)
aws cloudformation execute-change-set \
  --stack-name production-web \
  --change-set-name update-instance-type

# Wait for update
aws cloudformation wait stack-update-complete --stack-name production-web

# Delete a change set without applying
aws cloudformation delete-change-set \
  --stack-name production-web \
  --change-set-name update-instance-type
```

## Drift Detection

```bash
# Start drift detection
DRIFT_ID=$(aws cloudformation detect-stack-drift \
  --stack-name production-web \
  --query 'StackDriftDetectionId' --output text)

# Check drift detection status
aws cloudformation describe-stack-drift-detection-status \
  --stack-drift-detection-id $DRIFT_ID

# View drifted resources
aws cloudformation describe-stack-resource-drifts \
  --stack-name production-web \
  --stack-resource-drift-status-filters MODIFIED DELETED \
  --query "StackResourceDrifts[].{Resource:LogicalResourceId,Status:StackResourceDriftStatus,Differences:PropertyDifferences}" \
  --output table

# Detect drift on a specific resource
aws cloudformation detect-stack-resource-drift \
  --stack-name production-web \
  --logical-resource-id SecurityGroup
```

## Nested Stacks

Parent template:

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: Parent stack - full application

Parameters:
  Environment:
    Type: String
    AllowedValues: [dev, staging, prod]

Resources:
  NetworkStack:
    Type: AWS::CloudFormation::Stack
    Properties:
      TemplateURL: https://s3.amazonaws.com/my-cfn-templates/network.yaml
      Parameters:
        Environment: !Ref Environment
        VpcCidr: "10.0.0.0/16"
      Tags:
        - Key: Environment
          Value: !Ref Environment

  DatabaseStack:
    Type: AWS::CloudFormation::Stack
    DependsOn: NetworkStack
    Properties:
      TemplateURL: https://s3.amazonaws.com/my-cfn-templates/database.yaml
      Parameters:
        Environment: !Ref Environment
        VpcId: !GetAtt NetworkStack.Outputs.VpcId
        SubnetIds: !GetAtt NetworkStack.Outputs.PrivateSubnetIds

  AppStack:
    Type: AWS::CloudFormation::Stack
    DependsOn: [NetworkStack, DatabaseStack]
    Properties:
      TemplateURL: https://s3.amazonaws.com/my-cfn-templates/app.yaml
      Parameters:
        Environment: !Ref Environment
        VpcId: !GetAtt NetworkStack.Outputs.VpcId
        SubnetIds: !GetAtt NetworkStack.Outputs.PrivateSubnetIds
        DbEndpoint: !GetAtt DatabaseStack.Outputs.Endpoint

Outputs:
  VpcId:
    Value: !GetAtt NetworkStack.Outputs.VpcId
  AppUrl:
    Value: !GetAtt AppStack.Outputs.LoadBalancerDNS
```

```bash
# Package nested templates (uploads local references to S3)
aws cloudformation package \
  --template-file parent.yaml \
  --s3-bucket my-cfn-templates \
  --output-template-file packaged.yaml

# Deploy the packaged template
aws cloudformation deploy \
  --template-file packaged.yaml \
  --stack-name production-app \
  --parameter-overrides Environment=prod \
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND \
  --tags Environment=production
```

## Intrinsic Functions Reference

```yaml
# Ref - reference a parameter or resource
SecurityGroupId: !Ref SecurityGroup

# GetAtt - get an attribute of a resource
SecurityGroupArn: !GetAtt SecurityGroup.GroupId

# Sub - string substitution
BucketName: !Sub '${Environment}-${AWS::AccountId}-data'

# Join - concatenate strings
PolicyArn: !Join ['', ['arn:aws:iam::', !Ref 'AWS::AccountId', ':policy/MyPolicy']]

# Select - pick from a list
FirstSubnet: !Select [0, !Ref SubnetIds]

# Split - split a string
FirstPart: !Select [0, !Split ['-', !Ref 'AWS::StackName']]

# If - conditional value
InstanceSize: !If [IsProd, t3.large, t3.micro]

# Equals - condition definition
Conditions:
  IsProd: !Equals [!Ref Environment, prod]

# ImportValue - cross-stack reference
VpcId: !ImportValue production-VpcId

# Cidr - generate CIDR blocks
Subnets: !Cidr [!GetAtt VPC.CidrBlock, 6, 8]

# GetAZs - list availability zones
AZ: !Select [0, !GetAZs '']
```

## Stack Policy (Prevent Accidental Replacements)

```bash
# Apply a stack policy that prevents replacement of the database
aws cloudformation set-stack-policy \
  --stack-name production-web \
  --stack-policy-body '{
    "Statement": [
      {
        "Effect": "Allow",
        "Action": "Update:*",
        "Principal": "*",
        "Resource": "*"
      },
      {
        "Effect": "Deny",
        "Action": "Update:Replace",
        "Principal": "*",
        "Resource": "LogicalResourceId/Database"
      },
      {
        "Effect": "Deny",
        "Action": "Update:Delete",
        "Principal": "*",
        "Resource": "LogicalResourceId/Database"
      }
    ]
  }'
```

## Stack Events and Debugging

```bash
# View stack events (most recent first)
aws cloudformation describe-stack-events \
  --stack-name production-web \
  --query "StackEvents[?ResourceStatus=='CREATE_FAILED' || ResourceStatus=='UPDATE_FAILED'].{Time:Timestamp,Resource:LogicalResourceId,Status:ResourceStatus,Reason:ResourceStatusReason}" \
  --output table

# Continue a rollback that is stuck
aws cloudformation continue-update-rollback \
  --stack-name production-web \
  --resources-to-skip SecurityGroup

# Cancel an in-progress update
aws cloudformation cancel-update-stack --stack-name production-web

# Get template from an existing stack
aws cloudformation get-template \
  --stack-name production-web \
  --template-stage Processed \
  --query TemplateBody \
  --output text > current-template.yaml
```

## Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| CREATE_FAILED on IAM resource | Missing CAPABILITY_IAM | Add `--capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM` |
| Stack stuck in UPDATE_ROLLBACK_FAILED | Resource cannot be rolled back | Use `continue-update-rollback` with `--resources-to-skip` |
| Nested stack fails | Template URL wrong or S3 access denied | Use `aws cloudformation package` to upload; check bucket policy |
| Circular dependency error | Two resources reference each other | Break the cycle with a third resource or use `DependsOn` |
| Drift detected | Manual changes made outside CloudFormation | Re-apply the template or update template to match current state |
| Change set shows no changes | Template and parameters identical | Verify the diff; check if the change is parameter-only |
| Template validation error | YAML syntax or invalid resource property | Run `cfn-lint`; check property names against docs |
| Export name already exists | Another stack uses the same export name | Use unique export names with `!Sub '${AWS::StackName}-Name'` |
| Delete fails - resource in use | Dependent resource outside the stack | Remove the dependency first; check for SG references |

## Related Skills

- terraform-aws (`terraform-aws`) - Alternative IaC with Terraform
- aws-iam (`aws-iam`) - IAM resources in templates
- aws-vpc (`aws-vpc`) - Network infrastructure templates
- aws-ec2 (`aws-ec2`) - Compute resources in templates
- aws-s3 (`aws-s3`) - Storage resources in templates

## Limitations

- Infrastructure commands can disrupt services: confirm target host/scope and have backups/snapshots before mutating state.
- Docs-only import: upstream scripts and templates not bundled.

