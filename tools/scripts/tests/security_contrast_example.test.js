const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const root = path.resolve(__dirname, '../../..');
const source = fs.readFileSync(path.join(root,'skills/design-token-contrast/references/contraste-checker.md'),'utf8');
const fixture = path.join(__dirname,'fixtures/reviewed_examples/contrast.mjs');
assert.equal(source.match(/```javascript\n([\s\S]*?)\n```/)[1]+'\n',fs.readFileSync(fixture,'utf8'),'Review changed documentation before executing trusted fixture');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'aas-contrast-'));
try {
 const tokens=path.join(temp,'tokens.css');
 for(const color of ['rgb(none none none)','rgb(Infinity 0 0)','hsl(NaN 50% 50%)']) {
  fs.writeFileSync(tokens,`:root { --color-text: ${color}; --color-background: #fff; }`);
  const run=spawnSync(process.execPath,[fixture,'--tokens',tokens,'--todos'],{encoding:'utf8',timeout:2000,cwd:temp});
  assert.equal(run.error,undefined,run.error?.message);
  assert.equal(run.status,2,run.stdout+run.stderr);
 }
 fs.writeFileSync(tokens,':root { --color-text: #000; --color-background: #fff; }');
 const good=spawnSync(process.execPath,[fixture,'--tokens',tokens,'--todos'],{encoding:'utf8',timeout:2000,cwd:temp});
 assert.equal(good.status,0,good.stdout+good.stderr);
}finally{fs.rmSync(temp,{recursive:true,force:true});}
