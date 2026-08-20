# Production D2 Diagram Examples (v2.0)

Tested, real-world examples demonstrating D2 patterns across cutting-edge technical domains.

## Example 1: Enterprise Multi-Agent RAG Architecture

```d2
direction: right

classes: {
  agent: {
    shape: hexagon
    style: { fill: "#f3e8fd"; stroke: "#8430ce"; border-radius: 8 }
  }
  storage: {
    shape: cylinder
    style: { fill: "#e6f4ea"; stroke: "#137333" }
  }
  queue: {
    shape: queue
    style: { fill: "#fef7e0"; stroke: "#b06000" }
  }
}

user: Human Operator { shape: person }

orchestration: Multi-Agent Supervisor {
  supervisor: Orchestrator Agent { class: agent }
  planner: Task Planner { class: agent }
  critic: Validator / Critic { class: agent }
}

tools_and_retrievers: Retrieval & Tools Layer {
  rag_engine: Hybrid Search RAG Engine
  code_exec: Sandboxed Code Runner { shape: step }
  web_search: Live Web Search API { shape: cloud }
}

memory_layer: Shared Agent Memory {
  short_term: Working Context Store { class: storage }
  long_term: Vector Memory (Qdrant) { class: storage }
  audit_log: Execution Trace Logs { class: storage }
}

user -> orchestration.supervisor: Submit Complex Objective
orchestration.supervisor -> orchestration.planner: Generate Plan Steps
orchestration.planner -> memory_layer.short_term: Store Execution Plan

orchestration.supervisor -> tools_and_retrievers.rag_engine: Query Domain Docs
tools_and_retrievers.rag_engine -> memory_layer.long_term: Vector Search
memory_layer.long_term -> tools_and_retrievers.rag_engine: Relevant Passages

orchestration.supervisor -> tools_and_retrievers.code_exec: Execute Computations
tools_and_retrievers.code_exec -> orchestration.critic: Submit Results
orchestration.critic -> orchestration.supervisor: Validated / Refined Response
orchestration.supervisor -> memory_layer.audit_log: Record Completed Trace
orchestration.supervisor -> user: Final Deliverable
```

## Example 2: Kubernetes GitOps CI/CD Delivery Pipeline

```d2
direction: right

dev: Engineer { shape: person }
git: GitHub Monorepo { shape: cloud }

ci_cd: Automated Pipeline {
  github_actions: GitHub Actions CI { shape: step }
  security_scanner: Trivy Vulnerability Scan { shape: step }
  image_registry: Harbor Registry { shape: package }
  argocd: ArgoCD GitOps Controller { shape: hexagon }
}

k8s: Production Cluster {
  api_server: K8s Control Plane
  app_deploy: Deployment: Core API (3 Replicas) {
    pod_a: Pod A
    pod_b: Pod B
    pod_c: Pod C
  }
}

dev -> git: git push origin main
git -> ci_cd.github_actions: Trigger Webhook
ci_cd.github_actions -> ci_cd.security_scanner: Scan Code & Containers
ci_cd.security_scanner -> ci_cd.image_registry: Push Signed Container Image
ci_cd.github_actions -> git: Update K8s Manifest Image Tag

ci_cd.argocd -> git: Poll Git State (Desired State)
ci_cd.argocd -> k8s.api_server: Reconcile Diff
k8s.api_server -> k8s.app_deploy: Rolling Update
```

## Example 3: Multi-Board Disaster Recovery Failover

```d2
direction: right

primary_dc: Primary Region (us-east-1) {
  lb: Route 53 DNS (Primary) { shape: hexagon }
  app: Web Cluster
  db: Aurora Primary { shape: cylinder; style.fill: "#e6f4ea" }
  lb -> app -> db
}

standby_dc: Secondary Region (us-west-2) {
  lb_standby: Route 53 DNS (Standby) { shape: hexagon }
  app_standby: Scaled Down Web Cluster
  db_replica: Aurora Cross-Region Replica { shape: cylinder; style.fill: "#e8f0fe" }
  lb_standby -> app_standby -> db_replica
}

primary_dc.db -> standby_dc.db_replica: Asynchronous Cross-Region Sync {
  style.stroke-dash: 5
}

scenarios: {
  datacenter_failover: {
    primary_dc.style.opacity: 0.4
    primary_dc.db.style.fill: "#fce8e6"
    standby_dc.db_replica.style.fill: "#e6f4ea"
    standby_dc.db_replica: Aurora Promoted Primary
    standby_dc.lb_standby.style.stroke: "#1a73e8"
  }
}
```
