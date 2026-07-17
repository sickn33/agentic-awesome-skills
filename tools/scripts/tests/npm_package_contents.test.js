const assert = require("assert");
const { spawnSync } = require("child_process");
const path = require("path");
const os = require("os");
const packageJson = require(path.resolve(__dirname, "..", "..", "..", "package.json"));

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

function runNpmPackDryRunJson() {
  const result = spawnSync(npmCommand, ["pack", "--dry-run", "--json"], {
    cwd: repoRoot,
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

assert.ok(packagedFiles.has("tools/bin/install.js"), "published package must include tools/bin/install.js");
assert.ok(packagedFiles.has("tools/bin/aas.js"), "published package must include tools/bin/aas.js");
assert.ok(packagedFiles.has("tools/bin/aas-mcp.js"), "published package must include tools/bin/aas-mcp.js");
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
