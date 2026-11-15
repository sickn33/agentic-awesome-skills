import { test } from 'vitest';
import assert from 'node:assert/strict';
import { fetchReleases } from './sync-releases.js';
const release = id => ({ id, tag_name: `v${id}`, published_at: '2026-01-01T00:00:00Z', html_url: `https://github.com/sickn33/agentic-awesome-skills/releases/tag/v${id}`, body: `Notes ${id}`, draft: false });
test('retrieves every page, preserves notes and excludes drafts', async () => {
  const calls=[];
  const result=await fetchReleases(async url => {calls.push(url);return {ok:true,json:async()=>calls.length===1 ? Array.from({length:100},(_,i)=>release(i+1)) : [{...release(101),draft:true}, {...release(102),prerelease:true}]};});
  assert.equal(calls.length,2);assert.match(calls[1],/page=2$/);assert.equal(result.length,101);assert.equal(result.at(-1).body,'Notes 102');assert.equal(result.at(-1).prerelease,true);
});
test('a failed later page does not return a partial archive', async()=>{
 let page=0;await assert.rejects(fetchReleases(async()=>++page===1?{ok:true,json:async()=>Array.from({length:100},(_,i)=>release(i))}:{ok:false,status:403}),/HTTP 403/);
});
test('rejects empty responses and duplicate pagination',async()=>{
 await assert.rejects(fetchReleases(async()=>({ok:true,json:async()=>[]})),/empty/);
 let page=0;await assert.rejects(fetchReleases(async()=>({ok:true,json:async()=>++page===1?Array.from({length:100},(_,i)=>release(i)):[release(0)]})),/Duplicate/);
});
