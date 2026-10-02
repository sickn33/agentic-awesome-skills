const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { resolveReviewedSkillRoots } = require('../../lib/reviewed-fork-skills');
const { classifyChangeRecords } = require('../../lib/workflow-contract');
const { evaluateForkSafety } = require('../pr_preflight.cjs');
const { parseRawDiff } = require('../../lib/git-raw-diff');
const { execFileSync } = require('node:child_process');

const root = 'skills/example';
const entry = { pr: 42, base_repository: 'owner/repo', head_repository: 'author/fork',
  skill_root: root, reviewed_head: '1'.repeat(40), tree_oid: '2'.repeat(40) };
const ledger = { schema_version: 1, entries: [entry] };
const identity = { pr: 42, baseRepository: 'owner/repo', headRepository: 'author/fork', head: '3'.repeat(40) };
const resolve = (id = identity, tree = entry.tree_oid, custom = ledger) =>
  resolveReviewedSkillRoots('.', id, { ledger: custom, resolveTree: () => tree });
assert.deepEqual(resolve(), [root], 'identical reviewed tree survives a base-only merge');
for (const patch of [{pr: 43}, {baseRepository:'attacker/repo'}, {headRepository:'attacker/fork'},
  {head:'short'}, {head:'3'.repeat(39)+';'}]) assert.deepEqual(resolve({...identity,...patch}), []);
assert.deepEqual(resolve(identity, '4'.repeat(40)), [], 'any changed subtree file invalidates review');
assert.deepEqual(resolve(identity, null), [], 'missing tree is not approved');
assert.throws(() => resolve(identity, entry.tree_oid, {schema_version:2,entries:[]}), /Invalid/);
assert.throws(() => resolve(identity, entry.tree_oid, {schema_version:1,entries:[entry,entry]}), /duplicate/);
assert.throws(() => resolve(identity, entry.tree_oid, {schema_version:1,entries:[{...entry,skill_root:'tools'}]}), /Invalid/);

const record = { status:'A', old_path:null, new_path:root+'/scripts/check.py', old_mode:'000000',
  new_mode:'100644', old_oid:'0'.repeat(40), new_oid:'5'.repeat(40), new_size:100 };
const classify = (r=record, opts={}) => classifyChangeRecords([r], {reviewedSkillRoots:[root],...opts});
const { resolveReviewedSupportPaths } = require('../../lib/reviewed-fork-skills');
const supportEntry = {...entry, reviewed_support_paths:[root+'/README.md', root+'/.gitignore', root+'/scripts/report.py']};
const supportLedger = {schema_version:1, entries:[supportEntry]};
const resolveSupport = (custom=supportLedger, tree=entry.tree_oid) =>
  resolveReviewedSupportPaths('.', identity, {ledger:custom, resolveTree:()=>tree});
assert.deepEqual(resolveSupport(), [root+'/README.md', root+'/.gitignore', root+'/scripts/report.py']);
assert.deepEqual(resolveReviewedSkillRoots('.', identity, {ledger:supportLedger, resolveTree:()=>entry.tree_oid}), [root]);
for (const bad of [
  [root+'/../outside.md'], [root+'/assets/tool.sh'], [root+'/scripts/tool.sh'],
  [root+'/scripts/../../outside.py'], [root+'/scripts/report.py', root+'/scripts/report.py'],
  ['skills/other/README.md'], ['/absolute/README.md'], [root+'/'], [root+'/scripts/report.js'],
  Array.from({length:17},(_,i)=>`${root}/scripts/s${i}.py`),
]) assert.throws(() => resolveSupport({schema_version:1, entries:[{...supportEntry, reviewed_support_paths:bad}]}),
  /Invalid/, `rejects ${JSON.stringify(bad).slice(0,60)}`);
assert.throws(() => resolveSupport({schema_version:1, entries:[{...supportEntry, reviewed_support_paths:'README.md'}]}), /Invalid/);
const { isReviewedSupportPath: checkSupport } = require('../../lib/reviewed-fork-skills');
assert.equal(checkSupport(root+'/README.md', [root], [root+'/README.md']), true);
assert.equal(checkSupport(root+'/README.md', [root]), false, 'extra path only applies when opted in');
assert.equal(checkSupport(root+'/scripts/other.py', [root], [root+'/README.md']), true, 'baseline Python scripts stay permitted');
assert.equal(checkSupport(root+'/scripts/other.sh', [root], [root+'/README.md']), false);
assert.equal(classifyChangeRecords([{...record, new_path:root+'/README.md'}],
  {reviewedSkillRoots:[root], reviewedSupportPaths:[root+'/README.md']}).approvalSafe, true);
assert.equal(classifyChangeRecords([{...record, new_path:root+'/README.md'}], {reviewedSkillRoots:[root]}).approvalSafe, false);
assert.equal(classifyChangeRecords([{...record, new_path:root+'/scripts/check.py', new_mode:'100755'}],
  {reviewedSkillRoots:[root], reviewedSupportPaths:[root+'/README.md']}).approvalSafe, false, 'mode gate still applies');

assert.equal(classifyChangeRecords([record]).approvalSafe, false, 'no global Python allowlist');
assert.equal(classify().approvalSafe, true);
assert.equal(classify().requiresHumanReview, true);
for (const patch of [
  {new_mode:'100755'}, {new_mode:'120000'}, {new_mode:'160000'}, {new_oid:'bad'},
  {new_path:root+'/scripts/../../outside.py'}, {new_path:'skills/other/scripts/check.py'},
  {new_path:root+'/scripts/run.sh'}, {new_path:'.github/workflows/ci.yml'},
  {new_path:'plugins/agentic-awesome-skills/skills/example/scripts/check.py'},
  {new_size:2*1024*1024}, {new_size:undefined}, {status:'X'},
]) assert.equal(classify({...record,...patch}).approvalSafe,false,JSON.stringify(patch));
assert.equal(classify(record,{maxTotalBlobBytes:99}).approvalSafe,false);
assert.equal(classify(record,{maxChangeRecords:0}).approvalSafe,false);
const copy = {...record,status:'C',old_path:'plugins/library/LICENSE',new_path:root+'/LICENSE',
  old_mode:'100644',old_oid:'6'.repeat(40),old_size:90};
assert.equal(classify(copy).approvalSafe,true,'copy origin is read-only, all structural gates remain');
assert.equal(classify({...copy,status:'R'}).approvalSafe,false,'a rename modifies the origin');
assert.equal(classify({...copy,old_mode:'120000'}).approvalSafe,false);
assert.equal(classify({...copy,old_size:2*1024*1024}).approvalSafe,false);
assert.equal(classify({...copy,old_path:'../unsafe'}).approvalSafe,false);
assert.equal(classify({...copy,new_path:'plugins/library/OTHER'}).approvalSafe,false);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(),'aas-ledger-injection-'));
try {
  fs.mkdirSync(path.join(tmp,'tools/config'),{recursive:true});
  fs.writeFileSync(path.join(tmp,'tools/config/reviewed-fork-skills.json'),JSON.stringify(ledger));
  assert.deepEqual(resolveReviewedSkillRoots(tmp,identity,{resolveTree:()=>entry.tree_oid}),[],
    'PR-owned ledger is never read from the --repo directory');
} finally { fs.rmSync(tmp,{recursive:true,force:true}); }

// Real ledger provenance and complete tree identity are checked where the
// reviewed Git objects are available; detached package/test fixtures may omit them.
const repoRoot = path.resolve(__dirname,'../../..');
const realLedger = require('../../config/reviewed-fork-skills.json');
for (const e of realLedger.entries) {
  let tree;
  try { tree=execFileSync('git',['rev-parse','--verify',`${e.reviewed_head}:${e.skill_root}`],{cwd:repoRoot,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim(); }
  catch { continue; }
  assert.equal(tree,e.tree_oid,'ledger must bind the actual reviewed complete skill tree');
}
console.log('Reviewed fork skill boundary checks passed.');
