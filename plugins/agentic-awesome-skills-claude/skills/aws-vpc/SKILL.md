---
name: aws-vpc
description: Design and implement VPCs and networking. Configure subnets, route tables,
  and security groups. Use when setting up AWS network infrastructure.
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

# AWS VPC

Design and manage Virtual Private Cloud networking for production AWS environments with proper subnet isolation, routing, and security.

## When to Use This Skill

- Building a new VPC for production, staging, or development
- Setting up public/private subnet architecture across multiple AZs
- Configuring NAT Gateways for private subnet internet access
- Creating security groups and NACLs for network segmentation
- Setting up VPC peering or Transit Gateway for multi-VPC connectivity
- Implementing VPC endpoints for private access to AWS services
- Troubleshooting connectivity issues between resources

## Prerequisites

- AWS CLI v2 installed and configured
- IAM permissions: `ec2:*` (or scoped to VPC-related actions)
- CIDR range planning completed (avoid overlaps with on-premises or other VPCs)
- For VPC peering: access to both VPCs (same or different accounts)

## Network Architecture

```
VPC (10.0.0.0/16) - 65,536 IPs
├── Public Subnets (internet-facing via IGW)
│   ├── 10.0.1.0/24 (us-east-1a) - 256 IPs - ALBs, NAT GW, bastion
│   ├── 10.0.2.0/24 (us-east-1b) - 256 IPs
│   └── 10.0.3.0/24 (us-east-1c) - 256 IPs
├── Private Subnets (app tier, NAT GW for outbound)
│   ├── 10.0.11.0/24 (us-east-1a) - 256 IPs - ECS, EC2, Lambda
│   ├── 10.0.12.0/24 (us-east-1b) - 256 IPs
│   └── 10.0.13.0/24 (us-east-1c) - 256 IPs
├── Data Subnets (isolated, no internet)
│   ├── 10.0.21.0/24 (us-east-1a) - 256 IPs - RDS, ElastiCache
│   ├── 10.0.22.0/24 (us-east-1b) - 256 IPs
│   └── 10.0.23.0/24 (us-east-1c) - 256 IPs
├── Internet Gateway
├── NAT Gateways (one per AZ for HA)
├── Route Tables (public, private, data)
└── VPC Flow Logs → CloudWatch / S3
```

## Create a VPC with CLI

```bash
# Create the VPC
VPC_ID=$(aws ec2 create-vpc \
  --cidr-block 10.0.0.0/16 \
  --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=production-vpc},{Key=Environment,Value=production}]' \
  --query 'Vpc.VpcId' --output text)

# Enable DNS support and hostnames
aws ec2 modify-vpc-attribute --vpc-id $VPC_ID --enable-dns-support '{"Value":true}'
aws ec2 modify-vpc-attribute --vpc-id $VPC_ID --enable-dns-hostnames '{"Value":true}'

# Create public subnets
PUB_SUB_A=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.1.0/24 \
  --availability-zone us-east-1a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=public-a},{Key=Tier,Value=public}]' \
  --query 'Subnet.SubnetId' --output text)

PUB_SUB_B=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.2.0/24 \
  --availability-zone us-east-1b \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=public-b},{Key=Tier,Value=public}]' \
  --query 'Subnet.SubnetId' --output text)

# Enable auto-assign public IP on public subnets
aws ec2 modify-subnet-attribute --subnet-id $PUB_SUB_A --map-public-ip-on-launch
aws ec2 modify-subnet-attribute --subnet-id $PUB_SUB_B --map-public-ip-on-launch

# Create private subnets
PRIV_SUB_A=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.11.0/24 \
  --availability-zone us-east-1a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=private-a},{Key=Tier,Value=private}]' \
  --query 'Subnet.SubnetId' --output text)

PRIV_SUB_B=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.12.0/24 \
  --availability-zone us-east-1b \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=private-b},{Key=Tier,Value=private}]' \
  --query 'Subnet.SubnetId' --output text)

# Create data subnets (isolated)
DATA_SUB_A=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.21.0/24 \
  --availability-zone us-east-1a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=data-a},{Key=Tier,Value=data}]' \
  --query 'Subnet.SubnetId' --output text)

DATA_SUB_B=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.22.0/24 \
  --availability-zone us-east-1b \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=data-b},{Key=Tier,Value=data}]' \
  --query 'Subnet.SubnetId' --output text)
```

## Internet Gateway and NAT Gateway

```bash
# Create and attach Internet Gateway
IGW_ID=$(aws ec2 create-internet-gateway \
  --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=production-igw}]' \
  --query 'InternetGateway.InternetGatewayId' --output text)
aws ec2 attach-internet-gateway --vpc-id $VPC_ID --internet-gateway-id $IGW_ID

# Create public route table
PUB_RT=$(aws ec2 create-route-table \
  --vpc-id $VPC_ID \
  --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=public-rt}]' \
  --query 'RouteTable.RouteTableId' --output text)
aws ec2 create-route --route-table-id $PUB_RT --destination-cidr-block 0.0.0.0/0 --gateway-id $IGW_ID
aws ec2 associate-route-table --route-table-id $PUB_RT --subnet-id $PUB_SUB_A
aws ec2 associate-route-table --route-table-id $PUB_RT --subnet-id $PUB_SUB_B

# Allocate Elastic IPs for NAT Gateways (one per AZ for HA)
EIP_A=$(aws ec2 allocate-address --domain vpc --query 'AllocationId' --output text)
EIP_B=$(aws ec2 allocate-address --domain vpc --query 'AllocationId' --output text)

# Create NAT Gateways in public subnets
NAT_A=$(aws ec2 create-nat-gateway \
  --subnet-id $PUB_SUB_A \
  --allocation-id $EIP_A \
  --tag-specifications 'ResourceType=natgateway,Tags=[{Key=Name,Value=nat-a}]' \
  --query 'NatGateway.NatGatewayId' --output text)

NAT_B=$(aws ec2 create-nat-gateway \
  --subnet-id $PUB_SUB_B \
  --allocation-id $EIP_B \
  --tag-specifications 'ResourceType=natgateway,Tags=[{Key=Name,Value=nat-b}]' \
  --query 'NatGateway.NatGatewayId' --output text)

# Wait for NAT Gateways
aws ec2 wait nat-gateway-available --nat-gateway-ids $NAT_A $NAT_B

# Create private route tables (one per AZ for HA NAT)
PRIV_RT_A=$(aws ec2 create-route-table \
  --vpc-id $VPC_ID \
  --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=private-rt-a}]' \
  --query 'RouteTable.RouteTableId' --output text)
aws ec2 create-route --route-table-id $PRIV_RT_A --destination-cidr-block 0.0.0.0/0 --nat-gateway-id $NAT_A
aws ec2 associate-route-table --route-table-id $PRIV_RT_A --subnet-id $PRIV_SUB_A

PRIV_RT_B=$(aws ec2 create-route-table \
  --vpc-id $VPC_ID \
  --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=private-rt-b}]' \
  --query 'RouteTable.RouteTableId' --output text)
aws ec2 create-route --route-table-id $PRIV_RT_B --destination-cidr-block 0.0.0.0/0 --nat-gateway-id $NAT_B
aws ec2 associate-route-table --route-table-id $PRIV_RT_B --subnet-id $PRIV_SUB_B
```

## Security Groups

```bash
# ALB security group (public-facing)
ALB_SG=$(aws ec2 create-security-group \
  --group-name alb-sg \
  --description "Application Load Balancer" \
  --vpc-id $VPC_ID \
  --query 'GroupId' --output text)
aws ec2 authorize-security-group-ingress --group-id $ALB_SG --protocol tcp --port 443 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-id $ALB_SG --protocol tcp --port 80 --cidr 0.0.0.0/0

# Application security group (only from ALB)
APP_SG=$(aws ec2 create-security-group \
  --group-name app-sg \
  --description "Application tier" \
  --vpc-id $VPC_ID \
  --query 'GroupId' --output text)
aws ec2 authorize-security-group-ingress \
  --group-id $APP_SG \
  --protocol tcp \
  --port 8080 \
  --source-group $ALB_SG

# Database security group (only from app tier)
DB_SG=$(aws ec2 create-security-group \
  --group-name db-sg \
  --description "Database tier" \
  --vpc-id $VPC_ID \
  --query 'GroupId' --output text)
aws ec2 authorize-security-group-ingress \
  --group-id $DB_SG \
  --protocol tcp \
  --port 5432 \
  --source-group $APP_SG

# List all security groups in the VPC
aws ec2 describe-security-groups \
  --filters "Name=vpc-id,Values=$VPC_ID" \
  --query "SecurityGroups[].{Name:GroupName,ID:GroupId,Description:Description}" \
  --output table
```

## VPC Endpoints (Private Access to AWS Services)

```bash
# Gateway endpoint for S3 (free, route-table based)
aws ec2 create-vpc-endpoint \
  --vpc-id $VPC_ID \
  --service-name com.amazonaws.us-east-1.s3 \
  --route-table-ids $PRIV_RT_A $PRIV_RT_B \
  --tag-specifications 'ResourceType=vpc-endpoint,Tags=[{Key=Name,Value=s3-endpoint}]'

# Gateway endpoint for DynamoDB (free)
aws ec2 create-vpc-endpoint \
  --vpc-id $VPC_ID \
  --service-name com.amazonaws.us-east-1.dynamodb \
  --route-table-ids $PRIV_RT_A $PRIV_RT_B

# Interface endpoint for Secrets Manager (ENI-based, has hourly cost)
aws ec2 create-vpc-endpoint \
  --vpc-id $VPC_ID \
  --vpc-endpoint-type Interface \
  --service-name com.amazonaws.us-east-1.secretsmanager \
  --subnet-ids $PRIV_SUB_A $PRIV_SUB_B \
  --security-group-ids $APP_SG \
  --private-dns-enabled \
  --tag-specifications 'ResourceType=vpc-endpoint,Tags=[{Key=Name,Value=secretsmanager-endpoint}]'
```

## VPC Flow Logs

```bash
# Enable VPC flow logs to CloudWatch
aws ec2 create-flow-log \
  --resource-type VPC \
  --resource-ids $VPC_ID \
  --traffic-type ALL \
  --log-destination-type cloud-watch-logs \
  --log-group-name /vpc/production-flow-logs \
  --deliver-logs-permission-arn arn:aws:iam::123456789012:role/VPCFlowLogRole \
  --max-aggregation-interval 60 \
  --tag-specifications 'ResourceType=vpc-flow-log,Tags=[{Key=Name,Value=production-flow-log}]'

# Enable VPC flow logs to S3 (cheaper for long-term storage)
aws ec2 create-flow-log \
  --resource-type VPC \
  --resource-ids $VPC_ID \
  --traffic-type ALL \
  --log-destination-type s3 \
  --log-destination arn:aws:s3:::my-flow-logs-bucket/vpc-logs/ \
  --max-aggregation-interval 60
```

## VPC Peering

```bash
# Request peering connection
PEERING_ID=$(aws ec2 create-vpc-peering-connection \
  --vpc-id vpc-requester \
  --peer-vpc-id vpc-accepter \
  --peer-owner-id 987654321098 \
  --peer-region us-west-2 \
  --tag-specifications 'ResourceType=vpc-peering-connection,Tags=[{Key=Name,Value=prod-to-shared}]' \
  --query 'VpcPeeringConnection.VpcPeeringConnectionId' --output text)

# Accept peering (from the accepter account/region)
aws ec2 accept-vpc-peering-connection --vpc-peering-connection-id $PEERING_ID

# Add routes in both VPCs
aws ec2 create-route --route-table-id rtb-requester --destination-cidr-block 10.1.0.0/16 --vpc-peering-connection-id $PEERING_ID
aws ec2 create-route --route-table-id rtb-accepter --destination-cidr-block 10.0.0.0/16 --vpc-peering-connection-id $PEERING_ID
```

## Terraform VPC Module

```hcl
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name        = "production-vpc"
    Environment = "production"
  }
}

resource "aws_subnet" "public" {
  count                   = 3
  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index + 1)
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "public-${data.aws_availability_zones.available.names[count.index]}"
    Tier = "public"
  }
}

resource "aws_subnet" "private" {
  count             = 3
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index + 11)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "private-${data.aws_availability_zones.available.names[count.index]}"
    Tier = "private"
  }
}

resource "aws_subnet" "data" {
  count             = 3
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index + 21)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "data-${data.aws_availability_zones.available.names[count.index]}"
    Tier = "data"
  }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "production-igw" }
}

resource "aws_eip" "nat" {
  count  = 2
  domain = "vpc"
  tags   = { Name = "nat-eip-${count.index}" }
}

resource "aws_nat_gateway" "main" {
  count         = 2
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id
  tags          = { Name = "nat-${count.index}" }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }
  tags = { Name = "public-rt" }
}

resource "aws_route_table_association" "public" {
  count          = 3
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table" "private" {
  count  = 2
  vpc_id = aws_vpc.main.id
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main[count.index].id
  }
  tags = { Name = "private-rt-${count.index}" }
}

resource "aws_route_table_association" "private" {
  count          = 2
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}

resource "aws_vpc_endpoint" "s3" {
  vpc_id       = aws_vpc.main.id
  service_name = "com.amazonaws.${data.aws_region.current.name}.s3"
  route_table_ids = aws_route_table.private[*].id
  tags = { Name = "s3-endpoint" }
}

resource "aws_flow_log" "main" {
  vpc_id                 = aws_vpc.main.id
  traffic_type           = "ALL"
  log_destination_type   = "s3"
  log_destination        = "${aws_s3_bucket.flow_logs.arn}/vpc-logs/"
  max_aggregation_interval = 60
}
```

## Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| Cannot reach internet from private subnet | NAT Gateway route missing | Add 0.0.0.0/0 route to NAT GW in private route table |
| Cannot reach internet from public subnet | IGW not attached or route missing | Attach IGW; add 0.0.0.0/0 route to IGW in public RT |
| EC2 cannot reach S3 | No VPC endpoint or NAT | Add S3 gateway endpoint (free) or ensure NAT GW route |
| Security group rule not working | Wrong direction (ingress vs egress) | SG is stateful; check inbound rule on destination |
| NACL blocking traffic | NACLs are stateless; need both directions | Add matching inbound AND outbound rules with correct ports |
| VPC peering one-way only | Routes missing in one VPC | Add routes in BOTH VPC route tables |
| DNS resolution failing | DNS hostnames not enabled on VPC | Enable `enableDnsHostnames` on VPC |
| NAT Gateway charges high | All AZs routing through one NAT | Deploy NAT GW per AZ with separate route tables |
| Cross-AZ data transfer costs | Resources in different AZs communicating | Co-locate tightly coupled services in same AZ |

## Related Skills

- aws-ec2 (`aws-ec2`) - Instances deployed in VPC subnets
- aws-ecs-fargate (`aws-ecs-fargate`) - ECS tasks in VPC networking
- aws-rds (`aws-rds`) - Database subnet groups
- terraform-aws (`terraform-aws`) - IaC for VPC infrastructure
- firewall-config (`firewall-config`) - Network security controls

## Limitations

- Infrastructure commands can disrupt services: confirm target host/scope and have backups/snapshots before mutating state.
- Docs-only import: upstream scripts and templates not bundled.

