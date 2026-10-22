const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { pack, headCommit, readTarballGitHead } = require("../distribution_pack.cjs");

const root = fs.mkdtempSync(path.join(os.tmpdir(), "aas-pack-"));
const out = fs.mkdtempSync(path.join(os.tmpdir(), "aas-pack-out-"));
const git = (...args) => execFileSync("git", args, { cwd: root, stdio: "pipe" });
try {
  git("init");
  git("config", "user.email", "test@example.test");
  git("config", "user.name", "AAS test");
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: "aas-pack-fixture", version: "1.0.0" }, null, 2) + "\n");
  fs.writeFileSync(path.join(root, "index.js"), "module.exports = 1;\n");
  git("add", ".");
  git("commit", "-m", "fixture");
  const commit = headCommit(root);
  const before = fs.readFileSync(path.join(root, "package.json"));

  const result = pack(root, out);
  assert.equal(result.commit, commit, "the packer records HEAD as the release commit");
  assert.equal(path.basename(result.tarball), "package.tgz", "the packed candidate keeps the expected artifact name");
  assert.equal(readTarballGitHead(result.tarball), commit, "the packed manifest records gitHead for the registry");
  const originalPath = process.env.PATH;
  try {
    process.env.PATH = "";
    assert.equal(readTarballGitHead(result.tarball), commit, "manifest verification must not depend on a platform tar executable");
  } finally { process.env.PATH = originalPath; }
  assert.ok(fs.readFileSync(path.join(root, "package.json")).equals(before), "the working tree package.json is restored byte-for-byte");

  fs.writeFileSync(path.join(root, "untracked.txt"), "drift");
  assert.throws(() => pack(root, out), /unsealed tree/i, "an untracked source file must fail closed");
  fs.rmSync(path.join(root, "untracked.txt"));

  fs.writeFileSync(path.join(root, "index.js"), "module.exports = 2;\n");
  assert.throws(() => pack(root, out), /unsealed tree/i, "a modified tracked file must fail closed");
  git("add", "index.js");
  let error, staged;
  try {staged=pack(root,out);} catch(e) {error=e;}
  if(staged) console.log(JSON.stringify({unexpectedAcceptedStagedPayload:execFileSync('tar',['-xzOf',staged.tarball,'package/index.js'],{encoding:'utf8'}),claimedHead:readTarballGitHead(staged.tarball)}));
  assert.ok(error,'staged bytes differing from the claimed release HEAD must fail');
  assert.match(error.message,/unsealed tree/i);
} finally {
  fs.rmSync(root, { recursive: true, force: true });
  fs.rmSync(out, { recursive: true, force: true });
}
console.log("Distribution pack records the release commit and refuses unsealed trees");
