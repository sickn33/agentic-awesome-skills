# Kiro CLI Integration Guide

## Overview

This guide explains how to use Antigravity Awesome Skills with **Kiro CLI**, AWS's agentic AI-powered coding assistant.

## What is Kiro?

Kiro is AWS's agentic AI IDE that combines:

- **Autonomous coding agents** that work independently for extended periods
- **Context-aware assistance** with deep understanding of your codebase
- **AWS service integration** with native support for CDK, SAM, and Terraform
- **MCP (Model Context Protocol)** for secure external API and database calls
- **Spec-driven development** that turns natural language into structured specifications

## Why Use Skills with Kiro?

Kiro's agentic capabilities are enhanced by skills that provide:

- **Domain expertise** across 1,439+ specialized areas
- **Best practices** from Anthropic, OpenAI, Google, Microsoft, and AWS
- **Workflow automation** for common development tasks
- **AWS-specific patterns** for serverless, infrastructure, and cloud architecture

## Installation

### Quick Install

```bash
# Install to Kiro's default skills directory
npx antigravity-awesome-skills --kiro
```

This installs skills to `~/.kiro/skills/`

### Manual Installation

```bash
# Clone directly to Kiro's skills directory
git clone https://github.com/sickn33/antigravity-awesome-skills.git ~/.kiro/skills
```

### Verification

```bash
# Verify installation
test -d ~/.kiro/skills && echo "✓ Skills installed successfully"
ls ~/.kiro/skills/ | head -10
```

## Using Skills with Kiro

### Basic Invocation

Kiro uses natural language prompts to invoke skills:

```
Use the @brainstorming skill to help me design a serverless API
```

```
Apply @aws-serverless patterns to this Lambda function
```

```
Run @security-audit on my CDK stack
```

### Recommended Skills for Kiro Users

#### AWS & Cloud Infrastructure

- `@aws-serverless` - Serverless architecture patterns
- `@aws-cdk` - AWS CDK best practices
- `@aws-sam` - SAM template patterns
- `@terraform-expert` - Terraform infrastructure as code
- `@docker-expert` - Container optimization
- `@kubernetes-expert` - K8s deployment patterns

#### Architecture & Design

- `@architecture` - System design and ADRs
- `@c4-context` - C4 model diagrams
- `@senior-architect` - Scalable architecture patterns
- `@microservices-patterns` - Microservices design

#### Security

- `@api-security-best-practices` - API security hardening
- `@vulnerability-scanner` - Security vulnerability detection
- `@owasp-top-10` - OWASP security patterns
- `@aws-security-best-practices` - AWS security configuration

#### Development

- `@typescript-expert` - TypeScript best practices
- `@python-patterns` - Python design patterns
- `@react-patterns` - React component patterns
- `@test-driven-development` - TDD workflows

#### DevOps & Automation

- `@ci-cd-pipeline` - CI/CD automation
- `@github-actions` - GitHub Actions workflows
- `@monitoring-observability` - Observability patterns
- `@incident-response` - Incident management

## Kiro-Specific Workflows

### 1. Serverless Application Development

```
1. Use @brainstorming to design the application architecture
2. Apply @aws-serverless to create Lambda functions
3. Use @aws-cdk to generate infrastructure code
4. Run @test-driven-development to add tests
5. Apply @ci-cd-pipeline to set up deployment
```

### 2. Infrastructure as Code

```
1. Use @architecture to document the system design
2. Apply @terraform-expert to write Terraform modules
3. Run @security-audit to check for vulnerabilities
4. Use @documentation to generate README and runbooks
```

### 3. API Development

```
1. Use @api-design to plan endpoints
2. Apply @typescript-expert for implementation
3. Run @api-security-best-practices for hardening
4. Use @openapi-spec to generate documentation
```

## Advanced Features

### MCP Integration

Kiro's MCP support allows skills to:

- Call external APIs securely
- Query databases with context
- Integrate with AWS services
- Access documentation in real-time

Skills that leverage MCP:

- `@rag-engineer` - RAG system implementation
- `@langgraph` - Agent workflow orchestration
- `@prompt-engineer` - LLM prompt optimization

### Autonomous Operation

Kiro can work independently for extended periods. Use skills to guide long-running tasks:

```
Use @systematic-debugging to investigate and fix all TypeScript errors in the codebase,
then apply @test-driven-development to add missing tests, and finally run @documentation
to update all README files.
```

### Context-Aware Assistance

Kiro maintains deep context. Reference multiple skills in complex workflows:

```
I'm building a SaaS application. Use @brainstorming for the MVP plan,
@aws-serverless for the backend, @react-patterns for the frontend,
@stripe-integration for payments, and @security-audit for hardening.
```

## Bundles for Kiro Users

Pre-curated skill collections optimized for common Kiro use cases:

### AWS Developer Bundle

- `@aws-serverless`
- `@aws-cdk`
- `@aws-sam`
- `@lambda-best-practices`
- `@dynamodb-patterns`
- `@api-gateway-patterns`

### Full-Stack AWS Bundle

- `@aws-serverless`
- `@react-patterns`
- `@typescript-expert`
- `@api-design`
- `@test-driven-development`
- `@ci-cd-pipeline`

### DevOps & Infrastructure Bundle

- `@terraform-expert`
- `@docker-expert`
- `@kubernetes-expert`
- `@monitoring-observability`
- `@incident-response`
- `@security-audit`

See [bundles.md](bundles.md) for complete bundle listings.

## Troubleshooting

### Skills Not Loading

```bash
# Check installation path
ls -la ~/.kiro/skills/

# Reinstall if needed
rm -rf ~/.kiro/skills
npx antigravity-awesome-skills --kiro
```

### Skill Not Found

Ensure you're using the correct skill name:

```bash
# List all available skills
ls ~/.kiro/skills/
```

### Permission Issues

```bash
# Fix permissions
chmod -R 755 ~/.kiro/skills/
```

## Best Practices

1. **Start with bundles** - Use pre-curated collections for your role
2. **Combine skills** - Reference multiple skills in complex tasks
3. **Be specific** - Clearly state which skill to use and what to do
4. **Iterate** - Let Kiro work autonomously, then refine with additional skills
5. **Document** - Use `@documentation` to keep your codebase well-documented

## Examples

### Example 1: Build a Serverless API

```
I need to build a REST API for a todo application using AWS Lambda and DynamoDB.

Use @brainstorming to design the architecture, then apply @aws-serverless
to implement the Lambda functions, @dynamodb-patterns for data modeling,
and @api-security-best-practices for security hardening.

Generate the infrastructure using @aws-cdk and add tests with @test-driven-development.
```

### Example 2: Migrate to Microservices

```
I want to break down this monolithic application into microservices.

Use @architecture to create an ADR for the migration strategy,
apply @microservices-patterns for service boundaries,
@docker-expert for containerization, and @kubernetes-expert for orchestration.

Document the migration plan with @documentation.
```

### Example 3: Security Audit

```
Perform a comprehensive security audit of this application.

Use @security-audit to scan for vulnerabilities, @owasp-top-10 to check
for common issues, @api-security-best-practices for API hardening,
and @aws-security-best-practices for cloud configuration.

Generate a report with findings and remediation steps.
```

## Resources

- [Kiro Official Documentation](https://kiro.dev)
- [AWS Blog: Transform DevOps with Kiro](https://aws.amazon.com/blogs/publicsector/transform-devops-practice-with-kiro-ai-powered-agents/)
- [Complete Skills Catalog](../../CATALOG.md)
- [Usage Guide](usage.md)
- [Workflow Examples](workflows.md)

## Contributing

Found a Kiro-specific use case or workflow? Contribute to this guide:

1. Fork the repository
2. Add your examples to this file
3. Submit a pull request

## Support

- **Issues**: [GitHub Issues](https://github.com/sickn33/antigravity-awesome-skills/issues)
- **Discussions**: [GitHub Discussions](https://github.com/sickn33/antigravity-awesome-skills/discussions)
- **Community**: [Community Guidelines](../contributors/community-guidelines.md)
