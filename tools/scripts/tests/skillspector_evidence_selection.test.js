'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const yaml = require('yaml');
const workflow = yaml.parse(fs.readFileSync('.github/workflows/skillspector-advisory.yml', 'utf8'));
const script = workflow.jobs['evidence-ready'].steps.find(s => s.run).run;
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'aas-evidence-selection-'));
const sha = 'a'.repeat(40);
const run = { id: 10, run_attempt: 1, event: 'pull_request', path: '.github/workflows/ci.yml', head_sha: sha, head_repository: { full_name: 'fork/repo' }, head_branch: 'feature', repository: { full_name: 'owner/repo' } };
const job = { id: 20, name: 'pr-evidence', run_id: 10, run_attempt: 1, head_sha: sha, status: 'completed', conclusion: 'success' };
const check = { ...job, app: { id: 15368 } };
const pr = { number: 1, state: 'open', head: { sha, repo: { full_name: 'fork/repo' }, ref: 'feature' }, base: { repo: { full_name: 'owner/repo' } } };
try {
  fs.writeFileSync(path.join(root, 'gh'), `#!${process.execPath}\nconst fs=require('fs');const f=JSON.parse(fs.readFileSync(process.env.FIXTURE));const p=process.argv.find(a=>a.startsWith('repos/'));let v;if(p.includes('/actions/runs?'))v=f.runs;else if(p.includes('/attempts/'))v=f.jobs;else if(p.includes('/check-runs/'))v=f.check;else if(p.includes('/pulls/'))v=f.pr;else v=f.latest;process.stdout.write(JSON.stringify(v));\n`, { mode: 0o755 });
  fs.writeFileSync(path.join(root, 'sleep'), '#!/bin/sh\nexit 91\n', { mode: 0o755 });
  function invoke(patch = {}) {
    const fixture = { runs: [{ workflow_runs: [{ ...run, id: 99, path: '.github/workflows/pr-metadata.yml' }] }, { workflow_runs: [run] }], jobs: [{ jobs: [] }, { jobs: [job] }], check, pr, latest: run, ...patch };
    const file = path.join(root, 'fixture.json'); fs.writeFileSync(file, JSON.stringify(fixture));
    return spawnSync('bash', ['-e', '-c', script], { encoding: 'utf8', env: { ...process.env, PATH: root + path.delimiter + process.env.PATH, FIXTURE: file, GITHUB_REPOSITORY: 'owner/repo', PR_HEAD: sha, PR_NUMBER: '1', PR_HEAD_REPO: 'fork/repo', PR_HEAD_BRANCH: 'feature', GITHUB_STEP_SUMMARY: path.join(root, 'summary') } });
  }
  const success = invoke(); assert.equal(success.status, 0, success.stdout + success.stderr);
  for (const patch of [
    { check: { ...check, app: { id: 1 } } }, { check: { ...check, head_sha: 'b'.repeat(40) } },
    { jobs: [{ jobs: [job, job] }] }, { jobs: [{ jobs: [{ ...job, run_attempt: 2 }] }] },
    { jobs: [{ jobs: [{ ...job, conclusion: 'failure' }] }] }, { jobs: [{ jobs: [{ ...job, status: 'in_progress', conclusion: null }] }] },
    { latest: { ...run, run_attempt: 2 } }, { pr: { ...pr, state: 'closed' } },
    { pr: { ...pr, head: { ...pr.head, sha: 'b'.repeat(40) } } },
    ...['event', 'path', 'head_sha', 'head_branch'].map(key => ({ runs: [{ workflow_runs: [{ ...run, [key]: 'wrong' }] }] })),
    { runs: [{ workflow_runs: [{ ...run, head_repository: { full_name: 'wrong' } }] }] },
  ]) assert.notEqual(invoke(patch).status, 0, JSON.stringify(patch));
  assert(script.includes('--paginate --slurp'));
  console.log('Executed workflow: metadata-name collision, pagination, fork provenance, failed/pending evidence, reruns and PR drift checked.');
} finally { fs.rmSync(root, { recursive: true, force: true }); }
