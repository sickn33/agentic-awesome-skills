const assert = require("assert");
const fs = require("fs");
const path = require("path");
const Ajv2020 = require("ajv/dist/2020");
const { findProjectRoot } = require("../../lib/project-root");

const AGENT_PLUGIN_SCHEMA_URL = "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json";
const PILOT_BUNDLE_IDS = ["essentials", "skill-author", "aas-agent-mcp-builder"];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function normalizeRelativePath(value) {
  return value.replace(/\\/g, "/").replace(/^\.\//, "");
}

const projectRoot = findProjectRoot(__dirname);
const releaseVersion = readJson(path.join(projectRoot, "package.json")).version;
const bundles = readJson(path.join(projectRoot, "data", "editorial-bundles.json")).bundles;
const codexMarketplace = readJson(
  path.join(projectRoot, ".agents", "plugins", "marketplace.json"),
);
const claudeMarketplace = readJson(
  path.join(projectRoot, ".claude-plugin", "marketplace.json"),
);
const schema = readJson(
  path.join(projectRoot, "tools", "schemas", "agent-plugins", "1.0.0", "plugin.schema.json"),
);
const validateManifest = new Ajv2020({ allErrors: true, strict: true }).compile(schema);

const codexPluginPaths = new Set(
  codexMarketplace.plugins.map((plugin) => normalizeRelativePath(plugin.source.path)),
);
const claudePluginPaths = new Set(
  claudeMarketplace.plugins.map((plugin) => normalizeRelativePath(plugin.source)),
);

let expectedPortableCount = 0;
let actualPortableCount = 0;

for (const bundle of bundles) {
  const relativePluginPath = `plugins/agentic-bundle-${bundle.id}`;
  const pluginRoot = path.join(projectRoot, relativePluginPath);
  const manifestPath = path.join(pluginRoot, "plugin.json");
  const portableSkillNames = bundle.skills.map((skill) => path.posix.basename(skill.id));
  const hasFlatSkills = new Set(portableSkillNames).size === portableSkillNames.length;
  const isCrossHostSafe =
    codexPluginPaths.has(relativePluginPath) && claudePluginPaths.has(relativePluginPath);
  const shouldBePortable = hasFlatSkills && isCrossHostSafe;

  if (!shouldBePortable) {
    assert.ok(
      !fs.existsSync(manifestPath),
      `non-portable bundle must not claim Agent Plugins conformance: ${bundle.id}`,
    );
    continue;
  }

  expectedPortableCount += 1;
  assert.ok(fs.existsSync(manifestPath), `portable bundle manifest must exist: ${bundle.id}`);

  const manifest = readJson(manifestPath);
  actualPortableCount += 1;
  assert.strictEqual(
    validateManifest(manifest),
    true,
    `portable manifest must match the official Agent Plugins 1.0.0 schema: ${bundle.id} ${JSON.stringify(validateManifest.errors)}`,
  );
  assert.strictEqual(manifest.$schema, AGENT_PLUGIN_SCHEMA_URL);
  assert.strictEqual(manifest.name, `agentic-bundle-${bundle.id}`);
  assert.strictEqual(manifest.version, releaseVersion);
  assert.ok(!Object.hasOwn(manifest, "skills"), "portable manifests use fixed component discovery");
  assert.ok(!Object.hasOwn(manifest, "interface"), "host UI metadata must not leak into the portable core");

  const skillsRoot = path.join(pluginRoot, "skills");
  const discoveredSkillNames = fs
    .readdirSync(skillsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const skillManifestPath = path.join(skillsRoot, entry.name, "SKILL.md");
      assert.ok(
        fs.existsSync(skillManifestPath) && fs.statSync(skillManifestPath).isFile(),
        `Agent Plugins only discovers immediate skills children: ${bundle.id}/${entry.name}`,
      );
      return entry.name;
    })
    .sort();
  assert.deepStrictEqual(
    discoveredSkillNames,
    portableSkillNames.sort(),
    `portable bundle skill discovery must be complete: ${bundle.id}`,
  );
}

assert.strictEqual(actualPortableCount, expectedPortableCount);
assert.ok(actualPortableCount > 0, "at least one editorial bundle should be Agent Plugins portable");

for (const bundleId of PILOT_BUNDLE_IDS) {
  assert.ok(
    fs.existsSync(
      path.join(projectRoot, "plugins", `agentic-bundle-${bundleId}`, "plugin.json"),
    ),
    `pilot bundle should be Agent Plugins portable: ${bundleId}`,
  );
}

for (const legacyRoot of ["agentic-awesome-skills", "agentic-awesome-skills-claude"]) {
  assert.ok(
    !fs.existsSync(path.join(projectRoot, "plugins", legacyRoot, "plugin.json")),
    `host-specific root must not claim cross-host portability: ${legacyRoot}`,
  );
}

const invalidManifest = {
  ...readJson(path.join(projectRoot, "plugins", "agentic-bundle-essentials", "plugin.json")),
  skills: "./skills/",
};
assert.strictEqual(validateManifest(invalidManifest), false);
assert.ok(
  validateManifest.errors.some(
    (error) => error.keyword === "additionalProperties" && error.params.additionalProperty === "skills",
  ),
  "the closed schema must reject host-specific top-level fields",
);

console.log(`Agent Plugins manifests verified: ${actualPortableCount}`);
