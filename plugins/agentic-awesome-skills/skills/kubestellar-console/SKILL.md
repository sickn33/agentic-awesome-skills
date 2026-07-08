---
name: kubestellar-console
description: "Multi-cluster Kubernetes dashboard with AI-powered operations via MCP server and 10+ built-in agent skills"
category: devops
risk: critical
source: community
source_repo: kubestellar/console
source_type: community
date_added: "2026-04-27"
author: kubestellar
tags: [kubernetes, multi-cluster, mcp, dashboard, cncf, devops, observability]
tools: [claude, cursor, gemini, codex]
license: "Apache-2.0"
license_source: "https://github.com/kubestellar/console/blob/main/LICENSE"
plugin:
  setup:
    type: manual
    summary: "Requires kc-agent binary (brew tap kubestellar/tap && brew install kc-agent)"
    docs: "https://github.com/kubestellar/console#quick-start"
---

# KubeStellar Console

## Overview

KubeStellar Console is an open-source multi-cluster Kubernetes dashboard (CNCF project) with AI-powered operations. It ships with `kc-agent`, an MCP server that bridges coding agents to kubeconfig and Kubernetes APIs, plus 10+ built-in agent skills for development, testing, and operations.

## When to Use This Skill

- Use when managing multiple Kubernetes clusters across edge and cloud
- Use when you need AI-assisted Kubernetes troubleshooting and debugging
- Use when running performance tests, cache compliance checks, or CI debugging on a Kubernetes dashboard
- Use when integrating with CNCF projects (Argo, Kyverno, Istio, and 20+ others)

## How It Works

### Step 1: Install kc-agent

```bash
brew tap kubestellar/tap && brew install kc-agent
```

### Step 2: Start the MCP server

```bash
kc-agent
```

This bridges the active kubeconfig context to any MCP-compatible coding agent. Do not start it from a cluster-admin or write-capable context unless the user explicitly accepts that risk.

### Step 3: Use built-in agent skills

The project ships with agent skills accessible via `CLAUDE.md` and `AGENTS.md`:

- **@perf-test** — Dashboard performance testing and TTFI analysis
- **@cache-test** — Card cache compliance testing (IndexedDB warm return)
- **@nav-test** — Navigation performance testing
- **@ui-compliance-test** — Card loading compliance (8 criteria, 150+ cards)
- **@ci-status** — CI pipeline monitoring and status checks
- **@rca** — Root cause analysis for CI/test failures
- **@tdd** — Test-driven development workflow
- **@k8s-debug** — Kubernetes debugging and troubleshooting

## Key Features

- Multi-cluster management across edge and cloud
- Real-time streaming observability
- 20+ CNCF project integrations (Argo, Kyverno, Istio, etc.)
- GitHub OAuth authentication
- Supply chain security (SBOM, SLSA)
- SQLite WASM caching with stale-while-revalidate pattern
- 15+ themes with dark/light mode

## Security & Safety Notes

- **Critical risk:** `kc-agent` bridges your active kubeconfig context to MCP-compatible agents. If that context carries cluster-admin, write permissions, or secret read access, agents inherit those capabilities.
- **Do not rely on RBAC objects alone:** creating a ServiceAccount or ClusterRoleBinding does not change the credentials `kc-agent` uses. Start `kc-agent` only after switching `KUBECONFIG`/context to dedicated least-privilege credentials and verifying them.
- **Recommended read-only scope:** avoid `resources='*'`, because it includes sensitive objects such as Secrets. Prefer an explicit non-secret resource list and verify access before starting the MCP server:
  ```bash
  kubectl create serviceaccount kc-agent -n default
  kubectl create clusterrole kc-agent-readonly \
    --verb=get,list,watch \
    --resource=pods,services,deployments.apps,replicasets.apps,statefulsets.apps,daemonsets.apps,namespaces,nodes,events,configmaps
  kubectl create clusterrolebinding kc-agent-readonly \
    --clusterrole=kc-agent-readonly \
    --serviceaccount=default:kc-agent
  kubectl auth can-i get secrets --as=system:serviceaccount:default:kc-agent
  kubectl auth can-i list pods --as=system:serviceaccount:default:kc-agent
  ```
- The first `can-i` command must return `no`; the second should return `yes`. Then create or select a kubeconfig that actually authenticates as that ServiceAccount before running `kc-agent`.
- Do not expose `kc-agent` on a public network without authentication.
- Review [SECURITY-AI.md](https://github.com/kubestellar/console/blob/main/docs/security/SECURITY-AI.md) for prompt injection and agent drift mitigations.

## Limitations

- This skill requires an external binary (`kc-agent`) installed separately via Homebrew.
- Do not treat agent output as a substitute for environment-specific validation or expert review.
- Stop and ask for clarification if required permissions or safety boundaries are unclear.

## Links

- [GitHub](https://github.com/kubestellar/console)
- [Website](https://console.kubestellar.io)
- [CLAUDE.md](https://github.com/kubestellar/console/blob/main/CLAUDE.md)
- [AGENTS.md](https://github.com/kubestellar/console/blob/main/AGENTS.md)
