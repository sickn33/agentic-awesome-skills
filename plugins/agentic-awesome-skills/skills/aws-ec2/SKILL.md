---
name: aws-ec2
description: Manage EC2 instances, AMIs, and auto-scaling groups. Configure security
  groups, key pairs, and instance types. Use when deploying compute resources on AWS.
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

# AWS EC2

Deploy and manage Amazon EC2 compute instances for production, staging, and development workloads.

## When to Use This Skill

- Launching new compute instances for application hosting
- Building golden AMIs for consistent deployments
- Setting up auto-scaling groups behind load balancers
- Migrating workloads to Spot instances for cost savings
- Troubleshooting instance connectivity, performance, or launch failures
- Creating launch templates for repeatable infrastructure

## Prerequisites

- AWS CLI v2 installed and configured (`aws configure`)
- IAM permissions: `ec2:*`, `autoscaling:*`, `elasticloadbalancing:*`, `iam:PassRole`
- An existing VPC with subnets (see aws-vpc (`aws-vpc`))
- SSH key pair created (`aws ec2 create-key-pair --key-name my-key --query 'KeyMaterial' --output text > my-key.pem`)

## Instance Type Selection Guide

| Category | Types | Use Case |
|---|---|---|
| General Purpose | t3, t3a, m6i, m7g | Web servers, small databases, dev/test |
| Compute Optimized | c6i, c7g | Batch processing, media encoding, ML inference |
| Memory Optimized | r6i, r7g, x2idn | In-memory caches, large databases |
| Storage Optimized | i3, i4i, d3 | Data warehousing, distributed file systems |
| Accelerated | p4d, g5, inf2 | ML training, GPU rendering, inference |
| Burstable | t3.micro-t3.2xlarge | Low-steady-state with occasional bursts |

## Launch an Instance

```bash
# Launch a production web server
aws ec2 run-instances \
  --image-id ami-0abcdef1234567890 \
  --instance-type t3.medium \
  --key-name my-key \
  --security-group-ids sg-12345678 \
  --subnet-id subnet-12345678 \
  --iam-instance-profile Name=EC2AppProfile \
  --metadata-options "HttpTokens=required,HttpEndpoint=enabled" \
  --block-device-mappings '[{
    "DeviceName": "/dev/xvda",
    "Ebs": {
      "VolumeSize": 30,
      "VolumeType": "gp3",
      "Iops": 3000,
      "Throughput": 125,
      "Encrypted": true
    }
  }]' \
  --tag-specifications 'ResourceType=instance,Tags=[
    {Key=Name,Value=web-server-01},
    {Key=Environment,Value=production},
    {Key=Team,Value=platform}
  ]' \
  --user-data file://userdata.sh

# Launch with IMDSv2 required (security best practice)
aws ec2 run-instances \
  --image-id ami-0abcdef1234567890 \
  --instance-type t3.micro \
  --metadata-options "HttpTokens=required,HttpPutResponseHopLimit=1,HttpEndpoint=enabled" \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=secure-instance}]'
```

## User Data Scripts

```bash
#!/bin/bash
# userdata.sh - Bootstrap a web server on Amazon Linux 2023
set -euxo pipefail

# System updates
dnf update -y

# Install and start web server
dnf install -y nginx
systemctl enable nginx
systemctl start nginx

# Install CloudWatch agent
dnf install -y amazon-cloudwatch-agent
/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config -m ec2 \
  -s -c ssm:AmazonCloudWatch-linux

# Install CodeDeploy agent
dnf install -y ruby wget
cd /home/ec2-user
wget https://aws-codedeploy-us-east-1.s3.us-east-1.amazonaws.com/latest/install
chmod +x ./install
./install auto

# Signal CloudFormation (if launched via CFN)
# /opt/aws/bin/cfn-signal -e $? --stack ${AWS::StackName} --resource ASG --region ${AWS::Region}
```

## Launch Templates

```bash
# Create a launch template with full configuration
aws ec2 create-launch-template \
  --launch-template-name web-server-template \
  --version-description "v1 - AL2023 with nginx" \
  --launch-template-data '{
    "ImageId": "ami-0abcdef1234567890",
    "InstanceType": "t3.medium",
    "KeyName": "my-key",
    "SecurityGroupIds": ["sg-12345678"],
    "IamInstanceProfile": {"Name": "EC2AppProfile"},
    "MetadataOptions": {
      "HttpTokens": "required",
      "HttpEndpoint": "enabled"
    },
    "BlockDeviceMappings": [{
      "DeviceName": "/dev/xvda",
      "Ebs": {
        "VolumeSize": 30,
        "VolumeType": "gp3",
        "Encrypted": true
      }
    }],
    "TagSpecifications": [{
      "ResourceType": "instance",
      "Tags": [
        {"Key": "Environment", "Value": "production"},
        {"Key": "ManagedBy", "Value": "launch-template"}
      ]
    }],
    "Monitoring": {"Enabled": true},
    "UserData": "'"$(base64 -w0 userdata.sh)"'"
  }'

# Create a new version of the launch template
aws ec2 create-launch-template-version \
  --launch-template-name web-server-template \
  --source-version 1 \
  --version-description "v2 - updated AMI" \
  --launch-template-data '{"ImageId": "ami-0newami1234567890"}'

# Set the default version
aws ec2 modify-launch-template \
  --launch-template-name web-server-template \
  --default-version 2
```

## Auto Scaling Group

```bash
# Create ASG with mixed instances (on-demand + spot)
aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name web-asg \
  --mixed-instances-policy '{
    "LaunchTemplate": {
      "LaunchTemplateSpecification": {
        "LaunchTemplateName": "web-server-template",
        "Version": "$Default"
      },
      "Overrides": [
        {"InstanceType": "t3.medium"},
        {"InstanceType": "t3a.medium"},
        {"InstanceType": "m5.large"}
      ]
    },
    "InstancesDistribution": {
      "OnDemandBaseCapacity": 2,
      "OnDemandPercentageAboveBaseCapacity": 25,
      "SpotAllocationStrategy": "capacity-optimized"
    }
  }' \
  --min-size 2 --max-size 10 --desired-capacity 4 \
  --vpc-zone-identifier "subnet-aaa,subnet-bbb" \
  --target-group-arns "arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/web-tg/abc123" \
  --health-check-type ELB \
  --health-check-grace-period 300 \
  --tags '[
    {"Key":"Name","Value":"web-asg","PropagateAtLaunch":true},
    {"Key":"Environment","Value":"production","PropagateAtLaunch":true}
  ]'

# Create target tracking scaling policy (target 60% CPU)
aws autoscaling put-scaling-policy \
  --auto-scaling-group-name web-asg \
  --policy-name cpu-target-tracking \
  --policy-type TargetTrackingScaling \
  --target-tracking-configuration '{
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "ASGAverageCPUUtilization"
    },
    "TargetValue": 60.0,
    "ScaleInCooldown": 300,
    "ScaleOutCooldown": 60
  }'

# Create scheduled scaling for known traffic patterns
aws autoscaling put-scheduled-update-group-action \
  --auto-scaling-group-name web-asg \
  --scheduled-action-name scale-up-morning \
  --recurrence "0 8 * * MON-FRI" \
  --min-size 4 --max-size 20 --desired-capacity 8

aws autoscaling put-scheduled-update-group-action \
  --auto-scaling-group-name web-asg \
  --scheduled-action-name scale-down-evening \
  --recurrence "0 20 * * MON-FRI" \
  --min-size 2 --max-size 10 --desired-capacity 2
```

## Spot Instances

```bash
# Request Spot instances
aws ec2 request-spot-instances \
  --spot-price "0.05" \
  --instance-count 3 \
  --type "one-time" \
  --launch-specification '{
    "ImageId": "ami-0abcdef1234567890",
    "InstanceType": "c5.xlarge",
    "KeyName": "my-key",
    "SecurityGroupIds": ["sg-12345678"],
    "SubnetId": "subnet-12345678"
  }'

# Check current Spot prices
aws ec2 describe-spot-price-history \
  --instance-types t3.medium t3a.medium m5.large \
  --availability-zone us-east-1a \
  --product-descriptions "Linux/UNIX" \
  --start-time "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --query "SpotPriceHistory[].{Type:InstanceType,Price:SpotPrice,AZ:AvailabilityZone}" \
  --output table

# Create a Spot Fleet request
aws ec2 request-spot-fleet \
  --spot-fleet-request-config '{
    "IamFleetRole": "arn:aws:iam::123456789012:role/aws-ec2-spot-fleet-role",
    "TargetCapacity": 10,
    "SpotPrice": "0.10",
    "AllocationStrategy": "capacityOptimized",
    "LaunchSpecifications": [
      {"ImageId": "ami-xxx", "InstanceType": "c5.xlarge", "SubnetId": "subnet-aaa"},
      {"ImageId": "ami-xxx", "InstanceType": "c5a.xlarge", "SubnetId": "subnet-bbb"}
    ]
  }'
```

## AMI Management

```bash
# Create an AMI from a running instance
aws ec2 create-image \
  --instance-id i-0abc123def456 \
  --name "web-server-$(date +%Y%m%d)" \
  --description "Web server golden AMI" \
  --no-reboot \
  --tag-specifications 'ResourceType=image,Tags=[
    {Key=Name,Value=web-server-golden},
    {Key=Version,Value=2026.03.24}
  ]'

# Copy AMI to another region for disaster recovery
aws ec2 copy-image \
  --source-image-id ami-0abcdef1234567890 \
  --source-region us-east-1 \
  --region us-west-2 \
  --name "web-server-dr-copy"

# Deregister old AMIs and delete associated snapshots
aws ec2 deregister-image --image-id ami-old123
aws ec2 delete-snapshot --snapshot-id snap-old123

# Share AMI with another AWS account
aws ec2 modify-image-attribute \
  --image-id ami-0abcdef1234567890 \
  --launch-permission "Add=[{UserId=987654321098}]"
```

## Instance Management

```bash
# List running instances with key details
aws ec2 describe-instances \
  --filters "Name=instance-state-name,Values=running" \
  --query "Reservations[].Instances[].{ID:InstanceId,Type:InstanceType,IP:PrivateIpAddress,Name:Tags[?Key=='Name']|[0].Value,State:State.Name}" \
  --output table

# Stop and start instances
aws ec2 stop-instances --instance-ids i-0abc123def456
aws ec2 start-instances --instance-ids i-0abc123def456

# Resize an instance (stop first)
aws ec2 stop-instances --instance-ids i-0abc123def456
aws ec2 wait instance-stopped --instance-ids i-0abc123def456
aws ec2 modify-instance-attribute \
  --instance-id i-0abc123def456 \
  --instance-type '{"Value": "t3.large"}'
aws ec2 start-instances --instance-ids i-0abc123def456

# Get console output for debugging boot issues
aws ec2 get-console-output --instance-id i-0abc123def456

# Get instance screenshot (helps debug GUI issues)
aws ec2 get-console-screenshot --instance-id i-0abc123def456
```

## Terraform EC2 with Auto Scaling

```hcl
resource "aws_launch_template" "web" {
  name_prefix   = "web-"
  image_id      = data.aws_ami.amazon_linux.id
  instance_type = "t3.medium"

  iam_instance_profile {
    name = aws_iam_instance_profile.web.name
  }

  metadata_options {
    http_tokens   = "required"
    http_endpoint = "enabled"
  }

  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_size = 30
      volume_type = "gp3"
      encrypted   = true
    }
  }

  user_data = base64encode(file("userdata.sh"))

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name        = "web-server"
      Environment = "production"
    }
  }
}

resource "aws_autoscaling_group" "web" {
  name                = "web-asg"
  min_size            = 2
  max_size            = 10
  desired_capacity    = 4
  vpc_zone_identifier = [aws_subnet.private_a.id, aws_subnet.private_b.id]
  target_group_arns   = [aws_lb_target_group.web.arn]
  health_check_type   = "ELB"

  launch_template {
    id      = aws_launch_template.web.id
    version = "$Latest"
  }

  tag {
    key                 = "Name"
    value               = "web-asg"
    propagate_at_launch = true
  }
}

resource "aws_autoscaling_policy" "cpu" {
  name                   = "cpu-target-tracking"
  autoscaling_group_name = aws_autoscaling_group.web.name
  policy_type            = "TargetTrackingScaling"

  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ASGAverageCPUUtilization"
    }
    target_value = 60.0
  }
}
```

## Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| Instance stuck in `pending` | Insufficient capacity | Try a different AZ or instance type |
| Cannot SSH to instance | Security group or NACL blocks port 22 | Check SG ingress rules and route tables |
| Instance immediately terminates | EBS volume limit or AMI issue | Check `describe-instances` for StateReason |
| IMDSv1 deprecation warnings | Metadata options not set | Set `HttpTokens=required` in launch template |
| User data not running | Script missing shebang or not base64 | Verify `#!/bin/bash` header; check `/var/log/cloud-init-output.log` |
| Spot instance terminated | Capacity reclaimed by AWS | Use capacity-optimized allocation and diversify types |
| ASG not replacing unhealthy | Health check grace period too short | Increase grace period to cover app boot time |
| EBS throughput bottleneck | gp2 volume too small for IOPS | Migrate to gp3 and set explicit IOPS/throughput |

## Related Skills

- aws-vpc (`aws-vpc`) - VPC networking, subnets, and security groups
- aws-iam (`aws-iam`) - Instance profiles and roles
- aws-cost-optimization (`aws-cost-optimization`) - Rightsizing and Spot strategies
- terraform-aws (`terraform-aws`) - Infrastructure as Code deployment
- cloudformation (`cloudformation`) - AWS-native IaC templates

## Limitations

- Infrastructure commands can disrupt services: confirm target host/scope and have backups/snapshots before mutating state.
- Docs-only import: upstream scripts and templates not bundled.

