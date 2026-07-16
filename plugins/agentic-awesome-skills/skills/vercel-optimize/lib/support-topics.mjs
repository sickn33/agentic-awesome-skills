import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gates } from './gates/index.mjs';
import { SCANNER_GATES } from './gates/scanner-driven.mjs';
import {
  loadLibrary,
  lookupSkillRule,
  lookupUrl,
  matchesFrameworkVersion,
} from './citations.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const TOPICS_DIR = join(HERE, '..', 'references', 'support-topics');

export const SUPPORT_TOPIC_LIMIT = 3;
export const SUPPORT_TOPIC_TOTAL_CHAR_LIMIT = 2400;
const DEFAULT_MAX_BRIEF_CHARS = 900;

export const KNOWN_CANDIDATE_KINDS = new Set([
  ...gates
    .map((g) => g.metadata?.id)
    .filter((id) => id && id !== 'scanner-driven'),
  ...SCANNER_GATES.map((g) => g.id),
]);

export async function supportTopicSubset({
  candidate,
  signals = {},
  framework,
  version,
  profile,
  frameworkPlaybookId,
  maxTopics = SUPPORT_TOPIC_LIMIT,
  maxChars = SUPPORT_TOPIC_TOTAL_CHAR_LIMIT,
} = {}) {
  const stack = signals?.stack ?? signals?.codebase?.stack ?? {};
  const fw = framework ?? stack.framework ?? 'unknown';
  const fwVersion = version ?? stack.frameworkVersion ?? 'unknown';
  const candidates = await loadSupportTopics();
  const selected = [];
  let usedChars = 0;

  const sorted = candidates
    .filter((t) => t.status === 'active')
    .filter((t) => matchesCandidateKind(t, candidate?.kind))
    .filter((t) => matchesFrameworks(t.frameworks, fw, fwVersion))
    .filter((t) => matchesOptionalList(t.profiles, profile))
    .filter((t) => matchesOptionalList(t.frameworkPlaybooks, frameworkPlaybookId))
    .filter((t) => matchesRouter(t.routers, stack))
    .filter((t) => matchesCandidateMetrics(t.metrics, candidate))
    .filter((t) => matchesCandidateRoutePatterns(t.routePatterns, candidate))
    .filter((t) => matchesScannerPatterns(t.scannerPatterns, candidate))
    .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));

  for (const topic of sorted) {
    if (!await topicCitationsApply(topic, candidate?.kind, fw, fwVersion)) continue;
    if (selected.length >= maxTopics) break;
    const renderedChars = topic.title.length + topic.body.length + topic.id.length + 20;
    if (selected.length > 0 && usedChars + renderedChars > maxChars) continue;
    selected.push(topic);
    usedChars += renderedChars;
  }

  return selected;
}

export async function loadSupportTopics({ includeDraft = false } = {}) {
  let names = [];
  try {
    names = await readdir(TOPICS_DIR);
  } catch (err) {
    if (err?.code === 'ENOENT') return [];
    throw err;
  }

  const topics = [];
  for (const name of names.sort()) {
    if (!name.endsWith('.md') || name === 'README.md') continue;
    const path = join(TOPICS_DIR, name);
    const raw = await readFile(path, 'utf-8');
    const topic = parseSupportTopic(raw, path);
    if (includeDraft || topic.status === 'active') topics.push(topic);
  }
  return topics.sort((a, b) => a.id.localeCompare(b.id));
}

export async function validateSupportTopics() {
  const topics = await loadSupportTopics({ includeDraft: true });
  const errors = [];
  const seen = new Set();
  for (const topic of topics) {
    errors.push(...await validateSupportTopic(topic));
    if (seen.has(topic.id)) errors.push(`${topic.path}: duplicate topic id "${topic.id}"`);
    seen.add(topic.id);
  }
  return { ok: errors.length === 0, errors, topics };
}

export function renderSupportTopics(topics = []) {
  if (!Array.isArray(topics) || topics.length === 0) return [];
  const lines = [];
  lines.push('## Support topics (investigation guardrails)');
  lines.push('');
  lines.push('These are deterministic, candidate-scoped hints selected from `references/support-topics/`. They do not create recommendations. Use them only to decide what evidence to check, what to rule out, and when to abstain.');
  lines.push('');
  for (const topic of topics) {
    lines.push(`### ${topic.title} (\`${topic.id}\`)`);
    lines.push('');
    lines.push(topic.body.trim());
    lines.push('');
  }
  return lines;
}

export function parseSupportTopic(raw, path = '<memory>') {
  const { frontmatter, body } = splitFrontmatter(raw, path);
  const metadata = parseFrontmatter(frontmatter, path);
  return normalizeTopic({ ...metadata, body: body.trim(), path });
}

function splitFrontmatter(raw, path) {
  const text = String(raw ?? '');
  if (!text.startsWith('---\n')) {
    throw new Error(`${path}: support topic must start with --- frontmatter`);
  }
  const end = text.indexOf('\n---\n', 4);
  if (end === -1) {
    throw new Error(`${path}: support topic frontmatter must end with ---`);
  }
  return {
    frontmatter: text.slice(4, end),
    body: text.slice(end + '\n---\n'.length),
  };
}

function parseFrontmatter(src, path) {
  const out = {};
  for (const rawLine of src.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^([A-Za-z][A-Za-z0-9]*):\s*(.*)$/);
    if (!m) throw new Error(`${path}: unsupported frontmatter line "${rawLine}"`);
    const [, key, value] = m;
    out[key] = parseFrontmatterValue(value, path, key);
  }
  return out;
}

function parseFrontmatterValue(value, path, key) {
  if (value.startsWith('[')) {
    try {
      const parsed = JSON.parse(value);
      if (!Array.isArray(parsed)) throw new Error('not an array');
      return parsed;
    } catch (err) {
      throw new Error(`${path}: ${key} must use strict JSON array syntax (${err.message})`);
    }
  }
  if (/^-?\d+(?:\.\d+)?$/.test(value)) return Number(value);
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null') return null;
  const quoted = value.match(/^"(.*)"$/) ?? value.match(/^'(.*)'$/);
  return quoted ? quoted[1] : value;
}

function normalizeTopic(topic) {
  const maxBriefChars = Number.isFinite(topic.maxBriefChars)
    ? topic.maxBriefChars
    : DEFAULT_MAX_BRIEF_CHARS;
  return {
    id: topic.id,
    title: topic.title,
    status: topic.status,
    candidateKinds: toStringArray(topic.candidateKinds),
    frameworks: toStringArray(topic.frameworks),
    profiles: toStringArray(topic.profiles),
    frameworkPlaybooks: toStringArray(topic.frameworkPlaybooks),
    routers: toStringArray(topic.routers),
    metrics: toStringArray(topic.metrics),
    routePatterns: toStringArray(topic.routePatterns),
    scannerPatterns: toStringArray(topic.scannerPatterns),
    billingDimensions: toStringArray(topic.billingDimensions),
    citations: toStringArray(topic.citations),
    priority: Number(topic.priority),
    maxBriefChars,
    body: topic.body,
    path: topic.path,
  };
}

async function validateSupportTopic(topic) {
  const errors = [];
  const label = topic.path ?? topic.id ?? '<topic>';
  const fileId = basename(label).replace(/\.md$/, '');

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(topic.id ?? '')) {
    errors.push(`${label}: id must be kebab-case`);
  }
  if (fileId !== topic.id) errors.push(`${label}: filename must match id`);
  if (!nonEmptyString(topic.title)) errors.push(`${label}: title is required`);
  if (!['active', 'draft', 'deprecated'].includes(topic.status)) {
    errors.push(`${label}: status must be active, draft, or deprecated`);
  }
  if (!Number.isFinite(topic.priority)) errors.push(`${label}: priority must be a number`);
  if (!Number.isFinite(topic.maxBriefChars) || topic.maxBriefChars < 200 || topic.maxBriefChars > 1400) {
    errors.push(`${label}: maxBriefChars must be between 200 and 1400`);
  }
  if (!nonEmptyArray(topic.candidateKinds)) {
    errors.push(`${label}: candidateKinds must be a non-empty array`);
  } else {
    for (const kind of topic.candidateKinds) {
      if (kind !== '*' && !KNOWN_CANDIDATE_KINDS.has(kind)) {
        errors.push(`${label}: unknown candidate kind "${kind}"`);
      }
    }
  }
  if (!nonEmptyArray(topic.frameworks)) {
    errors.push(`${label}: frameworks must be a non-empty array`);
  } else {
    for (const fw of topic.frameworks) {
      if (fw !== '*' && !/^[\w-]+@/.test(fw)) {
        errors.push(`${label}: framework "${fw}" must be "*" or "framework@range"`);
      }
    }
  }
  if (!nonEmptyArray(topic.citations)) {
    errors.push(`${label}: citations must be a non-empty array`);
  } else {
    for (const citation of topic.citations) {
      if (!await knownCitation(citation)) {
        errors.push(`${label}: unknown citation "${citation}"`);
      }
    }
  }
  for (const pattern of topic.routePatterns) {
    try {
      new RegExp(pattern);
    } catch (err) {
      errors.push(`${label}: invalid routePatterns regex "${pattern}" (${err.message})`);
    }
  }
  for (const heading of [
    '## Investigation Brief',
    '## Evidence To Check',
    '## Do Not Recommend When',
    '## Verification',
  ]) {
    if (!topic.body.includes(heading)) errors.push(`${label}: missing heading "${heading}"`);
  }
  if (topic.body.length > topic.maxBriefChars) {
    errors.push(`${label}: body length ${topic.body.length} exceeds maxBriefChars ${topic.maxBriefChars}`);
  }
  if (/https?:\/\//.test(topic.body)) {
    errors.push(`${label}: put URLs in frontmatter citations, not body text`);
  }
  if (/\/Users\/|(?:^|[\s`"'])apps\/[^/\s`"']+\/|[A-Za-z0-9_-]+\.ts:\d+/.test(topic.body)) {
    errors.push(`${label}: body leaks internal implementation details`);
  }
  return errors;
}

function matchesCandidateKind(topic, candidateKind) {
  if (!candidateKind) return false;
  return topic.candidateKinds.includes('*') || topic.candidateKinds.includes(candidateKind);
}

function matchesFrameworks(frameworks, framework, version) {
  return frameworks.some((pattern) =>
    pattern === '*' || matchesFrameworkVersion(pattern, framework, version)
  );
}

function matchesOptionalList(values, actual) {
  if (!Array.isArray(values) || values.length === 0) return true;
  return values.includes('*') || (actual != null && values.includes(actual));
}

function matchesRouter(routers, stack) {
  if (!Array.isArray(routers) || routers.length === 0) return true;
  if (routers.includes('*')) return true;
  return (routers.includes('app') && stack?.hasAppRouter)
    || (routers.includes('pages') && stack?.hasPagesRouter);
}

function matchesCandidateMetrics(metrics, candidate) {
  if (!Array.isArray(metrics) || metrics.length === 0) return true;
  if (metrics.includes('*')) return true;
  const observed = new Set([
    candidate?.evidence?.metric,
    ...(candidate?.evidence?.issues ?? []).map((i) => i?.metric),
  ].filter(Boolean).map((m) => String(m).toUpperCase()));
  return metrics.some((m) => observed.has(String(m).toUpperCase()));
}

function matchesCandidateRoutePatterns(patterns, candidate) {
  if (!Array.isArray(patterns) || patterns.length === 0) return true;
  if (patterns.includes('*')) return true;
  const route = candidate?.route ?? candidate?.path;
  if (typeof route !== 'string' || route.length === 0) return false;
  return patterns.some((p) => new RegExp(p).test(route));
}

function matchesScannerPatterns(patterns, candidate) {
  if (!Array.isArray(patterns) || patterns.length === 0) return true;
  const observed = new Set([
    ...(candidate?.evidence?.patterns ?? []),
    ...(candidate?.evidence?.deepDive?.patterns ?? []),
  ].filter(Boolean));
  if (observed.size === 0) return false;
  return patterns.some((p) => observed.has(p));
}

function topicCitationsApply(topic, candidateKind, framework, version) {
  if (!candidateKind) return false;
  return topic.citations.every((citation) =>
    citationApplies(citation, candidateKind, framework, version)
  );
}

async function citationApplies(citation, candidateKind, framework, version) {
  const lib = await loadLibrary();
  const rule = lib.ruleSkillRefs.find((r) => `${r.skill}:${r.rule}` === citation);
  if (rule) {
    return rule.applicableFrameworks.includes('*')
      || rule.applicableFrameworks.some((p) => matchesFrameworkVersion(p, framework, version));
  }

  const url = lib.urls.find((u) => u.url === citation);
  if (!url) return false;
  const kindOk = !Array.isArray(url.appliesTo)
    || url.appliesTo.length === 0
    || url.appliesTo.includes(candidateKind);
  const versionOk = url.applicableFrameworks.includes('*')
    || url.applicableFrameworks.some((p) => matchesFrameworkVersion(p, framework, version));
  return kindOk && versionOk;
}

async function knownCitation(citation) {
  return Boolean(await lookupUrl(citation) || await lookupSkillRule(citation));
}

function toStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((v) => typeof v === 'string' && v.length > 0);
}

function nonEmptyArray(value) {
  return Array.isArray(value) && value.length > 0;
}

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}
