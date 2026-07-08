---
name: aws-cdk-development
description: AWS Cloud Development Kit (CDK) expert for building cloud infrastructure with TypeScript/Python. Use when creating CDK stacks, defining CDK constructs, implementing infrastructure as code, or when the user mentions CDK, CloudFormation, IaC, cdk synth, cdk deploy, or wants to define AWS...
risk: unknown
source: https://github.com/zxkane/aws-skills/tree/main/plugins/aws-iac/skills/aws-cdk-development
source_repo: zxkane/aws-skills
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/zxkane/aws-skills/blob/main/LICENSE
---

# AWS CDK Development

This skill provides comprehensive guidance for developing AWS infrastructure using the Cloud Development Kit (CDK), with integrated MCP servers for accessing latest AWS knowledge and CDK utilities.

## AWS Documentation Requirement

Always verify AWS facts using MCP tools (`mcp__aws-mcp__*` or `mcp__*awsdocs*__*`) before answering. The `aws-mcp-setup` dependency is auto-loaded — if MCP tools are unavailable, guide the user through that skill's setup flow.

## CDK-Specific MCP Guidance

AWS Labs replaced the dedicated CDK MCP server (`awslabs.cdk-mcp-server`) with the broader `awslabs.aws-iac-mcp-server`, which covers CDK alongside CloudFormation and other AWS infrastructure-as-code workflows.

For CDK construct lookups, best-practice recommendations, and pattern guidance, install `awslabs.aws-iac-mcp-server`. It ships in the `deploy-on-aws` plugin from `awslabs/agent-plugins`, or can be registered directly with `claude mcp add aws-iac uvx awslabs.aws-iac-mcp-server@latest`.

**When to reach for it**:
- CDK construct recommendations and API lookups
- CDK and CloudFormation best-practice patterns
- Validation of synthesized templates
- Cross-resource configuration guidance

## When to Use This Skill

Use this skill when:
- Creating new CDK stacks or constructs
- Refactoring existing CDK infrastructure
- Implementing Lambda functions within CDK
- Following AWS CDK best practices
- Validating CDK stack configurations before deployment
- Verifying AWS service capabilities and regional availability

## Core CDK Principles

### Resource Naming

**CRITICAL**: Do NOT explicitly specify resource names when they are optional in CDK constructs.

**Why**: CDK-generated names enable:
- **Reusable patterns**: Deploy the same construct/pattern multiple times without conflicts
- **Parallel deployments**: Multiple stacks can deploy simultaneously in the same region
- **Cleaner shared logic**: Patterns and shared code can be initialized multiple times without name collision
- **Stack isolation**: Each stack gets uniquely identified resources automatically

**Pattern**: Let CDK generate unique names automatically using CloudFormation's naming mechanism.

```typescript
// ❌ BAD - Explicit naming prevents reusability and parallel deployments
new lambda.Function(this, 'MyFunction', {
  functionName: 'my-lambda',  // Avoid this
  // ...
});

// ✅ GOOD - Let CDK generate unique names
new lambda.Function(this, 'MyFunction', {
  // No functionName specified - CDK generates: StackName-MyFunctionXXXXXX
  // ...
});
```

**Security Note**: For different environments (dev, staging, prod), follow AWS Security Pillar best practices by using separate AWS accounts rather than relying on resource naming within a single account. Account-level isolation provides stronger security boundaries.

### Lambda Function Development

Use the appropriate Lambda construct based on runtime:

**TypeScript/JavaScript**: Use `@aws-cdk/aws-lambda-nodejs`
```typescript
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';

new NodejsFunction(this, 'MyFunction', {
  entry: 'lambda/handler.ts',
  handler: 'handler',
  // Automatically handles bundling, dependencies, and transpilation
});
```

**Python**: Use `@aws-cdk/aws-lambda-python`
```typescript
import { PythonFunction } from '@aws-cdk/aws-lambda-python-alpha';

new PythonFunction(this, 'MyFunction', {
  entry: 'lambda',
  index: 'handler.py',
  handler: 'handler',
  // Automatically handles dependencies and packaging
});
```

**Benefits**:
- Automatic bundling and dependency management
- Transpilation handled automatically
- No manual packaging required
- Consistent deployment patterns

### Pre-Deployment Validation

Use a **multi-layer validation strategy** for comprehensive CDK quality checks:

#### Layer 1: Real-Time IDE Feedback (Recommended)

**For TypeScript/JavaScript projects**:

Install [cdk-nag](https://github.com/cdklabs/cdk-nag) for synthesis-time validation:
```bash
npm install --save-dev cdk-nag
```

Add to your CDK app:
```typescript
import { Aspects } from 'aws-cdk-lib';
import { AwsSolutionsChecks } from 'cdk-nag';

const app = new App();
Aspects.of(app).add(new AwsSolutionsChecks());
```

**Optional - VS Code users**: Install [CDK NAG Validator extension](https://marketplace.visualstudio.com/items?itemName=alphacrack.cdk-nag-validator) for faster feedback on file save.

**For Python/Java/C#/Go projects**: cdk-nag is available in all CDK languages and provides the same synthesis-time validation.

#### Layer 2: Synthesis-Time Validation (Required)

1. **Synthesis with cdk-nag**: Validate stack with comprehensive rules
   ```bash
   cdk synth  # cdk-nag runs automatically via Aspects
   ```

2. **Suppress legitimate exceptions** with documented reasons:
   ```typescript
   import { NagSuppressions } from 'cdk-nag';

   // Document WHY the exception is needed
   NagSuppressions.addResourceSuppressions(resource, [
     {
       id: 'AwsSolutions-L1',
       reason: 'Lambda@Edge requires specific runtime for CloudFront compatibility'
     }
   ]);
   ```

#### Layer 3: Pre-Commit Safety Net

1. **Build**: Ensure compilation succeeds
   ```bash
   npm run build  # or language-specific build command
   ```

2. **Tests**: Run unit and integration tests
   ```bash
   npm test  # or pytest, mvn test, etc.
   ```

3. **Validation Script**: Meta-level checks
   ```bash
   ./scripts/validate-stack.sh
   ```

The validation script now focuses on:
- Language detection
- Template size and resource count analysis
- Synthesis success verification
- (Note: Detailed anti-pattern checks are handled by cdk-nag)

## Workflow Guidelines

### Development Workflow

1. **Design**: Plan infrastructure resources and relationships
2. **Verify AWS Services**: Use AWS Documentation MCP to confirm service availability and features
   - Check regional availability for all required services
   - Verify service limits and quotas
   - Confirm latest API specifications
3. **Implement**: Write CDK constructs following best practices
   - Use CDK MCP server for construct recommendations
   - Reference CDK best practices via MCP tools
4. **Validate**: Run pre-deployment checks (see above)
5. **Synthesize**: Generate CloudFormation templates
6. **Review**: Examine synthesized templates for correctness
7. **Deploy**: Deploy to target environment
8. **Verify**: Confirm resources are created correctly

### Stack Organization

- Use nested stacks for complex applications
- Separate concerns into logical construct boundaries
- Export values that other stacks may need
- Use CDK context for environment-specific configuration

### Testing Strategy

- Unit test individual constructs
- Integration test stack synthesis
- Snapshot test CloudFormation templates
- Validate resource properties and relationships

## Using MCP Servers Effectively

### When to Use AWS Documentation MCP

**Always verify before implementing**:
- New AWS service features or configurations
- Service availability in target regions
- API parameter specifications
- Service limits and quotas
- Security best practices for AWS services

**Example scenarios**:
- "Check if Lambda supports Python 3.13 runtime"
- "Verify DynamoDB is available in eu-south-2"
- "What are the current Lambda timeout limits?"
- "Get latest S3 encryption options"

### When to Use CDK MCP Server

**Leverage for CDK-specific guidance**:
- CDK construct selection and usage
- CDK API parameter options
- CDK best practice patterns
- Construct property configurations
- CDK-specific optimizations

**Example scenarios**:
- "What's the recommended CDK construct for API Gateway REST API?"
- "How to configure NodejsFunction bundling options?"
- "Best practices for CDK stack organization"
- "CDK construct for DynamoDB with auto-scaling"

### MCP Usage Best Practices

1. **Verify First**: Always check AWS Documentation MCP before implementing new features
2. **Regional Validation**: Check service availability in target deployment regions
3. **CDK Guidance**: Use CDK MCP for construct-specific recommendations
4. **Stay Current**: MCP servers provide latest information beyond knowledge cutoff
5. **Combine Sources**: Use both skill patterns and MCP servers for comprehensive guidance

## CDK Patterns Reference

For detailed CDK patterns, anti-patterns, and architectural guidance, refer to the comprehensive reference:

**File**: `references/cdk-patterns.md`

This reference includes:
- Common CDK patterns and their use cases
- Anti-patterns to avoid
- Security best practices
- Cost optimization strategies
- Performance considerations

## Additional Resources

- **Validation Script**: `scripts/validate-stack.sh` - Pre-deployment validation
- **CDK Patterns**: `references/cdk-patterns.md` - Detailed pattern library
- **AWS Documentation MCP**: Integrated for latest AWS information
- **CDK MCP Server**: Integrated for CDK-specific guidance

## GitHub Actions Integration

When GitHub Actions workflow files exist in the repository, ensure all checks defined in `.github/workflows/` pass before committing. This prevents CI/CD failures and maintains code quality standards.

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
