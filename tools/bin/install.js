#!/usr/bin/env node

const { spawnSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const os = require("os");
const sanitizeFilename = require("sanitize-filename");
const { getRealPath, isPathInside, resolveSafeRealPath } = require("../lib/symlink-safety");
const { listSkillIdsRecursive, readSkill } = require("../lib/skill-utils");
const packageMetadata = require("../../package.json");

const REPO = "https://github.com/sickn33/agentic-awesome-skills.git";
const HOME = process.env.HOME || process.env.USERPROFILE || "";
const INSTALL_MANIFEST_FILE = ".antigravity-install-manifest.json";
const DEFAULT_RELEASE_REF = packageMetadata.version ? `v${packageMetadata.version}` : null;

function resolveDir(p) {
  if (!p) return null;
  const s = p.replace(/^~($|\/)/, HOME + "$1");
  const root = path.isAbsolute(s) ? path.parse(path.resolve(s)).root : process.cwd();
  const sanitizedSegments = path
    .resolve(s)
    .slice(path.parse(path.resolve(s)).root.length)
    .split(path.sep)
    .filter(Boolean)
    .map((segment) => {
      const sanitized = sanitizeFilename(segment);
      if (sanitized !== segment || !sanitized) {
        throw new Error(`Unsafe path segment: ${segment}`);
      }
      return sanitized;
    });
  return path.resolve(root, ...sanitizedSegments);
}

function parseArgs(argv = process.argv.slice(2)) {
  const a = argv;
  let pathArg = null;
  let versionArg = null;
  let tagArg = null;
  let riskArg = null;
  let categoryArg = null;
  let tagsArg = null;
  let skillsArg = null;
  let versionInfo = false;
  let dryRun = false;
  let cursor = false,
    claude = false,
    gemini = false,
    codex = false,
    antigravity = false,
    agy = false,
    kiro = false;

  for (let i = 0; i < a.length; i++) {
    if (a[i] === "--help" || a[i] === "-h") return { help: true };
    if (a[i] === "--version") {
      versionInfo = true;
      continue;
    }
    if (["--path", "--release", "--tag", "--risk", "--category", "--tags", "--skills"].includes(a[i])) {
      const value = a[i + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`Option ${a[i]} requires a value.`);
      }
      if (a[i] === "--path") pathArg = value;
      if (a[i] === "--release") versionArg = value;
      if (a[i] === "--tag") tagArg = value;
      if (a[i] === "--risk") riskArg = value;
      if (a[i] === "--category") categoryArg = value;
      if (a[i] === "--tags") tagsArg = value;
      if (a[i] === "--skills") skillsArg = value;
      i += 1;
      continue;
    }
    if (a[i] === "--dry-run") {
      dryRun = true;
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
    if (a[i] === "--agy") {
      agy = true;
      continue;
    }
    if (a[i] === "--kiro") {
      kiro = true;
      continue;
    }
    if (a[i] === "install") continue;
    throw new Error(`Unknown option or command: ${a[i]}`);
  }

  return {
    pathArg,
    versionArg,
    tagArg,
    riskArg,
    categoryArg,
    tagsArg,
    skillsArg,
    versionInfo,
    dryRun,
    cursor,
    claude,
    gemini,
    codex,
    antigravity,
    agy,
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
    targets.push({ name: "Antigravity", path: path.join(HOME, ".agents", "skills") });
  }
  if (opts.agy) {
    targets.push({
      name: "Antigravity CLI",
      path: path.join(HOME, ".gemini", "antigravity-cli", "skills"),
    });
  }
  if (targets.length === 0) {
    targets.push({ name: "Antigravity", path: path.join(HOME, ".agents", "skills") });
  }
  return targets;
}

function printHelp() {
  console.log(`
agentic-awesome-skills — installer

  npx agentic-awesome-skills [install] [options]

  Shallow-clones the skills repo into your agent's skills directory.

Options:
  --cursor       Install to ~/.cursor/skills (Cursor)
  --claude       Install to ~/.claude/skills (Claude Code)
  --gemini       Install to ~/.gemini/skills (Gemini CLI)
  --codex        Install to ~/.codex/skills (Codex CLI)
  --kiro         Install to ~/.kiro/skills (Kiro CLI)
  --antigravity  Install to ~/.agents/skills (Antigravity IDE / OpenCode-style layout)
  --agy          Install to ~/.gemini/antigravity-cli/skills (Antigravity CLI slash commands)
  --path <dir>   Install to <dir> (default: ~/.agents/skills)
  --risk <csv>     Install only skills matching these risk labels
  --category <csv> Install only skills matching these categories
  --tags <csv>     Install only skills matching these tags
  --skills <csv>   Set exact managed skill names, ids, or nested skill paths
  --dry-run        Preview installs/updates/removals for every target without writing
  --version        Print the installer version
  --release <ver>  Clone tag v<ver> (e.g. 4.6.0 -> v4.6.0)
  --tag <tag>      Clone this tag or branch (e.g. v4.6.0, main)

Examples:
  npx agentic-awesome-skills
  npx agentic-awesome-skills --cursor
  npx agentic-awesome-skills --kiro
  npx agentic-awesome-skills --antigravity
  npx agentic-awesome-skills --agy
  npx agentic-awesome-skills --path .agents/skills --category development,backend --risk safe,none
  npx agentic-awesome-skills --path .agents/skills --tags debugging,typescript-legacy-
  npx agentic-awesome-skills --codex --skills frontend-design,game-development/2d-games --dry-run
  npx agentic-awesome-skills --release 4.6.0
  npx agentic-awesome-skills --path ./my-skills
  npx agentic-awesome-skills --claude --codex    Install to multiple targets
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

function parseExactSkillArg(raw) {
  if (typeof raw !== "string" || !raw.trim()) {
    return [];
  }

  const values = raw.split(",").map((value) => value.trim());
  if (values.some((value) => !value)) {
    throw new Error("--skills must be a comma-separated list of non-empty exact skill names, ids, or paths.");
  }

  return uniqueValues(values);
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

function assertSafeDestinationPath(dest, destRoot) {
  const rootPath = path.resolve(destRoot);
  const destPath = path.resolve(dest);
  const relative = path.relative(rootPath, destPath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Refusing destination outside install root: ${dest}`);
  }

  if (fs.existsSync(rootPath) && fs.lstatSync(rootPath).isSymbolicLink()) {
    throw new Error(`Refusing symlinked install root: ${destRoot}`);
  }

  const realRoot = fs.existsSync(rootPath) ? getRealPath(rootPath) : rootPath;
  let current = rootPath;
  for (const part of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    if (!fs.existsSync(current)) {
      break;
    }
    if (fs.lstatSync(current).isSymbolicLink()) {
      throw new Error(`Refusing unsafe destination symlink component: ${current}`);
    }
    if (!isPathInside(realRoot, getRealPath(current))) {
      throw new Error(`Refusing destination outside install root: ${current}`);
    }
  }
}

function copyRecursiveSync(
  src,
  dest,
  rootDir = src,
  skipGit = true,
  destRoot = dest,
  selectedSkillEntries = null,
) {
  const stats = fs.lstatSync(src);
  const resolvedSource = stats.isSymbolicLink()
    ? resolveSafeRealPath(rootDir, src)
    : src;

  if (!resolvedSource) {
    console.warn(`  Skipping symlink outside cloned skills root: ${src}`);
    return;
  }

  const resolvedStats = fs.statSync(resolvedSource);
  const relativeSource = path.relative(rootDir, resolvedSource);
  if (
    selectedSkillEntries &&
    relativeSource &&
    relativeSource !== "." &&
    resolvedStats.isDirectory() &&
    fs.existsSync(path.join(resolvedSource, "SKILL.md")) &&
    !selectedSkillEntries.has(path.normalize(relativeSource))
  ) {
    return;
  }
  if (fs.existsSync(dest) && fs.lstatSync(dest).isSymbolicLink()) {
    throw new Error(`Skipping unsafe destination symlink: ${dest}`);
  }
  assertSafeDestinationPath(dest, destRoot);
  if (resolvedStats.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    const dir = fs.opendirSync(resolvedSource);
    try {
      for (;;) {
        const child = dir.readSync();
        if (!child) break;
        if (skipGit && child.name === ".git") continue;
        copyRecursiveSync(
          path.join(resolvedSource, child.name),
          path.join(dest, child.name),
          rootDir,
          skipGit,
          destRoot,
          selectedSkillEntries,
        );
      }
    } finally {
      dir.closeSync();
    }
  } else {
    fs.cpSync(resolvedSource, dest);
  }
}

function replaceManagedEntry(
  src,
  dest,
  rootDir,
  skipGit,
  targetRoot,
  selectedSkillEntries = null,
) {
  if (!fs.existsSync(targetRoot)) {
    fs.mkdirSync(targetRoot, { recursive: true });
  }
  assertSafeDestinationPath(dest, targetRoot);
  const stageRoot = fs.mkdtempSync(path.join(targetRoot, ".antigravity-stage-"));
  const stagedEntry = path.join(stageRoot, "entry");
  const backupEntry = path.join(stageRoot, "previous");
  let movedPreviousEntry = false;

  try {
    copyRecursiveSync(
      src,
      stagedEntry,
      rootDir,
      skipGit,
      stageRoot,
      selectedSkillEntries,
    );
    if (!fs.existsSync(stagedEntry)) {
      throw new Error(`Unable to stage managed install entry: ${src}`);
    }

    if (fs.existsSync(dest)) {
      assertSafeDestinationPath(dest, targetRoot);
      fs.renameSync(dest, backupEntry);
      movedPreviousEntry = true;
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.renameSync(stagedEntry, dest);
    if (movedPreviousEntry) {
      fs.rmSync(backupEntry, { recursive: true, force: true });
    }
  } catch (error) {
    if (movedPreviousEntry && fs.existsSync(backupEntry) && !fs.existsSync(dest)) {
      fs.renameSync(backupEntry, dest);
    }
    throw error;
  } finally {
    fs.rmSync(stageRoot, { recursive: true, force: true });
  }
}

/** Copy contents of repo's skills/ into target so each skill is target/skill-name/ (for Claude Code etc.). */
function resolveExactSkillSelections(repoSkills, skillEntries, requestedSkills = []) {
  if (requestedSkills.length === 0) {
    return null;
  }

  const skills = skillEntries.map((skillId) => readSkill(repoSkills, skillId));
  const resolvedEntries = new Set();

  for (const requestedSkill of requestedSkills) {
    const matches = skills.filter((skill) => (
      skill.name === requestedSkill ||
      skill.id === requestedSkill ||
      path.basename(skill.id) === requestedSkill
    ));

    if (matches.length === 0) {
      throw new Error(`Unknown skill requested by --skills: ${requestedSkill}`);
    }
    if (matches.length > 1) {
      throw new Error(
        `Ambiguous skill requested by --skills: ${requestedSkill}. Use one exact nested skill path: ${matches.map((skill) => skill.id).join(", ")}`,
      );
    }

    resolvedEntries.add(matches[0].id);
  }

  return resolvedEntries;
}

function getInstallEntries(tempDir, selectors = buildInstallSelectors({}), requestedSkills = []) {
  const repoSkills = path.join(tempDir, "skills");
  if (!fs.existsSync(repoSkills)) {
    throw new Error("Cloned repo has no skills/ directory.");
  }

  const skillEntries = listSkillIdsRecursive(repoSkills);
  const selectedEntries = resolveExactSkillSelections(repoSkills, skillEntries, requestedSkills);
  const filteredEntries = skillEntries.filter((skillId) => (
    (!selectedEntries || selectedEntries.has(skillId)) &&
    (!hasInstallSelectors(selectors) || matchesInstallSelectors(readSkill(repoSkills, skillId), selectors))
  ));

  if ((selectedEntries || hasInstallSelectors(selectors)) && filteredEntries.length === 0) {
    throw new Error("No skills matched the requested --skills/--risk/--category/--tags selection.");
  }

  const entries = [...filteredEntries];
  if (fs.existsSync(path.join(tempDir, "docs"))) {
    entries.push("docs");
  }
  return entries;
}

function installSkillsIntoTarget(tempDir, target, installEntries) {
  const repoSkills = path.join(tempDir, "skills");
  const selectedSkillEntries = new Set(
    installEntries
      .filter((entry) => entry !== "docs")
      .map(normalizeSourceEntry),
  );
  installEntries.forEach((name) => {
    const destName = normalizeInstallEntry(name);
    if (destName === "docs") {
      const repoDocs = path.join(tempDir, "docs");
      const docsDest = path.join(target, "docs");
      replaceManagedEntry(repoDocs, docsDest, repoDocs, true, target);
      return;
    }
    const src = path.join(repoSkills, normalizeSourceEntry(name));
    const dest = path.join(target, destName);
    replaceManagedEntry(src, dest, repoSkills, true, target, selectedSkillEntries);
  });
}

function normalizeInstallEntry(entry) {
  if (entry === "docs") {
    return entry;
  }
  const normalized = typeof entry === "string" && entry.startsWith("skills/")
    ? entry.slice("skills/".length)
    : entry;
  if (typeof normalized !== "string") {
    return normalized;
  }
  const parts = normalized.split(/[\\/]+/);
  if (
    path.isAbsolute(normalized) ||
    /[\\/]{2,}/.test(normalized) ||
    parts.some((part) => !part || part === "." || part === "..")
  ) {
    throw new Error(`Unsafe install entry: ${entry}`);
  }
  return parts.join(path.sep);
}

function normalizeSourceEntry(entry) {
  if (entry === "docs") {
    return entry;
  }
  if (typeof entry !== "string") {
    return entry;
  }
  const parts = entry.split(/[\\/]+/);
  if (
    path.isAbsolute(entry) ||
    /[\\/]{2,}/.test(entry) ||
    parts.some((part) => !part || part === "." || part === "..")
  ) {
    throw new Error(`Unsafe install source entry: ${entry}`);
  }
  return parts.join(path.sep);
}

function getManagedEntries(installEntries, target = {}) {
  return installEntries.map(normalizeInstallEntry);
}

function resolveManagedPath(targetPath, entry) {
  const normalizedEntry = normalizeInstallEntry(entry);
  const resolvedTargetPath = path.resolve(targetPath);
  const candidate = path.resolve(targetPath, normalizedEntry);
  const relative = path.relative(resolvedTargetPath, candidate);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return null;
  }
  return candidate;
}

function resolveInstallManifestPath(targetPath) {
  const manifestPath = path.join(targetPath, INSTALL_MANIFEST_FILE);
  assertSafeDestinationPath(manifestPath, targetPath);
  return manifestPath;
}

function readInstallManifest(targetPath) {
  const manifestPath = resolveInstallManifestPath(targetPath);
  if (!fs.existsSync(manifestPath)) {
    return [];
  }
  let fd = null;
  try {
    fd = fs.openSync(manifestPath, "r");
    const parsed = JSON.parse(fs.readFileSync(fd, "utf8"));
    if (!parsed || !Array.isArray(parsed.entries)) {
      return [];
    }
    return parsed.entries.filter((entry) => typeof entry === "string");
  } catch (error) {
    console.warn(`  Ignoring invalid install manifest at ${manifestPath}`);
    return [];
  } finally {
    if (fd !== null) {
      fs.closeSync(fd);
    }
  }
}

function normalizeManifestEntries(entries) {
  const normalized = [];
  const invalid = [];
  for (const entry of entries) {
    try {
      normalized.push(normalizeInstallEntry(entry));
    } catch (error) {
      invalid.push(entry);
    }
  }
  return {
    entries: uniqueValues(normalized).sort(),
    invalid: uniqueValues(invalid).sort(),
  };
}

function writeInstallManifest(targetPath, installEntries) {
  const manifestPath = resolveInstallManifestPath(targetPath);
  const normalizedEntries = [...new Set(installEntries.map(normalizeInstallEntry).filter(Boolean))].sort();
  const manifest = JSON.stringify(
    {
      schemaVersion: 1,
      updatedAt: new Date().toISOString(),
      entries: normalizedEntries,
    },
    null,
    2,
  ) + "\n";
  const fd = fs.openSync(manifestPath, "w", 0o600);
  try {
    fs.writeFileSync(fd, manifest, "utf8");
  } finally {
    fs.closeSync(fd);
  }
}

function pruneRemovedEntries(targetPath, previousEntries, installEntries) {
  const next = new Set(installEntries.map(normalizeInstallEntry));
  const normalizedPrevious = normalizeManifestEntries(previousEntries);
  for (const entry of normalizedPrevious.invalid) {
    console.warn(`  Skipping unsafe managed entry path from manifest: ${entry}`);
  }
  for (const normalizedEntry of normalizedPrevious.entries) {
    if (next.has(normalizedEntry)) {
      continue;
    }
    const candidate = resolveManagedPath(targetPath, normalizedEntry);
    if (!candidate) {
      console.warn(`  Skipping unsafe managed entry path from manifest: ${normalizedEntry}`);
      continue;
    }
    assertSafeDestinationPath(candidate, targetPath);
    fs.rmSync(candidate, { recursive: true, force: true });
    console.log(`  Removed stale managed entry: ${normalizedEntry}`);
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

function isSafeGitRef(ref) {
  return (
    typeof ref === "string" &&
    ref.length > 0 &&
    ref.length <= 128 &&
    /^[A-Za-z0-9._/-]+$/.test(ref) &&
    !ref.startsWith("-") &&
    !ref.startsWith("/") &&
    !ref.endsWith("/") &&
    !ref.endsWith(".") &&
    !ref.includes("..") &&
    !ref.includes("//") &&
    !ref.includes("@{") &&
    ref !== "@" &&
    !ref.split("/").some((part) => part.endsWith(".lock"))
  );
}

function assertSafeGitRef(ref) {
  if (!isSafeGitRef(ref)) {
    throw new Error(`Unsafe git ref: ${ref}`);
  }
}

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: "inherit", ...opts });
  if (r.status !== 0) process.exit(r.status == null ? 1 : r.status);
}

function buildCloneArgs(repo, tempDir, ref = null) {
  const args = ["clone", "--depth", "1"];
  if (ref) {
    assertSafeGitRef(ref);
    args.push("--branch", ref);
  }
  args.push(repo, tempDir);
  return args;
}

function resolveInstallRef(opts) {
  if (opts.tagArg) {
    return opts.tagArg;
  }
  if (opts.versionArg) {
    return opts.versionArg.startsWith("v") ? opts.versionArg : `v${opts.versionArg}`;
  }
  return DEFAULT_RELEASE_REF;
}

function installForTarget(
  tempDir,
  target,
  selectors = buildInstallSelectors({}),
  installEntries = null,
  requestedSkills = [],
) {
  // Resolve all selection errors before creating or changing the target.
  const resolvedInstallEntries = installEntries || getInstallEntries(tempDir, selectors, requestedSkills);

  if (fs.existsSync(target.path)) {
    ensureTargetIsDirectory(target.path);
    const targetStats = fs.lstatSync(target.path);
    if (targetStats.isSymbolicLink()) {
      console.error(
        `  Refusing to migrate or update through symlinked target: ${target.path}`,
      );
      console.error("  Choose a real directory path, or replace the symlink manually before retrying.");
      process.exit(1);
    }
    const gitDir = path.join(target.path, ".git");
    if (fs.existsSync(gitDir)) {
      console.log(`  Migrating from full-repo install to skills-only layout…`);
      const backupPath = `${target.path}_backup_${Date.now()}`;
      try { 
        fs.cpSync(target.path, backupPath, { recursive: true });
        fs.rmSync(target.path, { recursive: true, force: true });
        console.log(`  ⚠️  Safety Backup created at: ${backupPath}`);
        fs.mkdirSync(target.path, { recursive: true, mode: targetStats.mode });
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

  const managedEntries = getManagedEntries(resolvedInstallEntries, target);
  const previousEntries = readInstallManifest(target.path);
  installSkillsIntoTarget(tempDir, target.path, resolvedInstallEntries);
  pruneRemovedEntries(target.path, previousEntries, managedEntries);
  writeInstallManifest(target.path, managedEntries);
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
      "For the agy CLI slash-command menu, install the Antigravity CLI layout with --agy.",
    );
    messages.push(
      "For clone-based installs, use scripts/activate-skills.sh or scripts/activate-skills.bat",
    );
  }

  if (targets.some((target) => target.name === "Antigravity CLI")) {
    messages.push(
      "Restart agy and type /skills or /<skill-name> to load installed Antigravity CLI skills.",
    );
  }

  if (targets.some((target) => isOpenCodeStylePath(target.path))) {
    const baseMessage =
      "For Antigravity 2.0, OpenCode, or other .agents/skills installs, prefer a reduced install with --skills, --risk, --category, or --tags to avoid context overload.";
    messages.push(baseMessage);
    if (!hasInstallSelectors(selectors)) {
      messages.push(
        "Example: npx agentic-awesome-skills --path .agents/skills --category development,backend --risk safe,none",
      );
    }
  }

  return messages;
}

function buildDryRunTargetPlan(target, installEntries) {
  const desiredEntries = uniqueValues(getManagedEntries(installEntries, target)).sort();
  const targetExists = fs.existsSync(target.path);

  if (targetExists) {
    const stats = fs.lstatSync(target.path);
    if (stats.isSymbolicLink()) {
      throw new Error(`Refusing to preview through symlinked target: ${target.path}`);
    }
    if (!stats.isDirectory()) {
      throw new Error(`Install path exists but is not a directory: ${target.path}`);
    }
  }

  const previous = normalizeManifestEntries(readInstallManifest(target.path));
  const desiredSet = new Set(desiredEntries);
  const remove = previous.entries.filter((entry) => !desiredSet.has(entry));

  // Match the apply-time destination checks without creating any path. This
  // makes the preview fail before a later install could encounter a symlinked
  // managed destination or an unsafe stale manifest entry.
  for (const entry of [...desiredEntries, ...remove]) {
    const candidate = resolveManagedPath(target.path, entry);
    if (!candidate) {
      throw new Error(`Refusing unsafe managed entry in dry-run plan: ${entry}`);
    }
    assertSafeDestinationPath(candidate, target.path);
  }

  return {
    name: target.name,
    path: target.path,
    targetExists,
    replacesRepositoryClone: targetExists && fs.existsSync(path.join(target.path, ".git")),
    installOrUpdate: desiredEntries,
    remove,
    ignoredUnsafeManifestEntries: previous.invalid,
  };
}

function buildDryRunPlan(ref, targets, installEntries) {
  return {
    ref: ref || "default release",
    targets: targets.map((target) => buildDryRunTargetPlan(target, installEntries)),
    skills: installEntries.filter((entry) => entry !== "docs").sort(),
  };
}

function printDryRunPlan(plan) {
  console.log("\nDry run: no target files or directories will be created, changed, or removed.");
  console.log(`Ref: ${plan.ref}`);
  console.log(`Exact skill set (${plan.skills.length}):`);
  for (const skill of plan.skills) {
    console.log(`  ${skill}`);
  }
  console.log("Target mutation plans:");
  for (const target of plan.targets) {
    console.log(`  ${target.name}: ${target.path}`);
    console.log(`    target: ${target.targetExists ? "existing directory" : "will be created"}`);
    if (target.replacesRepositoryClone) {
      console.log("    migration: existing repository clone will be backed up and replaced");
    }
    console.log(`    install/update managed entries (${target.installOrUpdate.length}):`);
    for (const entry of target.installOrUpdate) {
      console.log(`      ${entry}`);
    }
    console.log(`    remove stale managed entries (${target.remove.length}):`);
    for (const entry of target.remove) {
      console.log(`      ${entry}`);
    }
    for (const entry of target.ignoredUnsafeManifestEntries) {
      console.log(`    ignored unsafe manifest entry: ${entry}`);
    }
  }
}

function main() {
  let opts;
  try {
    opts = parseArgs();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
    return;
  }
  const selectors = buildInstallSelectors(opts);
  let requestedSkills;
  try {
    requestedSkills = parseExactSkillArg(opts.skillsArg);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
    return;
  }
  const ref = resolveInstallRef(opts);

  if (opts.help) {
    printHelp();
    return;
  }

  if (opts.versionInfo) {
    console.log(packageMetadata.version);
    return;
  }

  const targets = getTargets(opts);
  if (!targets.length || (!HOME && !opts.pathArg)) {
    console.error(
      "Could not resolve home directory. Use --path <absolute-path>.",
    );
    process.exit(1);
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "ag-skills-"));

  try {
    console.log("Cloning repository…");
    if (ref) {
      console.log(`Cloning repository at ${ref}…`);
    }
    run("git", buildCloneArgs(REPO, tempDir, ref));

    // Resolve the exact set once before touching any target. This keeps an
    // unknown/ambiguous --skills value or an empty filter intersection atomic
    // across multi-target installs.
    let installEntries;
    try {
      installEntries = getInstallEntries(tempDir, selectors, requestedSkills);
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exitCode = 1;
      return;
    }

    // Preflight every target before mutating the first one. The same plan is
    // printed for --dry-run and acts as the multi-target safety gate for apply.
    let dryRunPlan;
    try {
      dryRunPlan = buildDryRunPlan(ref, targets, installEntries);
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exitCode = 1;
      return;
    }

    if (opts.dryRun) {
      printDryRunPlan(dryRunPlan);
      return;
    }

    console.log(`\nInstalling for ${targets.length} target(s):`);
    for (const target of targets) {
      console.log(`\n${target.name}:`);
      installForTarget(tempDir, target, selectors, installEntries);
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
  replaceManagedEntry,
  getPostInstallMessages,
  buildCloneArgs,
  buildDryRunPlan,
  buildDryRunTargetPlan,
  buildInstallSelectors,
  getInstallEntries,
  getManagedEntries,
  installSkillsIntoTarget,
  installForTarget,
  isSafeGitRef,
  isOpenCodeStylePath,
  main,
  matchesInstallSelectors,
  normalizeInstallEntry,
  normalizeManifestEntries,
  parseExactSkillArg,
  parseSelectorArg,
  printDryRunPlan,
  parseArgs,
  pruneRemovedEntries,
  readInstallManifest,
  resolveExactSkillSelections,
  resolveInstallRef,
  writeInstallManifest,
};
