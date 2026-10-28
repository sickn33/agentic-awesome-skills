const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { parseArgs, evaluateContributorSafety, runContributorEvidence } = require('../pr_preflight.cjs');
const { buildContributorReport, formatContributorReport, missingEvidence, evidenceText } = require('../../lib/contributor-report');
const yaml = require('yaml');
const root = path.resolve(__dirname, '../../..');
assert.throws(() => parseArgs(['--contributor']), /requires --base/);
assert.equal(evidenceText('before<!-- template -->after'), 'before\nafter');
assert.equal(evidenceText('before<!-- unclosed template'), 'before\n');
assert.equal(evidenceText('<!<!-- template -->--hidden-->'), '<!\n--hidden-->');
assert.equal(missingEvidence('## Change evidence\n<!-- unfinished template with many instructions').length,3);
assert.equal(missingEvidence('## Change evidence\nValid author explanation.<!-- guidance -->\n## Validation evidence\nInspected sources without executing services.\n## Source and operational boundaries\nOriginal work with no external writes.').length,0);
assert.equal(parseArgs(['--contributor', '--base', 'upstream/main']).contributor, true);
assert.deepEqual(missingEvidence('## Change evidence\n<!-- long instructions are not evidence -->\n## Validation evidence\nTODO fill this in later'), ['Change evidence','Validation evidence','Source and operational boundaries']);
assert.equal(missingEvidence('## Change evidence\nCorrected the example port.\n## Validation evidence\nInspected source; live task not run.\n## Source and operational boundaries\nN/A: original prose, no external writes.').length, 0);
const emptyReport = buildContributorReport({changeRecords:[{status:"A",new_path:"skills/demo/SKILL.md"}],prBody:{available:true,body:fs.readFileSync(path.join(root,'.github/PULL_REQUEST_TEMPLATE.md'),'utf8')}});
assert.equal(emptyReport.missing_evidence.length,3, 'unfilled template must request real evidence');
for (const reason of ['missing_examples','missing_limitations','provenance_identity','risk_downgrade']) {
 const report=buildContributorReport({headOid:'a'.repeat(40)}, {reasons:[`example:${reason}`]});
 assert.equal(report.blockers.length,1);
 assert.notEqual(report.blockers[0].action, '');
 assert.match(report.maintainer_review,/no merge approval/);
}
const hostile = formatContributorReport(buildContributorReport({directDerivedChanges:['<script>\n\x1b[31m`[click](evil)']}));
assert.ok(!hostile.includes('<script>') && !hostile.includes('\x1b') && !hostile.includes('`[click]'));
assert.match(formatContributorReport(buildContributorReport({})), /may still be pending/);
const detailed=buildContributorReport({}, {reasons:['sample:security_error_regression:SEC009:+2'], changes:[{skill_id:'sample',after:{security:{flags:[{code:'SEC009',line:85,message:'Hardcoded credential detected'}]}}}]});
assert.equal(detailed.blockers[0].path,'skills/sample/');
assert.match(detailed.blockers[0].detail,/scanner excerpt line 85/);
assert.match(formatContributorReport(detailed),/Hardcoded credential detected/);
for(const file of ['bug_report.yml','feature_request.yml']) {
 const data = yaml.parse(fs.readFileSync(path.join(root,'.github/ISSUE_TEMPLATE',file),'utf8'), {uniqueKeys:true});
 const ids = data.body.filter(item => item.id).map(item=>item.id);
 assert.equal(ids.length,new Set(ids).size);
 assert.ok(data.body.filter(item=>item.validations?.required).length>=6);
}
const temporary = fs.mkdtempSync(path.join(os.tmpdir(),'aas-contributor-regression-'));
function git(args) { const run=spawnSync('git',args,{cwd:temporary,encoding:'utf8'}); assert.equal(run.status,0,run.stderr); return run.stdout.trim(); }
try {
 git(['init','-q']); git(['config','user.email','test@example.invalid']); git(['config','user.name','Test']);
 fs.writeFileSync(path.join(temporary,'README.md'),'# Fixture\n');
 fs.writeFileSync(path.join(temporary,'.gitignore'),fs.readFileSync(path.join(root,'.gitignore'),'utf8'));
 fs.mkdirSync(path.join(temporary,'.venv/lib'),{recursive:true});
 fs.writeFileSync(path.join(temporary,'.venv/lib/local.cfg'),'local environment');
 assert.equal(git(['check-ignore','.venv/lib/local.cfg']),'.venv/lib/local.cfg', 'documented Python environment must not dirty the committed source checkout');
 git(['add','.']); git(['commit','-qm','base']); const base=git(['rev-parse','HEAD']);
 fs.mkdirSync(path.join(temporary,'skills/sample/scripts'),{recursive:true});
 fs.writeFileSync(path.join(temporary,'skills/sample/SKILL.md'),'---\nname: sample\ndescription: "Concrete fixture for a contributor regression"\nrisk: none\nsource: self\nsource_type: self\n---\n# Sample\n\n## When to Use\nUse when testing the contributor preflight.\n');
 git(['add','.']); git(['commit','-qm','new skill missing examples and limitations']);
 let head=git(['rev-parse','HEAD']);
 const check = runContributorEvidence(temporary,base,head);
 assert.equal(check.exitCode,1);
 assert.ok(check.evidence.reasons.some(reason=>reason.includes('missing_examples')));
 assert.ok(check.evidence.reasons.some(reason=>reason.includes('missing_limitations')));
 // A fabricated or stale evidence tuple cannot count as a successful check.
 assert.throws(()=>runContributorEvidence(temporary,base,head,(_cmd,args)=>{
  fs.writeFileSync(args.at(-1),JSON.stringify({base_oid:base,head_oid:base,blocking:false}));
  return {status:0};
 }),/does not match/);
 fs.writeFileSync(path.join(temporary,'skills/sample/scripts/helper.mjs'),'throw new Error("must never execute");\n');
 git(['add','.']);git(['commit','-qm','restricted bundle']);head=git(['rev-parse','HEAD']);
 const raw = require('../pr_preflight.cjs').getChangeRecords(temporary,base,head);
 const safety=evaluateContributorSafety(temporary,raw);
 assert.equal(safety.approvalSafe,false);
 const report=buildContributorReport({forkSafety:safety});
 assert.ok(report.blockers.some(item=>item.path.endsWith('helper.mjs')));
 assert.match(report.blockers.map(item=>item.action).join(' '),/maintainer review/);
 const output=spawnSync(process.execPath,[path.join(root,'tools/scripts/pr_preflight.cjs'),'--repo',temporary,'--contributor','--base',base,'--head',head,'--no-run','--json'],{cwd:root,encoding:'utf8'});
 assert.equal(output.status,1,output.stderr);
 assert.equal(JSON.parse(output.stdout).forkSafety.approvalSafe,false);
 assert.ok(!output.stderr.includes('must never execute'));
 const fullBlocked=spawnSync(process.execPath,[path.join(root,'tools/scripts/pr_preflight.cjs'),'--repo',temporary,'--contributor','--base',base,'--head',head,'--json'],{cwd:root,encoding:'utf8'});
 assert.equal(fullBlocked.status,1);
 assert.ok(JSON.parse(fullBlocked.stdout).contributorReport.blockers.length>0, 'full JSON mode must report intake failures before check execution');
 // Inert ordinary skill files use the exact same raw-record classifier as CI.
 const skillRecords=raw.filter(record=>!record.new_path.endsWith('.mjs'));
 assert.equal(evaluateContributorSafety(temporary,skillRecords).approvalSafe,true);
 const link=skillRecords.map(record=>({...record,new_mode:'120000'}));
 assert.equal(evaluateContributorSafety(temporary,link).approvalSafe,false);
} finally { fs.rmSync(temporary,{recursive:true,force:true}); }
console.log('Contributor readiness regressions passed.');
