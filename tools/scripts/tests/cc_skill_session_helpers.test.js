const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '../../..');
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'aas-session-helpers-'));
const learning = path.join(root, 'skills/cc-skill-continuous-learning/evaluate-session.sh');
const compact = path.join(root, 'skills/cc-skill-strategic-compact/suggest-compact.sh');
const environment = { ...process.env };
delete environment.CLAUDE_TRANSCRIPT_PATH;
delete environment.COMPACT_TOOL_COUNT;
delete environment.COMPACT_THRESHOLD;
const run = (script, args = [], env = {}) => {
  const result = spawnSync('bash', [script, ...args], {
    cwd: fixture, env: { ...environment, ...env }, encoding: 'utf8', timeout: 5000,
  });
  assert.ifError(result.error);
  assert.equal(result.stdout, '', 'helpers must not expose transcript content');
  return result;
};
const write = (name, content) => {
  const filename = path.join(fixture, name);
  fs.writeFileSync(filename, content);
  return filename;
};

try {
  assert.equal(run(learning).status, 0);
  const transcript = write('session.jsonl', [
    ...Array.from({ length: 10 }, () => JSON.stringify({ type: 'user', text: 'PRIVATE_CANARY' })),
    JSON.stringify({ type: 'assistant', nested: { type: 'user' } }), '',
  ].join('\n'));
  const before = fs.readdirSync(fixture);
  const result = run(learning, [transcript]);
  assert.equal(result.status, 0);
  assert.match(result.stderr, /10 user messages.*Nothing extracted or saved/);
  assert.doesNotMatch(result.stderr, /PRIVATE_CANARY/);
  assert.deepEqual(fs.readdirSync(fixture), before);
  assert.equal(run(learning, [], { CLAUDE_TRANSCRIPT_PATH: transcript }).stderr, result.stderr);
  assert.match(run(learning, [write('zero.jsonl', '{"type":"assistant"}\n\n')]).stderr, /0 user messages; below/);

  const link = path.join(fixture, 'link.jsonl');
  fs.symlinkSync(transcript, link);
  const tooLarge = write('large.jsonl', '');
  fs.truncateSync(tooLarge, 16 * 1024 * 1024 + 1);
  const badFiles = [link, fixture, tooLarge,
    write('invalid.jsonl', 'PRIVATE_CANARY invalid json'),
    write('array.jsonl', '[]'),
    write('line.jsonl', JSON.stringify({ type: 'user', text: 'x'.repeat(1024 * 1024) })),
    write('deep.jsonl', '['.repeat(2000) + '0' + ']'.repeat(2000)),
  ];
  for (const filename of badFiles) {
    const rejected = run(learning, [filename]);
    assert.equal(rejected.status, 2, filename);
    assert.match(rejected.stderr, /Cannot inspect/);
    assert.doesNotMatch(rejected.stderr, /PRIVATE_CANARY|Traceback/);
  }
  const copiedHelper = write('evaluate-session.sh', fs.readFileSync(learning));
  for (const threshold of [0, -1, true, '10', 100001]) {
    write('config.json', JSON.stringify({ min_session_length: threshold }));
    assert.equal(run(copiedHelper, [transcript]).status, 2);
  }

  assert.equal(run(compact).stderr, '');
  for (const count of ['0', '49', '51', '74']) {
    assert.equal(run(compact, [count]).stderr, '');
  }
  for (const count of ['50', '75', '100', '000050']) {
    const reminder = run(compact, [count]);
    assert.equal(reminder.status, 0);
    assert.match(reminder.stderr, /Nothing compacted or saved/);
  }
  assert.match(run(compact, ['76', '51']).stderr, /76 tool calls/);
  assert.equal(run(compact, ['75', '51']).stderr, '');
  assert.match(run(compact, [], { COMPACT_TOOL_COUNT: '75' }).stderr, /75 tool calls/);
  const marker = path.join(fixture, 'must-not-execute');
  const invalidCounts = ['-1', '1.5', '1000000', '1\n2', `a[$(touch ${marker})]`];
  for (const value of invalidCounts) {
    assert.equal(run(compact, [value]).status, 2);
    assert.equal(run(compact, ['50', value]).status, 2);
  }
  assert.equal(run(compact, ['50', '0']).status, 2);
  assert.equal(fs.existsSync(marker), false);
  const entriesBefore = fs.readdirSync(fixture);
  run(compact, ['50']);
  assert.deepEqual(fs.readdirSync(fixture), entriesBefore, 'no persisted counter');
  console.log('Session helpers: bounded JSONL, privacy, stateless counts and input rejection passed.');
} finally {
  fs.rmSync(fixture, { recursive: true, force: true });
}
