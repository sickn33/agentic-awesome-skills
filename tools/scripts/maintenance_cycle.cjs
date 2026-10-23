#!/usr/bin/env node
"use strict";
// Scheduling and measurement only. merge_batch remains the sole merge authority.
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const batch = require('./merge_batch.cjs');
const {openStore} = require('../lib/maintenance-state');
const {failure,describeFailure,readWithRetry} = require('../lib/maintenance-failures');
const ROOT = path.resolve(__dirname, '../..');
const REPO = 'sickn33/agentic-awesome-skills';
function moduleRun(command, args) { return execFileSync(command, args, {cwd:ROOT, encoding:'utf8', timeout:120000, maxBuffer:16*1024*1024}).trim(); }
function parse(argv) {
  const command=argv.shift(), options={command, reviewedHeads:[]};
  if(!['start','intake','merge','align','verify','status','hosts','close'].includes(command)) throw Error('Use start, intake, merge, align, verify, status, hosts or close');
  for(let i=0;i<argv.length;i+=2) {
    if(!['--state-dir','--prs','--reviewed-head','--reviewer','--review-evidence','--version','--config','--expected-head','--reason'].includes(argv[i]) || !argv[i+1] || argv[i+1].startsWith('--')) throw Error('Unknown or incomplete option: '+argv[i]);
    if(argv[i]==='--reviewed-head') options.reviewedHeads.push(batch.assertFullSha(argv[i+1], 'Reviewed head'));
    else options[argv[i].slice(2)]=argv[i+1];
  }
  if(!options['state-dir']) throw Error('A private external --state-dir is required');
  return options;
}
function nextAction(result) {
  if(result.nextAction && result.failureCode!=='UNKNOWN_STOP') return result.nextAction;
  if(result.merged) return 'Verify protected-main ancestry and exact-main CI.';
  if(result.prepared && result.reviewAttested) return 'Proceed to merge with the existing exact-head attestation; required checks and protection are still enforced. Re-review only if content/context changes.';
  if(!result.reason) return 'Review the complete immutable skill tree once; then merge with exact-head attestation.';
  if(/BEHIND|behind|base.*drift/i.test(result.reason)) return 'Use align once with the observed --expected-head, then re-intake; never loop or bypass strict protection.';
  if(/provenance|unapproved_path|approval-safe/.test(result.reason)) return 'Record this blocker once. A reviewed protected-base policy PR or source repair is required; continue other PRs.';
  if(/conflict/i.test(result.reason)) return 'Resolve the source branch conflict and review the resulting diff.';
  return 'Inspect the exact failure once; repair its cause before repeating this stage.';
}
function proofForRuns(runs, sha) {
  return ['.github/workflows/ci.yml','.github/workflows/codeql.yml'].map(workflow=>{
    const candidates=runs.filter(r=>r.head_sha===sha && r.head_branch==='main' && r.event==='push' && r.path===workflow).sort((a,b)=>b.id-a.id);
    const latest=candidates[0];
    if(!latest || latest.status!=='completed' || latest.conclusion!=='success') throw failure(latest?.status==='completed'?'CI_FAILED':'CI_WAIT_TIMEOUT',`${workflow}: missing, pending or failed on exact main ${sha}`);
    return latest;
  });
}
async function main(argv, dependencies = {}) {
  const options=parse([...argv]);
  const store=(dependencies.openStore || openStore)(options['state-dir'], ROOT);
  const release=options.command==='status' ? () => {} : store.acquireLock?.('cycle') || (() => {});
  try {return await mainUnlocked([...argv], {...dependencies,openStore:()=>store});}
  finally {release();}
}
async function mainUnlocked(argv, dependencies = {}) {
  const batch = dependencies.batch || require('./merge_batch.cjs');
  const run = dependencies.run || ((...args) => moduleRun(...args));
  const rawGh = dependencies.gh || (args => JSON.parse(run('gh', args)));
  const gh = args => {
    if(args.includes('--method') || args.includes('-X')) {
      try{return rawGh(args);} catch(error) {throw failure('WRITE_UNCERTAIN', 'Write response unavailable; read current PR state before resuming: '+error.message);}
    }
    return readWithRetry(()=>rawGh(args),dependencies);
  };
  const readVersion = dependencies.readVersion || (() => JSON.parse(fs.readFileSync(path.join(ROOT,'package.json'))).version);
  const o=parse(argv), store=(dependencies.openStore || openStore)(o['state-dir'], ROOT);
  let state=store.readBatch('cycle');
  if(o.command==='start') {
    if(state) throw Error('Cycle already exists; use status/resume, never reset its timer');
    const prs=o.prs==='none' ? [] : batch.parsePrList(o.prs);
    if(!prs.length && gh(['api',`repos/${REPO}/pulls?state=open&per_page=1`]).length) throw Error('Empty cycle forbidden while open PRs exist; inventory the authorized batch');
    const startedAt=new Date().toISOString();
    if(batch.readRepositorySlug(ROOT)!==REPO) throw Error('Repository mismatch');
    const baselineMain=batch.ensureTrustedMain(ROOT);
    state={schemaVersion:1,repository:REPO,scope:'source-maintenance-no-release',startedAt,prs,attempts:[],baselineMain,baselineVersion:readVersion()};
    store.writeBatch('cycle', state);
  } else if(!state) throw Error('Run start before analysis/review to include their elapsed time');
  if(o.prs && o.command!=='start' && batch.parsePrList(o.prs).some(n=>!state.prs.includes(n))) throw Error('PR outside the recorded cycle');
  if(state.repository!==REPO) throw Error('Repository mismatch');
  if(o.command==='status' || o.command==='start') { console.log(JSON.stringify(state,null,2)); return; }
  // A new action invalidates prior completion; history retains the old proof.
  for(const key of ['completedAt','elapsedMs','measurement','limitations']) delete state[key];
  const attempt={stage:o.command,startedAt:new Date().toISOString()};state.attempts.push(attempt);store.writeBatch('cycle',state);
  try {
    if(o.command==='intake' || o.command==='merge') {
      const results=await batch.runBatch(ROOT,o.prs?batch.parsePrList(o.prs):state.prs,{stateDir:o['state-dir'],prepareOnly:o.command==='intake',dryRun:o.command==='intake',reviewedHeads:o.reviewedHeads,reviewer:o.reviewer,reviewEvidence:o['review-evidence']});
      attempt.results=results.map(result=>({...result,nextAction:nextAction(result)}));
      attempt.success=results.every(r=>r.status!=='blocked');
      if(!attempt.success) process.exitCode=1;
    } else if(o.command==='align') {
      const prs=batch.parsePrList(o.prs); if(prs.length!==1) throw Error('Align one exact PR deliberately');
      const expected=batch.assertFullSha(o['expected-head'],'Expected head');
      const pr=gh(['api',`repos/${REPO}/pulls/${prs[0]}`]);
      if(pr.state!=='open' || pr.base.ref!=='main' || pr.head.sha!==expected) throw failure('PR_CHANGED','PR identity changed; re-intake');
      // One explicit request; never force push or retry automatically.
      attempt.result=gh(['api','--method','PUT',`repos/${REPO}/pulls/${prs[0]}/update-branch`,'-f',`expected_head_sha=${expected}`]);
      if(!attempt.result || typeof attempt.result.message!=='string' || typeof attempt.result.url!=='string') throw failure('WRITE_UNCERTAIN','Branch-update response is incomplete; read current PR state before resuming');
      attempt.success=true;
    } else if(o.command==='close') {
      const prs=batch.parsePrList(o.prs);
      if(prs.length!==1 || !o.reason || o.reason.trim().length<20) throw Error('close requires one PR and a substantive --reason');
      const expected=batch.assertFullSha(o['expected-head'],'Expected head');
      const pr=gh(['api',`repos/${REPO}/pulls/${prs[0]}`]);
      if(pr.state!=='open' || pr.head.sha!==expected || pr.base.ref!=='main') throw Error('PR changed; inspect before closing');
      const user=gh(['api','user']);
      if(user.login!=='sickn33') throw Error('Only the repository owner may resolve a batch PR without merge');
      const body=`${require('./release_cycle_gate.cjs').MARKER}${expected} -->\n${o.reason.trim()}`;
      // Comment first. Never retry uncertain writes automatically.
      const comment=gh(['api','--method','POST',`repos/${REPO}/issues/${pr.number}/comments`,'-f',`body=${body}`]);
      if(!Number.isSafeInteger(comment?.id) || comment.body!==body || comment.user?.login!==user.login || !Number.isFinite(Date.parse(comment.created_at))) throw failure('WRITE_UNCERTAIN','Comment response incomplete; inspect the PR before closing');
      const current=gh(['api',`repos/${REPO}/pulls/${pr.number}`]);
      if(current.state!=='open' || current.head.sha!==expected) throw Error('PR changed after comment; closure stopped');
      attempt.result=gh(['api','--method','PATCH',`repos/${REPO}/pulls/${pr.number}`,'-f','state=closed']);
      attempt.success=attempt.result.state==='closed';
      if(!attempt.success) throw Error('Closure not confirmed');
    } else if(o.command==='hosts') {
      if(!o.version || !o.config) throw Error('hosts requires --version and --config (existing Codex/Atlas config)');
      attempt.result=await require('./release_inspect.cjs').hostProof('codex',path.resolve(o.config),o.version);
      attempt.success=attempt.result.status==='verified';
      if(!attempt.success) throw Error('Host not verified');
    } else if(o.command==='verify') {
      const sha=batch.ensureTrustedMain(ROOT);batch.assertEffectiveMainProtection(ROOT, REPO);
      const version=readVersion();
      if(version!==state.baselineVersion) throw Error('Runtime version changed during no-release maintenance');
      const pulls=state.prs.map(n=>{const pr=gh(['api',`repos/${REPO}/pulls/${n}`]);if(pr.number!==n) throw Error('PR identity mismatch');return pr;});
      for(const pr of pulls) {
        require('./release_cycle_gate.cjs').resolvedPull(pr, pr.merged ? [] : gh(['api','--paginate','--slurp',`repos/${REPO}/issues/${pr.number}/comments?per_page=100`]).flat(), merge => run('git',['merge-base','--is-ancestor',merge,sha]));
      }
      const runs=gh(['api','--paginate','--slurp',`repos/${REPO}/actions/runs?head_sha=${sha}&per_page=100`]).flatMap(p=>p.workflow_runs);
      const proofs=proofForRuns(runs,sha);
      const raw=proofs.map(r=>({run:r,jobs:gh(['api','--paginate','--slurp',`repos/${REPO}/actions/runs/${r.id}/attempts/${r.run_attempt || 1}/jobs?per_page=100`]).flatMap(p=>p.jobs)}));
      const ci=raw.find(proof=>proof.run.path==='.github/workflows/ci.yml');
      const source=ci.jobs.find(job=>job.name==='main-validation-and-sync');
      if(source?.conclusion!=='success' || !source.steps?.some(step=>step.name==='Validate protected source diff with ephemeral snapshots' && step.conclusion==='success'))
        throw failure('CI_FAILED','Exact main CI did not execute successful protected source validation; a green workflow alone cannot complete maintenance');
      // Re-read after collecting jobs: a rerun can invalidate a previously green run.
      for(const proof of proofs) {
        const current=gh(['api',`repos/${REPO}/actions/runs/${proof.id}`]);
        proofForRuns([current,...proofs.filter(p=>p.id!==proof.id)],sha);
        if(current.id!==proof.id || current.run_attempt!==proof.run_attempt || current.path!==proof.path) throw failure('CI_WAIT_TIMEOUT','Workflow attempt changed during verification; collect fresh evidence');
      }
      const latestProofs=proofForRuns(gh(['api','--paginate','--slurp',`repos/${REPO}/actions/runs?head_sha=${sha}&per_page=100`]).flatMap(p=>p.workflow_runs),sha);
      if(latestProofs.some((current,index)=>current.id!==proofs[index].id || current.run_attempt!==proofs[index].run_attempt)) throw failure('CI_WAIT_TIMEOUT','A newer workflow run appeared during verification; collect fresh evidence');
      if(batch.ensureTrustedMain(ROOT)!==sha) throw Error('Main changed during final verification');
      attempt.result={main:sha,pulls:pulls.map(p=>({number:p.number,head:p.head.sha,merge:p.merge_commit_sha,mergedAt:p.merged_at,closedAt:p.closed_at})),workflows:raw};
      attempt.success=true;state.completedAt=new Date().toISOString();state.elapsedMs=Date.parse(state.completedAt)-Date.parse(state.startedAt);
      state.measurement='observed-source-maintenance-through-final-verification';
      state.limitations=['Includes review, agent gaps, blocked attempts and branch updates since start.','Not comparable to a release cycle or CI-only timing.','No runtime/catalog publication or native-client restart is performed.'];
    }
  } catch(error) {attempt.success=false;attempt.error=error.message;Object.assign(attempt,describeFailure(error));process.exitCode=1;}
  finally {attempt.completedAt=new Date().toISOString();attempt.elapsedMs=Date.parse(attempt.completedAt)-Date.parse(attempt.startedAt);store.writeBatch('cycle',state);console.log(JSON.stringify({startedAt:state.startedAt,completedAt:state.completedAt,elapsedMs:state.elapsedMs,attempt},null,2));}
}
module.exports={parse,nextAction,proofForRuns,main};
if(require.main===module)main(process.argv.slice(2)).catch(e=>{console.error(e.message);process.exitCode=1;});
