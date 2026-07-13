const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const installer = require(path.resolve(__dirname, "..", "..", "bin", "install.js"));
const packageVersion = require(path.resolve(__dirname, "..", "..", "..", "package.json")).version;
const pinnedRef = `v${packageVersion}`;

function writeSkill(repoRoot, skillPath, frontmatter) {
  const skillDir = path.join(repoRoot, "skills", skillPath);
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(
    path.join(skillDir, "SKILL.md"),
    `---\n${frontmatter}\n---\n\n# ${skillPath}\n`,
    "utf8",
  );
}

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "installer-exact-selection-"));

try {
  const repoRoot = path.join(tmpRoot, "repo");
  fs.mkdirSync(path.join(repoRoot, "skills"), { recursive: true });
  fs.mkdirSync(path.join(repoRoot, "docs"), { recursive: true });
  fs.writeFileSync(path.join(repoRoot, "docs", "README.md"), "# Docs\n", "utf8");

  writeSkill(
    repoRoot,
    "frontend-design",
    "name: frontend-design\ncategory: development\nrisk: safe\ntags: [frontend]",
  );
  writeSkill(
    repoRoot,
    path.join("game-development", "2d-games"),
    "name: 2D Games\ncategory: games\nrisk: safe\ntags: [game]",
  );
  writeSkill(
    repoRoot,
    path.join("legacy-games", "2d-games"),
    "name: Legacy 2D Games\ncategory: games\nrisk: safe\ntags: [game]",
  );
  writeSkill(
    repoRoot,
    "shared-one",
    "name: Shared Skill\ncategory: development\nrisk: safe\ntags: [shared]",
  );
  writeSkill(
    repoRoot,
    "shared-two",
    "name: Shared Skill\ncategory: development\nrisk: safe\ntags: [shared]",
  );

  const requested = installer.parseExactSkillArg("frontend-design,game-development/2d-games");
  assert.deepStrictEqual(
    installer.getInstallEntries(repoRoot, installer.buildInstallSelectors({}), requested),
    ["frontend-design", "game-development/2d-games", "docs"],
    "--skills should resolve exact root ids and full nested paths",
  );

  assert.deepStrictEqual(
    installer.getInstallEntries(
      repoRoot,
      installer.buildInstallSelectors({ categoryArg: "development" }),
      requested,
    ),
    ["frontend-design", "docs"],
    "--skills must combine with metadata filters using AND",
  );

  assert.throws(
    () => installer.getInstallEntries(
      repoRoot,
      installer.buildInstallSelectors({ categoryArg: "games" }),
      installer.parseExactSkillArg("frontend-design"),
    ),
    /No skills matched/i,
    "an empty exact-selection/filter intersection must fail instead of installing docs or a broad fallback",
  );

  assert.throws(
    () => installer.getInstallEntries(
      repoRoot,
      installer.buildInstallSelectors({}),
      installer.parseExactSkillArg("does-not-exist"),
    ),
    /unknown skill requested/i,
    "unknown exact skill selections must fail",
  );
  assert.throws(
    () => installer.getInstallEntries(
      repoRoot,
      installer.buildInstallSelectors({}),
      installer.parseExactSkillArg("2d-games"),
    ),
    /ambiguous skill requested/i,
    "ambiguous basename selections must require a full nested path",
  );
  assert.throws(
    () => installer.getInstallEntries(
      repoRoot,
      installer.buildInstallSelectors({}),
      installer.parseExactSkillArg("Shared Skill"),
    ),
    /ambiguous skill requested/i,
    "ambiguous canonical names must fail",
  );

  const absentTarget = path.join(tmpRoot, "absent-target");
  assert.throws(
    () => installer.installForTarget(
      repoRoot,
      { name: "Absent", path: absentTarget },
      installer.buildInstallSelectors({}),
      null,
      installer.parseExactSkillArg("does-not-exist"),
    ),
    /unknown skill requested/i,
  );
  assert.strictEqual(
    fs.existsSync(absentTarget),
    false,
    "invalid --skills selection must fail before an absent target is created",
  );

  const existingTarget = path.join(tmpRoot, "existing-target");
  fs.mkdirSync(existingTarget, { recursive: true });
  const sentinelPath = path.join(existingTarget, "sentinel.txt");
  fs.writeFileSync(sentinelPath, "keep", "utf8");
  const manifestPath = path.join(existingTarget, ".antigravity-install-manifest.json");
  fs.writeFileSync(
    manifestPath,
    JSON.stringify({
      schemaVersion: 1,
      entries: ["frontend-design", "legacy-skill", "docs", "../outside"],
    }),
    "utf8",
  );
  const plan = installer.buildDryRunPlan(
    pinnedRef,
    [
      { name: "Existing", path: existingTarget },
      { name: "Absent", path: absentTarget },
    ],
    ["game-development/2d-games", "frontend-design", "docs"],
  );
  assert.deepStrictEqual(plan.targets[0].remove, ["legacy-skill"]);
  assert.deepStrictEqual(plan.targets[0].ignoredUnsafeManifestEntries, ["../outside"]);
  assert.strictEqual(plan.targets[1].targetExists, false);
  const output = [];
  const originalLog = console.log;
  console.log = (message) => output.push(String(message));
  try {
    installer.printDryRunPlan(plan);
  } finally {
    console.log = originalLog;
  }
  assert.strictEqual(fs.readFileSync(sentinelPath, "utf8"), "keep");
  assert.strictEqual(fs.existsSync(absentTarget), false);
  assert.match(output.join("\n"), new RegExp(`Ref: ${pinnedRef.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
  assert.match(output.join("\n"), new RegExp(existingTarget.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(output.join("\n"), /Exact skill set \(2\):/);
  assert.match(output.join("\n"), /frontend-design/);
  assert.match(output.join("\n"), /remove stale managed entries \(1\)/i);
  assert.match(output.join("\n"), /legacy-skill/);
  assert.match(output.join("\n"), /ignored unsafe manifest entry: \.\.\/outside/i);

  // Exercise the real CLI boundary with a deterministic fake git clone. This
  // proves --dry-run returns before installForTarget can mutate either an
  // existing target or a missing one.
  const fakeBin = path.join(tmpRoot, "fake-bin");
  fs.mkdirSync(fakeBin, { recursive: true });
  const fakeGit = path.join(fakeBin, "git");
  fs.writeFileSync(
    fakeGit,
    `#!/usr/bin/env node
const fs = require("fs");
const destination = process.argv[process.argv.length - 1];
fs.appendFileSync(process.env.FAKE_GIT_LOG, JSON.stringify(process.argv.slice(2)) + "\\n");
fs.cpSync(process.env.FAKE_GIT_SOURCE, destination, { recursive: true, force: true });
`,
    "utf8",
  );
  fs.chmodSync(fakeGit, 0o755);

  const fakeGitLog = path.join(tmpRoot, "fake-git-log.jsonl");
  const cliEnv = {
    ...process.env,
    FAKE_GIT_SOURCE: repoRoot,
    FAKE_GIT_LOG: fakeGitLog,
    PATH: `${fakeBin}${path.delimiter}${process.env.PATH || ""}`,
  };
  const installerPath = path.resolve(__dirname, "..", "..", "bin", "install.js");
  const beforeDryRunEntries = fs.readdirSync(existingTarget).sort();
  const dryRun = spawnSync(
    process.execPath,
    [installerPath, "--path", existingTarget, "--release", packageVersion, "--skills", "frontend-design", "--dry-run"],
    { encoding: "utf8", env: cliEnv },
  );
  assert.strictEqual(dryRun.status, 0, dryRun.stderr);
  assert.match(dryRun.stdout, new RegExp(`Ref: ${pinnedRef.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
  assert.match(dryRun.stdout, /Exact skill set \(1\):/);
  assert.match(dryRun.stdout, /remove stale managed entries \(1\)/i);
  assert.match(dryRun.stdout, /legacy-skill/);
  assert.deepStrictEqual(fs.readdirSync(existingTarget).sort(), beforeDryRunEntries);
  assert.strictEqual(fs.readFileSync(sentinelPath, "utf8"), "keep");
  const cloneArgs = JSON.parse(fs.readFileSync(fakeGitLog, "utf8").trim().split("\n")[0]);
  assert.deepStrictEqual(
    cloneArgs.slice(0, 5),
    ["clone", "--depth", "1", "--branch", pinnedRef],
    "the real CLI dry run must clone the explicitly pinned release",
  );

  const outsideSentinel = path.join(tmpRoot, "outside");
  fs.writeFileSync(outsideSentinel, "outside stays", "utf8");
  assert.doesNotThrow(() => installer.pruneRemovedEntries(existingTarget, ["../outside"], []));
  assert.strictEqual(fs.readFileSync(outsideSentinel, "utf8"), "outside stays");

  const unknownTarget = path.join(tmpRoot, "unknown-target");
  const unknown = spawnSync(
    process.execPath,
    [installerPath, "--path", unknownTarget, "--skills", "does-not-exist", "--dry-run"],
    { encoding: "utf8", env: cliEnv },
  );
  assert.strictEqual(unknown.status, 1);
  assert.match(unknown.stderr, /Unknown skill requested/);
  assert.strictEqual(fs.existsSync(unknownTarget), false);

  const multiHome = path.join(tmpRoot, "multi-home");
  const firstTarget = path.join(multiHome, ".claude", "skills");
  const codexHome = path.join(tmpRoot, "codex-home");
  const unsafeTarget = path.join(codexHome, "skills");
  const unsafeRealTarget = path.join(tmpRoot, "unsafe-real-target");
  fs.mkdirSync(firstTarget, { recursive: true });
  fs.mkdirSync(codexHome, { recursive: true });
  fs.mkdirSync(unsafeRealTarget, { recursive: true });
  const firstSentinel = path.join(firstTarget, "first-sentinel.txt");
  fs.writeFileSync(firstSentinel, "first stays", "utf8");
  let createdUnsafeSymlink = false;
  try {
    fs.symlinkSync(unsafeRealTarget, unsafeTarget, "dir");
    createdUnsafeSymlink = true;
  } catch (error) {
    // Some platforms disallow unprivileged directory symlinks.
  }
  if (createdUnsafeSymlink) {
    const multiTarget = spawnSync(
      process.execPath,
      [installerPath, "--claude", "--codex", "--skills", "frontend-design"],
      {
        encoding: "utf8",
        env: { ...cliEnv, HOME: multiHome, CODEX_HOME: codexHome },
      },
    );
    assert.strictEqual(multiTarget.status, 1);
    assert.match(multiTarget.stderr, /symlinked target/i);
    assert.deepStrictEqual(fs.readdirSync(firstTarget), ["first-sentinel.txt"]);
    assert.strictEqual(fs.readFileSync(firstSentinel, "utf8"), "first stays");
  }
} finally {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
}
