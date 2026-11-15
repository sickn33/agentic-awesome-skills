'use strict';
const fs=require('node:fs');
const batch=require('./merge_batch.cjs');
const {execFileSync}=require('node:child_process');
const {readWithRetry}=require('../lib/maintenance-failures');
function plan(checks,runs) {
 const summaries=batch.summarizeRequiredCheckRuns(checks,batch.getRequiredCheckAliases({}).filter(c=>['source-validation','artifact-preview'].includes(c.label)));
 for(const summary of summaries) {
  // A skipped dependent job never executed. Only that case (or absence)
  // permits first execution here; a genuine failure requires source repair.
  if(summary.state==='failed' && summary.conclusion!=='skipped')throw Error('Technical CI failed; repair or deliberately rerun it before merging');
 }
 if(summaries.every(s=>s.state==='success'))return 'reuse';
 if(summaries.some(s=>s.state==='pending'))return 'wait';
 const latest=runs.filter(r=>r.path==='.github/workflows/ci.yml').sort((a,b)=>b.id-a.id)[0];
 if(latest && latest.status!=='completed')return 'wait';
 return 'run';
}
async function main() {
 const sha=batch.assertFullSha(process.env.PR_HEAD_SHA,'PR head'),repo=process.env.GITHUB_REPOSITORY;
 if(repo!=='sickn33/agentic-awesome-skills')throw Error('Repository mismatch');
 for(let attempt=0;attempt<30;attempt++) {
  const checks=batch.listCheckRuns(process.cwd(),repo,sha);
  const pages=readWithRetry(()=>JSON.parse(execFileSync('gh',['api','--paginate','--slurp',`repos/${repo}/actions/runs?head_sha=${sha}&per_page=100`],{encoding:'utf8',timeout:120000,maxBuffer:16*1024*1024})));
  const decision=plan(checks,pages.flatMap(p=>p.workflow_runs).filter(r=>r.head_sha===sha));
  if(decision!=='wait') {
   fs.appendFileSync(process.env.GITHUB_OUTPUT,`needed=${decision==='run'}\n`);
   console.log(decision==='run'?'Technical checks have not completed: execute the full protected technical path.':'Reuse existing successful exact-head technical checks; current metadata admission is fresh.');
   return;
  }
  if(attempt<29)await new Promise(resolve=>setTimeout(resolve,20_000));
 }
 throw Error('Existing source checks are still pending; no duplicate build or replacement success was emitted');
}
module.exports={plan};
if(require.main===module)main().catch(error=>{console.error(error.message);process.exitCode=1;});
