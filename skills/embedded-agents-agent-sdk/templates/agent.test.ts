import { describe, test, expect, vi, beforeAll } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

vi.mock('server-only', () => ({}));
vi.mock('@anthropic-ai/claude-agent-sdk', () => ({ query: vi.fn() }));

// The embedded-agent contract, pinned without a model call. Each assertion is a measured
// failure of the SDK's defaults — see the embedded-agents-agent-sdk skill, reference/playbook.md.

const root = mkdtempSync(join(tmpdir(), 'agents-'));
const agentsDir = join(root, '.claude', 'agents');
function write(path: string, body: string) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, body);
}
write(join(agentsDir, 'plain', 'AGENTS.md'), 'You are Plain.');
write(join(agentsDir, 'tooled', 'AGENTS.md'), 'You are Tooled.');
write(join(agentsDir, 'tooled', '.claude', 'skills', 'cite', 'SKILL.md'), '---\nname: cite\ndescription: Cite sources.\n---\n');
write(join(agentsDir, 'tooled', '.mcp.json'), JSON.stringify({
  mcpServers: { search: { type: 'stdio', command: 'npx', args: ['-y', 'some-mcp'], env: { KEY: '${SEARCH_KEY}' }, allowedTools: ['find'] } },
}));
write(join(agentsDir, 'not-an-agent', 'README.md'), 'No AGENTS.md here.');

let lib: typeof import('@/lib/agent');
beforeAll(async () => {
  vi.spyOn(process, 'cwd').mockReturnValue(root);
  process.env.SEARCH_KEY = 'k-123';
  lib = await import('@/lib/agent');
});

describe('agents are directories', () => {
  test('lists only directories that hold an AGENTS.md', () => {
    expect(lib.listAgents()).toEqual(['plain', 'tooled']);
  });

  test('refuses a name that is a path, so a request body cannot pick the repo root', () => {
    expect(() => lib.agentOptions({ agent: '../..' })).toThrow(/Invalid agent name/);
    expect(() => lib.agentOptions({ agent: 'Plain' })).toThrow(/Invalid agent name/);
  });

  test('refuses a directory without AGENTS.md', () => {
    expect(() => lib.agentOptions({ agent: 'not-an-agent' })).toThrow(/missing AGENTS\.md/);
  });
});

describe('isolation contract', () => {
  test("appends the agent's AGENTS.md to the preset, because the SDK does not load it", () => {
    const o = lib.agentOptions({ agent: 'plain' });
    expect(o.systemPrompt).toEqual({ type: 'preset', preset: 'claude_code', append: 'You are Plain.' });
    expect(o.settingSources).toEqual(['project']);
  });

  test('only the built-in tools on the allowlist exist, and anything unapproved is denied', () => {
    const o = lib.agentOptions({ agent: 'plain' });
    expect(o.tools).toEqual(['Read', 'Glob', 'Grep']);
    expect(o.allowedTools).toEqual(['Read', 'Glob', 'Grep']);
    expect(o.permissionMode).toBe('dontAsk');
    expect(o.strictMcpConfig).toBe(true);
    expect(o.skills).toEqual([]);
    expect(o.mcpServers).toBeUndefined();
  });

  test("agent-local skills and .mcp.json are discovered, secrets expanded, tools granted per server", () => {
    const o = lib.agentOptions({ agent: 'tooled' });
    expect(o.skills).toEqual(['cite']);
    expect(o.mcpServers).toEqual({ search: { type: 'stdio', command: 'npx', args: ['-y', 'some-mcp'], env: { KEY: 'k-123' } } });
    expect(o.allowedTools).toEqual(['Read', 'Glob', 'Grep', 'mcp__search__find']);
    expect(o.tools).toEqual(['Read', 'Glob', 'Grep']);
  });
});

describe('path guard', () => {
  const dir = join(agentsDir, 'plain');

  test('allows paths inside the agent directory', () => {
    expect(lib.isBlockedPath(dir, 'Read', { file_path: 'knowledge/okrs.md' })).toBe(false);
    expect(lib.isBlockedPath(dir, 'Read', { file_path: join(dir, 'knowledge', 'okrs.md') })).toBe(false);
    expect(lib.isBlockedPath(dir, 'Glob', { pattern: 'knowledge/*.md' })).toBe(false);
    expect(lib.isBlockedPath(dir, 'Grep', { pattern: 'OKR', path: 'knowledge' })).toBe(false);
  });

  test('blocks absolute paths and traversal out of it, and env files anywhere', () => {
    expect(lib.isBlockedPath(dir, 'Read', { file_path: join(root, 'AGENTS.md') })).toBe(true);
    expect(lib.isBlockedPath(dir, 'Read', { file_path: '../tooled/AGENTS.md' })).toBe(true);
    expect(lib.isBlockedPath(dir, 'Glob', { pattern: join(root, '**', '*.md') })).toBe(true);
    expect(lib.isBlockedPath(dir, 'Grep', { pattern: 'x', path: '..' })).toBe(true);
    expect(lib.isBlockedPath(dir, 'Read', { file_path: '.env' })).toBe(true);
  });

  test('is wired into PreToolUse', async () => {
    const hook = lib.agentOptions({ agent: 'plain' }).hooks!.PreToolUse![0].hooks[0];
    const signal = new AbortController().signal;
    await expect(hook({ tool_name: 'Read', tool_input: { file_path: join(root, 'AGENTS.md') } } as never, undefined, { signal }))
      .resolves.toMatchObject({ decision: 'block' });
    await expect(hook({ tool_name: 'Read', tool_input: { file_path: 'notes.md' } } as never, undefined, { signal }))
      .resolves.toEqual({});
  });
});

test('history is carried as a preamble, not a database shape', () => {
  expect(lib.composePrompt('Next?', [{ role: 'user', content: 'Hi' }, { role: 'assistant', content: 'Hello' }]))
    .toBe('Previous conversation:\nUser: Hi\nAssistant: Hello\n\nNew question: Next?');
  expect(lib.composePrompt('Only this')).toBe('Only this');
});
