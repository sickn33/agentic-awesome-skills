const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const installer = require(path.resolve(__dirname, "..", "..", "bin", "install.js"));
const packageMetadata = require(path.resolve(__dirname, "..", "..", "..", "package.json"));

assert.deepStrictEqual(
  installer.buildCloneArgs("https://example.com/repo.git", "/tmp/skills"),
  ["clone", "--depth", "1", "https://example.com/repo.git", "/tmp/skills"],
  "installer should use a shallow clone by default",
);

assert.deepStrictEqual(
  installer.buildCloneArgs("https://example.com/repo.git", "/tmp/skills", "v1.2.3"),
  ["clone", "--depth", "1", "--branch", "v1.2.3", "https://example.com/repo.git", "/tmp/skills"],
  "installer should keep versioned installs shallow while selecting the requested ref",
);

assert.strictEqual(
  installer.resolveInstallRef({}),
  `v${packageMetadata.version}`,
  "default installs should pin the clone to the npm package release tag",
);

assert.strictEqual(
  installer.resolveInstallRef({ versionArg: "1.2.3" }),
  "v1.2.3",
  "version installs should normalize bare versions to release tags",
);

assert.strictEqual(
  installer.resolveInstallRef({ tagArg: "main", versionArg: "1.2.3" }),
  "main",
  "explicit tags should override the npm package release tag",
);

assert.strictEqual(installer.isSafeGitRef("main"), true);
assert.strictEqual(installer.isSafeGitRef("release/v1.2.3"), true);
assert.strictEqual(installer.isSafeGitRef("--upload-pack=touch"), false);
assert.strictEqual(installer.isSafeGitRef("feature/../main"), false);
assert.strictEqual(installer.isSafeGitRef("feature branch"), false);
assert.throws(
  () => installer.buildCloneArgs("https://example.com/repo.git", "/tmp/skills", "--upload-pack=touch"),
  /Unsafe git ref/,
  "clone args should reject unsafe refs before invoking git",
);

const antigravityMessages = installer.getPostInstallMessages([
  { name: "Antigravity", path: "/tmp/.agents/skills" },
]);

assert.ok(
  antigravityMessages.some((message) => message.includes("agent-overload-recovery.md")),
  "Antigravity installs should point users to the overload recovery guide",
);
assert.ok(
  antigravityMessages.some((message) => message.includes("activate-skills.sh")),
  "Antigravity installs should mention the Unix activation flow",
);
assert.ok(
  antigravityMessages.some((message) => message.includes("activate-skills.bat")),
  "Antigravity installs should mention the Windows activation flow",
);
assert.ok(
  antigravityMessages.some((message) => message.includes("--agy")),
  "Antigravity installs should point agy CLI users to the flat CLI layout",
);

const agyMessages = installer.getPostInstallMessages([
  { name: "Antigravity CLI", path: "/tmp/.gemini/antigravity-cli/skills", layout: "flat-markdown" },
]);

assert.ok(
  agyMessages.some((message) => message.includes("/skills")),
  "Antigravity CLI installs should tell users how to verify slash commands",
);

const codexMessages = installer.getPostInstallMessages([
  { name: "Codex CLI", path: "/tmp/.codex/skills" },
]);

assert.strictEqual(
  codexMessages.some((message) => message.includes("agent-overload-recovery.md")),
  false,
  "Non-Antigravity installs should not emit the Antigravity-specific overload hint",
);

const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "agy-install-fixture-"));
try {
  const tempDir = path.join(fixtureRoot, "repo");
  const targetDir = path.join(fixtureRoot, "agy-skills");
  const alphaDir = path.join(tempDir, "skills", "alpha");
  const nestedDir = path.join(tempDir, "skills", "security", "audit");
  fs.mkdirSync(alphaDir, { recursive: true });
  fs.mkdirSync(nestedDir, { recursive: true });
  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(path.join(alphaDir, "SKILL.md"), "---\nname: alpha\n---\n\n# Alpha\n", "utf8");
  fs.writeFileSync(path.join(nestedDir, "SKILL.md"), "---\nname: audit\n---\n\n# Audit\n", "utf8");

  assert.deepStrictEqual(
    installer.getManagedEntries(["alpha", "security/audit", "docs"], { layout: "flat-markdown" }),
    ["alpha.md", "audit.md"],
    "agy CLI flat installs should track markdown skill files instead of skill directories",
  );

  installer.installSkillsIntoFlatMarkdownTarget(tempDir, targetDir, [
    "alpha",
    "security/audit",
    "docs",
  ]);

  assert.strictEqual(
    fs.readFileSync(path.join(targetDir, "alpha.md"), "utf8"),
    "---\nname: alpha\n---\n\n# Alpha\n",
  );
  assert.strictEqual(
    fs.readFileSync(path.join(targetDir, "audit.md"), "utf8"),
    "---\nname: audit\n---\n\n# Audit\n",
  );
  assert.strictEqual(
    fs.existsSync(path.join(targetDir, "docs")),
    false,
    "agy CLI flat installs should not copy docs as a slash-command entry",
  );
} finally {
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
}
