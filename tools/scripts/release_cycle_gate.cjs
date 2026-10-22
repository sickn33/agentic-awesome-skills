'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const REPO = 'sickn33/agentic-awesome-skills';
const FILE = 'data/release-cycle.json';
const MARKER = '<!-- aas-cycle-close:';
function closureComment(pr, comments, owner = 'sickn33') {
  return comments.find(c => c.user?.login === owner && !c.user?.type?.includes('Bot') &&
    typeof c.body === 'string' && c.body.startsWith(`${MARKER}${pr.head.sha} -->\n`) &&
    c.body.slice(`${MARKER}${pr.head.sha} -->\n`.length).trim().length >= 20 &&
    Date.parse(c.created_at) <= Date.parse(pr.closed_at) &&
    Date.parse(c.updated_at) <= Date.parse(pr.closed_at));
}
function resolvedPull(pr, comments, ancestor) {
  if (pr.base?.ref !== 'main' || pr.base?.repo?.full_name !== REPO || pr.state !== 'closed')
    throw Error(`PR #${pr.number} is still open or has invalid repository/base`);
  if (pr.merged) {
    if (!/^[a-f0-9]{40}$/.test(pr.merge_commit_sha || '')) throw Error('Missing merge SHA');
    ancestor(pr.merge_commit_sha);
  } else if (!closureComment(pr, comments)) throw Error(`PR #${pr.number} closed without an owner rationale bound to its head before closure`);
  return {number:pr.number,head:pr.head.sha,merge:pr.merged ? pr.merge_commit_sha : null,closedAt:pr.closed_at};
}
function validateProof(proof, version, deps) {
  if (proof?.schemaVersion !== 1 || proof.repository !== REPO || proof.version !== version ||
      !/^[a-f0-9]{40}$/.test(proof.main || '') || !Array.isArray(proof.prs) ||
      proof.prs.some(n => !Number.isSafeInteger(n) || n <= 0) || new Set(proof.prs).size !== proof.prs.length ||
      !Number.isFinite(Date.parse(proof.completedAt)) || !Array.isArray(proof.pulls) || proof.pulls.length !== proof.prs.length) throw Error('Missing or invalid completed release cycle');
  deps.ancestor(proof.main);
  for (const n of proof.prs) {
    const pr = deps.gh(['api',`repos/${REPO}/pulls/${n}`]);
    if (pr.number !== n) throw Error('PR identity mismatch');
    const observed = resolvedPull(pr, pr.merged ? [] : deps.gh(['api','--paginate','--slurp',`repos/${REPO}/issues/${n}/comments?per_page=100`]).flat(), merge=>deps.ancestor(merge,proof.main));
    const recorded=proof.pulls.find(p=>p.number===n);
    if (!recorded || recorded.head!==observed.head || (recorded.merge || null)!==observed.merge || recorded.closedAt!==observed.closedAt) throw Error('PR changed since cycle verification; verify again');
  }
  const {proofForRuns} = require('./maintenance_cycle.cjs');
  const runs = deps.gh(['api','--paginate','--slurp',`repos/${REPO}/actions/runs?head_sha=${proof.main}&per_page=100`]).flatMap(p=>p.workflow_runs);
  const checked = proofForRuns(runs,proof.main);
  const ci = checked.find(r=>r.path === '.github/workflows/ci.yml');
  const jobs = deps.gh(['api','--paginate','--slurp',`repos/${REPO}/actions/runs/${ci.id}/attempts/${ci.run_attempt || 1}/jobs?per_page=100`]).flatMap(p=>p.jobs);
  if (!jobs.some(j=>j.name==='main-validation-and-sync' && j.conclusion==='success' && j.steps?.some(s=>s.name==='Validate protected source diff with ephemeral snapshots' && s.conclusion==='success')))
    throw Error('Completed cycle lacks executed protected source validation');
  const latest = proofForRuns(deps.gh(['api','--paginate','--slurp',`repos/${REPO}/actions/runs?head_sha=${proof.main}&per_page=100`]).flatMap(p=>p.workflow_runs),proof.main);
  if (latest.some((r,i)=>r.id!==checked[i].id || r.run_attempt!==checked[i].run_attempt)) throw Error('Workflow changed during release gate; verify again');
  return proof;
}
function dependencies(root, target = 'HEAD') {
  const run=(cmd,args)=>execFileSync(cmd,args,{cwd:root,encoding:'utf8',timeout:120000,maxBuffer:16*1024*1024}).trim();
  return {gh:args=>JSON.parse(run('gh',args)),ancestor:(sha,base=target)=>run('git',['merge-base','--is-ancestor',sha,base])};
}
function prepareProof(root, version, directory) {
  if (!directory) throw Error('release:prepare requires --state-dir with a successful maintenance:cycle verify');
  const state=require('../lib/maintenance-state').openStore(directory,root).readBatch('cycle');
  const last=state?.attempts?.at(-1);
  if (!state?.completedAt || last?.stage !== 'verify' || last.success !== true || last.result?.main === undefined ||
      state.repository !== REPO || state.scope !== 'source-maintenance-no-release') throw Error('Maintenance cycle verification has not passed');
  const proof={schemaVersion:1,repository:REPO,version,main:last.result.main,prs:state.prs,pulls:last.result.pulls,completedAt:state.completedAt};
  const deps=dependencies(root);
  const head=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
  if (proof.main !== head) throw Error('Main changed since cycle verification; verify again before prepare');
  return validateProof(proof,version,deps);
}
function verifyFile(root, version, ref) {
  let proof;
  if(ref) proof=JSON.parse(execFileSync('git',['show',`${ref}:${FILE}`],{cwd:root,encoding:'utf8'}));
  else proof=JSON.parse(fs.readFileSync(path.join(root,FILE),'utf8'));
  return validateProof(proof,version,dependencies(root,ref || 'HEAD'));
}
module.exports={FILE,MARKER,closureComment,resolvedPull,validateProof,prepareProof,verifyFile};
if(require.main===module) {
  try { verifyFile(process.cwd(),process.argv[2],process.argv[3]); }
  catch(e) {console.error(e.message);process.exitCode=1;}
}
