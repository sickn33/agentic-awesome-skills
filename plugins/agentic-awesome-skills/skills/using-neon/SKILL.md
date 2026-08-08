---
name: using-neon
description: "Neon is a serverless Postgres platform that separates compute and storage to offer autoscaling, branching, instant restore, and scale-to-zero. It's fully compatible with Postgres and works with any language, framework, or ORM that supports Postgres."
risk: safe
source: "https://github.com/neondatabase/agent-skills/tree/main/skills/neon-postgres"
date_added: "2026-02-27"
---

# Neon Serverless Postgres

Neon is a serverless Postgres platform that separates compute and storage to offer autoscaling, branching, instant restore, and scale-to-zero. It's fully compatible with Postgres and works with any language, framework, or ORM that supports Postgres.

## When to Use This Skill

Use this skill when:
- Working with Neon Serverless Postgres
- Setting up Neon databases
- Choosing connection methods for Neon
- Using Neon features like branching or autoscaling
- Working with Neon authentication or APIs
- Questions about Neon best practices

## Neon Documentation

Always reference the Neon documentation before making Neon-related claims. The documentation is the source of truth for all Neon-related information.

Below you'll find a list of resources organized by area of concern. This is meant to support you find the right documentation pages to fetch and add a bit of additonal context.

You can use the `curl` commands to fetch the documentation page as markdown:

**Documentation:**

```bash
# Get list of all Neon docs
curl https://neon.com/llms.txt

# Fetch any doc page as markdown
curl -H "Accept: text/markdown" https://neon.com/docs/<path>
```

Don't guess docs pages. Use the `llms.txt` index to find the relevant URL or follow the links in the resources below.

## Overview of Resources

Reference the appropriate resource file based on the user's needs:

### Core Guides

| Area               | Resource                           | When to Use                                                    |
| ------------------ | ---------------------------------- | -------------------------------------------------------------- |
| What is Neon       | `references/what-is-neon.md`       | Understanding Neon concepts, architecture, core resources      |
| Referencing Docs   | `references/referencing-docs.md`   | Looking up official documentation, verifying information       |
| Features           | `references/features.md`           | Branching, autoscaling, scale-to-zero, instant restore         |
| Getting Started    | `references/getting-started.md`    | Setting up a project, connection strings, dependencies, schema |
| Connection Methods | `references/connection-methods.md` | Choosing drivers based on platform and runtime                 |
| Developer Tools    | `references/devtools.md`           | VSCode extension, MCP server, Neon CLI (`neon init`)           |

### Database Drivers & ORMs

HTTP/WebSocket queries for serverless/edge functions.

| Area              | Resource                        | When to Use                                         |
| ----------------- | ------------------------------- | --------------------------------------------------- |
| Serverless Driver | `references/neon-serverless.md` | `@neondatabase/serverless` - HTTP/WebSocket queries |
| Drizzle ORM       | `references/neon-drizzle.md`    | Drizzle ORM integration with Neon                   |

### Auth & Data API SDKs

Authentication and PostgREST-style data API for Neon.

| Area        | Resource                  | When to Use                                                         |
| ----------- | ------------------------- | ------------------------------------------------------------------- |
| Neon Auth   | `references/neon-auth.md` | `@neondatabase/auth` - Authentication only                          |
| Neon JS SDK | `references/neon-js.md`   | `@neondatabase/neon-js` - Auth + Data API (PostgREST-style queries) |

### Neon Platform API & CLI

Managing Neon resources programmatically via REST API, SDKs, or CLI.

| Area                  | Resource                            | When to Use                                  |
| --------------------- | ----------------------------------- | -------------------------------------------- |
| Platform API Overview | `references/neon-platform-api.md`   | Managing Neon resources via REST API         |
| Neon CLI              | `references/neon-cli.md`            | Terminal workflows, scripts, CI/CD pipelines |
| TypeScript SDK        | `references/neon-typescript-sdk.md` | `@neondatabase/api-client`                   |
| Python SDK            | `references/neon-python-sdk.md`     | `neon-api` package                           |

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
