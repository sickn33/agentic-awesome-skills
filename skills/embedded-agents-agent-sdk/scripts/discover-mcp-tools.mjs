#!/usr/bin/env node
// List the tools each MCP server in an embedded agent's .mcp.json exposes, beside the ones its
// `allowedTools` grants today. Reads only the SDK's init message — no model call, no cost.
// Run from the repo root, with the agent's secrets in the environment:
//   node --env-file=.env <skill dir>/scripts/discover-mcp-tools.mjs <agent>
// It writes nothing: grant only the tools the agent's job needs, by editing `allowedTools`.
import { query } from '@anthropic-ai/claude-agent-sdk';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const agent = process.argv[2];
if (!agent || !/^[a-z0-9][a-z0-9-]*$/.test(agent)) {
  console.error('Usage: discover-mcp-tools.mjs <agent>');
  process.exit(2);
}
const dir = resolve(process.cwd(), '.claude', 'agents', agent);
const file = join(dir, '.mcp.json');
if (!existsSync(file)) {
  console.log(`${agent} has no .mcp.json: nothing to discover.`);
  process.exit(0);
}

const expand = (v) =>
  typeof v === 'string' ? v.replace(/\$\{([A-Z0-9_]+)\}/gi, (_, n) => process.env[n] ?? '')
    : Array.isArray(v) ? v.map(expand)
      : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, expand(x)]))
        : v;
const declared = JSON.parse(readFileSync(file, 'utf8')).mcpServers ?? {};
const servers = Object.fromEntries(Object.entries(declared).map(([name, { allowedTools, ...rest }]) => [name, expand(rest)]));

const ac = new AbortController();
let init;
try {
  for await (const msg of query({ prompt: 'list tools', options: { cwd: dir, settingSources: [], strictMcpConfig: true, mcpServers: servers, abortController: ac } })) {
    if (msg.type === 'system' && msg.subtype === 'init') { init = msg; ac.abort(); break; }
  }
} catch (err) {
  if (!ac.signal.aborted) throw err;
}

let failed = false;
for (const name of Object.keys(servers)) {
  const status = init?.mcp_servers.find((s) => s.name === name)?.status ?? 'missing';
  const found = (init?.tools ?? []).filter((t) => t.startsWith(`mcp__${name}__`)).map((t) => t.slice(`mcp__${name}__`.length));
  const granted = declared[name].allowedTools ?? [];
  console.log(`\n${name} (${status})`);
  if (status !== 'connected') { failed = true; console.log('  did not connect: check its command and that its secrets are in the environment'); continue; }
  for (const t of found) console.log(`  ${granted.includes(t) ? 'granted  ' : 'available'} ${t}`);
  for (const t of granted.filter((g) => !found.includes(g))) console.log(`  STALE    ${t}  (granted, but the server no longer offers it)`);
}
process.exit(failed ? 1 : 0);
