const assert=require('node:assert/strict');
const {collectSkillTrees}=require('../maintainer_dossier.cjs');
const oid='a'.repeat(40), tree='b'.repeat(40);
const records=[{status:'R',old_path:'skills/old/SKILL.md',new_path:'skills/new/SKILL.md'},{status:'D',old_path:'skills/deleted/SKILL.md'}];
function run(_command,args){
 if(args[0]==='rev-parse')return tree;
 const roots=args[3]==='base'?['old','deleted']:['new'];
 return roots.flatMap(root=>['SKILL.md','references/guide.md'].map(f=>`100644 blob ${oid} 4\tskills/${root}/${f}`)).join('\n');
}
const before=collectSkillTrees('base',records,run,()=>Buffer.from('test'));
const after=collectSkillTrees('head',records,run,()=>Buffer.from('test'));
assert.deepEqual(before.map(s=>s.root),['skills/old','skills/deleted']);
assert.deepEqual(after.map(s=>s.root),['skills/new']);
assert.equal(before[1].files.length,2,'deleted skill review retains its complete previous tree');
assert.match(before[1].files[1].sha256,/^[a-f0-9]{64}$/);
const nestedRecords=[{status:'M',old_path:'skills/security/aws-secrets-rotation/SKILL.md',new_path:'skills/security/aws-secrets-rotation/SKILL.md'}];
const nestedRun=(_command,args)=>args[0]==='rev-parse'?tree:
 ['SKILL.md','references/guide.md'].map(f=>`100644 blob ${oid} 4\tskills/security/aws-secrets-rotation/${f}`).join('\n');
assert.deepEqual(collectSkillTrees('head',nestedRecords,nestedRun,()=>Buffer.from('test')).map(s=>s.root),['skills/security/aws-secrets-rotation']);
