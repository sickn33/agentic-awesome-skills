#!/usr/bin/env node

// Merges per-lane partial markdown files into one consolidated file per competitor.
//
// The 5-lane subagent fan-out writes partials to: {OUTPUT_DIR}/partials/{slug}.{lane}.md
//   lane ∈ { marketing, discussion, social, news, technical }
//
// Each partial has its own YAML frontmatter + sections. The marketing partial owns
// the canonical frontmatter (pricing, features, etc.); other lanes contribute only
// Mentions / Benchmarks / Findings bullets. The merge:
//   1. Starts from marketing.md's frontmatter as the canonical header
//   2. Appends body sections in the canonical order (Product, Pricing, Features,
//      Positioning, Comparison, Mentions, Benchmarks, Research Findings)
//   3. Unions all Mentions bullets across lanes, dedups by URL, sorts by date desc
//   4. Unions all Research Findings bullets across lanes
//   5. Unions all Benchmarks bullets
//   6. Writes the consolidated file to {OUTPUT_DIR}/{slug}.md
//
// Usage: node merge_partials.mjs <research-dir>

import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { parseFrontmatter, parseBody, parseSections } from './md_utils.mjs';

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h') || args.length === 0) {
  console.error(`Usage: node merge_partials.mjs <research-dir>

Reads {dir}/partials/{slug}.{lane}.md files and writes consolidated
{dir}/{slug}.md per competitor. Lanes: marketing, discussion, social, news, technical.`);
  process.exit(args.includes('--help') || args.includes('-h') ? 0 : 1);
}

const dir = args[0];
const partialsDir = join(dir, 'partials');

const LANES = ['marketing', 'discussion', 'social', 'news', 'technical', 'battle'];

function extractBullets(sectionText) {
  if (!sectionText) return [];
  const out = [];
  for (const raw of sectionText.split('\n')) {
    const line = raw.trim();
    // Accept either "- ..." or numbered-list "1. ..." — normalize both to "- ...".
    if (line.startsWith('- ')) out.push(line);
    else {
      const m = line.match(/^\d+\.\s+(.*)$/);
      if (m) out.push('- ' + m[1]);
    }
  }
  return out;
}

// Normalize Mentions bullet lines to the canonical format that `compile_report.mjs`
// parses: `- **[SourceType]** Title | Snippet (source: URL, YYYY-MM-DD)`.
//
// Lane subagents deviate in practice — we've observed at least three variants:
//   A) discussion-style:   `- **HN** — [Title](url) — snippet`
//   B) news-style:         `- **2025-08-06** — [News] Outlet — "title" — url`
//   C) canonical:          `- **[SourceType]** Title | Snippet (source: URL, YYYY-MM-DD)`
// Rather than fighting prompt drift, normalize at merge time so downstream stays clean.
function normalizeMentionBullet(line) {
  // Already canonical — nothing to do.
  if (/^-\s*\*\*\[\w+\]\*\*/.test(line)) return line;

  const urlMatch = line.match(/https?:\/\/\S+/);
  const url = urlMatch ? urlMatch[0].replace(/[).,\]\s]+$/, '') : '';
  const dateMatch = line.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  const date = dateMatch ? dateMatch[1] : '';

  // Pattern A — `- **SourceType** — [Title](url) — snippet`  (e.g. discussion lane)
  //   **SourceType** is bold but without the brackets we want in canonical form.
  let m = line.match(/^-\s*\*\*([^*]+)\*\*\s*[—\-]\s*\[([^\]]+)\]\(([^)]+)\)\s*(?:[—\-]\s*(.*))?$/);
  if (m) {
    const [, rawType, title, linkUrl, snippet] = m;
    const sourceType = rawType.trim().replace(/^\[|\]$/g, '');
    const snippetStr = snippet && snippet.trim() ? ` | ${snippet.trim()}` : '';
    const dateStr = date ? `, ${date}` : '';
    return `- **[${sourceType}]** ${title.trim()}${snippetStr} (source: ${linkUrl}${dateStr})`;
  }

  // Pattern B — `- **YYYY-MM-DD** — [SourceType] Outlet — "title" — url`  (e.g. news lane)
  m = line.match(/^-\s*\*\*(\d{4}-\d{2}-\d{2})\*\*\s*[—\-]\s*\[(\w+)\]\s+([^—]+?)\s*[—\-]\s*"?([^"]+?)"?\s*(?:[—\-]\s*(\S+))?\s*$/);
  if (m) {
    const [, dateStr, sourceType, outlet, title, trailingUrl] = m;
    const finalUrl = trailingUrl && trailingUrl.startsWith('http') ? trailingUrl : url;
    const snippet = outlet.trim();
    return `- **[${sourceType}]** ${title.trim()}${snippet ? ` | ${snippet}` : ''} (source: ${finalUrl || ''}, ${dateStr})`;
  }

  // Pattern C — generic fallback: find any `**X**` tag + URL and format canonically.
  m = line.match(/^-\s*\*\*([^*]+)\*\*\s*(.*)/);
  if (m && url) {
    const rawType = m[1].trim().replace(/^\[|\]$/g, '');
    // If the leading token is a date, try to pull a later **type** off the rest.
    let sourceType = rawType;
    if (/^\d{4}-\d{2}-\d{2}$/.test(rawType)) {
      const innerType = m[2].match(/\[(\w+)\]/);
      if (innerType) sourceType = innerType[1];
    }
    const linkTextM = m[2].match(/\[([^\]]+)\]/);
    const title = linkTextM ? linkTextM[1] : m[2].replace(url, '').replace(/[—"]+/g, '').replace(/^\W+|\W+$/g, '').slice(0, 100);
    const dateStr = date ? `, ${date}` : '';
    return `- **[${sourceType}]** ${title.trim()} (source: ${url}${dateStr})`;
  }

  // Last resort — leave line untouched (preserves data even if un-parseable).
  return line;
}

function urlOf(bullet) {
  const m = bullet.match(/\(source:\s*([^,)]+)/);
  return m ? m[1].trim() : null;
}

function dateOf(bullet) {
  const m = bullet.match(/\(source:\s*[^,)]+,\s*(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : '';
}

let files;
try { files = readdirSync(partialsDir); } catch {
  console.error(`No partials directory at ${partialsDir} — nothing to merge.`);
  process.exit(0);
}

// Group partials by slug
const bySlug = new Map();
for (const f of files) {
  if (!f.endsWith('.md')) continue;
  const m = f.match(/^(.+)\.([a-z]+)\.md$/);
  if (!m) continue;
  const slug = m[1];
  const lane = m[2];
  if (!LANES.includes(lane)) continue;
  if (!bySlug.has(slug)) bySlug.set(slug, {});
  const content = readFileSync(join(partialsDir, f), 'utf-8');
  bySlug.get(slug)[lane] = { fm: parseFrontmatter(content), body: parseBody(content) };
}

let merged = 0;
for (const [slug, lanes] of bySlug.entries()) {
  const marketing = lanes.marketing;
  if (!marketing || !marketing.fm) {
    console.error(`[skip] ${slug}: no marketing partial — cannot form canonical frontmatter`);
    continue;
  }

  // Union body sections
  const allSections = {};
  for (const lane of LANES) {
    if (!lanes[lane]) continue;
    const secs = parseSections(lanes[lane].body);
    for (const [k, v] of Object.entries(secs)) {
      if (!allSections[k]) allSections[k] = [];
      allSections[k].push(v);
    }
  }

  // Normalize → dedup Mentions by URL, sort by date desc
  const rawBullets = (allSections['Mentions'] || []).flatMap(s => extractBullets(s));
  const mentionBullets = rawBullets.map(normalizeMentionBullet);
  const seenUrls = new Set();
  const dedupedMentions = [];
  for (const b of mentionBullets) {
    const u = urlOf(b);
    const key = u || b; // fallback to bullet text if no URL
    if (seenUrls.has(key)) continue;
    seenUrls.add(key);
    dedupedMentions.push(b);
  }
  dedupedMentions.sort((a, b) => {
    const da = dateOf(a), db = dateOf(b);
    if (da && db) return db.localeCompare(da);
    if (da) return -1;
    if (db) return 1;
    return 0;
  });

  // Dedup Benchmarks by URL
  const benchmarkBullets = (allSections['Benchmarks'] || []).flatMap(s => extractBullets(s));
  const seenBench = new Set();
  const dedupedBench = [];
  for (const b of benchmarkBullets) {
    const m = b.match(/https?:\/\/\S+/);
    const key = m ? m[0] : b;
    if (seenBench.has(key)) continue;
    seenBench.add(key);
    dedupedBench.push(b);
  }

  // Dedup Findings loosely (by exact text)
  const findingBullets = (allSections['Research Findings'] || []).flatMap(s => extractBullets(s));
  const dedupedFindings = [...new Set(findingBullets)];

  // Merge/prefer marketing for Product/Pricing/Features/Positioning/Comparison
  function first(key) {
    const arr = allSections[key] || [];
    return arr.length ? arr[0] : '';
  }

  // Rebuild frontmatter — whitelist canonical fields only. Non-marketing lane subagents
  // sometimes leak ad-hoc meta fields (notes, searches_run, lane, etc.) into their partial's
  // frontmatter; those are debug/summary fields, not canonical data. Drop them here.
  const CANONICAL_FIELDS = [
    'competitor_name', 'website', 'pricing_url',
    'tagline', 'positioning', 'product_description', 'target_customer',
    'pricing_model', 'pricing_tiers', 'key_features', 'integrations',
    'headquarters', 'founded', 'employee_estimate', 'funding_info',
    'strategic_diff',
  ];
  // Subagents drift on canonical field names too. Common aliases observed in real runs:
  // `competitor` → `competitor_name` (browsaur marketing subagent), `homepage` → `website`,
  // `price_tiers` → `pricing_tiers`. Accept aliases silently.
  //
  // NOTE: a bare `pricing` key is mapped to `pricing_model`, NOT `pricing_tiers`. In practice
  // subagents use `pricing` for a pricing *model* or prose summary ("usage-based", "$0.005/req")
  // far more often than for an enumerated tier list, so routing it to `pricing_tiers` corrupted
  // the structured tier data the overview/matrix render from. Use `price_tiers`/`pricing_tiers`
  // explicitly for tiers.
  const FIELD_ALIASES = {
    'competitor': 'competitor_name',
    'name': 'competitor_name',
    'company': 'competitor_name',
    'homepage': 'website',
    'url': 'website',
    'price_tiers': 'pricing_tiers',
    'pricing': 'pricing_model',
  };
  function canonicalValue(fm, key) {
    if (fm[key]) return fm[key];
    for (const [alias, canonical] of Object.entries(FIELD_ALIASES)) {
      if (canonical === key && fm[alias]) return fm[alias];
    }
    return undefined;
  }
  const mergedFm = {};
  for (const k of CANONICAL_FIELDS) {
    const v = canonicalValue(marketing.fm, k);
    if (v) mergedFm[k] = v;
  }
  // Other lanes may fill in canonical gaps (e.g. funding_info from news, strategic_diff from technical).
  for (const lane of LANES) {
    if (lane === 'marketing' || !lanes[lane] || !lanes[lane].fm) continue;
    for (const k of CANONICAL_FIELDS) {
      if (!mergedFm[k]) {
        const v = canonicalValue(lanes[lane].fm, k);
        if (v) mergedFm[k] = v;
      }
    }
  }

  const fmLines = Object.entries(mergedFm).map(([k, v]) => `${k}: ${v}`).join('\n');

  // Comparison heading may be "Comparison vs Exa" etc — find any key starting with "Comparison"
  const comparisonKey = Object.keys(allSections).find(k => k.startsWith('Comparison'));
  // Battle lane is format-drifty: subagents emit `## Battle Card`, `# Battle Card: X vs Y`
  // (h1 — not picked up by parseSections), or skip the wrapper and lead with `## Landmines`.
  // Treat the ENTIRE battle partial body as the Battle Card section regardless of heading style,
  // so sales enablement content always lands in the merged file.
  let battleCardBody = '';
  if (lanes.battle && lanes.battle.body) {
    const body = lanes.battle.body.trim();
    // Strip the FIRST heading line if it mentions "Battle Card" — handles h1/h2/h3 and any
    // suffix (e.g. `## Battle Card — Serper`, `# Battle Card: Tavily`). Otherwise the
    // canonical `## Battle Card` wrapper added below produces duplicate headings.
    battleCardBody = body.replace(/^#{1,3}\s+Battle\s*Card\b[^\n]*\n+/m, '').trim();
  }

  const out = [
    '---',
    fmLines,
    '---',
    '',
    first('Product') ? `## Product\n${first('Product')}\n` : '',
    first('Pricing') ? `## Pricing\n${first('Pricing')}\n` : '',
    first('Features') ? `## Features\n${first('Features')}\n` : '',
    first('Positioning') ? `## Positioning\n${first('Positioning')}\n` : '',
    comparisonKey && allSections[comparisonKey].length ? `## ${comparisonKey}\n${allSections[comparisonKey][0]}\n` : '',
    battleCardBody ? `## Battle Card\n${battleCardBody}\n` : '',
    dedupedMentions.length ? `## Mentions\n${dedupedMentions.join('\n')}\n` : '',
    dedupedBench.length ? `## Benchmarks\n${dedupedBench.join('\n')}\n` : '',
    dedupedFindings.length ? `## Research Findings\n${dedupedFindings.join('\n')}\n` : '',
  ].filter(Boolean).join('\n');

  writeFileSync(join(dir, `${slug}.md`), out);
  merged += 1;
  console.error(`[ok]   ${slug}: ${dedupedMentions.length} mentions, ${dedupedBench.length} benchmarks, ${dedupedFindings.length} findings`);
}

console.log(JSON.stringify({ merged, competitors: bySlug.size }));
