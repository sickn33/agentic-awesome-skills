const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { findProjectRoot } = require("../../lib/project-root");

const projectRoot = findProjectRoot(__dirname);
const marketplacePath = path.join(projectRoot, ".claude-plugin", "marketplace.json");
const editorialBundlesPath = path.join(projectRoot, "data", "editorial-bundles.json");
const compatibilityPath = path.join(projectRoot, "data", "plugin-compatibility.json");
const marketplace = JSON.parse(fs.readFileSync(marketplacePath, "utf8"));
const editorialBundles = JSON.parse(fs.readFileSync(editorialBundlesPath, "utf8")).bundles || [];
const compatibility = JSON.parse(fs.readFileSync(compatibilityPath, "utf8")).skills || [];
const compatibilityById = new Map(compatibility.map((skill) => [skill.id, skill]));

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

assert.ok(Array.isArray(marketplace.plugins), "marketplace.json must define a plugins array");
assert.ok(marketplace.plugins.length > 0, "marketplace.json must contain at least one plugin");
assert.strictEqual(
  marketplace.plugins[0]?.name,
  "antigravity-awesome-skills",
  "full library Claude plugin should remain the first marketplace entry",
);
assert.strictEqual(
  marketplace.plugins[0]?.source,
  "./plugins/antigravity-awesome-skills-claude",
  "full library Claude plugin should resolve to the filtered plugin directory",
);

const expectedBundlePluginNames = editorialBundles
  .filter((bundle) => bundle.skills.every((skill) => compatibilityById.get(skill.id)?.targets?.claude === "supported"))
  .map((bundle) => `antigravity-bundle-${bundle.id}`);
for (const pluginName of expectedBundlePluginNames) {
  assert.ok(
    marketplace.plugins.some((plugin) => plugin.name === pluginName),
    `marketplace.json must contain bundle plugin ${pluginName}`,
  );
}

for (const bundle of editorialBundles) {
  const pluginName = `antigravity-bundle-${bundle.id}`;
  const included = marketplace.plugins.some((plugin) => plugin.name === pluginName);
  const claudeSupported = bundle.skills.every(
    (skill) => compatibilityById.get(skill.id)?.targets?.claude === "supported",
  );
  assert.strictEqual(
    included,
    claudeSupported,
    `bundle plugin ${pluginName} inclusion should match Claude compatibility`,
  );
}

const pluginRoot = path.join(projectRoot, "plugins", "antigravity-awesome-skills-claude", "skills");
for (const skill of compatibility) {
  const copiedPath = path.join(pluginRoot, ...skill.id.split("/"));
  if (skill.targets.claude === "supported") {
    assert.ok(
      waitForPathState(copiedPath, true),
      `Claude root plugin should include supported skill ${skill.id}`,
    );
  } else {
    assert.ok(
      waitForPathState(copiedPath, false),
      `Claude root plugin should exclude blocked skill ${skill.id}`,
    );
  }
}

for (const plugin of marketplace.plugins) {
  assert.strictEqual(
    typeof plugin.source,
    "string",
    `plugin ${plugin.name || "<unnamed>"} must define source as a string`,
  );
  assert.ok(
    plugin.source.startsWith("./"),
    `plugin ${plugin.name || "<unnamed>"} source must be a repo-relative path starting with ./`,
  );
}

console.log("ok");
