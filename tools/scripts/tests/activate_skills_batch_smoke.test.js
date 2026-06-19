const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

if (process.platform !== "win32") {
  console.log("Skipping activate-skills.bat smoke test outside Windows.");
  process.exit(0);
}

const repoRoot = path.resolve(__dirname, "../..", "..");
const scriptPath = path.join("scripts", "activate-skills.bat");
const root = fs.mkdtempSync(path.join(repoRoot, ".tmp-activate-skills-batch-"));
const baseDir = path.join(root, "antigravity");
const repoSkills = path.join(root, "repo-skills");

function makeSkill(skillId) {
  const skillDir = path.join(repoSkills, skillId);
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(
    path.join(skillDir, "SKILL.md"),
    `---\nname: ${skillId}\ndescription: test skill\ncategory: testing\nrisk: safe\nsource: community\ndate_added: "2026-04-05"\n---\n`,
    "utf8",
  );
}

try {
  makeSkill("brainstorming");
  makeSkill("custom-skill");
  fs.mkdirSync(path.join(baseDir, "skills", "legacy-skill"), { recursive: true });
  fs.writeFileSync(path.join(baseDir, "skills", "legacy-skill", "SKILL.md"), "legacy", "utf8");

const result = spawnSync(
    "cmd.exe",
    ["/d", "/c", `${scriptPath} --clear brainstorming custom-skill`],
    {
      cwd: repoRoot,
      env: {
        ...process.env,
        AG_BASE_DIR: baseDir,
        AG_REPO_SKILLS_DIR: repoSkills,
        AG_PYTHON_BIN: "__missing_python__",
        AG_NO_PAUSE: "1",
      },
      encoding: "utf8",
      timeout: 20000,
      maxBuffer: 1024 * 1024 * 20,
    },
  );

  if (result.error) {
    if (result.error.code === "EPERM" || result.error.code === "EACCES") {
      console.log("Skipping activate-skills.bat smoke test; this sandbox blocks cmd.exe child processes.");
      process.exit(0);
    }
    throw result.error;
  }

  assert.strictEqual(result.status, 0, result.stderr || result.stdout);
  assert.ok(
    fs.existsSync(path.join(baseDir, "skills", "brainstorming", "SKILL.md")),
    "brainstorming should be activated into the live skills directory",
  );
  assert.ok(
    fs.existsSync(path.join(baseDir, "skills", "custom-skill", "SKILL.md")),
    "custom-skill should be activated into the live skills directory",
  );
  assert.ok(
    fs.existsSync(path.join(baseDir, "skills_library", "brainstorming", "SKILL.md")),
    "repo skills should be synced into the backing library",
  );
  const archives = fs.readdirSync(baseDir).filter((entry) => entry.startsWith("skills_archive_"));
  assert.ok(archives.length > 0, "--clear should archive the previously active skills directory");
  assert.ok(
    fs.existsSync(path.join(baseDir, archives[0], "legacy-skill", "SKILL.md")),
    "legacy active skills should move into a timestamped archive",
  );
  assert.match(
    result.stdout,
    /Done! Antigravity skills are now activated\./,
    "script should report successful activation",
  );

  const missingHelperBaseDir = path.join(root, "antigravity-missing-helper");
  const missingHelperResult = spawnSync(
    "cmd.exe",
    ["/d", "/c", `${scriptPath} --clear custom-skill`],
    {
      cwd: repoRoot,
      env: {
        ...process.env,
        AG_BASE_DIR: missingHelperBaseDir,
        AG_REPO_SKILLS_DIR: repoSkills,
        AG_BUNDLE_HELPER: path.join(root, "missing-bundle-helper.py"),
        AG_PYTHON_BIN: "__missing_python__",
        AG_NO_PAUSE: "1",
      },
      encoding: "utf8",
      timeout: 20000,
      maxBuffer: 1024 * 1024 * 20,
    },
  );

  if (missingHelperResult.error) {
    if (missingHelperResult.error.code === "EPERM" || missingHelperResult.error.code === "EACCES") {
      console.log("Skipping activate-skills.bat smoke test; this sandbox blocks cmd.exe child processes.");
      process.exit(0);
    }
    throw missingHelperResult.error;
  }

  assert.strictEqual(
    missingHelperResult.status,
    0,
    missingHelperResult.stderr || missingHelperResult.stdout,
  );
  assert.ok(
    fs.existsSync(path.join(missingHelperBaseDir, "skills", "custom-skill", "SKILL.md")),
    "explicit skill args should still activate when the bundle helper path is missing",
  );
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
