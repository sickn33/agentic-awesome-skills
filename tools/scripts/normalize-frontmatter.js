const fs = require('fs');
const path = require('path');
const yaml = require('yaml');
const { listSkillIds, parseFrontmatter } = require('../lib/skill-utils');
const { findProjectRoot } = require('../lib/project-root');

const ROOT = findProjectRoot(__dirname);
const SKILLS_DIR = path.join(ROOT, 'skills');
const ALLOWED_FIELDS = new Set([
  'name',
  'description',
  'risk',
  'source',
  'license',
  'compatibility',
  'metadata',
  'allowed-tools',
  'date_added',
  'category',
  'id',
]);

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function coerceToString(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    const simple = value.every(item => ['string', 'number', 'boolean'].includes(typeof item));
    return simple ? value.map(item => String(item).trim()).filter(Boolean).join(', ') : JSON.stringify(value);
  }
  if (isPlainObject(value)) {
    return JSON.stringify(value);
  }
  return String(value).trim();
}

function appendMetadata(metadata, key, value) {
  const nextValue = coerceToString(value);
  if (!nextValue) return;
  if (!metadata[key]) {
    metadata[key] = nextValue;
    return;
  }
  if (metadata[key].includes(nextValue)) return;
  metadata[key] = `${metadata[key]}, ${nextValue}`;
}

function collectAllowedTools(value, toolSet) {
  if (!value) return;
  if (typeof value === 'string') {
    value
      .split(/[\s,]+/)
      .map(token => token.trim())
      .filter(Boolean)
      .forEach(token => toolSet.add(token));
    return;
  }
  if (Array.isArray(value)) {
    value
      .map(token => String(token).trim())
      .filter(Boolean)
      .forEach(token => toolSet.add(token));
  }
}

function normalizeSkill(skillId) {
  const skillPath = path.join(SKILLS_DIR, skillId, 'SKILL.md');
  const content = fs.readFileSync(skillPath, 'utf8');
  const { data, body, hasFrontmatter } = parseFrontmatter(content);

  if (!hasFrontmatter) return false;

  let modified = false;
  const updated = { ...data };
  const metadata = isPlainObject(updated.metadata) ? { ...updated.metadata } : {};
  if (updated.metadata !== undefined && !isPlainObject(updated.metadata)) {
    appendMetadata(metadata, 'legacy_metadata', updated.metadata);
    modified = true;
  }

  const allowedTools = new Set();
  collectAllowedTools(updated['allowed-tools'], allowedTools);
  collectAllowedTools(updated.tools, allowedTools);
  collectAllowedTools(updated.tool_access, allowedTools);

  if (updated.tools !== undefined) {
    delete updated.tools;
    modified = true;
  }
  if (updated.tool_access !== undefined) {
    delete updated.tool_access;
    modified = true;
  }

  for (const key of Object.keys(updated)) {
    if (ALLOWED_FIELDS.has(key)) continue;
    if (key === 'tags') {
      appendMetadata(metadata, 'tags', updated[key]);
    } else {
      appendMetadata(metadata, key, updated[key]);
    }
    delete updated[key];
    modified = true;
  }

  if (allowedTools.size) {
    updated['allowed-tools'] = Array.from(allowedTools).join(' ');
    modified = true;
  } else if (updated['allowed-tools'] !== undefined) {
    delete updated['allowed-tools'];
    modified = true;
  }

  if (Object.keys(metadata).length) {
    updated.metadata = metadata;
    modified = true;
  } else if (updated.metadata !== undefined) {
    delete updated.metadata;
    modified = true;
  }

  if (!modified) return false;

  const ordered = {};
  const order = ['id', 'name', 'description', 'category', 'risk', 'source', 'license', 'compatibility', 'date_added', 'allowed-tools', 'metadata'];
  for (const key of order) {
    if (updated[key] !== undefined) {
      ordered[key] = updated[key];
    }
  }

  const fm = yaml.stringify(ordered).trimEnd();
  const bodyPrefix = body.length && (body.startsWith('\n') || body.startsWith('\r\n')) ? '' : '\n';
  const next = `---\n${fm}\n---${bodyPrefix}${body}`;
  fs.writeFileSync(skillPath, next);
  return true;
}

function run() {
  const skillIds = listSkillIds(SKILLS_DIR);
  let updatedCount = 0;
  for (const skillId of skillIds) {
    if (normalizeSkill(skillId)) updatedCount += 1;
  }
  console.log(`Normalized frontmatter for ${updatedCount} skills.`);
}

if (require.main === module) {
  run();
}

module.exports = { run };
