#!/usr/bin/env node
// Scaffold an embedded agent: .claude/agents/<name>/AGENTS.md, plus knowledge/ or .mcp.json on request.
// Run from the repo root:
//   node <skill dir>/scripts/new-agent.mjs <name> [--knowledge] [--mcp]
// The wrapper finds the agent by its directory; no code or UI change is needed to route to it.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const args = process.argv.slice(2);
const name = args.find((a) => !a.startsWith('--'));
if (!name || !/^[a-z0-9][a-z0-9-]*$/.test(name)) {
  console.error('Usage: new-agent.mjs <name> [--knowledge] [--mcp]   (name: lowercase letters, digits, hyphens)');
  process.exit(2);
}
const dir = resolve(process.cwd(), '.claude', 'agents', name);
if (existsSync(join(dir, 'AGENTS.md'))) {
  console.error(`${name} already exists at ${dir}`);
  process.exit(1);
}

const title = name.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'AGENTS.md'), `You are the **${title}**. <One sentence: who you answer and what you do for them.>

## Sources

<Where every answer comes from — files in \`knowledge/\`, a named MCP tool, or general knowledge — and which of them is authoritative.>

## Output format

<The shape of every answer.>

## Refusals

<What you decline, and the exact sentence you answer with.>
`);
const made = ['AGENTS.md'];

if (args.includes('--knowledge')) {
  mkdirSync(join(dir, 'knowledge'), { recursive: true });
  made.push('knowledge/');
}
if (args.includes('--mcp')) {
  writeFileSync(join(dir, '.mcp.json'), `${JSON.stringify({
    mcpServers: {
      '<server>': { type: 'stdio', command: 'npx', args: ['-y', '<package>'], env: { '<KEY>': '${<KEY>}' }, allowedTools: [] },
    },
  }, null, 2)}\n`);
  made.push('.mcp.json');
}
console.log(`Created .claude/agents/${name}/: ${made.join(', ')}. Fill in the <placeholders>.`);
