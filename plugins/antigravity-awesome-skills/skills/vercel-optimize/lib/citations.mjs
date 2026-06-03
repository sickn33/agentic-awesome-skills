// Curated doc library — the allow-list for recommender citations.

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const LIBRARY_PATH = join(HERE, '..', 'references', 'docs-library.json');

let cached;

export async function loadLibrary() {
  if (cached) return cached;
  const raw = await readFile(LIBRARY_PATH, 'utf-8');
  cached = JSON.parse(raw);
  return cached;
}

export async function isKnownUrl(url) {
  const lib = await loadLibrary();
  return lib.urls.some(e => e.url === url);
}

export async function lookupUrl(url) {
  const lib = await loadLibrary();
  return lib.urls.find(e => e.url === url);
}

export async function lookupSkillRule(ref) {
  const lib = await loadLibrary();
  const m = ref.match(/^([\w-]+):([\w-]+)$/);
  if (!m) return undefined;
  return lib.ruleSkillRefs.find(r => r.skill === m[1] && r.rule === m[2]);
}

// Narrow semver subset: "*", "fw@*", "fw@14", "fw@>=15.0.0", "fw@<X", "fw@X.Y", "fw@X.Y.Z", "a || b".
export function matchesFrameworkVersion(pattern, framework, version) {
  if (pattern === '*') return true;

  if (pattern.includes('||')) {
    return pattern.split('||').map(p => p.trim()).some(p =>
      matchesFrameworkVersion(p, framework, version)
    );
  }

  const m = pattern.match(/^([\w-]+)@(.+)$/);
  if (!m) return false;
  const [, fw, range] = m;

  if (fw !== framework) return false;
  if (range === '*') return true;

  const verParts = parseVersion(version);
  if (!verParts) return false;

  let m2 = range.match(/^>=\s*(.+)$/);
  if (m2) {
    const min = parseVersion(m2[1]);
    return min ? compareVersion(verParts, min) >= 0 : false;
  }

  m2 = range.match(/^<\s*(.+)$/);
  if (m2) {
    const max = parseVersion(m2[1]);
    return max ? compareVersion(verParts, max) < 0 : false;
  }

  if (/^\d+$/.test(range)) {
    return verParts[0] === Number(range);
  }

  m2 = range.match(/^(\d+)\.(\d+)$/);
  if (m2) {
    return verParts[0] === Number(m2[1]) && verParts[1] === Number(m2[2]);
  }

  const exact = parseVersion(range);
  if (exact) return compareVersion(verParts, exact) === 0;

  return false;
}

function parseVersion(v) {
  const m = String(v).replace(/^[v^~]+/, '').match(/^(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
  if (!m) return null;
  return [Number(m[1]) || 0, Number(m[2]) || 0, Number(m[3]) || 0];
}

function compareVersion(a, b) {
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

// Filtered subset embedded in recommender prompt — LLM never sees URLs for features not in user's stack.
export async function libraryForStack(framework, version) {
  const lib = await loadLibrary();
  const matches = (frameworks) =>
    frameworks.some(p => matchesFrameworkVersion(p, framework, version) || p === '*');
  return {
    urls: lib.urls.filter(e => matches(e.applicableFrameworks)),
    ruleSkillRefs: lib.ruleSkillRefs.filter(r => matches(r.applicableFrameworks)),
  };
}

export async function sanitizeCitations(rec, framework, version) {
  const lib = await loadLibrary();
  const strippedUnknown = [];
  const strippedVersion = [];
  const kept = [];

  for (const cite of rec.citations ?? []) {
    const ruleRef = await lookupSkillRule(cite);
    if (ruleRef) {
      if (matchesFrameworkVersion(ruleRef.applicableFrameworks.join(' || '), framework, version) || ruleRef.applicableFrameworks.includes('*')) {
        kept.push(cite);
      } else {
        strippedVersion.push(cite);
      }
      continue;
    }

    const entry = lib.urls.find(e => e.url === cite);
    if (!entry) {
      strippedUnknown.push(cite);
      continue;
    }
    if (entry.applicableFrameworks.includes('*') ||
        entry.applicableFrameworks.some(p => matchesFrameworkVersion(p, framework, version))) {
      kept.push(cite);
    } else {
      strippedVersion.push(cite);
    }
  }

  rec.citations = kept;
  return { rec, strippedUnknown, strippedVersion };
}
