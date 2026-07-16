# Workflow Bundles

Consolidated and granular workflow bundles that orchestrate multiple skills for specific development and operational scenarios.

## Granular Workflow Bundles (Specialized)

### Frontend Development

| Bundle | Description | Key Skills |
|--------|-------------|------------|
| `react-nextjs-development` | React and Next.js 14+ with App Router, Server Components, TypeScript, Tailwind | nextjs-app-router-patterns, react-patterns, tailwind-patterns |

### Backend Development

| Bundle | Description | Key Skills |
|--------|-------------|------------|
| `python-fastapi-development` | FastAPI backend with async patterns, SQLAlchemy, Pydantic, auth | fastapi-pro, fastapi-router-py, pydantic-models-py |

### WordPress Development

| Bundle | Description | Key Skills |
|--------|-------------|------------|
| `wordpress-theme-development` | Custom WordPress themes, block editor, template hierarchy | frontend-developer, wordpress-penetration-testing |
| `wordpress-plugin-development` | WordPress plugins, hooks, admin interfaces, REST API | backend-dev-guidelines, wordpress-penetration-testing |
| `wordpress-woocommerce-development` | WooCommerce stores, payments, shipping, customization | payment-integration, stripe-integration, paypal-integration |

### System Administration

| Bundle | Description | Key Skills |
|--------|-------------|------------|
| `bash-scripting` | Production bash scripts with defensive patterns, testing | bash-pro, bash-defensive-patterns, bats-testing-patterns |
| `linux-troubleshooting` | Linux system diagnostics, performance, service issues | bash-linux, devops-troubleshooter, server-management |

### Security Testing

| Bundle | Description | Key Skills |
|--------|-------------|------------|
| `web-security-testing` | OWASP Top 10 testing, injection, XSS, authentication | sql-injection-testing, xss-html-injection, broken-authentication |
| `api-security-testing` | REST/GraphQL API security, auth, rate limiting, fuzzing | api-fuzzing-bug-bounty, api-security-best-practices |

### AI/ML

| Bundle | Description | Key Skills |
|--------|-------------|------------|
| `rag-implementation` | RAG systems, embeddings, vector DB, chunking, retrieval | rag-engineer, embedding-strategies, vector-database-engineer |
| `ai-agent-development` | Autonomous agents, multi-agent systems, CrewAI, LangGraph | ai-agents-architect, crewai, langgraph, autonomous-agents |

### Cloud/DevOps

| Bundle | Description | Key Skills |
|--------|-------------|------------|
| `kubernetes-deployment` | K8s deployment, Helm charts, service mesh, security | kubernetes-architect, helm-chart-scaffolding, istio-traffic-management |
| `terraform-infrastructure` | Terraform IaC, modules, state management, CI/CD | terraform-skill, terraform-specialist, terraform-module-library |

### Database

| Bundle | Description | Key Skills |
|--------|-------------|------------|
| `postgresql-optimization` | PostgreSQL query tuning, indexing, configuration, monitoring | postgres-best-practices, sql-optimization-patterns, database-optimizer |

### Testing/QA

| Bundle | Description | Key Skills |
|--------|-------------|------------|
| `e2e-testing` | Playwright E2E, visual regression, cross-browser, CI/CD | playwright-skill, e2e-testing-patterns, browser-automation |

### Documentation

| Bundle | Description | Key Skills |
|--------|-------------|------------|
| `api-documentation` | OpenAPI specs, developer guides, code examples, interactive docs | api-documenter, openapi-spec-generation, api-documentation-generator |

## Consolidated Workflow Bundles

| Bundle | Description | Key Skills |
|--------|-------------|------------|
| `development` | Full-stack web and mobile development | app-builder, senior-fullstack, frontend-developer, backend-architect |
| `wordpress` | WordPress theme, plugin, WooCommerce, security, performance | wordpress-penetration-testing, frontend-developer, payment-integration |
| `os-scripting` | Shell scripting and system administration | bash-pro, bash-defensive-patterns, shellcheck-configuration |
| `security-audit` | Security testing and penetration testing | vulnerability-scanner, sql-injection-testing, pentest-commands |
| `ai-ml` | LLM applications, RAG, and AI agents | ai-agents-architect, rag-engineer, crewai, langgraph |
| `cloud-devops` | Cloud infrastructure and DevOps | cloud-architect, kubernetes-architect, terraform-skill |
| `database` | Database design and operations | database-architect, prisma-expert, data-engineer |
| `testing-qa` | Testing and quality assurance | test-automator, playwright-skill, code-reviewer |
| `documentation` | Documentation generation | docs-architect, c4-architecture, wiki-architect |
| `office-productivity` | Document and office automation | libreoffice-writer, libreoffice-calc, libreoffice-impress |

## LibreOffice Skills

The following LibreOffice skills are available in the `skills/libreoffice/` directory:

| Skill | Description |
|-------|-------------|
| `writer` | Document creation and automation (ODT) |
| `calc` | Spreadsheet automation (ODS) |
| `impress` | Presentation creation (ODP) |
| `draw` | Vector graphics and diagrams (ODG) |
| `base` | Database management (ODB) |

## Usage

Each workflow bundle provides:

1. **When to Use** - Scenarios for invoking the workflow
2. **Workflow Phases** - Step-by-step phases with skills to invoke
3. **Copy-Paste Prompts** - Ready-to-use prompts for each phase
4. **Quality Gates** - Checkpoints to verify before proceeding
5. **Related Bundles** - Links to complementary workflows

### Example Usage

```
Use @react-nextjs-development to build a new Next.js 14 application
```

```
Use @python-fastapi-development to create a REST API with FastAPI
```

```
Use @wordpress-theme-development to create a custom WordPress theme
```

```
Use @rag-implementation to build a RAG system with vector search
```

```
Use @kubernetes-deployment to deploy application to Kubernetes
```

```
Use @web-security-testing to perform OWASP Top 10 assessment
```

```
Use @libreoffice-writer to convert DOCX documents to ODT format
```

## Structure

Each workflow bundle follows this structure:

```yaml
---
name: bundle-name
description: "Brief description"
source: personal
risk: safe
domain: domain-category
category: granular-workflow-bundle  # or consolidated-workflow-bundle
version: 1.0.0
---

# Bundle Name

## Overview
...

## When to Use This Workflow
...

## Workflow Phases
...

## Quality Gates
...

## Related Workflow Bundles
...
```

## Contributing

When creating new workflow bundles:

1. Identify common skill combinations
2. Document clear workflow phases
3. Provide copy-paste prompts
4. Define quality gates
5. Link related bundles

## License

Same as the parent project.
