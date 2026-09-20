---
name: mcp-server-security
description: Secure Model Context Protocol (MCP) servers with transport encryption,
  tool authorization, input validation, and audit logging for safe AI agent integrations.
category: security
risk: safe
source: https://github.com/BagelHole/DevOps-Security-Agent-Skills
source_repo: BagelHole/DevOps-Security-Agent-Skills
source_type: community
date_added: '2026-09-20'
license: MIT
license_source: https://github.com/BagelHole/DevOps-Security-Agent-Skills/blob/main/LICENSE
compatibility: Requires the relevant security tooling (scanners, vault CLIs) and an
  authorized scope for any active assessment. Docs-only; helper scripts and templates
  not bundled.
metadata:
  author: devops-skills
  version: '1.0'
---

# MCP Server Security

Comprehensive hardening guide for Model Context Protocol (MCP) servers. MCP is the open
standard for connecting AI agents to external tools, data sources, and services. Because
MCP servers execute real actions on real infrastructure, they are a high-value attack
surface. This skill covers every layer of defense you need before exposing an MCP server
to agents in production.

---

## 2. MCP Threat Model

Before hardening, understand what you are defending against.

| Threat                        | Vector                                                        | Impact                              |
|-------------------------------|---------------------------------------------------------------|-------------------------------------|
| Unauthorized tool access      | Agent calls tools the user should not have access to          | Privilege escalation, data breach   |
| Prompt injection via resources| Malicious content in MCP resources influences agent behavior  | Arbitrary tool execution            |
| Data exfiltration via results | Tool results leak sensitive data back to an untrusted agent   | Data loss, compliance violation     |
| SSRF via MCP tools            | Agent tricks a tool into making internal network requests      | Internal service compromise         |
| Credential theft              | API keys or tokens stored insecurely on the MCP server        | Full account takeover               |
| Denial of service             | Agent floods server with tool calls or huge payloads          | Service unavailability              |
| Man-in-the-middle             | Unencrypted transport between agent and MCP server            | Eavesdropping, request tampering    |
| Supply chain compromise       | Malicious MCP server package or plugin                        | Arbitrary code execution            |

---

## 3. Transport Security

### 3.1 TLS for Streamable HTTP and SSE Transports

Every MCP server exposed over HTTP must terminate TLS. Never run plain HTTP in
production.

**Nginx reverse proxy with TLS termination for an MCP server:**

```nginx
# /etc/nginx/sites-enabled/mcp-server.conf
server {
    listen 443 ssl http2;
    server_name mcp.internal.example.com;

    ssl_certificate     /etc/ssl/certs/mcp-server.crt;
    ssl_certificate_key /etc/ssl/private/mcp-server.key;
    ssl_protocols       TLSv1.3;
    ssl_ciphers         TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256;
    ssl_prefer_server_ciphers on;
    ssl_session_timeout 1d;
    ssl_session_tickets off;

    # HSTS header
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains" always;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;

        # SSE-specific: disable buffering so events stream immediately
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 86400s;
    }
}
```

### 3.2 mTLS Between Agent and Server

For high-security environments, require the agent (client) to present a certificate.

```nginx
# Add to the server block above
ssl_client_certificate /etc/ssl/certs/agent-ca.crt;
ssl_verify_client on;
ssl_verify_depth 2;
```

**Generate a client certificate for an agent:**

```bash
# Create CA (one-time)
openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:P-256 \
  -days 365 -noenc -keyout ca-key.pem -out ca-cert.pem \
  -subj "/CN=MCP Agent CA"

# Create agent client cert signed by the CA
openssl req -newkey ec -pkeyopt ec_paramgen_curve:P-256 \
  -noenc -keyout agent-key.pem -out agent-csr.pem \
  -subj "/CN=agent-orchestrator-01"

openssl x509 -req -in agent-csr.pem -CA ca-cert.pem -CAkey ca-key.pem \
  -CAcreateserial -out agent-cert.pem -days 90
```

### 3.3 Securing stdio Transport

For local stdio-based servers, the attack surface is the process boundary itself:

```jsonc
// claude_desktop_config.json - restrict stdio server permissions
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/home/user/safe-dir"],
      "env": {
        "NODE_OPTIONS": "--experimental-permission --allow-fs-read=/home/user/safe-dir --allow-fs-write=/home/user/safe-dir"
      }
    }
  }
}
```

---

## 4. Authentication and Authorization

### 4.1 OAuth 2.1 Integration

MCP's Streamable HTTP transport supports OAuth 2.1 for client authentication. Configure
your server to validate bearer tokens on every request.

```typescript
// src/auth.ts - OAuth 2.1 token validation middleware for an MCP server
import { createServer } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import jwt from "jsonwebtoken";

const app = express();

// OAuth 2.1 token validation middleware
function validateBearerToken(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "missing_token" });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, process.env.OAUTH_PUBLIC_KEY!, {
      algorithms: ["RS256"],
      issuer: "https://auth.example.com",
      audience: "mcp-server",
    });
    // Attach scopes for downstream authorization
    (req as any).tokenScopes = (payload as any).scope?.split(" ") || [];
    (req as any).userId = (payload as any).sub;
    next();
  } catch {
    return res.status(403).json({ error: "invalid_token" });
  }
}

app.use("/mcp", validateBearerToken);
```

### 4.2 API Key Management

For simpler deployments, use hashed API keys stored server-side:

```typescript
// src/apikeys.ts
import { createHash, timingSafeEqual } from "crypto";

interface ApiKeyRecord {
  hashedKey: string;
  userId: string;
  allowedTools: string[];
  rateLimit: number;        // requests per minute
  expiresAt: Date;
}

// Store hashed keys, never plaintext
const apiKeyStore: Map<string, ApiKeyRecord> = new Map();

export function registerApiKey(plainKey: string, record: Omit<ApiKeyRecord, "hashedKey">) {
  const hashed = createHash("sha256").update(plainKey).digest("hex");
  apiKeyStore.set(hashed, { ...record, hashedKey: hashed });
}

export function validateApiKey(plainKey: string): ApiKeyRecord | null {
  const hashed = createHash("sha256").update(plainKey).digest("hex");
  const record = apiKeyStore.get(hashed);
  if (!record) return null;
  if (new Date() > record.expiresAt) {
    apiKeyStore.delete(hashed);
    return null;
  }
  return record;
}
```

---

## 5. Tool Authorization

### 5.1 Allowlist Patterns

Never expose every tool to every user. Define an explicit allowlist:

```yaml
# config/tool-policy.yaml
policies:
  - role: developer
    allowed_tools:
      - "read_file"
      - "search_code"
      - "run_tests"
    denied_tools:
      - "execute_command"
      - "write_file"
      - "delete_file"

  - role: admin
    allowed_tools: ["*"]
    denied_tools: []

  - role: readonly-agent
    allowed_tools:
      - "read_file"
      - "list_directory"
      - "query_database:SELECT"
    denied_tools: ["*"]

dangerous_tools:
  - name: "execute_command"
    risk: critical
    requires_approval: true
    max_executions_per_session: 5
  - name: "write_file"
    risk: high
    requires_approval: true
  - name: "query_database"
    risk: medium
    allowed_operations: ["SELECT"]
```

### 5.2 Per-User Tool Access Enforcement

```typescript
// src/toolAuth.ts
import { readFileSync } from "fs";
import { parse } from "yaml";

interface ToolPolicy {
  role: string;
  allowed_tools: string[];
  denied_tools: string[];
}

const config = parse(readFileSync("config/tool-policy.yaml", "utf-8"));
const policies: ToolPolicy[] = config.policies;

export function isToolAllowed(userRole: string, toolName: string): boolean {
  const policy = policies.find((p) => p.role === userRole);
  if (!policy) return false;

  // Explicit deny takes precedence
  if (policy.denied_tools.includes(toolName)) return false;
  if (policy.denied_tools.includes("*") && !policy.allowed_tools.includes(toolName)) return false;

  // Check allow
  if (policy.allowed_tools.includes("*")) return true;
  if (policy.allowed_tools.includes(toolName)) return true;

  return false;
}

// MCP server integration: wrap the tool handler
export function authorizedToolHandler(server: any) {
  const originalCallTool = server.callTool.bind(server);

  server.callTool = async (request: any, context: any) => {
    const userRole = context.session?.userRole || "readonly-agent";
    const toolName = request.params.name;

    if (!isToolAllowed(userRole, toolName)) {
      return {
        content: [{ type: "text", text: `Access denied: tool "${toolName}" is not permitted for role "${userRole}".` }],
        isError: true,
      };
    }
    return originalCallTool(request, context);
  };
}
```

---


## Contents

- [6. Input Validation](references/details.md)
- [7. Resource Access Control](references/details.md)
- [8. Rate Limiting](references/details.md)
- [9. Audit Logging](references/details.md)
- [10. Deployment Hardening](references/details.md)
- [11. Testing](references/details.md)
- [Quick Reference Checklist](references/details.md)

## When to Use This Skill

Apply this skill whenever you are:

- Deploying an MCP server that exposes tools (filesystem, database, API) to AI agents.
- Connecting an agent runtime (Claude Desktop, Cursor, a custom orchestrator) to one or
  more MCP servers over stdio, SSE, or Streamable HTTP transport.
- Building a multi-tenant platform where multiple users share the same MCP server.
- Passing sensitive data (PII, credentials, internal documents) through MCP resources.
- Operating in a regulated environment (SOC 2, HIPAA, PCI-DSS) where tool invocations
  must be auditable.

If your MCP server only runs locally over stdio for a single developer with no network
exposure, you can relax some transport-layer controls -- but input validation and audit
logging still apply.

---

## Limitations

- Apply guidance only within authorized scope; test destructive steps in non-production first.
- Docs-only import: upstream scripts and templates not bundled.

### Example

```bash
# Read-only first: inventory before any active step.
which <tool> && <tool> --help | head -n 20
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.
