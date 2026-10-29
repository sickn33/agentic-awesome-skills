import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, 'dist', file), 'utf8');
const skills = JSON.parse(read('skills.json'));
const directory = read('directory/index.html');
const catalog = read('core/index.html');
assert.match(catalog, /href="[^"]*\/directory\/"/, 'Catalog must link to the complete directory');
const linkedIds = new Set([...directory.matchAll(/href="[^"]*\/skill\/([^/"?#]+)\/"/g)].map((match) => decodeURIComponent(match[1])));
assert.equal(linkedIds.size, skills.length, 'Directory must link to every catalog skill');
for (const skill of skills) {
  assert.ok(linkedIds.has(skill.id), `Missing directory link: ${skill.id}`);
  const html = read(`skill/${encodeURIComponent(skill.id)}/index.html`);
  assert.match(html, /<article class="markdown-body">[\s\S]+<\/article>/, `Missing initial instructions: ${skill.id}`);
}
const escape = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const schema = [...catalog.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].flatMap((match) => JSON.parse(match[1]));
const faq = schema.find((entry) => entry['@type'] === 'FAQPage');
assert.ok(faq?.mainEntity.length, 'Catalog questions must have matching structured data');
for (const question of faq.mainEntity) {
  assert.ok(catalog.includes(`<h2>${escape(question.name)}</h2>`), `Missing visible question: ${question.name}`);
  assert.ok(catalog.includes(`<p>${escape(question.acceptedAnswer.text)}</p>`), `Missing visible answer: ${question.name}`);
}
assert.match(read('404.html'), /name="robots" content="noindex, follow"/);
assert.match(read('404.html'), /<h1>Page not found<\/h1>/);
assert.match(read('share/index.html'), /name="robots" content="noindex, follow"/, 'Shared selections must retain a non-indexable static entry route');
console.log(`Discovery verified: ${skills.length} linked skills with initial HTML, visible FAQ answers and 404 document.`);
