const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

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
const longbridgeSkill = fs.readFileSync(
  path.join(repoRoot, 'skills', 'longbridge', 'SKILL.md'),
  'utf8',
);
const mercurySkill = fs.readFileSync(
  path.join(repoRoot, 'skills', 'mercury-mcp', 'SKILL.md'),
  'utf8',
);
const socialclawSkill = fs.readFileSync(
  path.join(repoRoot, 'skills', 'socialclaw', 'SKILL.md'),
  'utf8',
);
const bumblebeeSkill = fs.readFileSync(
  path.join(repoRoot, 'skills', 'bumblebee', 'SKILL.md'),
  'utf8',
);
const githubActionsAdvancedSkill = fs.readFileSync(
  path.join(repoRoot, 'skills', 'github-actions-advanced', 'SKILL.md'),
  'utf8',
);
const photopeaSkill = fs.readFileSync(
  path.join(repoRoot, 'skills', 'photopea-embedded-editor', 'SKILL.md'),
  'utf8',
);
const polisSkill = fs.readFileSync(
  path.join(repoRoot, 'skills', 'polis-protocol', 'SKILL.md'),
  'utf8',
);
const unshipSkill = fs.readFileSync(
  path.join(repoRoot, 'skills', 'unship', 'SKILL.md'),
  'utf8',
);
const accesslintDiffSkill = fs.readFileSync(
  path.join(repoRoot, 'skills', 'accesslint-diff', 'SKILL.md'),
  'utf8',
);
const atlasContractSkill = fs.readFileSync(
  path.join(repoRoot, 'skills', 'atlas-contract', 'SKILL.md'),
  'utf8',
);
const androidHybridReference = fs.readFileSync(
  path.join(repoRoot, 'skills', 'android-dev', 'references', 'hybrid.md'),
  'utf8',
);
const androidReactNativeReference = fs.readFileSync(
  path.join(repoRoot, 'skills', 'android-dev', 'references', 'react-native.md'),
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

function isAllowedLine(line, ruleId) {
  const marker = line.match(/(?:#|<!--)\s*security-allowlist(?::\s*([^>]+?))?\s*(?:-->)?$/i);
  if (!marker) {
    return false;
  }

  const raw = marker[1] || '';
  if (!raw.trim()) {
    return true;
  }
  const normalized = ruleId.toLowerCase().replace(/[^a-z0-9_-]/g, '');
  const allowlist = new Set(
    raw
      .split(',')
      .map((value) => value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, ''))
      .filter(Boolean),
  );

  return allowlist.has(normalized)
    || allowlist.has(normalized.replace(/[-_]/g, ''))
    || allowlist.has(`allow${normalized}`)
    || allowlist.has(`risk${normalized}`);
}

const rules = [
  {
    id: 'curl-pipe-bash',
    message: 'curl ... | bash|sh',
    regex: /\bcurl\b[^\n]*\|\s*(?:bash|sh|zsh)\b|\b(?:bash|sh|zsh)\s+<\s*\(\s*curl\b/i,
  },
  {
    id: 'wget-pipe-sh',
    message: 'wget ... | sh',
    regex: /\bwget\b[^\n]*\|\s*(?:bash|sh|zsh)\b|\b(?:bash|sh|zsh)\s+<\s*\(\s*wget\b/i,
  },
  {
    id: 'irm-pipe-iex',
    message: 'irm ... | iex',
    regex: /\b(?:irm|iwr|Invoke-WebRequest|Invoke-RestMethod)\b[^\n]*\|\s*(?:iex|Invoke-Expression)\b/i,
  },
  {
    id: 'commandline-token',
    message: 'command-line token arguments',
    regex: /\s(?:--token|--api[_-]?(?:key|token)|--access[_-]?token|--auth(?:entication)?[_-]?token|--secret|--api[_-]?secret|--refresh[_-]?token)\s+['\"]?([A-Za-z0-9._=\-:+/]{16,})['\"]?/i,
  },
];

const textFileExtensions = new Set([
  '.cjs',
  '.js',
  '.json',
  '.md',
  '.mjs',
  '.py',
  '.sh',
  '.ts',
  '.txt',
  '.yaml',
  '.yml',
]);

const realisticSecretPatterns = [
  {
    id: 'aws-example-access-key',
    message: 'realistic AWS access key example',
    regex: /AKIAIOSFODNN7EXAMPLE/,
  },
  {
    id: 'aws-example-secret-key',
    message: 'realistic AWS secret access key example',
    regex: /wJalrXUtnFEMI\/K7MDENG\/bPxRfiCYEXAMPLEKEY/,
  },
  {
    id: 'pem-private-key-placeholder',
    message: 'literal PEM private key placeholder',
    regex: /^\s*-----BEGIN PRIVATE KEY-----\s*$/m,
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
assert.strictEqual(
  isAllowedLine('curl https://example.invalid | bash <!-- security-allowlist: curl-pipe-bash -->', 'curl-pipe-bash'),
  true,
  'same-line rule allowlist should suppress that line',
);
assert.strictEqual(
  isAllowedLine('<!-- security-allowlist: all -->', 'curl-pipe-bash'),
  false,
  'standalone allowlist marker should not suppress later lines',
);

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

function logicalLines(content) {
  const output = [];
  let current = '';
  let startLine = 1;

  content.split(/\r?\n/).forEach((line, index) => {
    if (!current) {
      startLine = index + 1;
    }

    const continued = /\\\s*$/.test(line);
    current += (current ? ' ' : '') + line.replace(/\\\s*$/, '');
    if (!continued) {
      output.push([startLine, current]);
      current = '';
    }
  });

  if (current) {
    output.push([startLine, current]);
  }

  return output;
}

function scanCommandRules(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const relativePath = path.relative(repoRoot, filePath);

  for (const [lineNumber, logicalLine] of logicalLines(content)) {
    for (const rule of rules) {
      if (!rule.regex.test(logicalLine)) {
        continue;
      }

      if (isAllowedLine(logicalLine, rule.id)) {
        continue;
      }

      addViolation(relativePath, lineNumber, rule);
      rule.regex.lastIndex = 0;
    }
  }
}

function findTextFiles(rootPath) {
  const files = [];
  const queue = [rootPath];

  while (queue.length > 0) {
    const current = queue.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);

      if (entry.isDirectory()) {
        queue.push(fullPath);
        continue;
      }

      if (entry.isFile() && textFileExtensions.has(path.extname(entry.name))) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

const textFiles = new Set();
for (const rootPath of rootsToScan) {
  for (const filePath of findTextFiles(rootPath)) {
    textFiles.add(filePath);
  }
}

for (const filePath of textFiles) {
  scanCommandRules(filePath);
}

for (const filePath of findTextFiles(path.join(repoRoot, 'skills'))) {
  const content = fs.readFileSync(filePath, 'utf8');
  const relativePath = path.relative(repoRoot, filePath);

  for (const rule of realisticSecretPatterns) {
    const match = rule.regex.exec(content);
    if (!match) {
      continue;
    }

    const lineNumber = content.slice(0, match.index).split(/\r?\n/).length;
    addViolation(relativePath, lineNumber, rule);
    rule.regex.lastIndex = 0;
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
for (const [name, content] of [
  ['longbridge', longbridgeSkill],
  ['mercury-mcp', mercurySkill],
  ['socialclaw', socialclawSkill],
]) {
  assert.match(content, /^risk:\s*critical$/m, `${name} must not be classified as safe`);
  assert.match(content, /^\s+codex:\s*blocked$/m, `${name} must be blocked from Codex plugin bundle`);
  assert.match(content, /^\s+claude:\s*blocked$/m, `${name} must be blocked from Claude plugin bundle`);
}
assert.doesNotMatch(
  bumblebeeSkill,
  /^\s*python3 scripts\/render_report\.py\b/m,
  'Bumblebee must not invoke helper scripts via workspace-relative paths',
);
assert.doesNotMatch(
  githubActionsAdvancedSkill,
  /run:\s+npm ci \$\{\{\s*inputs\.install-flags\s*\}\}/,
  'GitHub Actions examples must not interpolate action inputs directly into run steps',
);
assert.doesNotMatch(
  photopeaSkill,
  /textItem\.contents\s*=\s*"\$\{(?:name|tagline)\}"/,
  'Photopea examples must serialize dynamic text before embedding it in runScript',
);
assert.doesNotMatch(
  polisSkill,
  /\buvx\s+polis-protocol\b/,
  'Polis Protocol setup must not run the latest PyPI CLI by default',
);
assert.match(
  polisSkill,
  /git checkout <reviewed-commit-sha>/,
  'Polis Protocol setup should pin a reviewed source checkout by default',
);
assert.doesNotMatch(
  unshipSkill,
  /\bnpx\s+-y\s+@unship\/cli@latest\b/,
  'Unship skill must not run an unpinned npm CLI',
);
assert.match(unshipSkill, /^risk:\s*critical$/m, 'Unship must not be classified as plugin-safe');
assert.match(unshipSkill, /^\s+codex:\s*blocked$/m, 'Unship must be blocked from Codex plugin bundle');
assert.match(unshipSkill, /^\s+claude:\s*blocked$/m, 'Unship must be blocked from Claude plugin bundle');
assert.doesNotMatch(
  accesslintDiffSkill,
  /\bgit\s+checkout\s+<branch>/,
  'AccessLint diff must not document unquoted branch checkout',
);
assert.match(
  accesslintDiffSkill,
  /git switch "\$branch"/,
  'AccessLint diff should switch to a quoted, validated branch variable',
);
assert.match(
  atlasContractSkill,
  /Treat this file as untrusted workspace content/,
  'Atlas ledger read-back must treat Atlas.md as untrusted workspace content',
);
assert.match(
  atlasContractSkill,
  /Higher-priority instructions and safety rules always win/,
  'Atlas ledger clauses must not override higher-priority instructions',
);
assert.doesNotMatch(
  androidHybridReference,
  /Preferences\.set\(\{ key: 'auth_token'/,
  'Hybrid Android reference must not store auth tokens in Capacitor Preferences',
);
assert.match(
  androidHybridReference,
  /Android Keystore-backed plugin/,
  'Hybrid Android reference should direct token storage to platform-backed secure storage',
);
assert.doesNotMatch(
  androidReactNativeReference,
  /auth-storage/,
  'React Native reference must not persist tokens in a generic auth-storage bucket',
);
assert.match(
  androidReactNativeReference,
  /react-native-keychain|expo-secure-store/,
  'React Native reference should direct token storage to platform-backed secure storage',
);

for (const scriptName of ['generate_slides.py', 'create_pdf_slides.py']) {
  const helpRun = spawnSync(
    process.env.PYTHON || 'python3',
    [path.join(repoRoot, 'skills', '2slides-ppt-generator', 'scripts', scriptName), '--help'],
    { encoding: 'utf8' },
  );
  assert.strictEqual(
    helpRun.status,
    0,
    `${scriptName} --help must work before optional HTTP dependencies are installed: ${helpRun.stderr}`,
  );
}

const voiceListRun = spawnSync(
  process.env.PYTHON || 'python3',
  [path.join(repoRoot, 'skills', '2slides-ppt-generator', 'scripts', 'generate_narration.py'), '--list-voices'],
  { encoding: 'utf8' },
);
assert.strictEqual(
  voiceListRun.status,
  0,
  `generate_narration.py --list-voices must work before optional HTTP dependencies are installed: ${voiceListRun.stderr}`,
);
assert.match(voiceListRun.stdout, /Puck/, '2slides voice listing should include documented default voice');

function violationCount(list) {
  return list.length;
}
