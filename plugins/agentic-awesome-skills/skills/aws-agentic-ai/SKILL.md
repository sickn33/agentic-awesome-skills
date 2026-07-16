---
name: aws-agentic-ai
description: AWS Bedrock AgentCore comprehensive expert for deploying and managing AI agents at scale. Use when working with any AgentCore service including Gateway, Runtime, Memory, Identity, Code Interpreter, Browser, Observability, Agent Registry, or Evaluations. Covers agent deployment, MCP...
risk: unknown
source: https://github.com/zxkane/aws-skills/tree/main/plugins/aws-agentic-ai/skills/aws-agentic-ai
source_repo: zxkane/aws-skills
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/zxkane/aws-skills/blob/main/LICENSE
---

# AWS Bedrock AgentCore
## When to Use

Use this skill when you need aWS Bedrock AgentCore comprehensive expert for deploying and managing AI agents at scale. Use when working with any AgentCore service including Gateway, Runtime, Memory, Identity, Code Interpreter, Browser, Observability, Agent Registry, or Evaluations. Covers agent deployment, MCP...


AWS Bedrock AgentCore provides a complete platform for deploying and scaling AI agents with nine core services. This skill covers service selection, deployment patterns, and integration workflows using AWS CLI.

**How to use this skill**: Identify the service(s) the user needs from the table below, then read the corresponding service README before responding. For cross-service patterns (credentials, security, registry integration), check the Cross-Service Resources section. Verify AWS-specific details using the MCP documentation tools.

## AWS Documentation Requirement

Always verify AWS facts using MCP tools before answering. Two documentation sources are available:
- **AgentCore-specific docs** (`mcp__acdocs__*`) — bundled with this plugin, provides `search_agentcore_docs` and `fetch_agentcore_doc` for AgentCore documentation
- **General AWS docs** (`mcp__aws-mcp__*` or `mcp__*awsdocs*__*`) — loaded via the `aws-mcp-setup` dependency for broader AWS documentation

Prefer the AgentCore docs MCP for AgentCore-specific questions. If MCP tools are unavailable, guide the user through the `aws-mcp-setup` skill's setup flow.

## Available Services

| Service | Use For | Documentation |
|---------|---------|---------------|
| **Gateway** | Converting REST APIs to MCP tools | [`services/gateway/README.md`](https://github.com/zxkane/aws-skills/tree/main/plugins/aws-agentic-ai/skills/aws-agentic-ai/services/gateway/README.md) |
| **Runtime** | Deploying and scaling agents | [`services/runtime/README.md`](https://github.com/zxkane/aws-skills/tree/main/plugins/aws-agentic-ai/skills/aws-agentic-ai/services/runtime/README.md) |
| **Memory** | Managing conversation state | [`services/memory/README.md`](https://github.com/zxkane/aws-skills/tree/main/plugins/aws-agentic-ai/skills/aws-agentic-ai/services/memory/README.md) |
| **Identity** | Credential and access management | [`services/identity/README.md`](https://github.com/zxkane/aws-skills/tree/main/plugins/aws-agentic-ai/skills/aws-agentic-ai/services/identity/README.md) |
| **Code Interpreter** | Secure code execution in sandboxes | [`services/code-interpreter/README.md`](https://github.com/zxkane/aws-skills/tree/main/plugins/aws-agentic-ai/skills/aws-agentic-ai/services/code-interpreter/README.md) |
| **Browser** | Web automation and scraping | [`services/browser/README.md`](https://github.com/zxkane/aws-skills/tree/main/plugins/aws-agentic-ai/skills/aws-agentic-ai/services/browser/README.md) |
| **Observability** | Tracing and monitoring | [`services/observability/README.md`](https://github.com/zxkane/aws-skills/tree/main/plugins/aws-agentic-ai/skills/aws-agentic-ai/services/observability/README.md) |
| **Agent Registry** | Catalog, discover, and govern agents/tools (Preview) | [`services/registry/README.md`](https://github.com/zxkane/aws-skills/tree/main/plugins/aws-agentic-ai/skills/aws-agentic-ai/services/registry/README.md) |
| **Evaluations** | Automated agent quality assessment (LLM-as-a-Judge) | [`services/evaluations/README.md`](https://github.com/zxkane/aws-skills/tree/main/plugins/aws-agentic-ai/skills/aws-agentic-ai/services/evaluations/README.md) |

## Common Workflows

### Deploying a Gateway Target

Read [`services/gateway/README.md`](https://github.com/zxkane/aws-skills/tree/main/plugins/aws-agentic-ai/skills/aws-agentic-ai/services/gateway/README.md) before implementing — Gateway setup involves deployment strategies, IAM, and auth choices that vary significantly by use case.

1. Upload OpenAPI schema to S3
2. *(API Key auth only)* Create credential provider and store API key
3. Create gateway target linking schema (and credentials if using API key)
4. Verify target status and test connectivity

> Credential provider is only needed for API key authentication. Lambda targets use IAM roles, and MCP servers use OAuth.

### Managing Credentials

Read [`cross-service/credential-management.md`](https://github.com/zxkane/aws-skills/tree/main/plugins/aws-agentic-ai/skills/aws-agentic-ai/cross-service/credential-management.md) first — credential patterns differ across services and getting them wrong causes hard-to-debug auth failures.

1. Use Identity service credential providers for all API keys
2. Link providers to gateway targets via ARN references
3. Rotate credentials quarterly through credential provider updates
4. Monitor usage with CloudWatch metrics

### Discovering Agents and Tools (Agent Registry)

Read [`services/registry/README.md`](https://github.com/zxkane/aws-skills/tree/main/plugins/aws-agentic-ai/skills/aws-agentic-ai/services/registry/README.md) first — the registry has governance workflows, MCP endpoint options, and sync modes that affect how records become discoverable.

1. Create a registry to catalog your organization's AI resources
2. Register resources (MCP servers, agents, skills, custom) with descriptive metadata
3. Submit records for approval (auto-approve for dev, manual for production)
4. Search and discover approved resources via CLI or MCP endpoint

> Agent Registry is in Preview. Available in us-east-1, us-west-2, eu-west-1, ap-northeast-1, ap-southeast-2.

### Evaluating Agent Quality

Read [`services/evaluations/README.md`](https://github.com/zxkane/aws-skills/tree/main/plugins/aws-agentic-ai/skills/aws-agentic-ai/services/evaluations/README.md) first — evaluators, scoring modes, and IAM setup vary between online monitoring and on-demand testing.

1. Instrument the agent with OpenTelemetry (ADOT) for trace collection
2. Create evaluators (use built-in like `Builtin.Helpfulness` or create custom)
3. Set up online evaluation with sampling rate and data source
4. Monitor scores in CloudWatch dashboards; investigate low-scoring sessions

### Monitoring Agents

Read [`services/observability/README.md`](https://github.com/zxkane/aws-skills/tree/main/plugins/aws-agentic-ai/skills/aws-agentic-ai/services/observability/README.md) for the full monitoring setup — observability configuration depends on your Runtime protocol and framework choice.

1. Enable observability for agents
2. Configure CloudWatch dashboards for metrics
3. Set up alarms for error rates and latency
4. Use X-Ray for distributed tracing

## Deep-Dive References

Each service README (linked in the table above) contains sub-links to getting-started guides, troubleshooting, and advanced topics. Start with the service README and follow pointers from there.

### Advanced Runtime & OAuth References

Deep-dive reference documentation for Runtime internals, deployment, OAuth integration, and communication protocols. Read these when building production Runtime deployments or configuring OAuth authentication:

- **OAuth Integration**: [`references/agentcore-oauth-integration.md`](https://github.com/zxkane/aws-skills/tree/main/plugins/aws-agentic-ai/skills/aws-agentic-ai/references/agentcore-oauth-integration.md) - Three-layer OAuth architecture (Inbound JWT, Outbound Credential Provider, Gateway OAuth), Cognito configuration, supported IdPs, end-to-end CDK examples
- **Runtime Core Mechanisms**: [`references/agentcore-runtime-core.md`](https://github.com/zxkane/aws-skills/tree/main/plugins/aws-agentic-ai/skills/aws-agentic-ai/references/agentcore-runtime-core.md) - Container contract, MicroVM Session model, Agent lifecycle (per-request vs per-session), tool integration (MCP/HTTP), startup flow
- **Runtime Deployment & Operations**: [`references/agentcore-runtime-deploy.md`](https://github.com/zxkane/aws-skills/tree/main/plugins/aws-agentic-ai/skills/aws-agentic-ai/references/agentcore-runtime-deploy.md) - CDK deployment (L1/L2 constructs), multi-Runtime architecture, security model, observability (OTel/CloudWatch), BedrockAgentCoreApp vs FastAPI comparison
- **Runtime Protocol Reference**: [`references/agentcore-runtime-protocols.md`](https://github.com/zxkane/aws-skills/tree/main/plugins/aws-agentic-ai/skills/aws-agentic-ai/references/agentcore-runtime-protocols.md) - HTTP, MCP, A2A, AG-UI protocol specifications with container contracts, endpoint specs, and selection guide

### Runnable Script Templates

Production-ready templates in [`scripts/`](https://github.com/zxkane/aws-skills/tree/main/plugins/aws-agentic-ai/skills/aws-agentic-ai/scripts/) for common deployment patterns:

| Script | Protocol | Description |
|--------|----------|-------------|
| [`Dockerfile.runtime-template`](https://github.com/zxkane/aws-skills/tree/main/plugins/aws-agentic-ai/skills/aws-agentic-ai/scripts/Dockerfile.runtime-template) | — | ARM64 multi-stage Docker build for AgentCore Runtime |
| [`runtime-fastapi-template.py`](https://github.com/zxkane/aws-skills/tree/main/plugins/aws-agentic-ai/skills/aws-agentic-ai/scripts/runtime-fastapi-template.py) | HTTP | FastAPI Runtime with SSE streaming and MCPClient |
| [`mcp-server-template.py`](https://github.com/zxkane/aws-skills/tree/main/plugins/aws-agentic-ai/skills/aws-agentic-ai/scripts/mcp-server-template.py) | MCP | MCP Server with Streamable HTTP transport |
| [`a2a-server-template.py`](https://github.com/zxkane/aws-skills/tree/main/plugins/aws-agentic-ai/skills/aws-agentic-ai/scripts/a2a-server-template.py) | A2A | A2A Server with Agent Card discovery |
| [`agui-server-template.py`](https://github.com/zxkane/aws-skills/tree/main/plugins/aws-agentic-ai/skills/aws-agentic-ai/scripts/agui-server-template.py) | AG-UI | AG-UI Server with standard AG-UI event stream |
| [`gateway-custom-resource-lambda.py`](https://github.com/zxkane/aws-skills/tree/main/plugins/aws-agentic-ai/skills/aws-agentic-ai/scripts/gateway-custom-resource-lambda.py) | — | CDK Custom Resource Lambda for Gateway lifecycle |

## Cross-Service Resources

For patterns and best practices that span multiple AgentCore services:

- **Credential Management**: [`cross-service/credential-management.md`](https://github.com/zxkane/aws-skills/tree/main/plugins/aws-agentic-ai/skills/aws-agentic-ai/cross-service/credential-management.md) - Unified credential patterns, security practices, rotation procedures
- **Registry Integration**: [`cross-service/registry-integration.md`](https://github.com/zxkane/aws-skills/tree/main/plugins/aws-agentic-ai/skills/aws-agentic-ai/cross-service/registry-integration.md) - Cross-service patterns with Gateway, Identity, Runtime
- **Security & Resource Policies**: [`cross-service/security-resource-policies.md`](https://github.com/zxkane/aws-skills/tree/main/plugins/aws-agentic-ai/skills/aws-agentic-ai/cross-service/security-resource-policies.md) - Resource-based policies, cross-account access, VPC/IP restrictions
- **Agent Deployment with S3 Files**: [`cross-service/agent-persistence-patterns.md`](https://github.com/zxkane/aws-skills/tree/main/plugins/aws-agentic-ai/skills/aws-agentic-ai/cross-service/agent-persistence-patterns.md) - Deploy Strands Agents, OpenClaw, Claude Agent SDK on AgentCore with S3 Files and Session Storage

## Additional Resources

- **AWS Documentation**: [Amazon Bedrock AgentCore](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/what-is-bedrock-agentcore.html)
- **API Reference**: [Bedrock AgentCore Control Plane API](https://docs.aws.amazon.com/bedrock-agentcore-control/latest/APIReference/)
- **AWS CLI Reference**: [bedrock-agentcore-control commands](https://awscli.amazonaws.com/v2/documentation/api/latest/reference/bedrock-agentcore-control/index.html)

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
