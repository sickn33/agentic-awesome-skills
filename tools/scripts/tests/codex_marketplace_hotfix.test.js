"use strict";

const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { resolveCodexMarketplaceHotfix } = require("../../lib/codex-marketplace-hotfix");

const repo = fs.mkdtempSync(path.join(os.tmpdir(), "aas-codex-marketplace-test-"));
const git = (...args) => execFileSync("git", args, { cwd: repo, encoding: "utf8" }).trim();
const source = "plugins/agentic-bundle-essentials";
const target = "plugins/aasb-essentials";
const marketplace = ".agents/plugins/marketplace.json";
const codexManifest = ".codex-plugin/plugin.json";
const skill = "skills/sample/SKILL.md";
const write = (file, data) => {
  const filename = path.join(repo, file);
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, data);
};
const json = (file, data) => write(file, JSON.stringify(data, null, 2) + "\n");

try {
  git("init", "-q");
  git("config", "user.email", "marketplace-test@example.test");
  git("config", "user.name", "Marketplace test");
  git("config", "core.filemode", "true");
  const entries = {
    name: "agentic-awesome-skills",
    plugins: [
      { name: "agentic-awesome-skills", source: { source: "local", path: "./plugins/agentic-awesome-skills" } },
      { name: "aasb-essentials", source: { source: "local", path: `./${source}` }, category: "Productivity" },
    ],
  };
  json(marketplace, entries);
  json(`${source}/plugin.json`, { name: "agentic-bundle-essentials", version: "20.7.0" });
  json(`${source}/${codexManifest}`, { name: "aasb-essentials", version: "20.7.0", skills: "./skills/" });
  json(`${source}/.claude-plugin/plugin.json`, { name: "agentic-bundle-essentials", version: "20.7.0" });
  write(`${source}/${skill}`, "# Shipped skill\n");
  write(`${source}/assets/logo.png`, Buffer.from([0, 1, 2, 3]));
  write("package.json", '{"version":"20.7.0"}\n');
  git("add", ".");
  git("commit", "-qm", "shipped tree");
  const base = git("rev-parse", "HEAD");
  git("update-ref", "refs/remotes/origin/main", base);

  const cli = path.resolve(__dirname, "../../lib/codex-marketplace-hotfix.js");
  assert.match(execFileSync(process.execPath, [cli], { cwd: repo, encoding: "utf8" }), /Isolated 1 published/);
  const generated = JSON.parse(fs.readFileSync(path.join(repo, marketplace)));
  entries.plugins[1].source.path = `./${target}`;
  assert.deepEqual(generated, entries);
  assert.ok(!fs.existsSync(path.join(repo, target, "plugin.json")));
  assert.ok(!fs.existsSync(path.join(repo, target, ".claude-plugin")));
  git("add", ".");
  git("commit", "-qm", "marketplace hotfix");
  const goodHead = git("rev-parse", "HEAD");
  const metadata = {
    base: { sha: base, ref: "main", repo: { full_name: "sickn33/agentic-awesome-skills" } },
    head: { sha: goodHead, ref: "codex-marketplace/test", repo: { full_name: "sickn33/agentic-awesome-skills" } },
    user: { login: "sickn33" },
  };
  assert.deepEqual(resolveCodexMarketplaceHotfix(repo, base, goodHead, metadata).sort(), [
    marketplace, `${target}/${codexManifest}`, `${target}/assets/logo.png`, `${target}/${skill}`,
  ].sort());
  for (const event of [
    null,
    { ...metadata, user: { login: "other" } },
    { ...metadata, head: { ...metadata.head, repo: { full_name: "fork/repo" } } },
    { ...metadata, head: { ...metadata.head, ref: "codex/ordinary" } },
    { ...metadata, head: { ...metadata.head, sha: base } },
  ]) {
    assert.deepEqual(resolveCodexMarketplaceHotfix(repo, base, goodHead, event), []);
  }

  for (const mutate of [
    () => write(`${target}/${skill}`, "# Unshipped skill\n"),
    () => fs.chmodSync(path.join(repo, target, skill), 0o755),
    () => write(`${target}/plugin.json`, "{}\n"),
    () => fs.rmSync(path.join(repo, target, "assets/logo.png")),
    () => json("package.json", { version: "20.7.1" }),
    () => json(marketplace, { ...entries, name: "another-marketplace" }),
  ]) {
    git("reset", "--hard", goodHead);
    mutate();
    git("add", ".");
    git("commit", "--amend", "-q", "--no-edit");
    const head = git("rev-parse", "HEAD");
    assert.throws(
      () => resolveCodexMarketplaceHotfix(repo, base, head, { ...metadata, head: { ...metadata.head, sha: head } }),
      /complete derived copy|Unexpected marketplace hotfix change/,
    );
  }

  git("reset", "--hard", goodHead);
  git("commit", "--allow-empty", "-qm", "second commit");
  const later = git("rev-parse", "HEAD");
  assert.throws(
    () => resolveCodexMarketplaceHotfix(repo, base, later, { ...metadata, head: { ...metadata.head, sha: later } }),
    /one commit on exact protected main/,
  );
} finally {
  fs.rmSync(repo, { recursive: true, force: true });
}

console.log("Codex marketplace hotfix protection verified");
