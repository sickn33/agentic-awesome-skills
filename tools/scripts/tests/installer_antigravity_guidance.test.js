const assert = require("assert");
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

const codexMessages = installer.getPostInstallMessages([
  { name: "Codex CLI", path: "/tmp/.codex/skills" },
]);

assert.strictEqual(
  codexMessages.some((message) => message.includes("agent-overload-recovery.md")),
  false,
  "Non-Antigravity installs should not emit the Antigravity-specific overload hint",
);
