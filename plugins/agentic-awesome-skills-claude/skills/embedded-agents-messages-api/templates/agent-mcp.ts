import 'server-only';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { mcpTools, type MCPCallToolResultLike, type MCPClientLike } from '@anthropic-ai/sdk/helpers/beta/mcp';
import { ToolError } from '@anthropic-ai/sdk/lib/tools/ToolError';
import type { AgentTool } from './agent';

// An agent's MCP servers, from its own .mcp.json, opened by this process for one run. The model
// never talks to a server: it calls a tool, the runner calls the server through this client, and
// only the tools the server's `allowedTools` lists exist for the model at all. Secrets stay here:
// `${VAR}` is expanded from this process's environment, and a stdio server starts with only the
// MCP SDK's short list of safe variables (PATH, HOME, …) plus its own `env`, never the app's secrets.

export interface McpServer {
  type?: 'stdio' | 'http';
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>;
  /** The tools this agent may call on the server. Every other tool it offers is never shown to the model. */
  allowedTools?: string[];
}

function expandEnvVars<T>(value: T, where: string): T {
  if (typeof value === 'string') {
    return value.replace(/\$\{([A-Z0-9_]+)\}/gi, (_, name: string) => {
      const v = process.env[name];
      // A missing secret fails here, by name, instead of as a server that silently refuses every call.
      if (v === undefined || v === '') throw new Error(`${where} needs ${name}, which is not set`);
      return v;
    }) as unknown as T;
  }
  if (Array.isArray(value)) return value.map((v) => expandEnvVars(v, where)) as unknown as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, expandEnvVars(v, where)])) as T;
  }
  return value;
}

/** The servers an agent's .mcp.json declares, secrets expanded. None when it has no .mcp.json. */
export function readMcpConfig(agentDir: string): Record<string, McpServer> {
  const file = join(agentDir, '.mcp.json');
  if (!existsSync(file)) return {};
  const servers = (JSON.parse(readFileSync(file, 'utf8')) as { mcpServers?: Record<string, McpServer> }).mcpServers ?? {};
  return Object.fromEntries(Object.entries(servers).map(([name, s]) => [name, expandEnvVars(s, `MCP server "${name}"`)]));
}

/** Connects to one server and lists every tool it offers. The caller closes the client. */
export async function connectMcp(name: string, server: McpServer, opts: { stderr?: 'ignore' | 'inherit' } = {}) {
  const client = new Client({ name: `agent-${name}`, version: '1.0.0' });
  const transport =
    server.type === 'http'
      ? new StreamableHTTPClientTransport(new URL(server.url ?? ''), { requestInit: { headers: server.headers } })
      : // A server's own log lines can carry what it was asked; the app's log stays ids, never bodies.
        new StdioClientTransport({ command: server.command ?? '', args: server.args, env: server.env, stderr: opts.stderr ?? 'ignore' });
  try {
    await client.connect(transport);
    const offered = [];
    let cursor: string | undefined;
    do {
      const page = await client.listTools(cursor ? { cursor } : undefined);
      offered.push(...page.tools);
      cursor = page.nextCursor;
    } while (cursor);
    return { client, offered };
  } catch (error) {
    await client.close().catch(() => {});
    throw error;
  }
}

/** What the SDK's MCP helper calls. The protocol's legacy `toolResult` answer has no content to read, so it fails as a tool error. */
function caller(client: Client): MCPClientLike {
  return {
    callTool: async (params) => {
      const result = await client.callTool(params);
      if (!('content' in result)) throw new ToolError('The server answered in a format this client does not read.');
      return result as MCPCallToolResultLike;
    },
  };
}

/** Opens every server the agent declares and returns the tools it may call, with one `close` for all of them. */
export async function openMcpTools(agentDir: string): Promise<{ tools: AgentTool[]; close: () => Promise<void> }> {
  const clients: Client[] = [];
  const close = async () => {
    await Promise.allSettled(clients.map((c) => c.close()));
  };
  try {
    const tools: AgentTool[] = [];
    for (const [name, server] of Object.entries(readMcpConfig(agentDir))) {
      const { client, offered } = await connectMcp(name, server);
      clients.push(client);
      const allowed = new Set(server.allowedTools ?? []);
      tools.push(...mcpTools(offered.filter((t) => allowed.has(t.name)), caller(client)));
    }
    return { tools, close };
  } catch (error) {
    await close();
    throw error;
  }
}
