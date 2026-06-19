const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { findProjectRoot } = require("../../lib/project-root");

const projectRoot = findProjectRoot(__dirname);
const marketplacePath = path.join(projectRoot, ".agents", "plugins", "marketplace.json");
const editorialBundlesPath = path.join(projectRoot, "data", "editorial-bundles.json");
const compatibilityPath = path.join(projectRoot, "data", "plugin-compatibility.json");
const packageJsonPath = path.join(projectRoot, "package.json");
const marketplace = JSON.parse(fs.readFileSync(marketplacePath, "utf8"));
const editorialBundles = JSON.parse(fs.readFileSync(editorialBundlesPath, "utf8")).bundles || [];
const compatibility = JSON.parse(fs.readFileSync(compatibilityPath, "utf8")).skills || [];
const compatibilityById = new Map(compatibility.map((skill) => [skill.id, skill]));
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function waitForPathState(filePath, shouldExist, attempts = 5, delayMs = 50) {
  for (let index = 0; index < attempts; index += 1) {
    if (fs.existsSync(filePath) === shouldExist) {
      return true;
    }
    if (index < attempts - 1) {
      sleep(delayMs);
    }
  }
  return fs.existsSync(filePath) === shouldExist;
}

assert.strictEqual(
  marketplace.name,
  "antigravity-awesome-skills",
  "Codex marketplace name should match the repository plugin name",
);
assert.strictEqual(
  marketplace.interface?.displayName,
  "Antigravity Awesome Skills",
  "Codex marketplace display name should be present",
);
assert.ok(Array.isArray(marketplace.plugins), "marketplace.json must define a plugins array");
assert.ok(marketplace.plugins.length > 0, "marketplace.json must contain at least one plugin");
assert.strictEqual(
  marketplace.plugins[0]?.name,
  "antigravity-awesome-skills",
  "full library Codex plugin should remain the first marketplace entry",
);

const pluginEntry = marketplace.plugins.find((plugin) => plugin.name === "antigravity-awesome-skills");
assert.ok(pluginEntry, "marketplace.json must include the antigravity-awesome-skills plugin entry");
assert.deepStrictEqual(
  pluginEntry.source,
  {
    source: "local",
    path: "./plugins/antigravity-awesome-skills",
  },
  "Codex plugin entry should resolve to the repo-local plugin directory",
);
assert.strictEqual(
  pluginEntry.policy?.installation,
  "AVAILABLE",
  "Codex plugin entry must include policy.installation",
);
assert.strictEqual(
  pluginEntry.policy?.authentication,
  "ON_INSTALL",
  "Codex plugin entry must include policy.authentication",
);
assert.strictEqual(
  pluginEntry.category,
  "Productivity",
  "Codex plugin entry must include a category",
);

const pluginRoot = path.join(projectRoot, "plugins", "antigravity-awesome-skills");
const pluginManifestPath = path.join(pluginRoot, ".codex-plugin", "plugin.json");
const pluginManifest = JSON.parse(fs.readFileSync(pluginManifestPath, "utf8"));

assert.strictEqual(pluginManifest.name, "antigravity-awesome-skills");
assert.strictEqual(pluginManifest.version, packageJson.version);
assert.strictEqual(pluginManifest.skills, "./skills/");

const pluginSkillsPath = path.join(pluginRoot, "skills");
assert.ok(fs.existsSync(pluginSkillsPath), "Codex plugin skills path must exist");
assert.ok(fs.statSync(pluginSkillsPath).isDirectory(), "Codex plugin skills path must be a directory");
for (const skill of compatibility) {
  const copiedPath = path.join(pluginSkillsPath, ...skill.id.split("/"));
  if (skill.targets.codex === "supported") {
    assert.ok(
      waitForPathState(copiedPath, true),
      `Codex root plugin should include supported skill ${skill.id}`,
    );
  } else {
    assert.ok(
      waitForPathState(copiedPath, false),
      `Codex root plugin should exclude blocked skill ${skill.id}`,
    );
  }
}

for (const bundle of editorialBundles) {
  const bundlePluginName = `agyb-${bundle.id}`;
  const bundlePluginPath = `antigravity-bundle-${bundle.id}`;
  const bundleEntry = marketplace.plugins.find((plugin) => plugin.name === bundlePluginName);
  const codexSupported = bundle.skills.every(
    (skill) => compatibilityById.get(skill.id)?.targets?.codex === "supported",
  );

  if (!codexSupported) {
    assert.ok(!bundleEntry, `marketplace.json must exclude incompatible bundle plugin ${bundlePluginName}`);
    continue;
  }

  assert.ok(bundleEntry, `marketplace.json must include bundle plugin ${bundlePluginName}`);
  assert.deepStrictEqual(
    bundleEntry.source,
    {
      source: "local",
      path: `./plugins/${bundlePluginPath}`,
    },
    `bundle plugin ${bundlePluginName} should resolve to the expected repo-local directory`,
  );
  assert.strictEqual(
    bundleEntry.category,
    bundle.group.replace(/^[^A-Za-z0-9]+/, "").trim(),
    `bundle plugin ${bundlePluginName} should derive its category from the bundle group`,
  );
}

console.log("ok");
