#!/usr/bin/env node
// Offline citation-library consistency checks. This intentionally does not
// fetch URLs; it validates the local allow-list contract used by sanitizers.

import { loadLibrary, matchesFrameworkVersion } from '../lib/citations.mjs';

const URL_RE = /^https:\/\/[A-Za-z0-9.-]+\/\S*$/;
const SKILL_REF_RE = /^[\w-]+:[\w-]+$/;
const BANNED_STALE_URLS = new Set([
  'https://nextjs.org/docs/app/api-reference/functions/cache-life',
  'https://nextjs.org/docs/app/api-reference/functions/cache-tag',
  'https://nextjs.org/docs/app/api-reference/functions/revalidate-tag',
  'https://nextjs.org/docs/app/api-reference/functions/revalidate-path',
  'https://nextjs.org/docs/app/api-reference/functions/cache',
]);

async function main() {
  const lib = await loadLibrary();
  const errors = [];

  if (!Array.isArray(lib.urls)) errors.push('docs-library.urls must be an array');
  if (!Array.isArray(lib.ruleSkillRefs)) errors.push('docs-library.ruleSkillRefs must be an array');

  for (const [i, entry] of (lib.urls ?? []).entries()) {
    const label = `urls[${i}]`;
    if (!URL_RE.test(entry?.url ?? '')) errors.push(`${label}.url must be an https URL`);
    if (BANNED_STALE_URLS.has(entry?.url)) {
      errors.push(`${label}.url uses a stale Next.js docs path: ${entry.url}`);
    }
    if (typeof entry.topic !== 'string' || entry.topic.trim() === '') errors.push(`${label}.topic is required`);
    if (!Array.isArray(entry.appliesTo)) errors.push(`${label}.appliesTo must be an array`);
    validateFrameworks(entry.applicableFrameworks, `${label}.applicableFrameworks`, errors);
  }

  const seenRules = new Set();
  for (const [i, entry] of (lib.ruleSkillRefs ?? []).entries()) {
    const label = `ruleSkillRefs[${i}]`;
    const ref = `${entry?.skill ?? ''}:${entry?.rule ?? ''}`;
    if (!SKILL_REF_RE.test(ref)) errors.push(`${label} must contain skill + rule identifiers`);
    if (seenRules.has(ref)) errors.push(`${label} duplicate: ${ref}`);
    seenRules.add(ref);
    if (typeof (entry.description ?? entry.topic) !== 'string' || (entry.description ?? entry.topic).trim() === '') {
      errors.push(`${label}.topic or .description is required`);
    }
    validateFrameworks(entry.applicableFrameworks, `${label}.applicableFrameworks`, errors);
  }

  if (errors.length > 0) {
    for (const error of errors) console.error(`[check-citations] ${error}`);
    process.exit(1);
  }

  console.error(`[check-citations] OK — ${lib.urls.length} URLs, ${lib.ruleSkillRefs.length} skill-rule refs`);
}

function validateFrameworks(patterns, label, errors) {
  if (!Array.isArray(patterns) || patterns.length === 0) {
    errors.push(`${label} must be a non-empty array`);
    return;
  }
  for (const pattern of patterns) {
    if (typeof pattern !== 'string' || pattern.trim() === '') {
      errors.push(`${label} contains an empty pattern`);
      continue;
    }
    if (pattern === '*') continue;
    // Smoke-check parser coverage with a modern Next version. Unknown framework
    // patterns are still valid as long as the syntax is recognizable.
    if (!/^[\w-]+@(?:\*|\d+(?:\.\d+){0,2}|[<>]=?\s*\d+(?:\.\d+){0,2})(?:\s*\|\|\s*[\w-]+@(?:\*|\d+(?:\.\d+){0,2}|[<>]=?\s*\d+(?:\.\d+){0,2}))*$/.test(pattern)) {
      errors.push(`${label} has unsupported pattern: ${pattern}`);
      continue;
    }
    matchesFrameworkVersion(pattern, 'next', '16.0.0');
  }
}

main().catch((err) => {
  console.error('[check-citations] FAILED:', err.message);
  console.error(err.stack);
  process.exit(1);
});
