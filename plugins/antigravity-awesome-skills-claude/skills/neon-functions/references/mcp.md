# MCP servers on Neon Functions

A [Model Context Protocol](https://modelcontextprotocol.io) server is a textbook Neon Functions workload: it's a long-running HTTP handler that an AI client (Cursor, Claude, ChatGPT, an agent) calls to discover and invoke tools, and those tools usually read and write a database. Running it as a Neon Function puts the MCP server's compute next to its Postgres data, gives it a public HTTPS URL, and lets it branch with the rest of your backend — each branch gets its own MCP server against its own isolated data.

MCP's **streamable HTTP transport** is a plain `POST`/`GET` on a single endpoint (conventionally `/mcp`), so it maps directly onto a function's web-standard `fetch` handler — no `upgrade` method or extra protocol like [WebSockets](../SKILL.md#websocket-servers) needed. A Hono app is the simplest host.

## The server

Two packages do the work: the official [`@modelcontextprotocol/sdk`](https://github.com/modelcontextprotocol/typescript-sdk) (defines the server and its tools) and [`@hono/mcp`](https://github.com/honojs/middleware/tree/main/packages/mcp) (bridges MCP's streamable HTTP transport to a Hono route). Tools query Postgres through Drizzle on a module-scope `pg` pool, exactly like any other function (see [Connecting to Postgres](../SKILL.md#connecting-to-postgres)).

```typescript
// src/index.ts
import { Hono } from "hono";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPTransport } from "@hono/mcp";
import { contacts } from "./db/schema";

// One pool per isolate, reused across requests.
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
const db = drizzle(pool);

const mcpServer = new McpServer({ name: "contacts", version: "1.0.0" });

// Each tool: a name, a config (description + a Zod input schema), and a handler
// that returns MCP content. The Zod shape becomes the tool's JSON schema, which
// the client uses to call the tool correctly.
mcpServer.registerTool(
  "create_contact",
  {
    title: "Create contact",
    description: "Create a new contact.",
    inputSchema: {
      name: z.string().describe("Full name (required)."),
      email: z.string().optional().describe("Email address."),
    },
  },
  async ({ name, email }) => {
    const [row] = await db.insert(contacts).values({ name, email }).returning();
    return { content: [{ type: "text", text: JSON.stringify(row) }] };
  },
);

mcpServer.registerTool(
  "delete_contact",
  {
    title: "Delete contact",
    description: "Delete a contact by id.",
    inputSchema: { id: z.number().int().positive() },
  },
  async ({ id }) => {
    const [row] = await db.delete(contacts).where(eq(contacts.id, id)).returning();
    return { content: [{ type: "text", text: JSON.stringify(row ?? { error: "not found" }) }] };
  },
);

// Connect the server to the transport once per isolate, then let the Hono route
// hand every /mcp request (POST for calls, GET for the stream) to the transport.
const transport = new StreamableHTTPTransport();
const app = new Hono();

app.all("/mcp", async (c) => {
  if (!mcpServer.isConnected()) await mcpServer.connect(transport);
  return transport.handleRequest(c);
});

export default app;
```

Key points:

- **Module scope.** Build the `McpServer`, register its tools, create the `StreamableHTTPTransport`, and open the `pg` pool once at module load — they're reused across every request the isolate serves (see [runtime limits](../SKILL.md#timeouts-and-runtime-limits)). Connect the transport lazily with the `isConnected()` guard so it happens once.
- **State in Postgres.** Module memory doesn't survive isolate eviction, and several isolates run in parallel — so the source of truth for anything a tool reads or writes belongs in Postgres, not an in-memory structure.
- **The URL.** After `neon deploy`, the server lives at `https://<branch_id>-<slug>.compute.…neon.tech/mcp`. Point any streamable-HTTP MCP client at that `/mcp` path.

## Authenticating the server

> [!WARNING]
> A Neon Function has a **public HTTPS URL — anyone can reach it.** An unauthenticated MCP server hands every caller your tools (and the database behind them). Authenticate at the top of the handler before touching the transport, exactly as for [any client-facing function](../SKILL.md#functions-as-an-agent-backend-nextjs-and-similar-frameworks).

[Better Auth](https://better-auth.com) (self-hostable, runs alongside your app) is a good fit, and it covers both common shapes. **Better Auth is evolving quickly** — the MCP plugin is moving out of `better-auth/plugins` into its own `@better-auth/mcp` package (built on the OAuth Provider plugin), which renames `withMcpAuth` → `requireMcpAuth` and `createMcpAuthClient` → `createMcpResourceClient`. Verify the current package and import paths against the [Better Auth MCP docs](https://better-auth.com/docs/plugins/mcp) before wiring it up.

### Option 1 — OAuth via the Better Auth MCP plugin (best for third-party clients)

The [MCP plugin](https://better-auth.com/docs/plugins/mcp) makes your **Better Auth app the OAuth authorization server** for MCP, implementing the MCP authorization spec end to end: discovery (`/.well-known/oauth-authorization-server`, `/.well-known/oauth-protected-resource`), dynamic client registration, and the consent/token flow. MCP clients that support OAuth (Cursor, Claude, ChatGPT) then sign the user in and obtain a token with no API key to copy around.

Your Neon Function is the **resource server** — a separate service from the Better Auth app, so it doesn't share a process. Use Better Auth's **remote MCP client** to validate the incoming Bearer token against the auth server's published JWKS, and serve the protected-resource metadata so clients can discover where to authenticate:

```typescript
// src/index.ts (sketch) — verify the bearer token against your remote Better Auth server.
// Import path/name depend on your Better Auth version (createMcpAuthClient in better-auth/plugins/mcp/client,
// or createMcpResourceClient in @better-auth/mcp/client) — check the docs.
import { createMcpAuthClient } from "better-auth/plugins/mcp/client";

const mcpAuth = createMcpAuthClient({ authURL: process.env.AUTH_URL }); // your Better Auth base URL

app.all("/mcp", async (c) => {
  const session = await mcpAuth.verify?.(c.req.raw); // verifies the Bearer token via the remote JWKS
  if (!session) {
    // Tell the client where to authenticate (RFC 9728 / MCP spec).
    return c.json({ error: "unauthorized" }, 401, {
      "WWW-Authenticate": `Bearer resource_metadata="${process.env.AUTH_URL}/.well-known/oauth-protected-resource"`,
    });
  }
  if (!mcpServer.isConnected()) await mcpServer.connect(transport);
  return transport.handleRequest(c); // scope tools to session.userId
});
```

Pass `AUTH_URL` (and any signing/JWKS config) to the function via its `env` in `neon.ts` (see [Environment variables](../SKILL.md#environment-variables)). Because the function only verifies tokens against the remote server, the Better Auth instance can live anywhere — typically your Next.js / app host on Vercel.

### Option 2 — API key or session JWT via self-hosted Better Auth (simplest)

When the callers are your own agents/services or a personal MCP server, you don't need the full OAuth dance. Run Better Auth self-hosted and either:

- **API keys** — enable Better Auth's [API Key plugin](https://better-auth.com/docs/plugins/api-key), issue a key, and have the function verify the `Authorization: Bearer <key>` (or an `x-api-key` header) on every request; or
- **Session JWT** — mint a short-lived JWT with Better Auth's `jwt` plugin and verify it in the function against the app's JWKS, the same `jose` pattern used for the [agent backend](../SKILL.md#functions-as-an-agent-backend-nextjs-and-similar-frameworks).

Either way it's one check at the top of the `/mcp` route — reject anything that doesn't carry a valid key/token before connecting the transport:

```typescript
app.all("/mcp", async (c) => {
  const auth = c.req.header("authorization");
  if (!(await isValidApiKey(auth))) return c.json({ error: "unauthorized" }, 401); // your check
  if (!mcpServer.isConnected()) await mcpServer.connect(transport);
  return transport.handleRequest(c);
});
```

This keeps the secret server-side, costs nothing to operate, and is trivial to rotate — a solid default until you need third-party clients to self-authorize, at which point reach for Option 1.

## Testing

Drive the server with any MCP client. [`mcporter`](https://github.com/instructa/mcporter) is a quick CLI for it — `mcporter list <url>/mcp --schema` lists the tools and `mcporter call "<url>/mcp.<tool>" key=value` invokes one (`--allow-http` for a local `neon dev` URL). To wire it into a client interactively, `npx add-mcp <url>/mcp -a <agent>` writes the client config for you.
