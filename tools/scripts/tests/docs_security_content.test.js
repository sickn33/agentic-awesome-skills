const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../..', '..');

const apifySkill = fs.readFileSync(
  path.join(repoRoot, 'skills', 'apify-actorization', 'SKILL.md'),
  'utf8',
);
const apifyCliReference = fs.readFileSync(
  path.join(repoRoot, 'skills', 'apify-actorization', 'references', 'cli-actorization.md'),
  'utf8',
);
const audioExample = fs.readFileSync(
  path.join(repoRoot, 'skills', 'audio-transcriber', 'examples', 'basic-transcription.sh'),
  'utf8',
);
const aomiSkill = fs.readFileSync(
  path.join(repoRoot, 'skills', 'aomi-transact', 'SKILL.md'),
  'utf8',
);
const mockHunterSkill = fs.readFileSync(
  path.join(repoRoot, 'skills', 'mock-hunter', 'SKILL.md'),
  'utf8',
);

function fencedBlocks(content, language) {
  const blocks = [];
  const blockRe = new RegExp(`^\\\`\\\`\\\`${language}\\n([\\s\\S]*?)^\\\`\\\`\\\``, 'gm');
  let match;

  while ((match = blockRe.exec(content)) !== null) {
    blocks.push(match[1]);
  }

  return blocks;
}

function findSkillFiles(skillsRoot) {
  const files = [];
  const queue = [skillsRoot];

  while (queue.length > 0) {
    const current = queue.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);

      if (entry.isDirectory()) {
        queue.push(fullPath);
        continue;
      }

      if (entry.isFile() && entry.name === 'SKILL.md') {
        files.push(fullPath);
      }
    }
  }

  return files;
}

function parseAllowlist(content) {
  const allowAllRe = /<!--\s*security-allowlist:\s*all\s*-->/i;
  const explicitRe = /<!--\s*security-allowlist:\s*([^>]+?)\s*-->/gi;
  const allow = new Set();

  if (allowAllRe.test(content)) {
    allow.add('all');
    return allow;
  }

  let match;
  while ((match = explicitRe.exec(content)) !== null) {
    const raw = match[1] || '';
    raw
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
      .forEach((value) => {
        allow.add(value.toLowerCase().replace(/[^a-z0-9_-]/g, ''));
      });
  }

  return allow;
}

function isAllowed(allowlist, ruleId) {
  if (allowlist.has('all')) {
    return true;
  }

  const normalized = ruleId.toLowerCase().replace(/[^a-z0-9_-]/g, '');

  return allowlist.has(normalized)
    || allowlist.has(normalized.replace(/[-_]/g, ''))
    || allowlist.has(`allow${normalized}`)
    || allowlist.has(`risk${normalized}`);
}

const rules = [
  {
    id: 'curl-pipe-bash',
    message: 'curl ... | bash|sh',
    regex: /\bcurl\b[^\n]*\|\s*(?:bash|sh)\b/i,
  },
  {
    id: 'wget-pipe-sh',
    message: 'wget ... | sh',
    regex: /\bwget\b[^\n]*\|\s*sh\b/i,
  },
  {
    id: 'irm-pipe-iex',
    message: 'irm ... | iex',
    regex: /\birm\b[^\n]*\|\s*iex\b/i,
  },
  {
    id: 'commandline-token',
    message: 'command-line token arguments',
    regex: /\s(?:--token|--api[_-]?(?:key|token)|--access[_-]?token|--auth(?:entication)?[_-]?token|--secret|--api[_-]?secret|--refresh[_-]?token)\s+['\"]?([A-Za-z0-9._=\-:+/]{16,})['\"]?/i,
  },
];

function collectSkillFiles(basePaths) {
  const files = new Set();

  for (const basePath of basePaths) {
    if (!fs.existsSync(basePath)) {
      continue;
    }

    for (const filePath of findSkillFiles(basePath)) {
      files.add(filePath);
    }
  }

  return [...files];
}

const rootsToScan = [path.join(repoRoot, 'skills')];
if ((process.env.DOCS_SECURITY_INCLUDE_PUBLIC || '').trim() === '1') {
  rootsToScan.push(path.join(repoRoot, 'apps/web-app/public/skills'));
}

const skillFiles = collectSkillFiles(rootsToScan);

assert.ok(skillFiles.length > 0, 'Expected SKILL.md files in configured scan roots');

const violations = [];
const seen = new Set();

function addViolation(relativePath, lineNumber, rule) {
  const key = `${relativePath}:${lineNumber}:${rule.id}`;
  if (seen.has(key)) {
    return;
  }

  seen.add(key);
  violations.push(`${relativePath}:${lineNumber}: ${rule.message}`);
}

for (const filePath of skillFiles) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const allowlist = parseAllowlist(content);
  const relativePath = path.relative(repoRoot, filePath);

  for (const rule of rules) {
    for (const [index, line] of lines.entries()) {
      if (!rule.regex.test(line)) {
        continue;
      }

      if (isAllowed(allowlist, rule.id)) {
        continue;
      }

      addViolation(relativePath, index + 1, rule);
      rule.regex.lastIndex = 0;
    }
  }
}

assert.strictEqual(violationCount(violations), 0, violations.join('\n'));
assert.match(audioExample, /python3 << 'EOF'/, 'audio example should use a quoted heredoc for Python');
assert.match(audioExample, /AUDIO_FILE_ENV/, 'audio example should pass shell variables through the environment');
assert.strictEqual(/\|\s*(bash|sh)\b/.test(apifySkill), false, 'SKILL.md must not recommend pipe-to-shell installs');
assert.strictEqual(/\|\s*iex\b/i.test(apifySkill), false, 'SKILL.md must not recommend PowerShell pipe-to-iex installs');
assert.strictEqual(/apify login -t\b/.test(apifySkill), false, 'SKILL.md must not put tokens on the command line');
assert.strictEqual(/\bcurl\b[\s\S]*?\|\s*(?:bash|sh)\b/i.test(apifyCliReference), false, 'cli reference must not recommend pipe-to-shell installs');
assert.strictEqual(
  fencedBlocks(aomiSkill, 'bash').some((block) => /\baomi\s+tx\s+sign\b/.test(block)),
  false,
  'Aomi runnable bash examples must stop before signing',
);
assert.match(mockHunterSkill, /^risk:\s*critical$/m, 'MockHunter must not be classified as plugin-safe');
assert.match(mockHunterSkill, /^\s+codex:\s*blocked$/m, 'MockHunter must be blocked from Codex plugin bundle');
assert.match(mockHunterSkill, /^\s+claude:\s*blocked$/m, 'MockHunter must be blocked from Claude plugin bundle');

function violationCount(list) {
  return list.length;
}
