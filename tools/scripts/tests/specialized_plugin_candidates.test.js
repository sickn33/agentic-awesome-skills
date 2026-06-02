const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { findProjectRoot } = require("../../lib/project-root");

const projectRoot = findProjectRoot(__dirname);
const candidatesPath = path.join(projectRoot, "data", "specialized-plugin-candidates.json");
const bundlesPath = path.join(projectRoot, "data", "editorial-bundles.json");
const skillsIndexPath = path.join(projectRoot, "data", "skills_index.json");
const codexMarketplacePath = path.join(projectRoot, ".agents", "plugins", "marketplace.json");
const claudeMarketplacePath = path.join(projectRoot, ".claude-plugin", "marketplace.json");

const candidates = JSON.parse(fs.readFileSync(candidatesPath, "utf8")).candidates || [];
const bundles = JSON.parse(fs.readFileSync(bundlesPath, "utf8")).bundles || [];
const skills = JSON.parse(fs.readFileSync(skillsIndexPath, "utf8"));
const codexMarketplace = JSON.parse(fs.readFileSync(codexMarketplacePath, "utf8"));
const claudeMarketplace = JSON.parse(fs.readFileSync(claudeMarketplacePath, "utf8"));

const bundlesById = new Map(bundles.map((bundle) => [bundle.id, bundle]));
const skillsById = new Map(skills.map((skill) => [skill.id, skill]));
const codexPluginNames = new Set(codexMarketplace.plugins.map((plugin) => plugin.name));
const claudePluginNames = new Set(claudeMarketplace.plugins.map((plugin) => plugin.name));

assert.ok(candidates.length >= 10, "specialized plugin candidates should include a meaningful shortlist");

for (const candidate of candidates) {
  assert.match(candidate.id, /^codex-[a-z0-9-]+$/, `candidate ${candidate.id} should use the codex-* id convention`);
  assert.ok(
    candidate.skills.length >= 5 && candidate.skills.length <= 10,
    `candidate ${candidate.id} should stay within the focused 5-10 skill range`,
  );

  const bundle = bundlesById.get(candidate.id);
  assert.ok(bundle, `candidate ${candidate.id} must be enabled in data/editorial-bundles.json`);
  assert.strictEqual(bundle.name, candidate.name, `candidate ${candidate.id} bundle name should match`);
  assert.deepStrictEqual(
    bundle.skills.map((skill) => skill.id),
    candidate.skills,
    `candidate ${candidate.id} bundle skills should match the candidate manifest`,
  );

  const pluginRoot = path.join(projectRoot, "plugins", `antigravity-bundle-${candidate.id}`);
  assert.ok(fs.existsSync(pluginRoot), `candidate ${candidate.id} plugin directory should exist`);
  assert.ok(
    fs.existsSync(path.join(pluginRoot, ".codex-plugin", "plugin.json")),
    `candidate ${candidate.id} should have a Codex plugin manifest`,
  );
  assert.ok(
    fs.existsSync(path.join(pluginRoot, ".claude-plugin", "plugin.json")),
    `candidate ${candidate.id} should have a Claude plugin manifest`,
  );
  assert.ok(
    codexPluginNames.has(`agyb-${candidate.id}`),
    `candidate ${candidate.id} should be listed in the Codex marketplace`,
  );
  assert.ok(
    claudePluginNames.has(`antigravity-bundle-${candidate.id}`),
    `candidate ${candidate.id} should be listed in the Claude marketplace`,
  );

  for (const skillId of candidate.skills) {
    const skill = skillsById.get(skillId);
    assert.ok(skill, `candidate ${candidate.id} references missing skill ${skillId}`);
    assert.strictEqual(skill.plugin?.targets?.codex, "supported", `${skillId} should be Codex plugin-safe`);
    assert.strictEqual(skill.plugin?.targets?.claude, "supported", `${skillId} should be Claude plugin-safe`);
    assert.ok(
      fs.existsSync(path.join(pluginRoot, "skills", ...skillId.split("/"), "SKILL.md")),
      `candidate ${candidate.id} should materialize skill ${skillId}`,
    );
  }
}

console.log("ok");
