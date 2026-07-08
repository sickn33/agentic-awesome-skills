---
name: aws-mcp-setup
description: Configure AWS MCP servers for documentation search and API access. Use when setting up AWS MCP, configuring AWS documentation tools, troubleshooting MCP connectivity, or when user mentions aws-mcp, awsdocs, uvx setup, or MCP server configuration. Covers both Full AWS MCP Server (with...
risk: unknown
source: https://github.com/zxkane/aws-skills/tree/main/plugins/aws-common/skills/aws-mcp-setup
source_repo: zxkane/aws-skills
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/zxkane/aws-skills/blob/main/LICENSE
---

# AWS MCP Server Configuration Guide
## When to Use

Use this skill when you need configure AWS MCP servers for documentation search and API access. Use when setting up AWS MCP, configuring AWS documentation tools, troubleshooting MCP connectivity, or when user mentions aws-mcp, awsdocs, uvx setup, or MCP server configuration. Covers both Full AWS MCP Server (with...


## Overview

This guide helps you configure AWS MCP tools for AI agents. Two options are available:

| Option | Requirements | Capabilities |
|--------|--------------|--------------|
| **Full AWS MCP Server** | Python 3.10+, uvx, AWS credentials | Execute AWS API calls + documentation search |
| **AWS Documentation MCP** | None | Documentation search only |

## Step 1: Check Existing Configuration

Before configuring, check if AWS MCP tools are already available using either method:

### Method A: Check Available Tools (Recommended)

Look for these tool name patterns in your agent's available tools:
- `mcp__aws-mcp__*` or `mcp__aws__*` → Full AWS MCP Server configured
- `mcp__*awsdocs*__aws___*` → AWS Documentation MCP configured

**How to check**: Run `/mcp` command to list all active MCP servers.

### Method B: Check Configuration Files

Agent tools use hierarchical configuration (precedence: local → project → user → enterprise):

| Scope | File Location | Use Case |
|-------|---------------|----------|
| Local | `.claude.json` (in project) | Personal/experimental |
| Project | `.mcp.json` (project root) | Team-shared |
| User | `~/.claude.json` | Cross-project personal |
| Enterprise | System managed directories | Organization-wide |

Check these files for `mcpServers` containing `aws-mcp`, `aws`, or `awsdocs` keys:

```bash
# Check project config
cat .mcp.json 2>/dev/null | grep -E '"(aws-mcp|aws|awsdocs)"'

# Check user config
cat ~/.claude.json 2>/dev/null | grep -E '"(aws-mcp|aws|awsdocs)"'

# Or use Claude CLI
claude mcp list
```

If AWS MCP is already configured, no further setup needed.

## Step 2: Choose Configuration Method

### Automatic Detection

Run these commands to determine which option to use:

```bash
# Check for uvx (requires Python 3.10+)
which uvx || echo "uvx not available"

# Check for valid AWS credentials
aws sts get-caller-identity || echo "AWS credentials not configured"
```

### Option A: Full AWS MCP Server (Recommended)

**Use when**: uvx available AND AWS credentials valid

**Prerequisites**:
- Python 3.10+ with `uv` package manager
- AWS credentials configured (via profile, environment variables, or IAM role)

**Required IAM Permissions**:
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": [
      "aws-mcp:InvokeMCP",
      "aws-mcp:CallReadOnlyTool",
      "aws-mcp:CallReadWriteTool"
    ],
    "Resource": "*"
  }]
}
```

**Configuration** (add to your MCP settings):
```json
{
  "mcpServers": {
    "aws-mcp": {
      "command": "uvx",
      "args": [
        "mcp-proxy-for-aws@latest",
        "https://aws-mcp.us-east-1.api.aws/mcp",
        "--metadata", "AWS_REGION=us-west-2"
      ]
    }
  }
}
```

**Credential Configuration Options**:

1. **AWS Profile** (recommended for development):
   ```json
   "args": [
     "mcp-proxy-for-aws@latest",
     "https://aws-mcp.us-east-1.api.aws/mcp",
     "--profile", "my-profile",
     "--metadata", "AWS_REGION=us-west-2"
   ]
   ```

2. **Environment Variables**:
   ```json
   "env": {
     "AWS_ACCESS_KEY_ID": "...",
     "AWS_SECRET_ACCESS_KEY": "...",
     "AWS_REGION": "us-west-2"
   }
   ```

3. **IAM Role** (for EC2/ECS/Lambda): No additional config needed - uses instance credentials

**Additional Options**:
- `--region <region>`: Override AWS region
- `--read-only`: Restrict to read-only tools
- `--log-level <level>`: Set logging level (debug, info, warning, error)

**Reference**: https://github.com/aws/mcp-proxy-for-aws

### Option B: AWS Documentation MCP Server (No Auth)

**Use when**:
- No Python/uvx environment
- No AWS credentials
- Only need documentation search (no API execution)

**Configuration**:
```json
{
  "mcpServers": {
    "awsdocs": {
      "type": "http",
      "url": "https://knowledge-mcp.global.api.aws"
    }
  }
}
```

## Step 3: Verification

After configuration, verify tools are available:

**For Full AWS MCP**:
- Look for tools: `mcp__aws-mcp__aws___search_documentation`, `mcp__aws-mcp__aws___call_aws`

**For Documentation MCP**:
- Look for tools: `mcp__awsdocs__aws___search_documentation`, `mcp__awsdocs__aws___read_documentation`

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| `uvx: command not found` | uv not installed | Install with `pip install uv` or use Option B |
| `AccessDenied` error | Missing IAM permissions | Add aws-mcp:* permissions to IAM policy |
| `InvalidSignatureException` | Credential issue | Check `aws sts get-caller-identity` |
| Tools not appearing | MCP not started | Restart your agent after config change |

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
