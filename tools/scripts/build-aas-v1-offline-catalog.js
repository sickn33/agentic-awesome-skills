#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const packageMetadata = require("../../package.json");
const { canonicalJson, sha256 } = require("../lib/aas-v1/canonical-json");
const versions = require("../lib/aas-v1/versions");

const ROOT = path.resolve(__dirname, "../..");
const OUTPUT_ROOT = path.join(ROOT, "data", "aas-v1");
const CONTENT_RELATIVE = "data/aas-v1/skill-content.v1.ndjson";
const INDEX_RELATIVE = "data/aas-v1/skill-content-index.v1.json";
const MANIFEST_RELATIVE = "data/aas-v1/catalog-manifest.v1.json";
const STATIC_ASSETS = [
  "data/catalog.json",
  "data/plugin-compatibility.json",
  "tools/lib/aas-v1/metadata-reviews.v1.json",
  "tools/lib/aas-v1/metadata-overrides.v1.json",
  "tools/lib/aas-v1/ontology.v1.json",
];

function compareStrings(left, right) {
  return left < right ? -1 : (left > right ? 1 : 0);
}

function record(relativePath, bytes) {
  return { path: relativePath, size: bytes.length, sha256: sha256(bytes) };
}

function buildArtifacts() {
  const index = JSON.parse(fs.readFileSync(path.join(ROOT, "skills_index.json"), "utf8"));
  const entries = [...index].sort((left, right) => compareStrings(left.id, right.id));
  const seen = new Set();
  const lines = [];
  const contentIndex = { schemaVersion: 1, entries: {} };
  let offset = 0;
  for (const entry of entries) {
    if (seen.has(entry.id)) throw new Error(`Duplicate canonical skill ID: ${entry.id}`);
    seen.add(entry.id);
    const relativeSkillPath = `${entry.path}/SKILL.md`;
    const skillPath = path.resolve(ROOT, ...relativeSkillPath.split("/"));
    if (skillPath !== ROOT && !skillPath.startsWith(`${ROOT}${path.sep}`)) throw new Error(`Skill path escaped root: ${entry.id}`);
    const text = fs.readFileSync(skillPath, "utf8");
    const line = Buffer.from(`${canonicalJson({ id: entry.id, text, sha256: sha256(Buffer.from(text)) })}\n`);
    lines.push(line);
    contentIndex.entries[entry.id] = {
      offset,
      length: line.length,
      sha256: sha256(line),
    };
    offset += line.length;
  }
  const contentBytes = Buffer.concat(lines);
  const indexBytes = Buffer.from(`${canonicalJson(contentIndex)}\n`);
  const generated = new Map([
    [CONTENT_RELATIVE, contentBytes],
    [INDEX_RELATIVE, indexBytes],
  ]);
  const assets = [
    ...STATIC_ASSETS.map((relativePath) => record(relativePath, fs.readFileSync(path.join(ROOT, ...relativePath.split("/"))))),
    ...[...generated].map(([relativePath, bytes]) => record(relativePath, bytes)),
  ].sort((left, right) => compareStrings(left.path, right.path));
  const catalogDigest = sha256(canonicalJson({ digestVersion: 1, assets }));
  const manifest = {
    schemaVersion: 1,
    package: packageMetadata.name,
    packageVersion: packageMetadata.version,
    metadataSchemaVersion: versions.metadataSchemaVersion,
    digestVersion: 1,
    catalogDigest,
    assets,
    skillCount: entries.length,
  };
  generated.set(MANIFEST_RELATIVE, Buffer.from(`${canonicalJson(manifest)}\n`));
  return { catalogDigest, generated, manifest };
}

function main() {
  const check = process.argv.includes("--check");
  const { generated, manifest } = buildArtifacts();
  const stale = [];
  for (const [relativePath, bytes] of generated) {
    const outputPath = path.join(ROOT, ...relativePath.split("/"));
    if (!fs.existsSync(outputPath) || !fs.readFileSync(outputPath).equals(bytes)) stale.push(relativePath);
    if (!check) {
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, bytes, { mode: 0o644 });
    }
  }
  if (check && stale.length) throw new Error(`Offline catalog assets are stale: ${stale.join(", ")}`);
  process.stdout.write(`${check ? "Validated" : "Wrote"} ${manifest.skillCount} skill records; catalog ${manifest.catalogDigest}.\n`);
}

if (require.main === module) main();

module.exports = { buildArtifacts };
