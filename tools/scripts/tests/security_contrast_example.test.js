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
 for(const color of ['rgb(none none none)','rgb(Infinity 0 0)','hsl(NaN 50% 50%)', '#abcde', '#abcdef0']) {
  fs.writeFileSync(tokens,`:root { --color-text: ${color}; --color-background: #fff; }`);
  const run=spawnSync(process.execPath,[fixture,'--tokens',tokens,'--todos'],{encoding:'utf8',timeout:2000,cwd:temp});
  assert.equal(run.error,undefined,run.error?.message);
  assert.equal(run.status,2,run.stdout+run.stderr);
 }
 fs.writeFileSync(tokens,':root { --color-text: #000; --color-background: #fff; }');
 const good=spawnSync(process.execPath,[fixture,'--tokens',tokens,'--todos'],{encoding:'utf8',timeout:2000,cwd:temp});
 assert.equal(good.status,0,good.stdout+good.stderr);
 // CLI errors fail before inspecting or writing project data.
 for (const args of [['--unknown'], ['--tokens'], ['--json', '--todos']]) {
  const run = spawnSync(process.execPath, [fixture, ...args], {encoding:'utf8', timeout:2000, cwd:temp});
  assert.equal(run.status, 2, run.stdout + run.stderr);
 }
 const pairs = path.join(temp, 'pairs.json');
 for (const [background, kind] of [['#fff', 'unsupported'], ['transparent', 'texto']]) {
  fs.writeFileSync(tokens, `:root { --color-text: #000; --color-background: ${background}; }`);
  fs.writeFileSync(pairs, JSON.stringify([{texto:'--color-text', fondo:'--color-background', tipo:kind}]));
  const run = spawnSync(process.execPath, [fixture, '--tokens', tokens, '--pares', pairs], {encoding:'utf8', timeout:2000, cwd:temp});
  assert.equal(run.status, 2, run.stdout + run.stderr);
 }
 // A readable black/white pair cannot conceal an unreadable additional color.
 fs.writeFileSync(tokens, ':root { --color-text: #000; --color-background: #fff; --color-extra: invalid; }');
 const incomplete = spawnSync(process.execPath, [fixture, '--tokens', tokens, '--todos'], {encoding:'utf8', timeout:2000, cwd:temp});
 assert.equal(incomplete.status, 2, incomplete.stdout + incomplete.stderr);
 fs.writeFileSync(tokens, ':root { --color-text: #000; --color-background: #fff; }');
 const report = path.join(temp, 'report.json');
 fs.writeFileSync(report, 'PRESERVE');
 const refused = spawnSync(process.execPath, [fixture, '--tokens', tokens, '--todos', '--json', report], {encoding:'utf8', timeout:2000, cwd:temp});
 assert.notEqual(refused.status, 0);
 assert.equal(fs.readFileSync(report, 'utf8'), 'PRESERVE');
 fs.unlinkSync(report);
 const created = spawnSync(process.execPath, [fixture, '--tokens', tokens, '--todos', '--json', report], {encoding:'utf8', timeout:2000, cwd:temp});
 assert.equal(created.status, 0, created.stdout + created.stderr);
 assert.equal(JSON.parse(fs.readFileSync(report, 'utf8'))[0].filas[0].ratio, 21);
 if (process.platform !== 'win32') assert.equal(fs.statSync(report).mode & 0o777, 0o600);
 fs.writeFileSync(tokens, ':root { --color-text: oklch(50% 0.6 30); --color-background: #fff; }');
 const gamut = spawnSync(process.execPath, [fixture, '--tokens', tokens], {encoding:'utf8', timeout:2000, cwd:temp});
 assert.equal(gamut.error, undefined, gamut.error?.message);
 assert.ok([0, 1].includes(gamut.status), gamut.stdout + gamut.stderr);
 assert.doesNotMatch(gamut.stdout, /NaN|Infinity/);
}finally{fs.rmSync(temp,{recursive:true,force:true});}
