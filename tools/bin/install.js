#!/usr/bin/env node

const { spawnSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { resolveSafeRealPath } = require("../lib/symlink-safety");
const { listSkillIdsRecursive, readSkill } = require("../lib/skill-utils");

const REPO = "https://github.com/sickn33/antigravity-awesome-skills.git";
const HOME = process.env.HOME || process.env.USERPROFILE || "";
const INSTALL_MANIFEST_FILE = ".antigravity-install-manifest.json";

function resolveDir(p) {
  if (!p) return null;
  const s = p.replace(/^~($|\/)/, HOME + "$1");
  return path.resolve(s);
}

function parseArgs() {
  const a = process.argv.slice(2);
  let pathArg = null;
  let versionArg = null;
  let tagArg = null;
  let riskArg = null;
  let categoryArg = null;
  let tagsArg = null;
  let cursor = false,
    claude = false,
    gemini = false,
    codex = false,
    antigravity = false,
    kiro = false;

  for (let i = 0; i < a.length; i++) {
    if (a[i] === "--help" || a[i] === "-h") return { help: true };
    if (a[i] === "--path" && a[i + 1]) {
      pathArg = a[++i];
      continue;
    }
    if (a[i] === "--version" && a[i + 1]) {
      versionArg = a[++i];
      continue;
    }
    if (a[i] === "--tag" && a[i + 1]) {
      tagArg = a[++i];
      continue;
    }
    if (a[i] === "--risk" && a[i + 1]) {
      riskArg = a[++i];
      continue;
    }
    if (a[i] === "--category" && a[i + 1]) {
      categoryArg = a[++i];
      continue;
    }
    if (a[i] === "--tags" && a[i + 1]) {
      tagsArg = a[++i];
      continue;
    }
    if (a[i] === "--cursor") {
      cursor = true;
      continue;
    }
    if (a[i] === "--claude") {
      claude = true;
      continue;
    }
    if (a[i] === "--gemini") {
      gemini = true;
      continue;
    }
    if (a[i] === "--codex") {
      codex = true;
      continue;
    }
    if (a[i] === "--antigravity") {
      antigravity = true;
      continue;
    }
    if (a[i] === "--kiro") {
      kiro = true;
      continue;
    }
    if (a[i] === "install") continue;
  }

  return {
    pathArg,
    versionArg,
    tagArg,
    riskArg,
    categoryArg,
    tagsArg,
    cursor,
    claude,
    gemini,
    codex,
    antigravity,
    kiro,
  };
}

function getTargets(opts) {
  const targets = [];
  if (opts.pathArg) {
    return [{ name: "Custom", path: resolveDir(opts.pathArg) }];
  }
  if (opts.cursor) {
    targets.push({ name: "Cursor", path: path.join(HOME, ".cursor", "skills") });
  }
  if (opts.claude) {
    targets.push({ name: "Claude Code", path: path.join(HOME, ".claude", "skills") });
  }
  if (opts.gemini) {
    targets.push({ name: "Gemini CLI", path: path.join(HOME, ".gemini", "skills") });
  }
  if (opts.codex) {
    const codexHome = process.env.CODEX_HOME;
    const codexPath = codexHome
      ? path.join(codexHome, "skills")
      : path.join(HOME, ".codex", "skills");
    targets.push({ name: "Codex CLI", path: codexPath });
  }
  if (opts.kiro) {
    targets.push({ name: "Kiro", path: path.join(HOME, ".kiro", "skills") });
  }
  if (opts.antigravity) {
    targets.push({ name: "Antigravity", path: path.join(HOME, ".gemini", "antigravity", "skills") });
  }
  if (targets.length === 0) {
    targets.push({ name: "Antigravity", path: path.join(HOME, ".gemini", "antigravity", "skills") });
  }
  return targets;
}

function printHelp() {
  console.log(`
antigravity-awesome-skills — installer

  npx antigravity-awesome-skills [install] [options]

  Shallow-clones the skills repo into your agent's skills directory.

Options:
  --cursor       Install to ~/.cursor/skills (Cursor)
  --claude       Install to ~/.claude/skills (Claude Code)
  --gemini       Install to ~/.gemini/skills (Gemini CLI)
  --codex        Install to ~/.codex/skills (Codex CLI)
  --kiro         Install to ~/.kiro/skills (Kiro CLI)
  --antigravity  Install to ~/.gemini/antigravity/skills (Antigravity)
  --path <dir>   Install to <dir> (default: ~/.gemini/antigravity/skills)
  --risk <csv>     Install only skills matching these risk labels
  --category <csv> Install only skills matching these categories
  --tags <csv>     Install only skills matching these tags
  --version <ver>  Clone tag v<ver> (e.g. 4.6.0 -> v4.6.0)
  --tag <tag>      Clone this tag or branch (e.g. v4.6.0)

Examples:
  npx antigravity-awesome-skills
  npx antigravity-awesome-skills --cursor
  npx antigravity-awesome-skills --kiro
  npx antigravity-awesome-skills --antigravity
  npx antigravity-awesome-skills --path .agents/skills --category development,backend --risk safe,none
  npx antigravity-awesome-skills --path .agents/skills --tags debugging,typescript-legacy-
  npx antigravity-awesome-skills --version 4.6.0
  npx antigravity-awesome-skills --path ./my-skills
  npx antigravity-awesome-skills --claude --codex    Install to multiple targets
`);
}

function normalizeFilterValue(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

function parseSelectorArg(raw) {
  const include = [];
  const exclude = [];

  if (typeof raw !== "string" || !raw.trim()) {
    return { include, exclude };
  }

  for (const token of raw.split(",")) {
    const normalized = normalizeFilterValue(token);
    if (!normalized) continue;
    if (normalized.endsWith("-") && normalized.length > 1) {
      exclude.push(normalized.slice(0, -1));
      continue;
    }
    include.push(normalized);
  }

  const excludeValues = uniqueValues(exclude);
  return {
    include: uniqueValues(include).filter((value) => !excludeValues.includes(value)),
    exclude: excludeValues,
  };
}

function hasActiveSelector(selector) {
  return selector.include.length > 0 || selector.exclude.length > 0;
}

function buildInstallSelectors(opts) {
  return {
    risk: parseSelectorArg(opts.riskArg),
    category: parseSelectorArg(opts.categoryArg),
    tags: parseSelectorArg(opts.tagsArg),
  };
}

function hasInstallSelectors(selectors) {
  return Object.values(selectors).some(hasActiveSelector);
}

function matchesScalarSelector(value, selector) {
  const normalized = normalizeFilterValue(value);
  if (normalized && selector.exclude.includes(normalized)) {
    return false;
  }
  if (selector.include.length === 0) {
    return true;
  }
  if (!normalized) {
    return false;
  }
  return selector.include.includes(normalized);
}

function matchesArraySelector(values, selector) {
  const normalizedValues = uniqueValues(
    (Array.isArray(values) ? values : []).map((value) => normalizeFilterValue(value)),
  );

  if (normalizedValues.some((value) => selector.exclude.includes(value))) {
    return false;
  }
  if (selector.include.length === 0) {
    return true;
  }
  return normalizedValues.some((value) => selector.include.includes(value));
}

function matchesInstallSelectors(skill, selectors) {
  return (
    matchesScalarSelector(skill.risk, selectors.risk) &&
    matchesScalarSelector(skill.category, selectors.category) &&
    matchesArraySelector(skill.tags, selectors.tags)
  );
}

function copyRecursiveSync(src, dest, rootDir = src, skipGit = true) {
  const stats = fs.lstatSync(src);
  const resolvedSource = stats.isSymbolicLink()
    ? resolveSafeRealPath(rootDir, src)
    : src;

  if (!resolvedSource) {
    console.warn(`  Skipping symlink outside cloned skills root: ${src}`);
    return;
  }

  const resolvedStats = fs.statSync(resolvedSource);
  if (resolvedStats.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(resolvedSource).forEach((child) => {
      if (skipGit && child === ".git") return;
      copyRecursiveSync(path.join(resolvedSource, child), path.join(dest, child), rootDir, skipGit);
    });
  } else {
    fs.copyFileSync(resolvedSource, dest);
  }
}

/** Copy contents of repo's skills/ into target so each skill is target/skill-name/ (for Claude Code etc.). */
function getInstallEntries(tempDir, selectors = buildInstallSelectors({})) {
  const repoSkills = path.join(tempDir, "skills");
  if (!fs.existsSync(repoSkills)) {
    console.error("Cloned repo has no skills/ directory.");
    process.exit(1);
  }

  const skillEntries = listSkillIdsRecursive(repoSkills);
  const filteredEntries = hasInstallSelectors(selectors)
    ? skillEntries.filter((skillId) => matchesInstallSelectors(readSkill(repoSkills, skillId), selectors))
    : skillEntries;

  if (hasInstallSelectors(selectors) && filteredEntries.length === 0) {
    console.error("No skills matched the requested --risk/--category/--tags filters.");
    process.exit(1);
  }

  const entries = [...filteredEntries];
  if (fs.existsSync(path.join(tempDir, "docs"))) {
    entries.push("docs");
  }
  return entries;
}

function installSkillsIntoTarget(tempDir, target, installEntries) {
  const repoSkills = path.join(tempDir, "skills");
  installEntries.forEach((name) => {
    if (name === "docs") {
      const repoDocs = path.join(tempDir, "docs");
      const docsDest = path.join(target, "docs");
      if (!fs.existsSync(docsDest)) fs.mkdirSync(docsDest, { recursive: true });
      copyRecursiveSync(repoDocs, docsDest, repoDocs);
      return;
    }
    const src = path.join(repoSkills, name);
    const destName = name.startsWith("skills/") ? name.slice("skills/".length) : name;
    const dest = path.join(target, destName);
    copyRecursiveSync(src, dest, repoSkills);
  });
}

function resolveManagedPath(targetPath, entry) {
  const resolvedTargetPath = path.resolve(targetPath);
  const candidate = path.resolve(targetPath, entry);
  const relative = path.relative(resolvedTargetPath, candidate);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return null;
  }
  return candidate;
}

function readInstallManifest(targetPath) {
  const manifestPath = path.join(targetPath, INSTALL_MANIFEST_FILE);
  if (!fs.existsSync(manifestPath)) {
    return [];
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    if (!parsed || !Array.isArray(parsed.entries)) {
      return [];
    }
    return parsed.entries.filter((entry) => typeof entry === "string");
  } catch (error) {
    console.warn(`  Ignoring invalid install manifest at ${manifestPath}`);
    return [];
  }
}

function writeInstallManifest(targetPath, installEntries) {
  const manifestPath = path.join(targetPath, INSTALL_MANIFEST_FILE);
  fs.writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        schemaVersion: 1,
        updatedAt: new Date().toISOString(),
        entries: installEntries.slice().sort(),
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );
}

function pruneRemovedEntries(targetPath, previousEntries, installEntries) {
  const next = new Set(installEntries);
  for (const entry of previousEntries) {
    if (next.has(entry)) {
      continue;
    }
    const candidate = resolveManagedPath(targetPath, entry);
    if (!candidate) {
      console.warn(`  Skipping unsafe managed entry path from manifest: ${entry}`);
      continue;
    }
    fs.rmSync(candidate, { recursive: true, force: true });
    console.log(`  Removed stale managed entry: ${entry}`);
  }
}

function ensureTargetIsDirectory(targetPath) {
  if (!fs.existsSync(targetPath)) {
    return;
  }
  const stats = fs.lstatSync(targetPath);
  if (stats.isDirectory()) {
    return;
  }
  if (stats.isSymbolicLink()) {
    try {
      if (fs.statSync(targetPath).isDirectory()) {
        return;
      }
    } catch (error) {
      // Fall through to the error below for dangling links or non-directory targets.
    }
  }
  console.error(`  Install path exists but is not a directory: ${targetPath}`);
  process.exit(1);
}

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: "inherit", ...opts });
  if (r.status !== 0) process.exit(r.status == null ? 1 : r.status);
}

function buildCloneArgs(repo, tempDir, ref = null) {
  const args = ["clone", "--depth", "1"];
  if (ref) {
    args.push("--branch", ref);
  }
  args.push(repo, tempDir);
  return args;
}

function installForTarget(tempDir, target, selectors = buildInstallSelectors({})) {
  if (fs.existsSync(target.path)) {
    ensureTargetIsDirectory(target.path);
    const gitDir = path.join(target.path, ".git");
    if (fs.existsSync(gitDir)) {
      console.log(`  Migrating from full-repo install to skills-only layout…`);
      const backupPath = `${target.path}_backup_${Date.now()}`;
      try { 
        const stats = fs.lstatSync(target.path);
        const isSymlink = stats.isSymbolicLink();
        const symlinkTarget = isSymlink ? 
        fs.readlinkSync(target.path) : null;
        fs.renameSync(target.path, backupPath);
        console.log(`  ⚠️  Safety Backup created at: ${backupPath}`);
        if (isSymlink) {
          fs.symlinkSync(symlinkTarget, target.path, 'dir');
        } else {
          fs.mkdirSync(target.path, { recursive: true, mode: stats.mode });
        }
      } catch (err) {
        console.error(`  Migration Error: ${err.message}`);
        process.exit(1);
      }
    } else {
      console.log(`  Updating existing install at ${target.path}…`);
    }
  } else {
    const parent = path.dirname(target.path);
    if (!fs.existsSync(parent)) {
      try {
        fs.mkdirSync(parent, { recursive: true });
      } catch (e) {
        console.error(`  Cannot create parent directory: ${parent}`, e.message);
        process.exit(1);
      }
    }
    fs.mkdirSync(target.path, { recursive: true });
  }

  const installEntries = getInstallEntries(tempDir, selectors);
  const previousEntries = readInstallManifest(target.path);
  pruneRemovedEntries(target.path, previousEntries, installEntries);
  installSkillsIntoTarget(tempDir, target.path, installEntries);
  writeInstallManifest(target.path, installEntries);
  console.log(`  ✓ Installed to ${target.path}`);
}

function isOpenCodeStylePath(targetPath) {
  const normalizedPath = path.normalize(targetPath);
  return normalizedPath.endsWith(path.join(".agents", "skills"));
}

function getPostInstallMessages(targets, selectors = buildInstallSelectors({})) {
  const messages = [
    "Pick a bundle in docs/users/bundles.md and use @skill-name in your AI assistant.",
  ];

  if (targets.some((target) => target.name === "Antigravity")) {
    messages.push(
      "If Antigravity hits context/truncation limits, see docs/users/agent-overload-recovery.md",
    );
    messages.push(
      "For clone-based installs, use scripts/activate-skills.sh or scripts/activate-skills.bat",
    );
  }

  if (targets.some((target) => isOpenCodeStylePath(target.path))) {
    const baseMessage =
      "For OpenCode or other .agents/skills installs, prefer a reduced install with --risk, --category, or --tags to avoid context overload.";
    messages.push(baseMessage);
    if (!hasInstallSelectors(selectors)) {
      messages.push(
        "Example: npx antigravity-awesome-skills --path .agents/skills --category development,backend --risk safe,none",
      );
    }
  }

  return messages;
}

function main() {
  const opts = parseArgs();
  const { tagArg, versionArg } = opts;
  const selectors = buildInstallSelectors(opts);
  const ref =
    tagArg ||
    (versionArg
      ? versionArg.startsWith("v")
        ? versionArg
        : `v${versionArg}`
      : null);

  if (opts.help) {
    printHelp();
    return;
  }

  const targets = getTargets(opts);
  if (!targets.length || !HOME) {
    console.error(
      "Could not resolve home directory. Use --path <absolute-path>.",
    );
    process.exit(1);
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "ag-skills-"));
  const originalCwd = process.cwd();

  try {
    console.log("Cloning repository…");
    if (ref) {
      console.log(`Cloning repository at ${ref}…`);
    }
    run("git", buildCloneArgs(REPO, tempDir, ref));

    console.log(`\nInstalling for ${targets.length} target(s):`);
    for (const target of targets) {
      console.log(`\n${target.name}:`);
      installForTarget(tempDir, target, selectors);
    }

    for (const message of getPostInstallMessages(targets, selectors)) {
      console.log(`\n${message}`);
    }
  } finally {
    try {
      if (fs.existsSync(tempDir)) {
        if (fs.rmSync) {
          fs.rmSync(tempDir, { recursive: true, force: true });
        } else {
          fs.rmdirSync(tempDir, { recursive: true });
        }
      }
    } catch (e) {
      // ignore cleanup errors
    }
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  copyRecursiveSync,
  getPostInstallMessages,
  buildCloneArgs,
  buildInstallSelectors,
  getInstallEntries,
  installSkillsIntoTarget,
  installForTarget,
  isOpenCodeStylePath,
  main,
  matchesInstallSelectors,
  parseSelectorArg,
  pruneRemovedEntries,
  readInstallManifest,
  writeInstallManifest,
};
