const assert = require("assert");
const fs = require("fs");
const path = require("path");

const { platformKey } = require("../run_actionlint");

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const config = JSON.parse(
  fs.readFileSync(path.join(repoRoot, "tools", "config", "actionlint.json"), "utf8"),
);
const workflow = fs.readFileSync(
  path.join(repoRoot, ".github", "workflows", "actionlint.yml"),
  "utf8",
);
const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));

assert.strictEqual(config.version, "1.7.12");
for (const key of ["darwin-amd64", "darwin-arm64", "linux-amd64", "linux-arm64"]) {
  assert.match(config.artifacts[key], /^[a-f0-9]{64}$/);
}
assert.strictEqual(platformKey("darwin", "arm64"), "darwin-arm64");
assert.strictEqual(platformKey("linux", "x64"), "linux-amd64");
assert.throws(() => platformKey("win32", "x64"), /Unsupported/);
assert.strictEqual(packageJson.scripts["lint:workflows"], "node tools/scripts/run_actionlint.js");
assert.match(workflow, /npm run lint:workflows/);
assert.doesNotMatch(workflow, /curl\s/);

console.log("ok");
