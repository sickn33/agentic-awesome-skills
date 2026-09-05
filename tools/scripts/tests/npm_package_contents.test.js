const assert = require("assert");
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");
const packageJson = require(path.resolve(__dirname, "..", "..", "..", "package.json"));

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

function runNpmPackDryRunJson(cwd = repoRoot) {
  const result = spawnSync(npmCommand, ["pack", "--dry-run", "--json"], {
    cwd,
    encoding: "utf8",
    shell: process.platform === "win32",
    env: { ...process.env, npm_config_cache: path.join(os.tmpdir(), "aas-npm-pack-test-cache") },
  });

  if (result.error) {
    throw result.error;
  }

  if (typeof result.status !== "number" || result.status !== 0) {
    throw new Error(result.stderr.trim() || "npm pack --dry-run --json failed");
  }

  return JSON.parse(result.stdout);
}

const packOutput = runNpmPackDryRunJson();
assert.ok(Array.isArray(packOutput) && packOutput.length > 0, "npm pack should return package metadata");
for (const dependency of ["ajv", "sanitize-filename", "yaml"]) {
  assert.ok(packOutput[0].bundled.includes(dependency), `published runtime must bundle ${dependency}`);
}

const packagedEntries = new Map(packOutput[0].files.map((file) => [file.path, file]));
const packagedFiles = new Set(packagedEntries.keys());

for (const file of packagedFiles) {
  assert.ok(!file.split("/").includes("__pycache__"), `generated Python cache must not ship: ${file}`);
  assert.ok(!/\.py[co]$/i.test(file), `generated Python bytecode must not ship: ${file}`);
}

// Exercise npm's real directory allowlist and nested ignore behavior without
// writing test debris into canonical skills or relying on local Python caches.
const cacheFixture = fs.mkdtempSync(path.join(os.tmpdir(), "aas-package-cache-"));
try {
  fs.writeFileSync(path.join(cacheFixture, "package.json"), JSON.stringify({
    name: "aas-package-cache-fixture",
    version: "1.0.0",
    files: packageJson.files,
  }));
  fs.copyFileSync(path.join(repoRoot, ".gitignore"), path.join(cacheFixture, ".gitignore"));
  const retained = [
    "skills/sample/SKILL.md",
    "skills/sample/scripts/helper.py",
    "skills/sample/references/example.md",
    "skills/sample/scripts/native.pyd",
    "skills/nested/sample/SKILL.md",
  ];
  const excluded = [
    "skills/sample/scripts/__pycache__/helper.cpython-314.pyc",
    "skills/sample/scripts/__pycache__/cache-metadata.txt",
    "skills/sample/scripts/helper.pyc",
    "skills/nested/sample/helper.pyo",
  ];
  for (const file of [...retained, ...excluded]) {
    const absolute = path.join(cacheFixture, file);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, "inert packaging fixture\n");
  }
  const before = new Set(runNpmPackDryRunJson(cacheFixture)[0].files.map((file) => file.path));
  assert.ok(before.has(excluded[0]), "negative control: root ignores alone do not exclude the cache");
  fs.copyFileSync(path.join(repoRoot, "skills", ".gitignore"), path.join(cacheFixture, "skills", ".gitignore"));
  const after = new Set(runNpmPackDryRunJson(cacheFixture)[0].files.map((file) => file.path));
  for (const file of excluded) assert.ok(!after.has(file), `nested package policy must exclude ${file}`);
  for (const file of retained) assert.ok(after.has(file), `canonical payload must remain available: ${file}`);
} finally {
  fs.rmSync(cacheFixture, { recursive: true, force: true });
}

assert.ok(packagedFiles.has("tools/bin/install.js"), "published package must include tools/bin/install.js");
assert.ok(packagedFiles.has("tools/bin/aas.js"), "published package must include tools/bin/aas.js");
assert.ok(packagedFiles.has("tools/bin/aas-mcp.js"), "published package must include tools/bin/aas-mcp.js");
assert.ok(packagedFiles.has("tools/lib/aas-v1/skill-files.js"), "published MCP must include inert bundle reading");
assert.ok(packagedFiles.has("skills/debugging-strategies/resources/implementation-playbook.md"), "published MCP must include referenced bundle files");
if (process.platform !== "win32") {
  assert.notStrictEqual(
    packagedEntries.get("tools/bin/aas.js").mode & 0o111,
    0,
    "published aas bin must be executable",
  );
  assert.notStrictEqual(
    packagedEntries.get("tools/bin/aas-mcp.js").mode & 0o111,
    0,
    "published aas-mcp bin must be executable",
  );
}
assert.ok(packagedFiles.has("data/aas-v1/catalog-manifest.v1.json"), "published package must include the offline catalog identity");
assert.ok(packagedFiles.has("data/aas-v1/skill-content.v1.ndjson"), "published package must include bounded offline skill content");
assert.ok(packagedFiles.has("schemas/aas-v1/stack-manifest.schema.json"), "published package must include public v1 schemas");
assert.ok(packagedFiles.has("skills/game-development/2d-games/SKILL.md"), "published package must include complete skill source trees");
assert.ok(
  packagedFiles.has("tools/lib/symlink-safety.js"),
  "published package must include tools/lib/symlink-safety.js",
);
assert.strictEqual(
  packageJson.dependencies?.yaml,
  "^2.9.0",
  "published package must declare yaml as a runtime dependency for the installer",
);
assert.strictEqual(
  packageJson.dependencies?.ajv,
  "^8.20.0",
  "published package must declare ajv as a runtime dependency for v1 schema validation",
);

const coreGuide = fs.readFileSync(path.join(repoRoot, "docs", "users", "aas-core.md"), "utf8");
const readme = fs.readFileSync(path.join(repoRoot, "README.md"), "utf8");
assert.strictEqual(
  packageJson.aasCore?.includedFromMajor,
  15,
  "published package must declare the first Core-capable major",
);
assert.ok(
  readme.includes(`https://github.com/sickn33/agentic-awesome-skills/blob/v${packageJson.version}/docs/users/aas-core.md`),
  "published README must link to the AAS Core guide pinned to the exact package release",
);
assert.ok(
  !readme.includes("/blob/main/docs/users/aas-core.md"),
  "published README must not direct package readers to moving main-branch Core instructions",
);
assert.ok(
  coreGuide.includes(`--package=agentic-awesome-skills@${packageJson.version}`),
  "AAS Core onboarding must pin the exact published package version",
);
assert.ok(
  !coreGuide.includes("--package=agentic-awesome-skills@latest"),
  "AAS Core onboarding must not resolve a moving npm dist-tag",
);
assert.ok(
  !/^\s*--runtime-version\b/m.test(coreGuide),
  "AAS Core onboarding command must derive the runtime version from the manifest catalog identity",
);
