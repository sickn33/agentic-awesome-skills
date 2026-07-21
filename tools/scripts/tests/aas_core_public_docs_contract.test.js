#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "../../..");
const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));

const publicRoots = [
  "README.md",
  "docs/users",
  "docs/vietnamese",
  "docs_zh-CN",
  "docs/integrations",
  "docs/maintainers/repo-growth-seo.md",
  "apps/web-app/index.html",
  "apps/web-app/public/llms.txt",
  "apps/web-app/public/site.webmanifest",
  "apps/web-app/src/data/seoLandingPages.json",
  "apps/web-app/src/pages/Home.tsx",
  "apps/web-app/src/pages/SkillDetail.tsx",
  "apps/web-app/src/utils/seo.ts",
];

const publicExtensions = new Set([".html", ".json", ".md", ".ts", ".tsx", ".txt"]);

function collectPublicFiles(relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  const stat = fs.statSync(absolutePath);
  if (stat.isFile()) return [relativePath];

  return fs.readdirSync(absolutePath, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name))
    .flatMap((entry) => {
      const child = path.join(relativePath, entry.name);
      if (entry.isDirectory()) return collectPublicFiles(child);
      return publicExtensions.has(path.extname(entry.name)) ? [child] : [];
    });
}

const publicFiles = publicRoots.flatMap(collectPublicFiles);

for (const relativePath of publicFiles) {
  const content = fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
  assert.doesNotMatch(
    content,
    /\brecommend_stack\b/,
    `${relativePath} must not document the retired Core recommendation tool`,
  );
  assert.doesNotMatch(
    content,
    /"schemaVersion"\s*:\s*1(?=\s*[,}])/,
    `${relativePath} must not publish a legacy Core stack example`,
  );
  assert.doesNotMatch(
    content,
    /"intent"\s*:/,
    `${relativePath} must use the schema 2 profile field instead of intent`,
  );

  const affirmativeCoreSelectionClaims = content.match(
    /\b(?:AAS Core|Core preview)[^.\n]{0,180}\b(?:recommend(?:s|ed|ing|ation|ations)?|rank(?:s|ed|ing)?)\b[^.\n]*/gi,
  ) || [];
  for (const claim of affirmativeCoreSelectionClaims) {
    assert.match(
      claim,
      /\b(?:does not|do not|never|no (?:relevance )?(?:score|ranking|recommendation)|not (?:the )?output)\b/i,
      `${relativePath} must attribute semantic selection to the coding agent, not Core: ${claim}`,
    );
  }

  assert.doesNotMatch(
    content,
    /\bAAS Core(?: preview)?\s+(?:selects|chooses|evaluates|recommends|ranks)\b/i,
    `${relativePath} must not make Core the semantic decision maker`,
  );
}

const coreGuide = fs.readFileSync(path.join(repoRoot, "docs/users/aas-core.md"), "utf8");
const usageGuide = fs.readFileSync(path.join(repoRoot, "docs/users/usage.md"), "utf8");
const readme = fs.readFileSync(path.join(repoRoot, "README.md"), "utf8");
const validityBoundary = /Structural and identity validity does not certify semantic fit, compatibility, setup correctness, operational safety, or safety to apply\./;
assert.match(coreGuide, new RegExp(`--package=agentic-awesome-skills@${packageJson.version.replaceAll(".", "\\.")}`));
assert.doesNotMatch(coreGuide, /--package=agentic-awesome-skills@(?:X\.Y\.Z|latest)\b/);
assert.match(coreGuide, validityBoundary);
assert.match(readme, validityBoundary);
assert.doesNotMatch(coreGuide, /selectable, and usable/i);
assert.doesNotMatch(readme, /selectable, and usable/i);
assert.match(coreGuide, /"schemaVersion"\s*:\s*2/);
assert.match(coreGuide, /"profile"\s*:\s*\{/);
assert.match(coreGuide, /"skills"\s*:\s*\[\s*\{\s*"id"\s*:/);
assert.match(coreGuide, /stable catalog order and contain no relevance score/i);
assert.match(coreGuide, /Codex or Claude evaluates the returned candidates semantically/i);
for (const guide of [coreGuide, usageGuide]) {
  assert.doesNotMatch(guide, /(?:no |without an? )?arbitrary skill-count cap/i);
  assert.match(guide, /primary capability/i);
  assert.match(guide, /paginate or refine/i);
  assert.match(guide, /compare multiple/i);
  assert.match(guide, /non-redundant/i);
  assert.match(guide, /catalog\s+gaps?/i);
  assert.match(guide, /smallest\s+stack/i);
  assert.match(guide, /no semantic policy|no semantic small-stack policy/i);
  assert.match(guide, /technical maximum of 128/i);
  assert.match(guide, /every current catalog skill[^.\n]{0,180}individually searchable, readable, (?:and )?(?:selectable|available for agent selection)/i);
  assert.match(guide, /compose_stack[\s\S]{0,200}in memory/i);
  assert.match(guide, /client or (?:the )?CLI[\s\S]{0,200}persist/i);
  assert.match(guide, /export_selection_evidence/);
  assert.match(guide, /inspect_selection_evidence/);
  assert.match(guide, /artifact-dir/);
  assert.match(guide, /raw `?search_skills`? queries/i);
  assert.match(guide, /architecture\/runtime/i);
  assert.match(guide, /testing\/quality/i);
  assert.match(guide, /security\/privacy/i);
  assert.match(guide, /deployment\/operations/i);
  assert.match(guide, /maintenance workflow/i);
  assert.match(guide, /not applicable/i);
}

for (const relativePath of ["README.md", "apps/web-app/public/llms.txt"]) {
  const content = fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
  assert.doesNotMatch(content, /(?:no |without an? )?arbitrary (?:skill-)?count cap/i);
  assert.match(content, /no semantic policy|does not rank or recommend/i);
  assert.match(content, /technical maximum of 128/i);
  assert.match(content, /every (?:current )?catalog skill[^.\n]{0,180}(?:individually )?searchable, readable, (?:and )?(?:selectable|available for agent selection)/i);
  assert.match(content, /compose_stack[^.\n]{0,160}in memory/i);
  assert.match(content, /client or (?:the )?(?:`?aas`? )?CLI[^.\n]{0,160}persist/i);
}

for (const relativePath of [
  "apps/web-app/scripts/prerender-routes.js",
  "apps/web-app/src/utils/seo.ts",
  "apps/web-app/public/manifest.webmanifest",
  "apps/web-app/public/site.webmanifest",
]) {
  const content = fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
  assert.doesNotMatch(
    content,
    /\b(?:discover(?:y|ing)?,\s*)?recommend(?:ing|ation)?(?:,\s*validat|\s+and\s+stack review)/i,
    `${relativePath} must not describe current AAS Core as a recommender`,
  );
}

console.log(`AAS Core public documentation contract passed (${publicFiles.length} files scanned).`);
