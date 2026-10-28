const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const yaml = require('yaml');
const {missingEvidence,evaluateAdmission,requiresEvidence} = require('../../lib/contribution-admission');
const {assertSubmissionReady,pullRequestTuple,assertUnchangedTuple} = require('../merge_batch.cjs');
const root=path.resolve(__dirname,'../../..');
const valid='## Change evidence\nCorrected one wrong example port.\n## Validation evidence\nInspected the source; live test not run because credentials are unavailable.\n## Source and operational boundaries\nN/A: original prose; no new accounts, data recipients or writes.\n';
const record={status:'M',old_path:'skills/demo/references/guide.md',new_path:'skills/demo/references/guide.md'};
assert.equal(evaluateAdmission([record],valid).blocking,false);
assert.equal(evaluateAdmission([record],null).blocking,true);
assert.equal(evaluateAdmission([record],'').missing.length,3);
assert.equal(evaluateAdmission([{...record,old_path:'docs/guide.md',new_path:'docs/guide.md'}],null).blocking,false);
const {buildContributorReport,formatContributorReport}=require('../../lib/contributor-report');
assert.deepEqual(buildContributorReport({changeRecords:[{status:'M',old_path:'docs/guide.md',new_path:'docs/guide.md'}],prBody:{available:true,body:''}}).missing_evidence,[]);
assert.match(formatContributorReport(buildContributorReport({changeRecords:[record]})),/not checked/);
assert.equal(requiresEvidence([{status:'C',old_path:'skills/demo/SKILL.md',new_path:'plugins/example/skills/demo/SKILL.md'}]),false);
assert.equal(requiresEvidence([{status:'R',old_path:'skills/demo/SKILL.md',new_path:'docs/guide.md'}]),true);
for(const body of [valid.replace('Corrected one wrong example port.','TODO provide the explanation'),valid.replace('Corrected one wrong example port.','N/A'), '```markdown\n'+valid+'```', valid+'\n## Change evidence\nContradictory duplicate section.', 'x'.repeat(65537)]) {
 assert.ok(missingEvidence(body).length>0);
 assert.throws(()=>assertSubmissionReady([record],{body}),error=>error.failureCode==='SUBMISSION_INCOMPLETE');
}
assert.doesNotThrow(()=>assertSubmissionReady([record],{body:valid}));
assert.throws(()=>assertSubmissionReady([record],{body:valid,isDraft:true}),error=>error.failureCode==='DRAFT_PR');
const details={number:10,baseRefName:'main',baseRefOid:'a'.repeat(40),headRefOid:'b'.repeat(40),body:valid,isDraft:false};
const tuple=pullRequestTuple(details);
assert.doesNotThrow(()=>assertUnchangedTuple(details,tuple,'test',10));
for(const change of [{body:''},{body:valid+' More evidence'},{isDraft:true}]) {
 assert.throws(()=>assertUnchangedTuple({...details,...change},tuple,'before merge',10),error=>error.failureCode==='PR_CHANGED');
}
const ci=yaml.parse(fs.readFileSync(path.join(root,'.github/workflows/ci.yml'),'utf8'));
for(const event of ['opened','synchronize','reopened','edited','ready_for_review']) assert.ok(ci.on.pull_request.types.includes(event));
const intake=ci.jobs['pr-policy'].steps.find(step=>step.id==='intake');
assert.match(intake.run,/trusted_root\/tools\/scripts\/pr_preflight/);
assert.match(intake.run,/--check-submission/);
assert.ok(!ci.on.pull_request_target);
// Real CLI policy preview: incomplete descriptions fail before candidate checks,
// and completing only the body fixes admission without changing source bytes.
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'aas-admission-'));
function git(args){const run=spawnSync('git',args,{cwd:temporary,encoding:'utf8'});assert.equal(run.status,0,run.stderr);return run.stdout.trim();}
try{
 git(['init','-q']);git(['config','user.email','test@example.invalid']);git(['config','user.name','Test']);
 fs.mkdirSync(path.join(temporary,'skills/demo'),{recursive:true});fs.writeFileSync(path.join(temporary,'skills/demo/SKILL.md'),'# Fixture\n');
 git(['add','.']);git(['commit','-qm','base']);const base=git(['rev-parse','HEAD']);
 fs.appendFileSync(path.join(temporary,'skills/demo/SKILL.md'),'One correction.\n');git(['add','.']);git(['commit','-qm','fix']);
 const file=path.join(temporary,'body.md');
 const args=[path.join(root,'tools/scripts/pr_preflight.cjs'),'--repo',temporary,'--base',base,'--head','HEAD','--body-file',file,'--check-submission','--no-run','--json'];
 fs.writeFileSync(file,'## Change evidence\n<!-- template only -->');
 let run=spawnSync(process.execPath,args,{encoding:'utf8'});assert.equal(run.status,1);assert.match(run.stderr,/evidence is incomplete/);assert.ok(JSON.parse(run.stdout).contributorReport.admission.blocking);
 fs.writeFileSync(file,valid);run=spawnSync(process.execPath,args,{encoding:'utf8'});assert.equal(run.status,0,run.stderr);assert.equal(JSON.parse(run.stdout).contributorReport.admission.blocking,false);
 const noBody=args.slice(0,args.indexOf('--body-file')).concat(['--check-submission','--no-run','--json']);
 run=spawnSync(process.execPath,noBody,{encoding:'utf8'});assert.equal(run.status,1);assert.match(run.stderr,/description unavailable/);
}finally{fs.rmSync(temporary,{recursive:true,force:true});}
console.log('Mandatory contribution admission regressions passed.');
