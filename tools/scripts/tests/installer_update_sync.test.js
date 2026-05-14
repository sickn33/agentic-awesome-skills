const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const installer = require(path.resolve(__dirname, "..", "..", "bin", "install.js"));

function writeSkill(repoRoot, skillName, content = "# Skill\n") {
  const skillDir = path.join(repoRoot, "skills", skillName);
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(path.join(skillDir, "SKILL.md"), content, "utf8");
}

function createFakeRepo(rootDir, skills) {
  fs.mkdirSync(path.join(rootDir, "skills"), { recursive: true });
  fs.mkdirSync(path.join(rootDir, "docs"), { recursive: true });
  fs.writeFileSync(path.join(rootDir, "docs", "README.md"), "# Docs\n", "utf8");
  for (const skillName of skills) {
    writeSkill(rootDir, skillName, `# ${skillName}\n`);
  }
}

function readManifestEntries(targetDir) {
  const manifestPath = path.join(targetDir, ".antigravity-install-manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  return manifest.entries;
}

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "installer-update-sync-"));

try {
  const repoV1 = path.join(tmpRoot, "repo-v1");
  const repoV2 = path.join(tmpRoot, "repo-v2");
  const targetDir = path.join(tmpRoot, "target");
  fs.mkdirSync(targetDir, { recursive: true });

  createFakeRepo(repoV1, ["skill-a", "skill-b"]);
  createFakeRepo(repoV2, ["skill-a"]);
  writeSkill(
    repoV1,
    path.join("nested", "skill-c"),
    "---\nname: nested-skill-c\ncategory: backend\nrisk: safe\ntags: [api]\n---\n",
  );
  writeSkill(
    repoV2,
    "skill-a",
    "---\nname: skill-a\ncategory: development\nrisk: safe\ntags: [debugging]\n---\n",
  );
  writeSkill(
    repoV2,
    path.join("nested", "skill-c"),
    "---\nname: nested-skill-c\ncategory: backend\nrisk: safe\ntags: [api]\n---\n",
  );

  installer.installForTarget(repoV1, { name: "Test", path: targetDir });
  assert.ok(fs.existsSync(path.join(targetDir, "skill-a", "SKILL.md")));
  assert.ok(fs.existsSync(path.join(targetDir, "skill-b", "SKILL.md")));
  assert.ok(fs.existsSync(path.join(targetDir, "nested", "skill-c", "SKILL.md")));

  installer.installForTarget(
    repoV2,
    { name: "Test", path: targetDir },
    installer.buildInstallSelectors({ categoryArg: "backend" }),
  );
  assert.strictEqual(
    fs.existsSync(path.join(targetDir, "skill-a")),
    false,
    "non-matching top-level skills should be pruned during filtered updates",
  );
  assert.strictEqual(
    fs.existsSync(path.join(targetDir, "skill-b")),
    false,
    "stale managed top-level skills should be pruned during updates",
  );
  assert.ok(fs.existsSync(path.join(targetDir, "nested", "skill-c", "SKILL.md")));
  assert.deepStrictEqual(
    readManifestEntries(targetDir),
    ["docs", "nested/skill-c"],
    "install manifest should mirror the latest filtered install entries",
  );

  const legacyTargetDir = path.join(tmpRoot, "legacy-target");
  fs.mkdirSync(path.join(legacyTargetDir, "removed-skill"), { recursive: true });
  fs.writeFileSync(
    path.join(legacyTargetDir, ".antigravity-install-manifest.json"),
    JSON.stringify(
      {
        schemaVersion: 1,
        updatedAt: new Date().toISOString(),
        entries: ["skills/removed-skill", "skills/nested/skill-c"],
      },
      null,
      2,
    ),
    "utf8",
  );

  installer.installForTarget(
    repoV2,
    { name: "LegacyManifest", path: legacyTargetDir },
    installer.buildInstallSelectors({ categoryArg: "backend" }),
  );
  assert.strictEqual(
    fs.existsSync(path.join(legacyTargetDir, "removed-skill")),
    false,
    "legacy skills/<name> manifest entries should prune the flattened installed path",
  );
  assert.deepStrictEqual(
    readManifestEntries(legacyTargetDir),
    ["docs", "nested/skill-c"],
    "legacy manifest entries should be normalized after update",
  );

  const badTargetPath = path.join(tmpRoot, "bad-target");
  fs.writeFileSync(badTargetPath, "not-a-directory", "utf8");
  const badTargetCheck = spawnSync(
    process.execPath,
    [
      "-e",
      `
const installer = require(${JSON.stringify(path.resolve(__dirname, "..", "..", "bin", "install.js"))});
installer.installForTarget(${JSON.stringify(repoV2)}, { name: "BadTarget", path: ${JSON.stringify(badTargetPath)} });
`,
    ],
    {
      stdio: "pipe",
      encoding: "utf8",
    },
  );

  assert.notStrictEqual(
    badTargetCheck.status,
    0,
    "installer should fail fast when target path exists as a non-directory",
  );
  assert.match(
    `${badTargetCheck.stdout}\n${badTargetCheck.stderr}`,
    /not a directory/i,
    "installer should print a clear error for non-directory targets",
  );
} finally {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
}
