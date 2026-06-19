const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { findProjectRoot } = require("../../lib/project-root");

function normalizeRelativePath(value) {
  return value.replace(/\\/g, "/").replace(/^\.\//, "");
}

const projectRoot = findProjectRoot(__dirname);
const pluginsRoot = path.join(projectRoot, "plugins");
const claudeMarketplace = JSON.parse(
  fs.readFileSync(path.join(projectRoot, ".claude-plugin", "marketplace.json"), "utf8"),
);
const codexMarketplace = JSON.parse(
  fs.readFileSync(path.join(projectRoot, ".agents", "plugins", "marketplace.json"), "utf8"),
);

const claudePluginPaths = new Set(
  claudeMarketplace.plugins.map((plugin) => normalizeRelativePath(plugin.source)),
);
const codexPluginPaths = new Set(
  codexMarketplace.plugins.map((plugin) => normalizeRelativePath(plugin.source.path)),
);
const knownPluginPaths = new Set([...claudePluginPaths, ...codexPluginPaths]);

for (const relativePluginPath of knownPluginPaths) {
  const pluginDir = path.join(projectRoot, relativePluginPath);
  assert.ok(fs.existsSync(pluginDir), `plugin directory must exist: ${relativePluginPath}`);
  assert.ok(fs.statSync(pluginDir).isDirectory(), `plugin path must be a directory: ${relativePluginPath}`);

  const skillsDir = path.join(pluginDir, "skills");
  assert.ok(fs.existsSync(skillsDir), `plugin skills dir must exist: ${relativePluginPath}`);
  assert.ok(fs.statSync(skillsDir).isDirectory(), `plugin skills dir must be a directory: ${relativePluginPath}`);

  const skillMarkdownFiles = [];
  const stack = [skillsDir];
  while (stack.length > 0) {
    const currentDir = stack.pop();
    for (const child of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const childPath = path.join(currentDir, child.name);
      if (child.isDirectory()) {
        stack.push(childPath);
      } else if (child.isFile() && child.name === "SKILL.md") {
        skillMarkdownFiles.push(childPath);
      }
    }
  }
  assert.ok(skillMarkdownFiles.length > 0, `plugin must contain at least one skill: ${relativePluginPath}`);

  const codexManifestPath = path.join(pluginDir, ".codex-plugin", "plugin.json");
  if (fs.existsSync(codexManifestPath)) {
    const codexManifest = JSON.parse(fs.readFileSync(codexManifestPath, "utf8"));
    assert.strictEqual(codexManifest.skills, "./skills/");
    assert.ok(
      codexMarketplace.plugins.some((plugin) => plugin.name === codexManifest.name),
      `Codex marketplace should expose ${codexManifest.name}`,
    );
  }

  const claudeManifestPath = path.join(pluginDir, ".claude-plugin", "plugin.json");
  if (fs.existsSync(claudeManifestPath)) {
    const claudeManifest = JSON.parse(fs.readFileSync(claudeManifestPath, "utf8"));
    assert.ok(
      claudeMarketplace.plugins.some((plugin) => plugin.name === claudeManifest.name),
      `Claude marketplace should expose ${claudeManifest.name}`,
    );
  }
}

for (const entry of fs.readdirSync(pluginsRoot, { withFileTypes: true })) {
  if (!entry.isDirectory()) {
    continue;
  }

  const relativePluginPath = normalizeRelativePath(path.join("plugins", entry.name));
  if (entry.name.startsWith("antigravity-bundle-") || entry.name === "antigravity-awesome-skills" || entry.name === "antigravity-awesome-skills-claude") {
    assert.ok(
      knownPluginPaths.has(relativePluginPath),
      `generated plugin directory should be represented in a marketplace: ${relativePluginPath}`,
    );
  }
}

console.log("ok");
