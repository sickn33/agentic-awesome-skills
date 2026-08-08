---
name: multi-cloud-architecture
description: "Decision framework and patterns for architecting applications across AWS, Azure, and GCP."
risk: safe
source: community
date_added: "2026-02-27"
---

# Multi-Cloud Architecture

Decision framework and patterns for architecting applications across AWS, Azure, and GCP.

## Do not use this skill when

- The task is unrelated to multi-cloud architecture
- You need a different domain or tool outside this scope

## Instructions

- Clarify goals, constraints, and required inputs.
- Apply relevant best practices and validate outcomes.
- Provide actionable steps and verification.
- If detailed examples are required, open `resources/implementation-playbook.md`.

## Purpose

Design cloud-agnostic architectures and make informed decisions about service selection across cloud providers.

## Use this skill when

- Design multi-cloud strategies
- Migrate between cloud providers
- Select cloud services for specific workloads
- Implement cloud-agnostic architectures
- Optimize costs across providers

## Cloud Service Comparison

### Compute Services

| AWS | Azure | GCP | Use Case |
|-----|-------|-----|----------|
| EC2 | Virtual Machines | Compute Engine | IaaS VMs |
| ECS | Container Instances | Cloud Run | Containers |
| EKS | AKS | GKE | Kubernetes |
| Lambda | Functions | Cloud Functions | Serverless |
| Fargate | Container Apps | Cloud Run | Managed containers |

### Storage Services

| AWS | Azure | GCP | Use Case |
|-----|-------|-----|----------|
| S3 | Blob Storage | Cloud Storage | Object storage |
| EBS | Managed Disks | Persistent Disk | Block storage |
| EFS | Azure Files | Filestore | File storage |
| Glacier | Archive Storage | Archive Storage | Cold storage |

### Database Services

| AWS | Azure | GCP | Use Case |
|-----|-------|-----|----------|
| RDS | SQL Database | Cloud SQL | Managed SQL |
| DynamoDB | Cosmos DB | Firestore | NoSQL |
| Aurora | PostgreSQL/MySQL | Cloud Spanner | Distributed SQL |
| ElastiCache | Cache for Redis | Memorystore | Caching |

**Reference:** See `references/service-comparison.md` for complete comparison

## Multi-Cloud Patterns

### Pattern 1: Single Provider with DR

- Primary workload in one cloud
- Disaster recovery in another
- Database replication across clouds
- Automated failover

### Pattern 2: Best-of-Breed

- Use best service from each provider
- AI/ML on GCP
- Enterprise apps on Azure
- General compute on AWS

### Pattern 3: Geographic Distribution

- Serve users from nearest cloud region
- Data sovereignty compliance
- Global load balancing
- Regional failover

### Pattern 4: Cloud-Agnostic Abstraction

- Kubernetes for compute
- PostgreSQL for database
- S3-compatible storage (MinIO)
- Open source tools

## Cloud-Agnostic Architecture

### Use Cloud-Native Alternatives

- **Compute:** Kubernetes (EKS/AKS/GKE)
- **Database:** PostgreSQL/MySQL (RDS/SQL Database/Cloud SQL)
- **Message Queue:** Apache Kafka (MSK/Event Hubs/Confluent)
- **Cache:** Redis (ElastiCache/Azure Cache/Memorystore)
- **Object Storage:** S3-compatible API
- **Monitoring:** Prometheus/Grafana
- **Service Mesh:** Istio/Linkerd

### Abstraction Layers

```
Application Layer
    ↓
Infrastructure Abstraction (Terraform)
    ↓
Cloud Provider APIs
    ↓
AWS / Azure / GCP
```

## Cost Comparison

### Compute Pricing Factors

- **AWS:** On-demand, Reserved, Spot, Savings Plans
- **Azure:** Pay-as-you-go, Reserved, Spot
- **GCP:** On-demand, Committed use, Preemptible

### Cost Optimization Strategies

1. Use reserved/committed capacity (30-70% savings)
2. Leverage spot/preemptible instances
3. Right-size resources
4. Use serverless for variable workloads
5. Optimize data transfer costs
6. Implement lifecycle policies
7. Use cost allocation tags
8. Monitor with cloud cost tools

**Reference:** See `references/multi-cloud-patterns.md`

## Migration Strategy

### Phase 1: Assessment
- Inventory current infrastructure
- Identify dependencies
- Assess cloud compatibility
- Estimate costs

### Phase 2: Pilot
- Select pilot workload
- Implement in target cloud
- Test thoroughly
- Document learnings

### Phase 3: Migration
- Migrate workloads incrementally
- Maintain dual-run period
- Monitor performance
- Validate functionality

### Phase 4: Optimization
- Right-size resources
- Implement cloud-native services
- Optimize costs
- Enhance security

## Best Practices

1. **Use infrastructure as code** (Terraform/OpenTofu)
2. **Implement CI/CD pipelines** for deployments
3. **Design for failure** across clouds
4. **Use managed services** when possible
5. **Implement comprehensive monitoring**
6. **Automate cost optimization**
7. **Follow security best practices**
8. **Document cloud-specific configurations**
9. **Test disaster recovery** procedures
10. **Train teams** on multiple clouds

## Reference Files

- `references/service-comparison.md` - Complete service comparison
- `references/multi-cloud-patterns.md` - Architecture patterns

## Related Skills

- `terraform-module-library` - For IaC implementation
- `cost-optimization` - For cost management
- `hybrid-cloud-networking` - For connectivity

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
