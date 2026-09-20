---
name: aws-ecs-fargate
description: Deploy containers on ECS and Fargate. Configure task definitions, services,
  and load balancing. Use when running containerized workloads on AWS.
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

# AWS ECS & Fargate

Run containerized applications on Amazon ECS with Fargate serverless compute or EC2 launch type.

## When to Use This Skill

- Deploying Docker containers to AWS without managing servers (Fargate)
- Running microservices with service discovery and load balancing
- Setting up blue/green or rolling deployments for containerized apps
- Configuring auto-scaling for container workloads
- Migrating from docker-compose or Kubernetes to ECS
- Troubleshooting task failures, health check issues, or networking problems

## Prerequisites

- AWS CLI v2 installed and configured
- Docker installed for building and pushing images
- IAM permissions: `ecs:*`, `ecr:*`, `elasticloadbalancing:*`, `logs:*`, `iam:PassRole`
- An ECR repository for storing container images
- A VPC with subnets and an ALB (see aws-vpc (`aws-vpc`))

## Cluster Setup

```bash
# Create an ECS cluster with Container Insights enabled
aws ecs create-cluster \
  --cluster-name production \
  --capacity-providers FARGATE FARGATE_SPOT \
  --default-capacity-provider-strategy '[
    {"capacityProvider": "FARGATE", "weight": 1, "base": 2},
    {"capacityProvider": "FARGATE_SPOT", "weight": 3}
  ]' \
  --settings '[{"name": "containerInsights", "value": "enabled"}]'

# List clusters
aws ecs list-clusters

# Describe cluster details
aws ecs describe-clusters --clusters production --include STATISTICS ATTACHMENTS
```

## Push Image to ECR

```bash
# Create ECR repository
aws ecr create-repository \
  --repository-name myapp \
  --image-scanning-configuration scanOnPush=true \
  --encryption-configuration encryptionType=KMS

# Authenticate Docker to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com

# Build, tag, and push
docker build -t myapp:latest .
docker tag myapp:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/myapp:latest
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/myapp:latest
```

## Task Definition

```json
{
  "family": "myapp",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::123456789012:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::123456789012:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "myapp",
      "image": "123456789012.dkr.ecr.us-east-1.amazonaws.com/myapp:latest",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 8080,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "NODE_ENV", "value": "production"},
        {"name": "PORT", "value": "8080"}
      ],
      "secrets": [
        {
          "name": "DB_PASSWORD",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:myapp/db-password"
        },
        {
          "name": "API_KEY",
          "valueFrom": "arn:aws:ssm:us-east-1:123456789012:parameter/myapp/api-key"
        }
      ],
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:8080/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      },
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/myapp",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs",
          "awslogs-create-group": "true"
        }
      },
      "ulimits": [
        {"name": "nofile", "softLimit": 65536, "hardLimit": 65536}
      ]
    }
  ]
}
```

```bash
# Register the task definition
aws ecs register-task-definition --cli-input-json file://task-definition.json

# List task definition revisions
aws ecs list-task-definitions --family-prefix myapp

# Deregister an old revision
aws ecs deregister-task-definition --task-definition myapp:1
```

## Create Service with ALB

```bash
# Create the CloudWatch log group first
aws logs create-log-group --log-group-name /ecs/myapp
aws logs put-retention-policy --log-group-name /ecs/myapp --retention-in-days 30

# Create ECS service with load balancer
aws ecs create-service \
  --cluster production \
  --service-name myapp \
  --task-definition myapp:2 \
  --desired-count 3 \
  --launch-type FARGATE \
  --platform-version LATEST \
  --deployment-configuration '{
    "deploymentCircuitBreaker": {"enable": true, "rollback": true},
    "maximumPercent": 200,
    "minimumHealthyPercent": 100
  }' \
  --network-configuration '{
    "awsvpcConfiguration": {
      "subnets": ["subnet-private-a", "subnet-private-b"],
      "securityGroups": ["sg-app"],
      "assignPublicIp": "DISABLED"
    }
  }' \
  --load-balancers '[{
    "targetGroupArn": "arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/myapp-tg/abc123",
    "containerName": "myapp",
    "containerPort": 8080
  }]' \
  --service-registries '[{
    "registryArn": "arn:aws:servicediscovery:us-east-1:123456789012:service/srv-abc123"
  }]' \
  --enable-execute-command \
  --propagate-tags SERVICE
```

## Deployments

```bash
# Rolling update - update task definition and force new deployment
aws ecs update-service \
  --cluster production \
  --service myapp \
  --task-definition myapp:3 \
  --force-new-deployment

# Watch deployment progress
aws ecs describe-services \
  --cluster production \
  --services myapp \
  --query "services[0].deployments[].{Status:status,Running:runningCount,Desired:desiredCount,TaskDef:taskDefinition}" \
  --output table

# Wait for service to stabilize
aws ecs wait services-stable --cluster production --services myapp

# Exec into a running container for debugging
aws ecs execute-command \
  --cluster production \
  --task arn:aws:ecs:us-east-1:123456789012:task/production/abc123 \
  --container myapp \
  --interactive \
  --command "/bin/sh"
```

## Auto Scaling

```bash
# Register ECS service as a scalable target
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/production/myapp \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 2 \
  --max-capacity 20

# Target tracking policy - scale on CPU utilization
aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --resource-id service/production/myapp \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-name cpu-target-tracking \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "ECSServiceAverageCPUUtilization"
    },
    "TargetValue": 70.0,
    "ScaleInCooldown": 300,
    "ScaleOutCooldown": 60
  }'

# Scale on request count per target (ALB)
aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --resource-id service/production/myapp \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-name request-count-tracking \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "ALBRequestCountPerTarget",
      "ResourceLabel": "app/my-alb/abc123/targetgroup/myapp-tg/def456"
    },
    "TargetValue": 1000.0,
    "ScaleInCooldown": 300,
    "ScaleOutCooldown": 60
  }'
```

## Terraform ECS Fargate Service

```hcl
resource "aws_ecs_cluster" "main" {
  name = "production"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

resource "aws_ecs_task_definition" "myapp" {
  family                   = "myapp"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name      = "myapp"
    image     = "${aws_ecr_repository.myapp.repository_url}:latest"
    essential = true

    portMappings = [{
      containerPort = 8080
      protocol      = "tcp"
    }]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.myapp.name
        awslogs-region        = "us-east-1"
        awslogs-stream-prefix = "ecs"
      }
    }

    healthCheck = {
      command     = ["CMD-SHELL", "curl -f http://localhost:8080/health || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 60
    }
  }])
}

resource "aws_ecs_service" "myapp" {
  name            = "myapp"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.myapp.arn
  desired_count   = 3
  launch_type     = "FARGATE"

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.app.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.myapp.arn
    container_name   = "myapp"
    container_port   = 8080
  }

  enable_execute_command = true
  propagate_tags         = "SERVICE"
}
```

## Viewing Logs

```bash
# Tail logs from CloudWatch
aws logs tail /ecs/myapp --follow --since 1h

# Get logs for a specific task
aws logs get-log-events \
  --log-group-name /ecs/myapp \
  --log-stream-name "ecs/myapp/abc123def456" \
  --start-from-head

# Filter logs for errors
aws logs filter-log-events \
  --log-group-name /ecs/myapp \
  --filter-pattern "ERROR" \
  --start-time $(date -d '1 hour ago' +%s000)
```

## Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| Task stuck in PROVISIONING | No available capacity in subnets | Check subnet availability and capacity provider |
| Task fails immediately | Container crashes on startup | Check CloudWatch logs; run image locally first |
| Health check failing | App not ready within startPeriod | Increase `startPeriod`; verify health endpoint |
| Cannot pull ECR image | Execution role missing ECR permissions | Attach `AmazonECSTaskExecutionRolePolicy` |
| Service stuck at 0 running | Security group blocks ALB health check | Allow ALB SG to reach container port |
| Exec command fails | SSM agent not initialized | Ensure `enableExecuteCommand` is true; check task role |
| High Fargate costs | Not using Fargate Spot for tolerant workloads | Add FARGATE_SPOT capacity provider |
| Container OOM killed | Memory limit too low | Increase `memory` in task definition; check for leaks |
| Slow deployments | minimumHealthyPercent too high | Set to 50% for faster rolling updates |

## Related Skills

- docker-management (`docker-management`) - Container fundamentals
- container-registries (`container-registries`) - ECR and image management
- aws-vpc (`aws-vpc`) - Networking for ECS tasks
- aws-iam (`aws-iam`) - Task and execution roles
- terraform-aws (`terraform-aws`) - Infrastructure as Code deployment

## Limitations

- Infrastructure commands can disrupt services: confirm target host/scope and have backups/snapshots before mutating state.
- Docs-only import: upstream scripts and templates not bundled.

