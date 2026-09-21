#!/usr/bin/env node

/**
 * evaluate.mjs — Inner agent harness.
 *
 * Runs a browsing agent using the raw Anthropic API with a single `execute`
 * tool. The agent calls browse CLI commands to navigate websites. Full trace
 * is captured incrementally and written to disk.
 *
 * Usage: node scripts/evaluate.mjs --task <task-name> [--workspace <dir>] [--env local|remote] [--model <model>] [--run-number N]
 */

import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import * as fs from "node:fs";
import * as path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = path.resolve(__dirname, "..");

// ── Config ─────────────────────────────────────────────────────────

const DEFAULT_MODEL = "claude-sonnet-4-6";
const MAX_TURNS = Number(process.env.MAX_TURNS) || 30;
const MAX_TOKENS = 4096;
const EXEC_TIMEOUT_MS = 30_000;

// Trace artifacts can contain cookies, auth headers, bearer tokens, passwords,
// private URLs, and screenshots of authenticated pages. Restrict them to the
// owner so other local users or processes on a shared host (CI runners, shared
// dev boxes, multi-tenant containers) can't read them. 0700/0600 are
// unaffected by the process umask.
const TRACE_DIR_MODE = 0o700;
const TRACE_FILE_MODE = 0o600;

// Recursively tighten an already-written trace tree to owner-only. Catches
// files created by subprocesses (screenshots from the `browse` CLI, .o11y
// artifacts) whose creation mode we don't control. Symlinks are skipped.
function lockDownTrace(root) {
  let entries;
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const p = path.join(root, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) {
      try { fs.chmodSync(p, TRACE_DIR_MODE); } catch {}
      lockDownTrace(p);
    } else if (entry.isFile()) {
      try { fs.chmodSync(p, TRACE_FILE_MODE); } catch {}
    }
  }
  try { fs.chmodSync(root, TRACE_DIR_MODE); } catch {}
}

// ── Tool definition ────────────────────────────────────────────────

const TOOLS = [
  {
    name: "execute",
    description:
      "Execute a browse CLI command for browser automation.\n\n" +
      "Browse commands:\n" +
      "  browse open <url> --local|--remote — Navigate and choose browser mode\n" +
      "  browse snapshot            — Get accessibility tree; refs look like [0-5] (primary perception)\n" +
      "  browse screenshot --path <path> — Save screenshot to file\n" +
      "  browse click <ref>         — Click element by [X-Y] ref from snapshot\n" +
      "  browse type <text>         — Type into focused element\n" +
      "  browse fill <sel> <value>  — Fill input (clears first — preferred over type)\n" +
      "  browse press <key>         — Keyboard: Enter, Tab, Escape, ArrowRight, ArrowLeft...\n" +
      "  browse mouse scroll <x> <y> <dx> <dy> — Scroll at coords (positive dy scrolls down)\n" +
      "  browse select <sel> <val>  — Select dropdown option\n" +
      "  browse wait load|selector|timeout — Wait for page load, a selector, or a timeout\n" +
      "  browse get url/title/text  — Get page info\n" +
      "  browse mouse drag <x1> <y1> <x2> <y2> — Drag (for sliders)\n" +
      "  browse back/reload/stop    — Navigation/session control\n\n" +
      "Critical: Always `browse snapshot` after every action — refs invalidate on DOM changes.",
    input_schema: {
      type: "object",
      properties: {
        command: {
          type: "string",
          description: "The browse CLI command to execute",
        },
      },
      required: ["command"],
    },
  },
];

// ── CLI args ───────────────────────────────────────────────────────

function getArg(name, fallback) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
  return fallback;
}

function showHelp() {
  console.log(`evaluate.mjs — Inner agent harness for autobrowse skill

Usage: node scripts/evaluate.mjs --task <name> [options]

Options:
  --task <name>        Task name — matches tasks/<name>/ directory (required)
  --workspace <dir>    Workspace root holding tasks/ and traces/ (default: ./autobrowse)
  --env local|remote   Browser environment (default: local)
  --model <model>      Claude model for the inner agent (default: ${DEFAULT_MODEL})
  --run-number N       Force a specific run number (default: auto-increment)
  --connect-url <url>  Browserbase wss connectUrl; when set, every inner browse
                       call is rewritten to attach via --cdp <url> --session
                       autobrowse-main, and browse stop is suppressed. Used by
                       the outer harness when --browser-trace is active so a
                       sibling bb-capture observer can see Network/Console
                       events (the --remote attach path routes those only to
                       the driving client).
  --help               Show this help message

Environment variables:
  ANTHROPIC_API_KEY          Required — Claude API key
  BROWSERBASE_API_KEY        Required for --env remote
  BROWSERBASE_PROJECT_ID     Optional Browserbase project override

Output:
  traces/<task>/run-NNN/summary.md     Decision log and final output
  traces/<task>/run-NNN/trace.json     Full tool call log
  traces/<task>/run-NNN/messages.json  Raw API message history
  traces/<task>/run-NNN/screenshots/   Visual captures

Examples:
  node scripts/evaluate.mjs --task google-flights
  node scripts/evaluate.mjs --task my-portal --env remote
  node scripts/evaluate.mjs --task checkout --model claude-opus-4-6`);
  process.exit(0);
}

function resolveWorkspace() {
  const workspace = path.resolve(getArg("workspace", "autobrowse"));
  return workspace;
}

function getTaskName(workspace) {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    showHelp();
  }

  const task = getArg("task");
  if (!task) {
    console.error("ERROR: --task <name> is required");
    console.error("Usage: node scripts/evaluate.mjs --task google-flights");
    console.error("\nRun with --help for full usage.");
    console.error(`\nAvailable tasks in ${workspace}:`);
    const tasksDir = path.join(workspace, "tasks");
    if (fs.existsSync(tasksDir)) {
      const dirs = fs.readdirSync(tasksDir, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => `  - ${d.name}`);
      console.error(dirs.length > 0 ? dirs.join("\n") : "  (none — create tasks/<name>/task.md)");
    } else {
      console.error("  (no tasks/ directory found — create one via the SKILL.md workflow)");
    }
    process.exit(1);
  }
  return task;
}

function ensureApiKey() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ERROR: ANTHROPIC_API_KEY is not set.");
    console.error("");
    console.error("Set it one of these ways:");
    console.error("  1. export ANTHROPIC_API_KEY=sk-ant-...");
    console.error("  2. Create a .env file in the current directory with:");
    console.error("       ANTHROPIC_API_KEY=sk-ant-...");
    console.error("");
    console.error("Get a key at https://console.anthropic.com/settings/keys");
    process.exit(1);
  }
}

// ── Helpers ─────────────────────────────────────────────────────────

function getNextRunNumber(tracesDir) {
  const n = getArg("run-number");
  if (n) { const num = parseInt(n, 10); if (!isNaN(num)) return num; }
  if (!fs.existsSync(tracesDir)) return 1;
  const dirs = fs.readdirSync(tracesDir).filter((d) => d.startsWith("run-"));
  if (dirs.length === 0) return 1;
  const nums = dirs.map((d) => parseInt(d.replace("run-", ""), 10)).filter((n) => !isNaN(n));
  if (nums.length === 0) return 1;
  return Math.max(...nums) + 1;
}

const ALLOWED_COMMAND = "browse";

function parseCommand(command) {
  const args = [];
  let current = "";
  let quote = null;
  let escaping = false;
  let tokenStarted = false;

  for (const char of command.trim()) {
    if (escaping) {
      current += char;
      escaping = false;
      tokenStarted = true;
      continue;
    }

    if (quote === "'") {
      if (char === "'") {
        quote = null;
      } else {
        current += char;
      }
      tokenStarted = true;
      continue;
    }

    if (quote === "\"") {
      if (char === "\"") {
        quote = null;
      } else if (char === "\\") {
        escaping = true;
      } else {
        current += char;
      }
      tokenStarted = true;
      continue;
    }

    if (char === "'" || char === "\"") {
      quote = char;
      tokenStarted = true;
      continue;
    }

    if (char === "\\") {
      escaping = true;
      tokenStarted = true;
      continue;
    }

    if (/\s/.test(char)) {
      if (tokenStarted) {
        args.push(current);
        current = "";
        tokenStarted = false;
      }
      continue;
    }

    current += char;
    tokenStarted = true;
  }

  if (escaping) {
    return { error: "BLOCKED: command ends with an unfinished escape sequence." };
  }

  if (quote) {
    return { error: "BLOCKED: command has an unclosed quote." };
  }

  if (tokenStarted) {
    args.push(current);
  }

  if (args.length === 0) {
    return { error: "BLOCKED: empty command." };
  }

  return { args };
}

// browse subcommands that drive a page through a local daemon — these need
// the --cdp/--session injection when --connect-url is set. Excludes commands
// that don't touch the daemon (cloud/cdp/status) or that would tear it down
// (stop).
const PAGE_DRIVING_VERBS = new Set([
  "open", "snapshot", "screenshot", "click", "type", "fill", "press", "select",
  "wait", "get", "reload", "back", "forward", "mouse", "tab",
]);

// Per-process local daemon name. Derived from a hash of the connectUrl so two
// evaluate.mjs invocations driving different Browserbase sessions (e.g. SKILL.md
// Step-3 parallel sub-agents) use distinct local daemons and don't collide on
// the "autobrowse-main" socket. crypto.createHash is sync, fast, no deps.
function deriveBrowseSessionName(connectUrl) {
  const hash = crypto.createHash("sha1").update(connectUrl).digest("hex").slice(0, 8);
  return `autobrowse-${hash}`;
}

function rewriteArgsForTrace(args, connectUrl) {
  // No-op when not in trace mode or when the first arg isn't a page-driving
  // verb (cloud, cdp, etc. pass through unchanged).
  if (!connectUrl || args.length === 0) return args;
  const verb = args[0];
  if (!PAGE_DRIVING_VERBS.has(verb)) return args;

  const out = args.slice();
  const hasFlag = (name) => out.some((a, i) => a === name && i > 0);
  // Remove --remote / --local — they'd conflict with --cdp.
  for (let i = out.length - 1; i > 0; i--) {
    if (out[i] === "--remote" || out[i] === "--local") out.splice(i, 1);
  }
  if (!hasFlag("--cdp")) out.push("--cdp", connectUrl);
  if (!hasFlag("--session") && !hasFlag("-s")) out.push("--session", deriveBrowseSessionName(connectUrl));
  return out;
}

function executeCommand(command, connectUrl) {
  // Security: only allow the browse CLI and execute it without a shell so
  // metacharacters are treated as literal arguments instead of extra commands.
  const parsed = parseCommand(command);
  if ("error" in parsed) {
    return { output: parsed.error, error: true, duration_ms: 0 };
  }

  const [executable, ...args] = parsed.args;
  if (executable !== ALLOWED_COMMAND) {
    return { output: `BLOCKED: only browse commands are allowed. Got: ${command.slice(0, 50)}`, error: true, duration_ms: 0 };
  }

  // Suppress `browse stop` under --browser-trace: the outer harness owns the
  // session and daemon; tearing the named daemon down would orphan the trace
  // observer and block the rest of the iteration.
  if (connectUrl && args[0] === "stop") {
    return { output: '{"stopped":true,"suppressed":"browse-trace mode owns the session"}', error: false, duration_ms: 0 };
  }

  const finalArgs = rewriteArgsForTrace(args, connectUrl);

  const start = Date.now();
  try {
    const output = execFileSync(executable, finalArgs, {
      encoding: "utf-8",
      timeout: EXEC_TIMEOUT_MS,
      stdio: ["pipe", "pipe", "pipe"],
      maxBuffer: 1024 * 1024,
    });
    return { output: output.trim(), error: false, duration_ms: Date.now() - start };
  } catch (err) {
    const stderr = typeof err.stderr === "string" ? err.stderr : err.stderr?.toString("utf-8");
    const stdout = typeof err.stdout === "string" ? err.stdout : err.stdout?.toString("utf-8");
    const output = stderr || stdout || err.message || String(err);
    return { output: output.trim(), error: true, duration_ms: Date.now() - start };
  }
}

function buildSystemPrompt(strategy, traceDir, browseEnv, connectUrl) {
  // Under --browser-trace (connectUrl set), the outer harness owns the
  // Browserbase session and a sibling bb-capture observer is attached. Every
  // browse call is rewritten by executeCommand to attach via
  // --cdp $connectUrl --session autobrowse-main, and `browse stop` is a no-op.
  // The inner agent must NOT pass --remote/--local or run browse stop.
  const openFlag = connectUrl ? "" : (browseEnv === "remote" ? "--remote" : "--local");
  const envDesc = connectUrl
    ? `**Traced session managed by the outer harness.** Do not run \`browse stop\`. Do not pass \`--remote\` or \`--local\` — the harness routes every browse call through the trace-attached connection automatically. Just write \`browse open <url>\`, \`browse snapshot\`, etc.`
    : (browseEnv === "remote"
    ? `Use **remote mode** (Browserbase) — Browserbase Identity, Verified browsers, CAPTCHA solving, residential proxies:
\`\`\`
browse stop
browse open <url> --remote
\`\`\`
Run \`browse stop\` first when a prior daemon may be active; active sessions do not switch between local and remote automatically.`
    : `Use **local mode** — runs on local Chrome:
\`\`\`
browse open <url> --local
\`\`\``);

  return `You are a browser automation agent. You navigate websites using the browse CLI via the execute tool.

# Browser Automation via Browse CLI

All browser interaction happens through the \`browse\` command, run via the execute tool.

## Environment

${envDesc}

## Commands

### Navigation
- \`browse open <url> ${openFlag}\` — Go to URL
- \`browse reload\` — Reload page
- \`browse back\` / \`browse forward\` — History navigation

### Page State (prefer snapshot over screenshot)
- \`browse snapshot\` — Get accessibility tree. Each element has a ref in \`[X-Y]\` format (e.g. \`[0-5]\`, \`[2-147]\`). This is your PRIMARY perception tool.
- \`browse screenshot --path ${traceDir}/screenshots/step-NN.png\` — Save visual screenshot (for debugging only)
- \`browse get url\` / \`browse get title\` — Page info
- \`browse get text <selector>\` — Get text content ("body" for all)
- \`browse get value <selector>\` — Get form field value

### Interaction
- \`browse click [X-Y]\` — Click element by ref from the latest snapshot. Pass the ref EXACTLY as it appears in the tree, including brackets (e.g. \`browse click [2-147]\`).
- \`browse type <text>\` — Type text into focused element
- \`browse fill <selector> <value>\` — Fill input without pressing Enter (clears existing text — PREFERRED over type)
- \`browse fill <selector> <value> --press-enter\` — Fill input and press Enter
- \`browse select <selector> <values...>\` — Select dropdown option(s)
- \`browse press <key>\` — Press key: Enter, Tab, Escape, ArrowRight, ArrowLeft, ArrowUp, ArrowDown, Cmd+A
- \`browse mouse drag <fromX> <fromY> <toX> <toY>\` — Drag (useful for sliders)
- \`browse mouse scroll <x> <y> <deltaX> <deltaY>\` — Scroll at coords (positive dy scrolls down)
- \`browse wait load\` — Wait for page to finish loading
- \`browse wait timeout <ms>\` — Wait a fixed amount of time for spinners or animations
- \`browse wait selector "<selector>"\` — Wait for an element to become visible (or use \`--state\`)

### Session
- \`browse stop\` — Close browser
- \`browse status\` — Check daemon status
- \`browse tab list\` — List open tabs
- \`browse tab switch <index-or-target-id>\` — Switch tabs

## Workflow Pattern
1. \`browse stop\` — clean up any previous run
2. \`browse open <url> ${openFlag}\` — navigate to page in ${browseEnv} mode
3. \`browse snapshot\` — read accessibility tree; refs appear as \`[X-Y]\`
4. \`browse click [X-Y]\` / \`browse fill <sel> <val>\` / \`browse press <key>\` — interact using refs
5. \`browse snapshot\` — confirm action worked (refs invalidate after DOM changes!)
6. Repeat 4-5 until done
7. \`browse stop\` — clean up

## Critical Rules
1. **Start clean when needed** — if a daemon may already be active, run \`browse stop\` before \`browse open <url> ${openFlag}\`
2. **ALWAYS snapshot after every action** — refs like \`[0-5]\` invalidate when the DOM changes
3. **Use fill, not type, for input fields** — fill clears existing text first
4. **Use refs from the LATEST snapshot only** — old refs are stale
5. **Never invent refs.** If you haven't seen \`[X-Y]\` in the snapshot output, it doesn't exist. Snapshot first, then click.
6. **Save screenshots at key decision points** — \`browse screenshot --path ${traceDir}/screenshots/step-NN.png\`
7. **When an action fails**, run \`browse snapshot\` to see current state and try a different approach
8. **When done, output your final answer as a JSON code block**

## Troubleshooting
- **Action fails / element not found**: Run \`browse snapshot\` to see available elements
- **Page seems empty**: Try \`browse wait timeout 1000\` then \`browse snapshot\`; if you know the target element, use \`browse wait selector "<selector>"\`
- **Dropdown didn't open**: Wait briefly, then snapshot to check
- **Slider won't move with click**: Use \`browse press ArrowRight\` / \`browse press ArrowLeft\` after clicking the slider thumb

# Current Navigation Strategy

The following strategy has been learned from previous iterations. Follow these guidelines:

${strategy}

# Important
- Your goal is to complete the task and return the result as a JSON code block.
- Save screenshots to: ${traceDir}/screenshots/
- If you get stuck on an approach, try something different rather than repeating the same failing action.
`;
}

// ── Main agent loop ────────────────────────────────────────────────

async function main() {
  const workspace = resolveWorkspace();
  const taskName = getTaskName(workspace);
  ensureApiKey();

  const model = getArg("model", DEFAULT_MODEL);
  const taskDir = path.join(workspace, "tasks", taskName);
  const tracesDir = path.join(workspace, "traces", taskName);

  const taskFile = path.join(taskDir, "task.md");
  const strategyFile = path.join(taskDir, "strategy.md");

  if (!fs.existsSync(taskFile)) {
    console.error(`ERROR: ${path.relative(process.cwd(), taskFile)} not found.`);
    console.error(`Create it from the template: ${path.join(SKILL_DIR, "references/example-task.md")}`);
    process.exit(1);
  }
  if (!fs.existsSync(strategyFile)) {
    fs.mkdirSync(taskDir, { recursive: true });
    fs.writeFileSync(strategyFile, `# ${taskName} Navigation Skill\n\n(This will grow as the agent learns through iterations)\n`);
    console.error(`Created empty strategy.md for task "${taskName}"`);
  }

  const browseEnv = getArg("env", "local");
  const connectUrl = getArg("connect-url");
  if (connectUrl && browseEnv !== "remote") {
    console.error("ERROR: --connect-url requires --env remote");
    process.exit(1);
  }
  const client = new Anthropic();
  const runNumber = getNextRunNumber(tracesDir);
  const runId = `run-${String(runNumber).padStart(3, "0")}`;
  const traceDir = path.join(tracesDir, runId);

  fs.mkdirSync(path.join(traceDir, "screenshots"), { recursive: true, mode: TRACE_DIR_MODE });
  // mkdirSync's mode only applies to dirs it creates; ensure the run dir is
  // locked down even if a parent already existed with looser perms.
  fs.chmodSync(traceDir, TRACE_DIR_MODE);

  const strategy = fs.readFileSync(strategyFile, "utf-8");
  const task = fs.readFileSync(taskFile, "utf-8");
  const systemPrompt = buildSystemPrompt(strategy, traceDir, browseEnv, connectUrl);

  console.error(`\n${"=".repeat(60)}`);
  console.error(`  AUTOBROWSE — ${taskName} — Run ${runNumber}`);
  console.error(`${"=".repeat(60)}`);
  console.error(`Model: ${model} | Env: ${browseEnv}${connectUrl ? " (traced)" : ""} | Max turns: ${MAX_TURNS} | Trace: ${traceDir}\n`);

  const trace = [];
  const messages = [
    { role: "user", content: task },
  ];

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let turn = 0;
  let lastAssistantText = "";
  let runStatus = "max_turns";
  let finalStopReason = null;
  const startTime = Date.now();

  while (turn < MAX_TURNS) {
    turn++;

    const response = await client.messages.create({
      model,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      tools: TOOLS,
      messages,
    });

    totalInputTokens += response.usage.input_tokens;
    totalOutputTokens += response.usage.output_tokens;

    const toolUseBlocks = [];
    let assistantText = "";

    for (const block of response.content) {
      if (block.type === "text") {
        assistantText += block.text;
      }
      if (block.type === "tool_use") {
        toolUseBlocks.push(block);
      }
    }

    if (assistantText) {
      lastAssistantText = assistantText;
      const short = assistantText.slice(0, 200).replace(/\n/g, " ");
      console.error(`  [${turn}] reasoning: ${short}${assistantText.length > 200 ? "..." : ""}`);
      trace.push({
        turn,
        timestamp: new Date().toISOString(),
        role: "assistant",
        reasoning: assistantText,
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
      });
    }

    if (response.stop_reason === "end_turn") {
      console.error(`  [${turn}] done (${response.stop_reason})`);
      messages.push({ role: "assistant", content: response.content });
      runStatus = "completed";
      finalStopReason = response.stop_reason;
      break;
    }

    if (toolUseBlocks.length === 0) {
      finalStopReason = response.stop_reason ?? "unknown";
      runStatus = response.stop_reason === "max_tokens" ? "truncated" : "incomplete";
      console.error(`  [${turn}] incomplete (${finalStopReason})`);
      messages.push({ role: "assistant", content: response.content });
      break;
    }

    const toolResults = [];

    for (const toolUse of toolUseBlocks) {
      const command = toolUse.input.command;
      const isSnapshot = command.includes("browse snapshot");
      const isScreenshot = command.includes("browse screenshot");

      console.error(`  [${turn}] exec: ${command.slice(0, 120)}`);

      const { output, error, duration_ms } = executeCommand(command, connectUrl);

      if (error) {
        console.error(`  [${turn}] error: ${output.slice(0, 100)}`);
      } else if (isSnapshot) {
        const refCount = (output.match(/\[\d+-\d+\]/g) || []).length;
        console.error(`  [${turn}] snapshot: ${refCount} refs (${duration_ms}ms)`);
      } else if (isScreenshot) {
        console.error(`  [${turn}] screenshot saved (${duration_ms}ms)`);
      } else {
        console.error(`  [${turn}] ok: ${output.slice(0, 100)} (${duration_ms}ms)`);
      }

      trace.push({
        turn,
        timestamp: new Date().toISOString(),
        role: "assistant",
        tool_name: "execute",
        tool_input: { command },
      });
      trace.push({
        turn,
        timestamp: new Date().toISOString(),
        role: "tool_result",
        command,
        output,
        error,
        duration_ms,
      });

      toolResults.push({
        type: "tool_result",
        tool_use_id: toolUse.id,
        content: output.slice(0, 50_000),
        is_error: error,
      });
    }

    messages.push({ role: "assistant", content: response.content });
    messages.push({ role: "user", content: toolResults });

    // Write trace incrementally
    fs.writeFileSync(path.join(traceDir, "trace.json"), JSON.stringify(trace, null, 2), { mode: TRACE_FILE_MODE });
  }

  // ── Write final artifacts ──────────────────────────────────────
  const durationSec = (Date.now() - startTime) / 1000;
  const pricing = {
    "claude-opus-4-6": [5, 25],
    "claude-sonnet-4-6": [3, 15],
    "claude-haiku-4-5-20251001": [1, 5],
  };
  const [inputRate, outputRate] = pricing[model] ?? [3, 15];
  const costUsd = (totalInputTokens * inputRate + totalOutputTokens * outputRate) / 1_000_000;

  const summaryLines = [
    `# ${taskName} — Run ${runId} Summary`,
    "",
    `**Status:** ${runStatus}${finalStopReason ? ` (${finalStopReason})` : ""}`,
    `**Duration:** ${durationSec.toFixed(1)}s | **Turns:** ${turn} | **Cost:** ~$${costUsd.toFixed(2)}`,
    `**Tokens:** ${totalInputTokens.toLocaleString()} in / ${totalOutputTokens.toLocaleString()} out`,
    "",
    "## Decision Log",
    "",
  ];

  for (const entry of trace) {
    if (entry.role === "assistant" && entry.reasoning) {
      const short = entry.reasoning.slice(0, 150).replace(/\n/g, " ");
      summaryLines.push(`Turn ${entry.turn}: [reasoning] "${short}${entry.reasoning.length > 150 ? "..." : ""}"`);
    }
    if (entry.role === "assistant" && entry.tool_name) {
      summaryLines.push(`Turn ${entry.turn}: [execute] \`${entry.tool_input?.command}\``);
    }
    if (entry.role === "tool_result") {
      const isSnapshot = entry.command?.includes("snapshot");
      const isError = entry.error;
      if (isError) {
        summaryLines.push(`Turn ${entry.turn}: [error] ${entry.output?.slice(0, 100)}`);
      } else if (isSnapshot) {
        const refs = (entry.output?.match(/\[\d+-\d+\]/g) || []).length;
        summaryLines.push(`Turn ${entry.turn}: [snapshot] ${refs} refs (${entry.duration_ms}ms)`);
      } else {
        summaryLines.push(`Turn ${entry.turn}: [result] ${entry.output?.slice(0, 100)} (${entry.duration_ms}ms)`);
      }
    }
  }

  if (lastAssistantText) {
    summaryLines.push("", "## Agent Final Output", "", lastAssistantText);
  }

  const summary = summaryLines.join("\n");

  fs.writeFileSync(path.join(traceDir, "summary.md"), summary, { mode: TRACE_FILE_MODE });
  fs.writeFileSync(path.join(traceDir, "trace.json"), JSON.stringify(trace, null, 2), { mode: TRACE_FILE_MODE });
  fs.writeFileSync(path.join(traceDir, "messages.json"), JSON.stringify(messages, null, 2), { mode: TRACE_FILE_MODE });

  // Lock down everything under the run dir, including artifacts written by
  // subprocesses (screenshots, .o11y) whose creation mode we don't control.
  lockDownTrace(traceDir);

  // Update latest symlink
  const latestLink = path.join(tracesDir, "latest");
  try {
    try {
      fs.unlinkSync(latestLink);
    } catch (err) {
      if (err.code !== "ENOENT") throw err;
    }
    fs.symlinkSync(runId, latestLink);
  } catch (err) {
    console.warn(`Warning: failed to update latest symlink: ${err.message}`);
  }

  // Structured summary to stdout (data), diagnostics already went to stderr
  const result = {
    task: taskName,
    run: runId,
    status: runStatus,
    stop_reason: finalStopReason ?? (runStatus === "max_turns" ? "max_turns" : null),
    duration_sec: parseFloat(durationSec.toFixed(1)),
    cost_usd: parseFloat(costUsd.toFixed(2)),
    turns: turn,
    tokens_in: totalInputTokens,
    tokens_out: totalOutputTokens,
    trace_dir: traceDir,
  };
  console.log(JSON.stringify(result));
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
