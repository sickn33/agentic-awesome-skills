import 'server-only';
import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';
import Anthropic from '@anthropic-ai/sdk';
import { betaZodTool } from '@anthropic-ai/sdk/helpers/beta/zod';
import { ToolError } from '@anthropic-ai/sdk/lib/tools/ToolError';
import type { BetaRunnableTool } from '@anthropic-ai/sdk/lib/tools/BetaRunnableTool';
import type { BetaMessage, BetaMessageParam, BetaToolRunnerParams } from '@anthropic-ai/sdk/resources/beta/messages/messages';
import { z } from 'zod';
import { openMcpTools } from './agent-mcp';

// Embedded agents on the Claude API: one directory per agent under .claude/agents/<name>/, each
// with its own AGENTS.md, optional knowledge/, agent-local skills and .mcp.json. No agent names
// live in code: an agent is a directory. The loop is the Anthropic SDK's tool runner, in this
// process, and an agent has exactly the tools this file gives it. Every choice below is explained,
// with the measurement behind it, in the embedded-agents-messages-api skill (reference/playbook.md).

const AGENTS_ROOT = resolve(process.cwd(), '.claude', 'agents');
const INSTRUCTIONS = 'AGENTS.md';
const KNOWLEDGE = 'knowledge';
// An agent name usually arrives in a request body, so it must be a directory name and never a
// path: `../..` would otherwise resolve to the repo root and its AGENTS.md.
const AGENT_NAME = /^[a-z0-9][a-z0-9-]*$/;
export const DEFAULT_MODEL = 'claude-sonnet-5-5';

// $ per million tokens, from Anthropic's price list. A requested model missing here cannot run:
// its cost, and so its maxBudgetUsd, would be unknown. Cache writes are the 5-minute rate.
type Rates = { input: number; output: number; cacheWrite: number; cacheRead: number };
const PRICES: Record<string, { rates: Rates; longAbove?: number; long?: Rates }> = {
  'claude-opus-5-5': { rates: { input: 4, output: 20, cacheWrite: 5, cacheRead: 0.2 } },
  'claude-sonnet-5-5': { rates: { input: 2, output: 10, cacheWrite: 2.5, cacheRead: 0.2 } },
  // Haiku 5.5 bills a prompt over 100K tokens at a second rate.
  'claude-haiku-5-5': {
    rates: { input: 0.1, output: 0.5, cacheWrite: 0.125, cacheRead: 0.01 },
    longAbove: 100_000,
    long: { input: 0.5, output: 2.5, cacheWrite: 0.625, cacheRead: 0.05 },
  },
};
// A response served by a model not listed above (a refusal fallback picks its own) is priced at
// the most expensive rates on the price list, so a budget stays a ceiling.
const UNLISTED: Rates = { input: 10, output: 50, cacheWrite: 12.5, cacheRead: 1 };
// Models that take the server-side refusal fallback. Haiku 5.5 has none: its refusals stand.
const FALLBACK_MODELS = new Set(['claude-opus-5-5', 'claude-sonnet-5-5']);

/** Room for thinking plus the answer; non-streaming requests stay under the SDK's timeout guard. */
const MAX_TOKENS = 16_000;
const MAX_FILE_BYTES = 256 * 1024;

let client: Anthropic | undefined;
// ANTHROPIC_API_KEY, or a profile from `ant auth login` on a developer's machine. Each request
// gets two minutes and two retries; a run that still fails throws, and the caller says so.
const agentClient = () => (client ??= new Anthropic({ timeout: 120_000, maxRetries: 2 }));

export function listAgents(): string[] {
  if (!existsSync(AGENTS_ROOT)) return [];
  return readdirSync(AGENTS_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory() && AGENT_NAME.test(d.name) && existsSync(join(AGENTS_ROOT, d.name, INSTRUCTIONS)))
    .map((d) => d.name)
    .sort();
}

export function agentDir(agent: string): string {
  if (!AGENT_NAME.test(agent)) throw new Error(`Invalid agent name "${agent}"`);
  const dir = join(AGENTS_ROOT, agent);
  if (!existsSync(join(dir, INSTRUCTIONS))) {
    throw new Error(`Agent "${agent}" not found at ${dir} (missing ${INSTRUCTIONS})`);
  }
  return dir;
}

/** A tool the runner can call: its definition, plus `parse` and `run`. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the runner's own type for a mixed list
export type AgentTool = BetaRunnableTool<any>;

/** What a tool says when it fails in a way it did not plan for. */
export const TOOL_FAILED = "The tool failed before it could answer. Say so plainly; don't guess what it would have returned.";

/** A tool whose unplanned exceptions reach the model as TOOL_FAILED: a message can carry a vendor's internals or a credential. */
export function guarded(tool: AgentTool): AgentTool {
  return {
    ...tool,
    run: async (input, context) => {
      try {
        return await tool.run(input, context);
      } catch (error) {
        if (error instanceof ToolError) throw error;
        throw new ToolError(TOOL_FAILED);
      }
    },
  };
}

/**
 * One of the app's own tools. `run` returns the text the model reads; a refusal or a planned
 * failure throws a `ToolError` with the text instead, which the model reads as an error result.
 * The input is validated against `input` before `run` sees it.
 */
export function agentTool<S extends z.ZodRawShape>(spec: {
  name: string;
  description: string;
  input: S;
  run: (input: z.infer<z.ZodObject<S>>) => Promise<string>;
}): AgentTool {
  return guarded(betaZodTool({ name: spec.name, description: spec.description, inputSchema: z.object(spec.input), run: spec.run }));
}
export { ToolError };

export interface AskAgentOptions {
  agent: string;
  prompt: string;
  /** Earlier turns, oldest first, sent as the conversation they were. */
  history?: { role: 'user' | 'assistant'; content: string }[];
  model?: string;
  maxBudgetUsd?: number;
  maxTurns?: number;
  /** The caller's own tools for this run, built per request so they close over the caller. */
  tools?: AgentTool[];
  /**
   * Tools that only attach something to the reply, such as a link or a list the app draws. When a
   * response that has text calls nothing else, they run and the run ends there (playbook § 7).
   */
  closingTools?: string[];
  /** Extra instructions appended after AGENTS.md for this run (never user text). */
  context?: string;
}

export interface AgentMetadata {
  cost: number;
  duration_ms: number;
  /** Every file the agent read, relative to its directory. */
  filesRead: string[];
  /** Every token the model read (cached or not) and wrote, across the run's requests. */
  tokens: number;
}

export type AgentEvent =
  | { type: 'text'; text: string }
  | { type: 'done'; text: string; metadata: AgentMetadata }
  // The run stopped without an answer: error_max_turns, error_max_budget_usd, refusal, max_tokens, …
  | { type: 'error'; text: string; subtype: string; metadata: AgentMetadata };

// ── Files the agent may read: knowledge/ and its own skills, nothing else ────────────────────────

/** `path` inside `root`, symlinks resolved, or null. Never an env file, never `root` itself. */
export function inside(root: string, path: string): string | null {
  if (path.split(/[\\/]/).some((part) => part.startsWith('.env'))) return null;
  try {
    const base = realpathSync(root);
    const real = realpathSync(resolve(base, path));
    const rel = relative(base, real);
    return rel && !rel.startsWith('..') && !isAbsolute(rel) ? real : null;
  } catch {
    return null;
  }
}

/** Every regular file under `dir`, as relative paths; hidden files and symlinks are left out. */
function filesUnder(dir: string, prefix = ''): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .flatMap((d) => {
      if (d.name.startsWith('.')) return [];
      const rel = prefix ? `${prefix}/${d.name}` : d.name;
      return d.isDirectory() ? filesUnder(join(dir, d.name), rel) : d.isFile() ? [rel] : [];
    })
    .sort();
}

function readInside(root: string, path: string, shown: string): string {
  const file = inside(root, path);
  if (!file || !statSync(file).isFile()) throw new ToolError(`There is no file ${shown}.`);
  if (statSync(file).size > MAX_FILE_BYTES) throw new ToolError(`${shown} is over ${MAX_FILE_BYTES / 1024} KB, too large to read whole.`);
  return readFileSync(file, 'utf8');
}

function knowledgeTools(dir: string, filesRead: string[]): AgentTool[] {
  const root = join(dir, KNOWLEDGE);
  if (!existsSync(root)) return [];
  const terms = (query: string) => [...new Set(query.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((t) => t.length > 1))];
  return [
    agentTool({
      name: 'list_files',
      description: 'List the files in knowledge/, the reference files you answer from.',
      input: {},
      run: async () => filesUnder(root).map((f) => `${KNOWLEDGE}/${f}`).join('\n') || 'knowledge/ is empty.',
    }),
    agentTool({
      name: 'read_file',
      description: 'Read one file from knowledge/ in full, by its path as list_files gives it (e.g. knowledge/okrs.md).',
      input: { path: z.string().min(1).max(300) },
      run: async ({ path }) => {
        const rel = path.replace(/\\/g, '/').replace(/^\.?\/?knowledge\//, '');
        const text = readInside(root, rel, path);
        filesRead.push(`${KNOWLEDGE}/${rel}`);
        return text;
      },
    }),
    agentTool({
      name: 'search_files',
      description: 'Find the lines in knowledge/ that contain any of these words, case-insensitively. Returns path:line: text, best matches first.',
      input: { query: z.string().min(2).max(200).describe('A few keywords') },
      run: async ({ query }) => {
        const words = terms(query);
        if (!words.length) throw new ToolError('Give at least one word of two letters or more.');
        const hits = filesUnder(root).flatMap((f) => {
          const file = inside(root, f);
          if (!file || statSync(file).size > MAX_FILE_BYTES) return [];
          return readFileSync(file, 'utf8').split(/\r?\n/).flatMap((line, i) => {
            const score = words.filter((w) => line.toLowerCase().includes(w)).length;
            return score ? [{ score, at: `${KNOWLEDGE}/${f}:${i + 1}: ${line.trim().slice(0, 300)}` }] : [];
          });
        });
        return hits.sort((a, b) => b.score - a.score).slice(0, 40).map((h) => h.at).join('\n') || 'No line matches. list_files shows every file.';
      },
    }),
  ];
}

export interface Skill { name: string; description: string; dir: string }

/** The agent's own skills: `.claude/skills/<name>/SKILL.md`, described by its frontmatter. */
export function discoverSkills(agentDir: string): Skill[] {
  const root = join(agentDir, '.claude', 'skills');
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory() && AGENT_NAME.test(d.name) && existsSync(join(root, d.name, 'SKILL.md')))
    .map((d) => {
      const front = /^---\r?\n([\s\S]*?)\r?\n---/.exec(readFileSync(join(root, d.name, 'SKILL.md'), 'utf8'))?.[1] ?? '';
      const description = /^description:\s*(.+)$/m.exec(front)?.[1].trim().replace(/^(["'])(.*)\1$/, '$2') ?? '';
      return { name: d.name, description, dir: join(root, d.name) };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function skillIndex(skills: Skill[]): string {
  if (!skills.length) return '';
  return [
    '',
    '',
    '## Skills',
    'Each skill holds the instructions for one kind of task. When a task matches one, call load_skill with its name before you start, then follow it.',
    ...skills.map((s) => `- ${s.name}: ${s.description}`),
  ].join('\n');
}

function skillTools(skills: Skill[], filesRead: string[]): AgentTool[] {
  if (!skills.length) return [];
  const names = skills.map((s) => s.name) as [string, ...string[]];
  const skill = (name: string) => skills.find((s) => s.name === name)!;
  const read = (name: string, path: string) => {
    const text = readInside(skill(name).dir, path, `${path} in the ${name} skill`);
    filesRead.push(`.claude/skills/${name}/${path.replace(/\\/g, '/')}`);
    return text;
  };
  return [
    agentTool({
      name: 'load_skill',
      description: 'Load one of your skills: its instructions, and the names of its other files.',
      input: { name: z.enum(names) },
      run: async ({ name }) => {
        const others = filesUnder(skill(name).dir).filter((f) => f !== 'SKILL.md');
        const text = read(name, 'SKILL.md');
        return others.length ? `${text}\n\nOther files in this skill (read them with read_skill_file): ${others.join(', ')}` : text;
      },
    }),
    agentTool({
      name: 'read_skill_file',
      description: 'Read one file of a skill, by the path load_skill listed.',
      input: { name: z.enum(names), path: z.string().min(1).max(300) },
      run: async ({ name, path }) => read(name, path),
    }),
  ];
}

// ── The request and the run ──────────────────────────────────────────────────────────────────────

/**
 * The conversation as the API takes it: it must open with the user, and no turn may be empty.
 * Two user turns in a row (a reply that never finished) are left as they are: the API merges
 * them into one turn (checked 2026-10-24).
 */
export function conversation(prompt: string, history: AskAgentOptions['history'] = []): BetaMessageParam[] {
  const turns = history.filter((m) => m.content.trim() !== '');
  while (turns[0]?.role === 'assistant') turns.shift();
  return [...turns.map(({ role, content }) => ({ role, content })), { role: 'user', content: prompt }];
}

// The request every run sends, minus the conversation. Exported so the contract can be
// unit-tested without a model call. `mcpTools` are the agent's MCP tools, already opened.
export function agentRequest(opts: Omit<AskAgentOptions, 'prompt' | 'history'>, filesRead: string[] = [], mcpTools: AgentTool[] = []) {
  const dir = agentDir(opts.agent);
  const model = opts.model ?? DEFAULT_MODEL;
  if (!PRICES[model]) throw new Error(`No price for model "${model}": add it to PRICES before running it`);
  const skills = discoverSkills(dir);
  const tools = [...(opts.tools ?? []), ...knowledgeTools(dir, filesRead), ...skillTools(skills, filesRead), ...mcpTools.map(guarded)];
  const names = tools.map((t) => t.name);
  const twice = names.find((n, i) => names.indexOf(n) !== i);
  if (twice) throw new Error(`Agent "${opts.agent}" has two tools named "${twice}"`);
  return {
    model,
    max_tokens: MAX_TOKENS,
    // Thinking stays adaptive (the model's default); effort is stated, not left to each model's default.
    output_config: { effort: 'medium' as const },
    ...(FALLBACK_MODELS.has(model) ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const } : {}),
    system: [
      // The breakpoint caches the tools, AGENTS.md and the skill list together: the same for every caller.
      { type: 'text' as const, text: readFileSync(join(dir, INSTRUCTIONS), 'utf8') + skillIndex(skills), cache_control: { type: 'ephemeral' as const } },
      ...(opts.context ? [{ type: 'text' as const, text: opts.context }] : []),
    ],
    // And the conversation so far, so each request in a run reads the one before from cache.
    cache_control: { type: 'ephemeral' as const },
    tools,
  } satisfies Omit<BetaToolRunnerParams, 'messages'>;
}

type Usage = Pick<BetaMessage['usage'], 'input_tokens' | 'output_tokens' | 'cache_creation_input_tokens' | 'cache_read_input_tokens'>;

export function costOf(model: string, usage: Usage): number {
  const price = PRICES[model];
  const cacheWrite = usage.cache_creation_input_tokens ?? 0;
  const cacheRead = usage.cache_read_input_tokens ?? 0;
  const prompt = usage.input_tokens + cacheWrite + cacheRead;
  const r = !price ? UNLISTED : price.long && price.longAbove !== undefined && prompt > price.longAbove ? price.long : price.rates;
  return (usage.input_tokens * r.input + usage.output_tokens * r.output + cacheWrite * r.cacheWrite + cacheRead * r.cacheRead) / 1_000_000;
}

/**
 * Runs one agent to its answer. One `text` event per model response that has text, then `done`,
 * or `error` with the reason the run stopped. A request that fails after the SDK's retries
 * throws. `client` is a seam for tests.
 */
export async function* askAgent(opts: AskAgentOptions, client: Anthropic = agentClient()): AsyncGenerator<AgentEvent> {
  const filesRead: string[] = [];
  const started = Date.now();
  // The agent's MCP servers live for this run only, and are closed however it ends.
  const mcp = existsSync(join(agentDir(opts.agent), '.mcp.json')) ? await openMcpTools(agentDir(opts.agent)) : undefined;
  try {
    const request = agentRequest(opts, filesRead, mcp?.tools);
    const maxTurns = opts.maxTurns ?? 10;
    let fullText = '';
    let cost = 0;
    let tokens = 0;
    let turns = 0;
    const metadata = (): AgentMetadata => ({ cost, duration_ms: Date.now() - started, filesRead, tokens });

    const runner = client.beta.messages.toolRunner({ ...request, messages: conversation(opts.prompt, opts.history) });
    let last: BetaMessage | undefined;
    // Each item is one complete response. The runner runs its tool calls only when the loop asks
    // for the next one, so leaving the loop here means they never run.
    for await (const message of runner) {
      last = message;
      turns += 1;
      cost += costOf(message.model, message.usage);
      const u = message.usage;
      tokens += u.input_tokens + (u.cache_creation_input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0) + u.output_tokens;
      const text = message.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('');
      if (text) {
        fullText += text;
        yield { type: 'text', text };
      }
      if (message.stop_reason !== 'tool_use') continue;
      // Asked again after such a call, Haiku 5.5 repeated its reply in 3 of 27 runs, and in 5 of 18 when
      // told not to (2026-10-24). No request follows, so neither ceiling applies.
      const calls = message.content.flatMap((b) => (b.type === 'tool_use' ? [b.name] : []));
      if (text && opts.closingTools && calls.every((name) => opts.closingTools!.includes(name))) {
        await runner.generateToolResponse();
        yield { type: 'done', text: fullText, metadata: metadata() };
        return;
      }
      // Both ceilings are checked between responses: the response that crosses one is kept, and
      // the tools it asked for are not run.
      if (turns >= maxTurns) {
        yield { type: 'error', text: fullText, subtype: 'error_max_turns', metadata: metadata() };
        return;
      }
      if (opts.maxBudgetUsd !== undefined && cost >= opts.maxBudgetUsd) {
        yield { type: 'error', text: fullText, subtype: 'error_max_budget_usd', metadata: metadata() };
        return;
      }
    }
    const stop = last?.stop_reason;
    if (stop === 'end_turn' || stop === 'stop_sequence') yield { type: 'done', text: fullText, metadata: metadata() };
    else yield { type: 'error', text: fullText, subtype: stop ?? 'no_response', metadata: metadata() };
  } finally {
    await mcp?.close();
  }
}
