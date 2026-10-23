const assert = require('node:assert/strict');
const { mkdtemp, writeFile, mkdir, rm, readFile } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const { execFileSync } = require('node:child_process');

async function main() {
const root = resolve(__dirname, '../../..');
const base=`${root}/skills/vercel-optimize`;
const {filterUsageByProject,runVercelJson,getAccountPlan}=await import(`${base}/lib/vercel.mjs`);
const {apply:strip}=await import(`${base}/lib/sanitizers/vercel-directive-strip.mjs`);
const {apply:deps}=await import(`${base}/lib/sanitizers/undeclared-dep.mjs`);
const {apply:rate}=await import(`${base}/lib/sanitizers/rate-limit.mjs`);
const {apply:pre}=await import(`${base}/lib/sanitizers/pre-release.mjs`);
const {gate:fluid}=await import(`${base}/lib/gates/platform-fluid-compute.mjs`);
const {gate:bot}=await import(`${base}/lib/gates/platform-bot-protection.mjs`);
const {impactMagnitude}=await import(`${base}/lib/impact-magnitude.mjs`);
assert.equal(filterUsageByProject({groupBy:{dimension:'project',data:[{projectId:'other',name:'same'}]}},'wanted','same').matched,false);
assert.equal(fluid({project:{},metrics:{fnDurationP95ByRoute:{rows:[{route:'/a',value:2000}]},requestsByRouteCache:{rows:[{route:'/a',value:3000}]}}}).length,0);
assert.equal(bot({project:{},metrics:{requestsByRouteCache:{rows:[{value:20000}]}}}).length,0);
const rec={fix:`Set Cache-Control: "public, stale-if-error=86400, s-maxage=60"`};strip(rec);assert(!rec.fix.includes('86400'));assert(rec.fix.includes('s-maxage=60'));
const malicious={fix:`import x from 'p;touch /tmp/should-not-exist'`};deps(malicious,{package:{}});assert(!malicious.fix.includes('npm i'));
const bounded={fix:'OpenAI: 2 concurrent requests'};rate(bounded);assert(!bounded.fix.includes('30 requests'));assert(bounded.fix.includes('does not establish requests per second'));
assert.equal(pre({fix:`Use 'use cache'`},{framework:'next',version:'15.5.0'}).needsReview,true);
assert.equal(pre({fix:`Use 'use cache'`},{framework:'next',version:'16.0.0'}).needsReview,undefined);
assert(!impactMagnitude({currentCost:10000,impactTier:'high'}).phrase.includes('month'));
const temp=await mkdtemp(join(tmpdir(),'aas-review-smoke-'));
const old=process.env.PATH;
try {
 const {supportTopicSubset}=await import(`${base}/lib/support-topics.mjs`);
 assert.equal((await supportTopicSubset({candidate:{kind:'use_cache_date_stamp',evidence:{patterns:['use-cache-date-stamp']}},framework:'next',version:'15.5.0'})).length,0);
 const {extractClaims}=await import(`${base}/lib/extract-claims.mjs`);
 const {verifyClaim}=await import(`${base}/lib/verify-claim.mjs`);
 const {resolveRepoRoot}=await import(`${base}/lib/repo-root.mjs`);
 const sandbox=join(temp,'repo');await mkdir(sandbox);await writeFile(join(sandbox,'entry.js'),'first\nsecond\n');
 const {resolveWorkspaceImports}=await import(`${base}/lib/workspace-resolver.mjs`);
 await writeFile(join(temp,'outside.js'),'private');await writeFile(join(sandbox,'route.js'),"import '../outside.js';");
 assert.deepEqual(await resolveWorkspaceImports(join(sandbox,'route.js'),()=>null,{rootDir:sandbox}),[]);
 const claims=extractClaims({findingRefs:['entry.js:999'],verifiableClaims:[{type:'file_exists',file:'entry.js',repoRoot:'/'}]}, {repoRoot:sandbox});
 assert.equal(claims.find(c=>c.sourceField==='verifiableClaims').repoRoot,sandbox);
 assert.equal((await verifyClaim(claims.find(c=>c.sourceField==='findingRefs'))).disposition,'failed');
 assert.equal((await resolveRepoRoot([{affectedFiles:['../outside.js']}],sandbox)).root,sandbox);
 await writeFile(join(sandbox,'invalidate.js'),"revalidateTag(tag); const config={tags:['private-content']};");
 assert.equal((await verifyClaim({type:'next_cache_tag_invalidation_supported',repoRoot:sandbox,rec:{fix:"cacheTag('private-content')"}})).disposition,'failed');
 const {scan:matcher}=await import(`${base}/lib/scanners/middleware-broad-matcher.mjs`);
 assert.equal(matcher({files:[{path:'middleware.ts',content:'export function middleware(){}; export const config={matcher:["/"]}'}]}).length,0);
 const {scan:edge}=await import(`${base}/lib/scanners/edge-heavy-import.mjs`);
 assert.equal(edge({files:[{path:'middleware.ts',content:"export const config={runtime:'nodejs'};\nimport fs from 'node:fs'"}]}).length,0);
 const {scan:image}=await import(`${base}/lib/scanners/unoptimized-image.mjs`);
 assert.equal(image({files:[{path:'x.tsx',content:`import Image from 'next/image'; <Image src="/logo.svg" width={10} height={10}/>`}]}).length,0);
 assert.equal(filterUsageByProject({totalCost:1000,groupBy:{dimension:'project',data:[{projectId:'wanted',totals:{billedCost:7}}]}},'wanted').filtered.totalCost,7);
 await writeFile(join(temp,'vercel'),`#!/bin/sh\nprintf '%s\\n' '{"partial":true}'\nexit 1\n`,{mode:0o700});
 process.env.PATH=`${temp}:${old}`;
 assert.equal((await runVercelJson(['metrics'])).ok,false);
 // Explicit team lookup returns failure, never a personal plan.
 await writeFile(join(temp,'vercel'),`#!/bin/sh\ncase "$*" in *teams*) printf '%s\\n' '{"error":{"code":"not_found"}}';exit 1;; *) printf '%s\\n' '{"billing":{"plan":"hobby"}}';; esac\n`,{mode:0o700});
 assert.equal((await getAccountPlan('my-team')).plan,'unknown');
 // Shell-quote regression: evaluate only the reviewed quote helper with a literal path.
 const source=await readFile(`${root}/skills/remote-gpu-trainer/scripts/download_loop.sh`,'utf8');
 const helper=source.split('\n').find(l=>l.startsWith('shell_quote(){'));
 const payload=`/a' b;$(touch ${temp}/injected)`;
 const quoted=execFileSync('bash',['-c',`${helper}\nshell_quote "$1"`,'test',payload],{encoding:'utf8'});
 const literal=execFileSync('sh',['-c',`printf '%s' ${quoted}`],{encoding:'utf8'});
 assert.equal(literal,payload);
 // Historical destructive option must fail before probing hardware or touching processes.
 const {spawnSync}=await import('node:child_process');
 const result=spawnSync('bash',[`${root}/skills/remote-gpu-trainer/scripts/reap_vram_zombies.sh`,'--force']);
 assert.equal(result.status,64);
 console.log('PASS: account/evidence/cache/dependency/quota/version/cost/quoting/destructive-option regressions');
} finally {process.env.PATH=old;await rm(temp,{recursive:true,force:true});}

}
main().catch((error) => { console.error(error); process.exitCode = 1; });
