const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const { createSymlinkOrSkip } = require("./symlink-test-utils");

const repoRoot = path.resolve(__dirname, "../../..");
const telegramScript = path.join(
  repoRoot,
  "skills",
  "telegram-bot-messaging",
  "scripts",
  "telegram.sh",
);
const faviconScript = path.join(
  repoRoot,
  "skills",
  "lovable-cleanup",
  "scripts",
  "write-transparent-favicon.js",
);

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function makeCurlMock(tempDir) {
  const binDir = path.join(tempDir, "bin");
  fs.mkdirSync(binDir);
  const mockPath = path.join(binDir, "curl");
  fs.writeFileSync(
    mockPath,
    `#!/usr/bin/env bash
set -euo pipefail
config=$(cat)
{
  for arg in "$@"; do printf '<%s>' "$arg"; done
  printf '\n'
} >> "$MOCK_ARGV_LOG"
printf '%s\n' "$config" >> "$MOCK_CONFIG_LOG"
method=$(printf '%s' "$config" | sed -n 's#.*[/]\\([^/"]*\\)"$#\\1#p')
case "$method" in
  getUpdates)
    count=0
    [ ! -f "$MOCK_STATE" ] || count=$(cat "$MOCK_STATE")
    count=$((count + 1))
    printf '%s' "$count" > "$MOCK_STATE"
    if [ "$count" -eq 1 ]; then
      printf '%s' '{"ok":true,"result":[]}'
    elif [ "$MOCK_SCENARIO" = private ]; then
      printf '%s' '{"ok":true,"result":[{"update_id":1,"message":{"chat":{"id":111},"from":{"id":111},"text":"Private yes"}}]}'
    elif [ "$MOCK_SCENARIO" = group-text ]; then
      printf '%s' '{"ok":true,"result":[{"update_id":1,"message":{"chat":{"id":-100},"from":{"id":666},"text":"Mallory"}},{"update_id":2,"message":{"chat":{"id":-100},"from":{"id":777},"text":"Approved"}}]}'
    elif [ "$MOCK_SCENARIO" = group-callback ]; then
      printf '%s' '{"ok":true,"result":[{"update_id":1,"callback_query":{"id":"bad","from":{"id":666},"data":"No","message":{"message_id":42,"chat":{"id":-100}}}},{"update_id":2,"callback_query":{"id":"good","from":{"id":777},"data":"Yes","message":{"message_id":42,"chat":{"id":-100}}}}]}'
    else
      printf '%s' '{"ok":true,"result":[]}'
    fi
    ;;
  sendMessage)
    printf '%s' '{"ok":true,"result":{"message_id":42}}'
    ;;
  *)
    printf '%s' '{"ok":true,"result":{}}'
    ;;
esac
`,
    { mode: 0o755 },
  );
  return binDir;
}

function runTelegram(scenario, args, overrides = {}) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "telegram-security-"));
  const binDir = makeCurlMock(tempDir);
  const argvLog = path.join(tempDir, "argv.log");
  const configLog = path.join(tempDir, "config.log");
  const result = spawnSync("bash", [telegramScript, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${binDir}${path.delimiter}${process.env.PATH}`,
      MOCK_ARGV_LOG: argvLog,
      MOCK_CONFIG_LOG: configLog,
      MOCK_SCENARIO: scenario,
      MOCK_STATE: path.join(tempDir, "state"),
      TELEGRAM_BOT_TOKEN: "123456:secret_token",
      TELEGRAM_CHAT_ID: "111",
      TELEGRAM_CONFIG_DIR: path.join(tempDir, "config"),
      ...overrides,
    },
  });
  return {
    result,
    argv: fs.existsSync(argvLog) ? fs.readFileSync(argvLog, "utf8") : "",
    config: fs.existsSync(configLog) ? fs.readFileSync(configLog, "utf8") : "",
  };
}

test("Telegram token-bearing URL is supplied via curl config stdin, not argv", () => {
  const { result, argv, config } = runTelegram("send", ["send", "hello"]);
  assert.equal(result.status, 0, result.stderr);
  assert.doesNotMatch(argv, /123456:secret_token/);
  assert.match(argv, /<--config><->/);
  assert.match(config, /bot123456:secret_token\/sendMessage/);
});

test("Telegram private ask preserves direct-chat approval without extra config", () => {
  const { result } = runTelegram("private", ["ask", "Proceed?", "--timeout", "3"]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), "Private yes");
});

test("Telegram group ask fails closed without an explicit approver allowlist", () => {
  const { result, argv } = runTelegram(
    "group-text",
    ["ask", "Proceed?", "--timeout", "3"],
    { TELEGRAM_CHAT_ID: "-100" },
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /group ask requires TELEGRAM_APPROVER_IDS/);
  assert.equal(argv, "", "validation must happen before the first API request");
});

test("Telegram group text ignores a non-approver and accepts an allowlisted sender", () => {
  const { result } = runTelegram(
    "group-text",
    ["ask", "Proceed?", "--timeout", "3"],
    { TELEGRAM_CHAT_ID: "-100", TELEGRAM_APPROVER_IDS: "777" },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), "Approved");
});

test("Telegram group callback ignores a non-approver and accepts an allowlisted sender", () => {
  const { result } = runTelegram(
    "group-callback",
    ["ask", "Proceed?", "--timeout", "3"],
    { TELEGRAM_CHAT_ID: "-100", TELEGRAM_APPROVER_IDS: "777" },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), "Yes");
});

test("Telegram named group target uses its target-specific approver allowlist", () => {
  const { result } = runTelegram(
    "group-text",
    ["ask", "Proceed?", "--timeout", "3", "--to", "team"],
    { TARGET_TEAM: "-100", APPROVERS_TEAM: "777" },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), "Approved");
});

test("lore mirror contract rejects unsafe targets and preserves allowlisted targets", () => {
  const config = read("skills/lore/references/config.md");
  const mirrors = read("skills/lore/references/platform-mirrors.md");
  assert.match(config, /errors, not warnings/);
  assert.match(mirrors, /before reading,[\s\S]*or writing any target/);
  assert.match(mirrors, /Reject absolute paths/);
  assert.match(mirrors, /Reject any `\.\.`/);
  assert.match(mirrors, /symlink outside the project/);
  assert.match(mirrors, /accept `CLAUDE\.md`, `.github\/copilot-instructions\.md`, and\s+`\.cursor\/rules\/lore\.mdc`/);
  assert.match(mirrors, /Reject `\/tmp\/CLAUDE\.md`, `\.\.\/CLAUDE\.md`/);
});

test("go-in-depth rejects non-string query values without calling trim on them", async () => {
  const source = read("skills/go-in-depth/scripts/workflow-script.js");
  const start = source.indexOf("const RAW_QUESTION");
  const end = source.indexOf("const scope =", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const normalizeAndValidate = new Function(
    "args",
    `return (async () => {\n${source.slice(start, end)}\n})()`,
  );

  assert.equal(await normalizeAndValidate(" research question "), undefined);
  assert.equal(await normalizeAndValidate({ query: " research question " }), undefined);
  for (const args of [{ query: 123 }, null, []]) {
    assert.deepEqual(await normalizeAndValidate(args), {
      error: "No research question provided. Pass it as args: Workflow({name: 'go-in-depth', args: '<question>'}).",
    });
  }
});

test("auto-research shorthand example approves redacted text before WebSearch", () => {
  const skill = read("skills/auto-research/SKILL.md");
  const example = skill.slice(skill.indexOf("### Example 2: Web Search"));
  const proposal = example.indexOf("exact redacted query");
  const approval = example.indexOf("User: Yes, send that query");
  const search = example.indexOf("[WebSearch + WebFetch");
  assert.ok(proposal >= 0, "example must propose an exact redacted query");
  assert.ok(approval > proposal, "approval must follow the proposed boundary");
  assert.ok(search > approval, "external search must occur only after approval");
});

test("canonical security fixes are synchronized to distributed plugin mirrors", () => {
  const mirroredFiles = [
    "lore/SKILL.md",
    "lore/references/config.md",
    "lore/references/platform-mirrors.md",
    "auto-research/SKILL.md",
  ];
  for (const relative of mirroredFiles) {
    const canonical = read(`skills/${relative}`);
    assert.equal(read(`plugins/agentic-awesome-skills/skills/${relative}`), canonical);
    assert.equal(read(`plugins/agentic-awesome-skills-claude/skills/${relative}`), canonical);
  }
  for (const relative of ["SKILL.md", "README.md", "scripts/telegram.sh"]) {
    assert.equal(
      read(`plugins/agentic-awesome-skills-claude/skills/telegram-bot-messaging/${relative}`),
      read(`skills/telegram-bot-messaging/${relative}`),
    );
  }
});

test("BrowserAct never delegates its operating policy to mutable provider guides", () => {
  const skill = read("skills/browser-act/SKILL.md");
  assert.doesNotMatch(skill, /^browser-act get-skills\b/m);
  assert.match(skill, /checked-in Skill remains the complete operating policy/);
  assert.match(skill, /browser-act <subcommand> --help/);
});

test("Agent QA authoring never fetches a moving npm package at runtime", () => {
  const skill = read("skills/agent-qa-authoring/SKILL.md");
  assert.doesNotMatch(skill, /npx\s+--yes\s+agent-qa/);
  assert.match(skill, /already installed/);
  assert.match(skill, /Do not fetch and execute the package at\s+runtime/);
});

test("write-capable PR, cloud, and delegate skills are classified critical", () => {
  const skills = [
    "babysit-pr",
    "atlas-cloud-media",
    "aider-delegate",
    "agy-delegate",
    "claude-delegate",
    "cline-delegate",
    "codex-delegate",
    "commandcode-delegate",
    "copilot-delegate",
    "cursor-delegate",
    "grok-delegate",
    "kimi-delegate",
    "omp-delegate",
    "opencode-delegate",
    "pi-delegate",
    "qoder-delegate",
    "vibe-delegate",
    "warp-delegate",
    "zcode-delegate",
  ];
  for (const skill of skills) {
    assert.match(read(`skills/${skill}/SKILL.md`), /^risk: critical$/m, skill);
  }
});

test("pentest agent reference never pipes a mutable installer to a shell", () => {
  const reference = read("skills/pentest-tools/references/pentest-ai-agents-matrix.md");
  assert.doesNotMatch(reference, /curl[^\n]*install\.sh[^\n]*\|\s*(?:bash|sh|zsh)/i);
  assert.match(reference, /40 位 commit\s+SHA/);
  assert.match(reference, /私有审查目录/);
  assert.match(reference, /获得单独批准/);
});

test("Atlas examples keep sensitive intermediates private and refuse output clobber", () => {
  const skill = read("skills/atlas-cloud-media/SKILL.md");
  assert.match(skill, /umask 077/);
  assert.match(skill, /mktemp -d/);
  assert.match(skill, /chmod 700/);
  assert.match(skill, /trap .*atlas_tmp_dir.* EXIT/);
  assert.doesNotMatch(skill, /\/tmp\/atlas-[A-Za-z0-9_-]+\.json/);
  assert.match(skill, /pwd -P/);
  assert.match(skill, /mktemp "\$atlas_output_dir\/\.atlas-output/);
  assert.match(skill, /ln -- "\$atlas_publish_tmp" "\$atlas_output_path"/);
  assert.doesNotMatch(skill, /mv -n --/);
});

test("favicon helper writes atomically but rejects symlink targets and parents", (t) => {
  const normalRoot = fs.mkdtempSync(path.join(os.tmpdir(), "favicon-normal-"));
  fs.mkdirSync(path.join(normalRoot, "public"));
  const normal = spawnSync(process.execPath, [faviconScript, normalRoot], { encoding: "utf8" });
  assert.equal(normal.status, 0, normal.stderr);
  assert.equal(fs.readFileSync(path.join(normalRoot, "public", "favicon.ico")).length, 70);

  const targetRoot = fs.mkdtempSync(path.join(os.tmpdir(), "favicon-target-link-"));
  fs.mkdirSync(path.join(targetRoot, "public"));
  const outside = path.join(targetRoot, "outside.txt");
  fs.writeFileSync(outside, "unchanged");
  if (!createSymlinkOrSkip(outside, path.join(targetRoot, "public", "favicon.ico"))) {
    t.skip("symlink creation unavailable");
    return;
  }
  const targetResult = spawnSync(process.execPath, [faviconScript, targetRoot], { encoding: "utf8" });
  assert.notEqual(targetResult.status, 0);
  assert.match(targetResult.stderr, /symbolic link/);
  assert.equal(fs.readFileSync(outside, "utf8"), "unchanged");

  const parentRoot = fs.mkdtempSync(path.join(os.tmpdir(), "favicon-parent-link-"));
  const outsideDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "favicon-outside-"));
  if (!createSymlinkOrSkip(outsideDirectory, path.join(parentRoot, "public"), "dir")) {
    t.skip("directory symlink creation unavailable");
    return;
  }
  const parentResult = spawnSync(process.execPath, [faviconScript, parentRoot], { encoding: "utf8" });
  assert.notEqual(parentResult.status, 0);
  assert.match(parentResult.stderr, /real directory/);
  assert.equal(fs.existsSync(path.join(outsideDirectory, "favicon.ico")), false);
});

test("pre-C++20 framing checks the cap before allocating the body", () => {
  const reference = read("skills/boost-asio-pro/references/pre-cpp20.md");
  const decode = reference.indexOf("const std::uint32_t frame_length = ntohl(len_be_)");
  const cap = reference.indexOf("frame_length > max_frame_size", decode);
  const allocate = reference.indexOf("body_.assign", decode);
  assert.ok(decode >= 0 && cap > decode && allocate > cap);
  assert.match(reference.slice(cap, allocate), /socket_\.close/);
});

test("graceful shutdown already releases aborted and finished requests exactly once", () => {
  const skill = read("skills/graceful-shutdown/SKILL.md");
  assert.match(skill, /let counted = true;[\s\S]*if \(!counted\) return;[\s\S]*counted = false;/);
  assert.match(skill, /res\.on\("finish", release\);/);
  assert.match(skill, /res\.on\("close", release\);/);
});

test("Unsloth examples require full immutable model and dataset revisions", () => {
  const skill = read("skills/unsloth-finetuning/SKILL.md");
  const modelCalls = [...skill.matchAll(/FastLanguageModel\.from_pretrained\(([\s\S]*?)\n\)/g)];
  assert.equal(modelCalls.length, (skill.match(/FastLanguageModel\.from_pretrained\(/g) || []).length);
  assert.ok(modelCalls.length >= 3);
  for (const call of modelCalls) assert.match(call[1], /\brevision\s*=\s*model_revision/);

  const datasetCalls = [...skill.matchAll(/load_dataset\(([\s\S]*?)\n\)/g)];
  assert.equal(datasetCalls.length, (skill.match(/load_dataset\(/g) || []).length);
  assert.ok(datasetCalls.length >= 1);
  for (const call of datasetCalls) assert.match(call[1], /\brevision\s*=\s*dataset_revision/);

  assert.match(skill, /\[0-9a-fA-F\]\{40\}/);
  assert.match(skill, /obtain approval before changing[\s\S]*revision/);
  assert.match(skill, /full-commit-pinned local toolchain/);
});
