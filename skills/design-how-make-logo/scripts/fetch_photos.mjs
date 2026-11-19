// Pulls photos for the logo book's mockups from Openverse (references/logo-book.md, "Photos"): free-to-use images,
// public domain or CC BY only, with each one's creator and source kept for the book's credits page.
//
//   node fetch_photos.mjs "<what the product's world looks like>" <outDir> [count=4]
//
// e.g. "support team laptop office". No key. Openverse answers anonymous requests at a low rate; a run is one search
// and a few downloads. The images are for the book; the credits page lists every one.
import {mkdir, writeFile} from 'node:fs/promises';
import {extname, join} from 'node:path';

const [, , query, out = 'photos', countArg = '4'] = process.argv;
if (!query) {
  console.error('Usage: node fetch_photos.mjs "<search words>" <outDir> [count=4]');
  process.exit(1);
}
const count = Number(countArg);
const H = {'User-Agent': 'make-logo/0.1'};
// Stock libraries first: StockSnap is CC0 stock photography, Flickr the fallback. Wikimedia is left out: it answers
// generic clients with 429, and its large results are mostly museum and science scans, not product mood.
// Narrow searches often find nothing, so widen step by step: from stock to Flickr, then drop trailing words.
async function search(words, source) {
  const url = new URL('https://api.openverse.org/v1/images/');
  const q = {q: words, license: 'cc0,pdm,by', aspect_ratio: 'wide', source, page_size: String(count * 3), mature: 'false'};
  url.search = new URLSearchParams(q).toString();
  const r = await fetch(url, {headers: H});
  if (!r.ok) throw new Error(`Openverse answered ${r.status} for "${words}"`);
  return (await r.json()).results ?? [];
}
let results = [], used = query;
const words = query.split(/\s+/);
for (let n = words.length; n >= 1 && results.length < count; n--) {
  used = words.slice(0, n).join(' ');
  results = await search(used, 'stocksnap');
  if (results.length < count) results = [...results, ...(await search(used, 'flickr'))];
}
if (!results.length) throw new Error(`No free photos for "${query}"; try other words`);
if (used !== query) console.log(`searched "${used}" (the full "${query}" found too few)`);
await mkdir(out, {recursive: true});
const items = [];
for (const p of results) {
  if (items.length >= count) break;
  try {
    const img = await fetch(p.url, {headers: H});
    if (!img.ok || !/image\/(jpeg|png|webp)/.test(img.headers.get('content-type') ?? '')) continue;
    const file = `${p.id}${extname(new URL(p.url).pathname) || '.jpg'}`;
    await writeFile(join(out, file), Buffer.from(await img.arrayBuffer()));
    items.push({file, title: p.title ?? '', creator: p.creator ?? 'unknown', license: `${p.license.toUpperCase()} ${p.license_version ?? ''}`.trim(),
      license_url: p.license_url ?? null, source: p.foreign_landing_url ?? p.url});
  } catch {
    // A dead link is skipped; the next result takes its place.
  }
}
await writeFile(join(out, 'manifest.json'), JSON.stringify({query, fetched: new Date().toISOString(), items}, null, 2));
console.log(`${items.length} photos in ${out} (${[...new Set(items.map((i) => i.license))].join(', ')}). The book credits each one.`);
