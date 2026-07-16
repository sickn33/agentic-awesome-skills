const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..', '..', '..');
const script = path.join(root, 'scripts', 'validate-glossary.sh');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'glossary-validation-'));

function runGlossary(payload) {
  const glossary = path.join(tempDir, 'glossary.json');
  const report = path.join(tempDir, 'report.txt');
  fs.writeFileSync(glossary, JSON.stringify(payload), 'utf8');
  return spawnSync('bash', [script], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, GLOSSARY_FILE: glossary, GLOSSARY_OUTPUT_FILE: report },
  });
}

const valid = runGlossary({
  metadata: { version: '1', created: '2026-01-01', last_updated: '2026-01-01', total_terms: 1 },
  terms: { skill: { translation: '技能' } },
});
assert.strictEqual(valid.status, 0, valid.stderr || valid.stdout);

const invalid = runGlossary({
  metadata: { version: '1', created: '2026-01-01', last_updated: '2026-01-01', total_terms: 1 },
  terms: { skill: { context: 'missing translation' }, agent: { translation: '代理' } },
});
assert.strictEqual(invalid.status, 1, invalid.stderr || invalid.stdout);

fs.rmSync(tempDir, { recursive: true, force: true });
