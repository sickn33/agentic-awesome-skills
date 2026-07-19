#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "../../..");

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
assert.match(coreGuide, /"schemaVersion"\s*:\s*2/);
assert.match(coreGuide, /"profile"\s*:\s*\{/);
assert.match(coreGuide, /"skills"\s*:\s*\[\s*\{\s*"id"\s*:/);
assert.match(coreGuide, /stable catalog order and contain no relevance score/i);
assert.match(coreGuide, /Codex or Claude evaluates the returned candidates semantically/i);

console.log(`AAS Core public documentation contract passed (${publicFiles.length} files scanned).`);
