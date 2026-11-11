"use strict";

const { execFileSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { decodeGitPath, parseRawDiff, splitNulFields } = require("./git-raw-diff");
const { validateRawRepoPath } = require("./workflow-contract");

const REPOSITORY = "sickn33/agentic-awesome-skills";
const SHA = /^[a-f0-9]{40}$/;
const MARKETPLACE = ".agents/plugins/marketplace.json";
const CODEX_MANIFEST = ".codex-plugin/plugin.json";
const BRANCH_PREFIX = "codex-marketplace/";
const BUNDLE_NAME = /^aasb-[a-z0-9][a-z0-9-]*$/;

function git(repo, args) {
  return execFileSync("git", args, { cwd: repo, timeout: 30_000, maxBuffer: 16 * 1024 * 1024 });
}

function treeEntries(repo, base, directory) {
  const rows = splitNulFields(git(repo, ["ls-tree", "-r", "-z", base, "--", directory]), { allowEmpty: true });
  return rows.map(row => {
    const tab = row.indexOf(9);
    if (tab < 0) throw new Error("Invalid marketplace Git tree entry");
    const match = /^(100644) blob ([a-f0-9]{40})$/.exec(row.subarray(0, tab).toString("ascii"));
    const file = decodeGitPath(row.subarray(tab + 1));
    if (!match || !validateRawRepoPath(file).safe) {
      throw new Error(`Unsafe or non-regular marketplace file: ${JSON.stringify(file)}`);
    }
    return { file, mode: match[1], oid: match[2] };
  });
}

function readJsonBlob(repo, oid) {
  return JSON.parse(git(repo, ["cat-file", "blob", oid]).toString("utf8"));
}

function planCodexMarketplaceHotfix(repo, base) {
  if (!SHA.test(base)) throw new Error("Marketplace hotfix requires an immutable base SHA");
  const [marketplaceEntry] = treeEntries(repo, base, MARKETPLACE);
  if (!marketplaceEntry) throw new Error("Missing Codex marketplace on protected base");
  const marketplace = readJsonBlob(repo, marketplaceEntry.oid);
  const copies = new Map();
  const names = new Set();

  for (const entry of marketplace.plugins) {
    const name = entry.name;
    if (names.has(name)) throw new Error(`Duplicate Codex marketplace entry: ${name}`);
    names.add(name);
    if (!BUNDLE_NAME.test(name)) continue;
    const source = `plugins/agentic-bundle-${name.slice("aasb-".length)}`;
    if (entry.source?.source !== "local" || entry.source.path !== `./${source}`) continue;

    const files = treeEntries(repo, base, source);
    const portable = files.find(file => file.file === `${source}/plugin.json`);
    if (!portable) continue;
    const portableManifest = readJsonBlob(repo, portable.oid);
    if (portableManifest.name === name) continue;
    const codex = files.find(file => file.file === `${source}/${CODEX_MANIFEST}`);
    const codexManifest = codex && readJsonBlob(repo, codex.oid);
    if (portableManifest.name !== path.posix.basename(source) || codexManifest?.name !== name
        || codexManifest.skills !== "./skills/" || codexManifest.version !== portableManifest.version) {
      throw new Error(`Unexpected manifest identity or layout for ${name}`);
    }

    const destination = `plugins/${name}`;
    if (git(repo, ["ls-tree", "-z", base, "--", destination]).length > 0) {
      throw new Error(`Codex marketplace destination already exists: ${destination}`);
    }
    let hasSkills = false;
    for (const file of files) {
      const relative = file.file.slice(source.length + 1);
      if (relative.startsWith("skills/") && relative.endsWith("/SKILL.md")) hasSkills = true;
      if (relative === CODEX_MANIFEST || relative.startsWith("skills/") || relative.startsWith("assets/")) {
        copies.set(`${destination}/${relative}`, file);
      }
    }
    if (!hasSkills) throw new Error(`Missing shipped skills for ${name}`);
    entry.source.path = `./${destination}`;
  }

  const bytes = Buffer.from(JSON.stringify(marketplace, null, 2) + "\n");
  const marketplaceOid = createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
  return { bytes, copies, marketplaceEntry, marketplaceOid };
}

function resolveCodexMarketplaceHotfix(repo, base, head, pr) {
  if (pr?.base?.repo?.full_name !== REPOSITORY || pr?.head?.repo?.full_name !== REPOSITORY
      || pr?.user?.login !== REPOSITORY.split("/")[0] || pr?.base?.ref !== "main"
      || typeof pr?.head?.ref !== "string" || !pr.head.ref.startsWith(BRANCH_PREFIX)
      || pr.base.sha !== base || pr.head.sha !== head) return [];
  if (!SHA.test(base) || !SHA.test(head)) throw new Error("Immutable marketplace PR endpoints required");
  const parents = git(repo, ["show", "-s", "--format=%P", head]).toString().trim();
  if (parents !== base) throw new Error("Marketplace hotfix must be one commit on exact protected main");

  const plan = planCodexMarketplaceHotfix(repo, base);
  const records = parseRawDiff(git(repo, ["diff", "--raw", "--no-abbrev", "-z", "--no-renames", base, head]));
  if (!plan.copies.size || records.length !== plan.copies.size + 1) {
    throw new Error("Marketplace hotfix must contain the complete derived copy and only that copy");
  }
  for (const record of records) {
    const file = record.new_path;
    const expected = plan.copies.get(file);
    const valid = file === MARKETPLACE
      ? record.status === "M" && record.old_path === MARKETPLACE
        && record.old_mode === plan.marketplaceEntry.mode && record.old_oid === plan.marketplaceEntry.oid
        && record.new_mode === "100644" && record.new_oid === plan.marketplaceOid
      : record.status === "A" && expected?.mode === record.new_mode && expected.oid === record.new_oid;
    if (!valid) throw new Error(`Unexpected marketplace hotfix change: ${JSON.stringify(file || record.old_path)}`);
  }
  return records.map(record => record.new_path);
}

function writeCodexMarketplaceHotfix(repo) {
  if (git(repo, ["status", "--porcelain", "--untracked-files=normal"]).length) {
    throw new Error("Run the Codex marketplace hotfix generator in a clean checkout");
  }
  const base = git(repo, ["rev-parse", "HEAD"]).toString().trim();
  if (git(repo, ["rev-parse", "origin/main"]).toString().trim() !== base) {
    throw new Error("The Codex marketplace hotfix requires current origin/main");
  }
  const plan = planCodexMarketplaceHotfix(repo, base);
  if (!plan.copies.size) throw new Error("No published Codex bundle has a shadowing portable manifest");
  const packageRoots = new Set([...plan.copies.keys()].map(file => file.split("/").slice(0, 2).join("/")));
  for (const directory of packageRoots) fs.mkdirSync(path.join(repo, directory));
  for (const [destination, source] of plan.copies) {
    const target = path.join(repo, destination);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(repo, source.file), target, fs.constants.COPYFILE_EXCL);
  }
  fs.writeFileSync(path.join(repo, MARKETPLACE), plan.bytes);
  return packageRoots.size;
}

if (require.main === module) {
  try {
    const count = writeCodexMarketplaceHotfix(process.cwd());
    process.stdout.write(`Isolated ${count} published Codex bundle packages.\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = { planCodexMarketplaceHotfix, resolveCodexMarketplaceHotfix };
