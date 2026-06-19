const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const { listSkillIds, listSkillIdsRecursive, readSkill } = require("../../lib/skill-utils");
const { createSymlinkOrSkip } = require("./symlink-test-utils");

function withTempDir(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "skill-utils-security-"));
  try {
    fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

withTempDir((root) => {
  const skillsDir = path.join(root, "skills");
  const outsideDir = path.join(root, "outside-secret");

  fs.mkdirSync(skillsDir, { recursive: true });
  fs.mkdirSync(outsideDir, { recursive: true });

  fs.mkdirSync(path.join(skillsDir, "safe-skill"));
  fs.writeFileSync(path.join(skillsDir, "safe-skill", "SKILL.md"), "# safe\n");

  fs.writeFileSync(path.join(outsideDir, "SKILL.md"), "# secret\n");
  const createdSymlink = createSymlinkOrSkip(outsideDir, path.join(skillsDir, "linked-secret"), "dir");
  if (!createdSymlink) {
    return;
  }

  const skillIds = listSkillIds(skillsDir);

  assert.deepStrictEqual(
    skillIds,
    ["safe-skill"],
    "symlinked skill directories must not be treated as local skills",
  );
});

withTempDir((root) => {
  const skillsDir = path.join(root, "skills");
  const outsideDir = path.join(root, "outside-secret");

  fs.mkdirSync(skillsDir, { recursive: true });
  fs.mkdirSync(outsideDir, { recursive: true });

  fs.mkdirSync(path.join(skillsDir, "nested", "safe-skill"), { recursive: true });
  fs.writeFileSync(path.join(skillsDir, "nested", "safe-skill", "SKILL.md"), "# safe\n");

  fs.mkdirSync(path.join(outsideDir, "loop-target"), { recursive: true });
  const createdSymlink = createSymlinkOrSkip(
    outsideDir,
    path.join(skillsDir, "nested", "linked-secret"),
    "dir",
  );
  if (!createdSymlink) {
    return;
  }

  const skillIds = listSkillIdsRecursive(skillsDir);

  assert.deepStrictEqual(
    skillIds,
    ["nested/safe-skill"],
    "recursive skill listing must ignore symlinked directories",
  );
});

withTempDir((root) => {
  const skillsDir = path.join(root, "skills");
  let currentDir = skillsDir;

  fs.mkdirSync(skillsDir, { recursive: true });
  currentDir = skillsDir;
  const originalReaddirSync = fs.readdirSync;
  const originalLstatSync = fs.lstatSync;

  try {
    const depth = 1500;
    const directorySet = new Set([skillsDir]);
    for (let i = 0; i < depth; i += 1) {
      currentDir = path.join(currentDir, `d${i}`);
      directorySet.add(currentDir);
    }
    const deepestSkill = path.join(currentDir, "SKILL.md");

    fs.readdirSync = (targetPath, options) => {
      if (targetPath === skillsDir) {
        return [{ name: "d0", isDirectory: () => true }];
      }

      const match = targetPath.match(/\/d(\d+)$/);
      if (!match) return originalReaddirSync(targetPath, options);

      const index = Number(match[1]);
      if (index >= depth - 1) {
        return [];
      }
      return [{ name: `d${index + 1}`, isDirectory: () => true }];
    };

    fs.lstatSync = (targetPath) => {
      if (directorySet.has(targetPath)) {
        return { isDirectory: () => true, isSymbolicLink: () => false, isFile: () => false };
      }
      if (targetPath === deepestSkill) {
        return { isDirectory: () => false, isSymbolicLink: () => false, isFile: () => true };
      }
      return originalLstatSync(targetPath);
    };

    const skillIds = listSkillIdsRecursive(skillsDir);

    assert.strictEqual(skillIds.length, 1, "deep trees should still produce exactly one skill");
    assert.match(skillIds[0], /d1499$/, "deepest nested skill should be discovered without stack overflow");
  } finally {
    fs.readdirSync = originalReaddirSync;
    fs.lstatSync = originalLstatSync;
  }
});

withTempDir((root) => {
  const skillsDir = path.join(root, "skills");
  const skillDir = path.join(skillsDir, "metadata-skill");
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(
    path.join(skillDir, "SKILL.md"),
    `---
name: metadata-skill
category: backend
risk: safe
metadata:
  tags: "[api, saas]"
---

# metadata-skill
`,
    "utf8",
  );

  const skill = readSkill(skillsDir, "metadata-skill");

  assert.strictEqual(skill.category, "backend", "readSkill should expose category metadata");
  assert.strictEqual(skill.risk, "safe", "readSkill should expose risk metadata");
  assert.deepStrictEqual(
    skill.tags,
    ["api", "saas"],
    "readSkill should normalize inline tag lists from metadata.tags",
  );
});
