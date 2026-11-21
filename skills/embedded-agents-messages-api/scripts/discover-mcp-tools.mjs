#!/usr/bin/env node
// List the tools each MCP server in an embedded agent's .mcp.json offers, beside the ones its
// `allowedTools` grants today. Connects to each server the way the wrapper does (src/lib/agent-mcp.ts)
// and asks it for its tools — no model call, no cost. Run from the repo root, with the agent's
// secrets in the environment:
//   node --env-file=.env <skill dir>/scripts/discover-mcp-tools.mjs <agent>
// It writes nothing: grant only the tools the agent's job needs, by editing `allowedTools`.
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const agent = process.argv[2];
if (!agent || !/^[a-z0-9][a-z0-9-]*$/.test(agent)) {
  console.error('Usage: discover-mcp-tools.mjs <agent>');
  process.exit(2);
}
const file = join(resolve(process.cwd(), '.claude', 'agents', agent), '.mcp.json');
if (!existsSync(file)) {
  console.log(`${agent} has no .mcp.json: nothing to discover.`);
  process.exit(0);
}

const missing = new Set();
const expand = (v) =>
  typeof v === 'string' ? v.replace(/\$\{([A-Z0-9_]+)\}/gi, (_, n) => process.env[n] || (missing.add(n), ''))
    : Array.isArray(v) ? v.map(expand)
      : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, expand(x)]))
        : v;

let failed = false;
for (const [name, declared] of Object.entries(JSON.parse(readFileSync(file, 'utf8')).mcpServers ?? {})) {
  const { allowedTools: granted = [], ...server } = declared;
  missing.clear();
  const s = expand(server);
  console.log(`\n${name}`);
  if (missing.size) { failed = true; console.log(`  not started: ${[...missing].join(', ')} not set`); continue; }
  const client = new Client({ name: `discover-${name}`, version: '1.0.0' });
  try {
    // The server's own error output is shown here (and only here): it is the clue when a server won't start.
    await client.connect(s.type === 'http'
      ? new StreamableHTTPClientTransport(new URL(s.url), { requestInit: { headers: s.headers } })
      : new StdioClientTransport({ command: s.command, args: s.args, env: s.env, stderr: 'inherit' }));
    const found = [];
    let cursor;
    do {
      const page = await client.listTools(cursor ? { cursor } : undefined);
      found.push(...page.tools.map((t) => t.name));
      cursor = page.nextCursor;
    } while (cursor);
    for (const t of found) console.log(`  ${granted.includes(t) ? 'granted  ' : 'available'} ${t}`);
    for (const t of granted.filter((g) => !found.includes(g))) console.log(`  STALE    ${t}  (granted, but the server no longer offers it)`);
  } catch (err) {
    failed = true;
    console.log(`  did not connect: ${err instanceof Error ? err.message : err}`);
  } finally {
    await client.close().catch(() => {});
  }
}
process.exit(failed ? 1 : 0);
