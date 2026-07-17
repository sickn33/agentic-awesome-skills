#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { discoverBundle, sha256 } = require("../../local-skill-reviewer/safe-bundle");
const { tesslAlignedValidation } = require("../../local-skill-reviewer/validation");

const ROOT = path.resolve(__dirname, "../../..");
const GOLD = "/private/tmp/aas-tessl-parity-validation-v2/raw";

function bundle(frontmatter, body, extra = []) {
  const text = `---\n${frontmatter}\n---\n${body}`;
  const primary = { path: "skills/x/SKILL.md", text, bytes: Buffer.from(text), sha256: sha256(Buffer.from(text)), size: Buffer.byteLength(text) };
  return { skillId: "x", files: [primary, ...extra.map((item) => ({ path: `skills/x/${item}`, text: "", bytes: Buffer.alloc(0), sha256: sha256(Buffer.alloc(0)), size: 0 }))] };
}

function status(result, name) { return result.checks.find((item) => item.name === name).status; }

const base = "name: x\ndescription: Use this skill when testing validation.";
let result = tesslAlignedValidation(bundle(base, "\nSee [bad](missing.md) and `references/missing.md`.\n"), "x");
assert.strictEqual(status(result, "relative_links"), "warning");
assert.strictEqual(status(result, "referenced_paths_exist"), "warning");
assert.strictEqual(result.normalized, (16 - 0.5 * 2) / 16);

result = tesslAlignedValidation(bundle(`${base}\nmetadata:\n  version: 1.2.3\n  owner: team`, "\nBody.\n"), "x");
assert.strictEqual(status(result, "metadata_version"), "passed");
assert.strictEqual(status(result, "metadata_field"), "passed");
result = tesslAlignedValidation(bundle(`${base}\nmetadata:\n  owner: team`, "\nBody.\n"), "x");
assert.strictEqual(status(result, "metadata_version"), "warning");
result = tesslAlignedValidation(bundle(`${base}\nrisk: safe\nunknown: value`, "\nBody.\n"), "x");
assert.strictEqual(status(result, "frontmatter_unknown_keys"), "warning");

result = tesslAlignedValidation(bundle(base, `\n${Array.from({ length: 498 }, () => "line").join("\n")}\n`), "x");
assert.strictEqual(status(result, "skill_md_line_count"), "warning");

let goldReplay = "skipped (external frozen artifact unavailable)";
if (fs.existsSync(GOLD)) {
  let matched = 0;
  for (const filename of fs.readdirSync(GOLD).filter((name) => name.endsWith(".unique.json")).sort()) {
    const skillId = Buffer.from(filename.split(".")[0], "base64url").toString("utf8");
    const gold = JSON.parse(fs.readFileSync(path.join(GOLD, filename), "utf8")).view.validation;
    const actual = tesslAlignedValidation(discoverBundle(ROOT, skillId), skillId);
    assert.deepStrictEqual(actual.checks.map(({ name, status: value }) => ({ name, status: value })), gold.checks.map(({ name, status: value }) => ({ name, status: value })), skillId);
    assert.strictEqual(actual.errorCount, gold.errorCount, skillId);
    assert.strictEqual(actual.warningCount, gold.warningCount, skillId);
    assert.strictEqual(actual.normalized, (16 - gold.errorCount - 0.5 * gold.warningCount) / 16, skillId);
    matched += 1;
  }
  assert.strictEqual(matched, 25);
  goldReplay = `${matched}/25 frozen gold bundles`;
}

process.stdout.write(`ok - Tessl-aligned validation fixtures; gold replay ${goldReplay}\n`);
