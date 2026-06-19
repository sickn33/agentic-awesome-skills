const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

if (process.platform === "win32") {
  console.log("Skipping activate-skills.sh smoke test on Windows; use the batch-script coverage instead.");
  process.exit(0);
}

const repoRoot = path.resolve(__dirname, "../..", "..");
const scriptPath = path.posix.join("scripts", "activate-skills.sh");

const root = fs.mkdtempSync(path.join(repoRoot, ".tmp-activate-skills-shell-"));
const baseDir = path.join(root, "antigravity");
const repoSkills = path.join(root, "repo-skills");
const outsideDir = path.join(root, "outside-skill-root");

function makeSkill(skillId) {
  const skillDir = path.join(repoSkills, skillId);
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(
    path.join(skillDir, "SKILL.md"),
    `---\nname: ${skillId}\ndescription: test skill\ncategory: testing\nrisk: safe\nsource: community\ndate_added: "2026-03-22"\n---\n`,
    "utf8",
  );
}

try {
  makeSkill("brainstorming");
  makeSkill("systematic-debugging");
  makeSkill("custom-skill");
  fs.mkdirSync(outsideDir, { recursive: true });
  fs.writeFileSync(path.join(outsideDir, "secret.txt"), "outside", "utf8");
  fs.symlinkSync(outsideDir, path.join(repoSkills, "escape-link"), "dir");

  const result = spawnSync(
    "bash",
    [scriptPath, "--clear", "brainstorming", "custom-skill"],
    {
      cwd: repoRoot,
      env: {
        ...process.env,
        AG_BASE_DIR: path.relative(repoRoot, baseDir).split(path.sep).join("/"),
        AG_REPO_SKILLS_DIR: path.relative(repoRoot, repoSkills).split(path.sep).join("/"),
        AG_PYTHON_BIN: "python3",
      },
      encoding: "utf8",
    },
  );

  assert.strictEqual(result.status, 0, result.stderr || result.stdout);
  assert.ok(
    fs.existsSync(path.join(baseDir, "skills", "brainstorming", "SKILL.md")),
    "brainstorming should be activated into the live skills directory",
  );
  assert.ok(
    fs.existsSync(path.join(baseDir, "skills", "custom-skill", "SKILL.md")),
    "literal safe skill ids should be activated from the library",
  );
  assert.ok(
    fs.existsSync(path.join(baseDir, "skills_library", "brainstorming", "SKILL.md")),
    "repo skills should be synced into the backing library",
  );
  assert.ok(
    !fs.existsSync(path.join(baseDir, "skills_library", "escape-link")),
    "repo sync must not copy symlinked skills that point outside the source root",
  );
  assert.ok(
    !fs.existsSync(path.join(baseDir, "skills", "escape-link")),
    "unsafe symlinked skills must never become active",
  );
  assert.match(
    result.stdout,
    /Done! Antigravity skills are now activated\./,
    "script should report successful activation",
  );
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
