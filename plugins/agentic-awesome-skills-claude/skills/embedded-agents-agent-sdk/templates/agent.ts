import 'server-only';
import { resolve, join, relative, isAbsolute } from 'node:path';
import { readdirSync, existsSync, readFileSync } from 'node:fs';
import {
  query,
  type HookCallback,
  type McpServerConfig,
  type Options,
  type PostToolUseHookInput,
  type PreToolUseHookInput,
} from '@anthropic-ai/claude-agent-sdk';

// Embedded agents: one directory per agent under .claude/agents/<name>/, each with its
// own AGENTS.md, optional knowledge/, agent-local skills and .mcp.json. No agent names
// live in code — an agent is a directory. Every option below is explained, with the
// measurement behind it, in the embedded-agents-agent-sdk skill (reference/playbook.md).

const AGENTS_ROOT = resolve(process.cwd(), '.claude', 'agents');
const INSTRUCTIONS = 'AGENTS.md';
// An agent name usually arrives in a request body, so it must be a directory name and
// never a path: `../..` would otherwise resolve to the repo root and its AGENTS.md.
const AGENT_NAME = /^[a-z0-9][a-z0-9-]*$/;
export const DEFAULT_MODEL = 'claude-sonnet-5-5';

export function listAgents(): string[] {
  if (!existsSync(AGENTS_ROOT)) return [];
  return readdirSync(AGENTS_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory() && AGENT_NAME.test(d.name) && existsSync(join(AGENTS_ROOT, d.name, INSTRUCTIONS)))
    .map((d) => d.name)
    .sort();
}

function agentCwd(agent: string): string {
  if (!AGENT_NAME.test(agent)) throw new Error(`Invalid agent name "${agent}"`);
  const dir = join(AGENTS_ROOT, agent);
  if (!existsSync(join(dir, INSTRUCTIONS))) {
    throw new Error(`Agent "${agent}" not found at ${dir} (missing ${INSTRUCTIONS})`);
  }
  return dir;
}

function discoverSkills(agentDir: string): string[] {
  const skillsDir = join(agentDir, '.claude', 'skills');
  if (!existsSync(skillsDir)) return [];
  return readdirSync(skillsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(skillsDir, d.name, 'SKILL.md')))
    .map((d) => d.name);
}

function expandEnvVars<T>(value: T): T {
  if (typeof value === 'string') {
    return value.replace(/\$\{([A-Z0-9_]+)\}/gi, (_, name) => process.env[name] ?? '') as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((v) => expandEnvVars(v)) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = expandEnvVars(v);
    }
    return out as unknown as T;
  }
  return value;
}

interface DiscoveredMcp {
  servers: Record<string, McpServerConfig>;
  allowedTools: string[];
}

function discoverMcp(agentDir: string): DiscoveredMcp | undefined {
  const mcpFile = join(agentDir, '.mcp.json');
  if (!existsSync(mcpFile)) return undefined;
  const parsed = JSON.parse(readFileSync(mcpFile, 'utf8')) as {
    mcpServers?: Record<string, McpServerConfig & { allowedTools?: string[] }>;
  };
  if (!parsed.mcpServers) return undefined;

  const servers: Record<string, McpServerConfig> = {};
  const allowedTools: string[] = [];
  for (const [name, raw] of Object.entries(parsed.mcpServers)) {
    const { allowedTools: serverTools, ...rest } = raw;
    servers[name] = expandEnvVars(rest) as McpServerConfig;
    if (Array.isArray(serverTools)) {
      for (const t of serverTools) allowedTools.push(`mcp__${name}__${t}`);
    }
  }
  return { servers, allowedTools };
}

export interface AskAgentOptions {
  agent: string;
  prompt: string;
  history?: { role: 'user' | 'assistant'; content: string }[];
  model?: string;
  maxBudgetUsd?: number;
  maxTurns?: number;
  allowedTools?: string[];
}

export interface AgentMetadata {
  cost: number;
  duration_ms: number;
  filesRead: string[];
  tokens: number;
}

export type AgentEvent =
  | { type: 'text'; text: string }
  | { type: 'done'; text: string; metadata: AgentMetadata }
  // The run stopped without an answer: max turns, max budget, or an execution error.
  | { type: 'error'; text: string; subtype: string; metadata: AgentMetadata };

// A tool may touch only files inside the agent's own directory, and never an env file.
// Checking for `..` alone is not enough: an absolute path walks straight out.
export function isBlockedPath(agentDir: string, toolName: string, input: Record<string, unknown> | undefined): boolean {
  const candidates = [input?.file_path, input?.path, input?.glob, toolName === 'Glob' ? input?.pattern : undefined];
  return candidates.some((c) => {
    if (typeof c !== 'string' || c === '') return false;
    if (c.includes('.env')) return true;
    const rel = relative(agentDir, resolve(agentDir, c));
    return rel.startsWith('..') || isAbsolute(rel);
  });
}

export function composePrompt(prompt: string, history: AskAgentOptions['history'] = []): string {
  const historyBlock = history
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n');
  return historyBlock ? `Previous conversation:\n${historyBlock}\n\nNew question: ${prompt}` : prompt;
}

// The options every call gets. Exported so the contract can be unit-tested without a model call.
export function agentOptions(opts: Omit<AskAgentOptions, 'prompt' | 'history'>, filesRead: string[] = []): Options {
  const cwd = agentCwd(opts.agent);
  const mcp = discoverMcp(cwd);
  const allowedTools = opts.allowedTools ?? ['Read', 'Glob', 'Grep', ...(mcp?.allowedTools ?? [])];
  return {
    cwd,
    // 'project' is what discovers agent-local skills; the SDK does not load AGENTS.md itself.
    settingSources: ['project'],
    // The agent's AGENTS.md is appended to the preset, which is what makes it authoritative.
    systemPrompt: { type: 'preset', preset: 'claude_code', append: readFileSync(join(cwd, INSTRUCTIONS), 'utf8') },
    skills: discoverSkills(cwd),
    strictMcpConfig: true,
    mcpServers: mcp?.servers,
    // `allowedTools` only auto-approves. `tools` is what makes every other built-in tool
    // (Bash, Write, Edit, WebFetch…) unavailable, and 'dontAsk' denies anything not approved —
    // including an MCP tool the agent's .mcp.json did not list.
    tools: allowedTools.filter((t) => !t.startsWith('mcp__')),
    allowedTools,
    permissionMode: 'dontAsk',
    model: opts.model ?? DEFAULT_MODEL,
    maxTurns: opts.maxTurns ?? 10,
    maxBudgetUsd: opts.maxBudgetUsd,
    hooks: {
      PreToolUse: [
        {
          hooks: [
            (async (input) => {
              const i = input as PreToolUseHookInput;
              if (isBlockedPath(cwd, i.tool_name, i.tool_input as Record<string, unknown> | undefined)) {
                return { decision: 'block' as const, reason: "Access denied: outside the agent's directory, or an env file" };
              }
              return {};
            }) as HookCallback,
          ],
        },
      ],
      PostToolUse: [
        {
          hooks: [
            (async (input) => {
              const i = input as PostToolUseHookInput;
              if (i.tool_name === 'Read') {
                const t = i.tool_input as Record<string, string> | undefined;
                // Relative to the agent: the list reaches the browser, the server's layout must not.
                if (t?.file_path) filesRead.push(relative(cwd, resolve(cwd, t.file_path)).replace(/\\/g, '/'));
              }
              return {};
            }) as HookCallback,
          ],
        },
      ],
    },
  };
}

export async function* askAgent(opts: AskAgentOptions): AsyncGenerator<AgentEvent> {
  const filesRead: string[] = [];
  const options = agentOptions(opts, filesRead);
  let fullText = '';
  let finished = false;

  try {
    for await (const msg of query({ prompt: composePrompt(opts.prompt, opts.history), options })) {
      if (msg.type === 'assistant') {
        const text = msg.message.content
          .filter((b): b is Extract<typeof b, { type: 'text' }> => b.type === 'text')
          .map((b) => b.text)
          .join('');
        if (text) {
          fullText += text;
          yield { type: 'text', text };
        }
      }
      if (msg.type === 'result') {
        const metadata: AgentMetadata = {
          cost: msg.total_cost_usd ?? 0,
          duration_ms: msg.duration_ms ?? 0,
          filesRead,
          tokens: (msg.usage?.input_tokens ?? 0) + (msg.usage?.output_tokens ?? 0),
        };
        finished = true;
        if (msg.subtype === 'success') yield { type: 'done', text: fullText, metadata };
        else yield { type: 'error', text: fullText, subtype: msg.subtype, metadata };
      }
    }
  } catch (err) {
    // After a non-success result the SDK also throws ("Claude Code returned an error result").
    // The error event above already carries it, so the caller gets one signal, not two.
    if (!finished) throw err;
  }
}
