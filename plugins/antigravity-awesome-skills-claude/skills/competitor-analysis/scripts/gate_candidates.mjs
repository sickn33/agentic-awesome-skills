#!/usr/bin/env node

// Category-fit gate. For each candidate URL, fetch the homepage hero via `browse cloud fetch`,
// extract visible text, and decide whether the candidate is in the same category as
// the user's company based on include/exclude keyword rules.
//
// Usage:
//   cat urls.txt | node gate_candidates.mjs \
//     --include "web search api,neural search,retrieval api,semantic search,search for agents" \
//     --exclude "vector database,observability,analytics,enterprise search appliance,site search widget" \
//     --concurrency 6
//
// Output: newline-delimited JSON to stdout with one object per URL:
//   { "url": "https://foo.com", "status": "PASS" | "REJECT" | "UNKNOWN",
//     "matched_includes": [...], "matched_excludes": [...], "title": "...", "hero": "..." }

import { execFile } from 'child_process';
import { promisify } from 'util';
import { readFileSync } from 'fs';

// Async execFile so the worker pool actually parallelizes. spawnSync blocks the entire
// event loop, which silently turns --concurrency N into N=1 — every URL fetched serially
// regardless of the flag. With promisified execFile, N workers can wait on N pending
// `browse cloud fetch` processes concurrently.
const execFileAsync = promisify(execFile);

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.error(`Usage: cat urls.txt | node gate_candidates.mjs [options]

Reads URLs from stdin (one per line) OR from --input <file>. For each URL, fetches
the homepage via \`browse cloud fetch --allow-redirects\`, extracts the first N chars of visible
text (the hero / tagline area), and classifies against include/exclude keyword rules.

Options:
  --include "<csv>"    Required. Comma-separated keywords; candidate PASSES if any match.
  --exclude "<csv>"    Comma-separated keywords; candidate REJECTS if any match.
  --input <file>       Read URLs from file instead of stdin.
  --concurrency <n>    Max parallel fetches (default: 6).
  --hero-chars <n>     Chars of visible text to examine (default: 800).
  --help, -h           Show this help message.`);
  process.exit(args.includes('--help') || args.includes('-h') ? 0 : 1);
}

function flag(name) {
  const i = args.indexOf(name);
  return i !== -1 ? args[i + 1] : null;
}

const includes = (flag('--include') || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
const excludes = (flag('--exclude') || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
// Floor at 1: `--concurrency 0` or a non-numeric value makes parseInt yield 0/NaN, which would
// spawn zero workers — the script would exit "successfully" having gated nothing, making
// discovery look empty with no error. Always run at least one worker.
const concurrency = Math.max(1, parseInt(flag('--concurrency') || '6', 10) || 0);
const heroChars = parseInt(flag('--hero-chars') || '800', 10);
const inputFile = flag('--input');

if (includes.length === 0) {
  console.error('Error: --include is required');
  process.exit(1);
}

let urls;
if (inputFile) {
  urls = readFileSync(inputFile, 'utf-8').split('\n').map(l => l.trim()).filter(Boolean);
} else {
  const stdin = readFileSync(0, 'utf-8');
  urls = stdin.split('\n').map(l => l.trim()).filter(Boolean);
}

if (urls.length === 0) {
  console.error('Error: no URLs provided (pipe via stdin or use --input)');
  process.exit(1);
}

function stripHtml(html) {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Position-aware classification:
//   1. Exclude term in <title>        → REJECT (their primary identity is the excluded category)
//   2. Include term in <title>        → PASS   (their primary identity matches)
//   3. Include in early hero (200ch)  → PASS iff no exclude in early hero
//   4. Otherwise                       → REJECT (default conservative)
// Rationale: <title> is the single strongest signal of what a company sells.
// Mid/late hero mentions (e.g. "we also support web scraping use cases") shouldn't
// disqualify a real competitor that self-identifies in its title as a cloud browser.
function classify(title, heroFull, includes, excludes) {
  const titleLower = (title || '').toLowerCase();
  const heroLower = heroFull.toLowerCase();
  const heroEarly = heroLower.slice(0, 200);

  const incTitle = includes.filter(k => titleLower.includes(k));
  const excTitle = excludes.filter(k => titleLower.includes(k));
  const incEarly = includes.filter(k => heroEarly.includes(k));
  const excEarly = excludes.filter(k => heroEarly.includes(k));
  const incHero = includes.filter(k => heroLower.includes(k));
  const excHero = excludes.filter(k => heroLower.includes(k));

  let status, reason;
  if (incTitle.length > 0 && excTitle.length > 0) {
    // Hybrid-identity title (e.g. "Browser Automation & Web Scraping API").
    // Break the tie by the early hero — whichever category has more mentions wins.
    if (incEarly.length > excEarly.length)       { status = 'PASS';   reason = `title-hybrid→hero200 leans include(${incEarly[0] || incTitle[0]})`; }
    else if (excEarly.length > incEarly.length)  { status = 'REJECT'; reason = `title-hybrid→hero200 leans exclude(${excEarly[0] || excTitle[0]})`; }
    else                                          { status = 'PASS';   reason = `title-hybrid→tie, defaulting include(${incTitle[0]})`; }
  }
  else if (excTitle.length > 0)                   { status = 'REJECT'; reason = `title→exclude(${excTitle[0]})`; }
  else if (incTitle.length > 0)                   { status = 'PASS';   reason = `title→include(${incTitle[0]})`; }
  else if (incEarly.length > 0 && excEarly.length === 0) { status = 'PASS'; reason = `hero200→include(${incEarly[0]})`; }
  else if (excEarly.length > 0)                   { status = 'REJECT'; reason = `hero200→exclude(${excEarly[0]})`; }
  else if (incHero.length > 0 && excHero.length === 0)   { status = 'PASS'; reason = `hero→include(${incHero[0]})`; }
  // Late-hero conflict: both include AND exclude appear in chars 200–800 (nothing in
  // title or early hero). This is genuine ambiguous signal, not absence — return UNKNOWN
  // so the candidate surfaces in the user-confirmation bucket at Step 4.5 instead of
  // being silently dropped as REJECT.
  else if (incHero.length > 0 && excHero.length > 0)     { status = 'UNKNOWN'; reason = `hero→conflict(include:${incHero[0]}, exclude:${excHero[0]})`; }
  else                                            { status = 'REJECT'; reason = 'no category signal'; }

  return {
    status, reason,
    matched_includes: [...new Set([...incTitle, ...incEarly, ...incHero])],
    matched_excludes: [...new Set([...excTitle, ...excEarly, ...excHero])],
  };
}

async function gateOne(url) {
  let stdout;
  try {
    // --format raw returns the JSON envelope with raw HTML in `.content` (the default
    // is markdown, which has no <title> tag for the position-aware classifier to read).
    const r = await execFileAsync('browse', ['cloud', 'fetch', '--allow-redirects', '--format', 'raw', url], {
      maxBuffer: 4 * 1024 * 1024,
      timeout: 20000,
    });
    stdout = r.stdout;
  } catch (err) {
    // Non-zero exit, timeout, or spawn failure all surface here.
    return { url, status: 'UNKNOWN', reason: `browse cloud fetch failed: ${err.message}`, matched_includes: [], matched_excludes: [], title: '', hero: '' };
  }
  let resp;
  try { resp = JSON.parse(stdout); } catch {
    return { url, status: 'UNKNOWN', reason: 'non-JSON response', matched_includes: [], matched_excludes: [], title: '', hero: '' };
  }
  const html = resp.content || '';
  const titleM = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const title = titleM ? titleM[1].trim() : '';
  const heroFull = stripHtml(html).slice(0, heroChars);
  const c = classify(title, heroFull, includes, excludes);
  return {
    url,
    status: c.status,
    reason: c.reason,
    matched_includes: c.matched_includes,
    matched_excludes: c.matched_excludes,
    title,
    hero: heroFull.slice(0, 240),
  };
}

// Run with bounded concurrency
const results = [];
async function runAll() {
  const queue = [...urls];
  const workers = Array(Math.min(concurrency, queue.length)).fill(0).map(async () => {
    while (queue.length > 0) {
      const u = queue.shift();
      const r = await gateOne(u);
      results.push(r);
      console.log(JSON.stringify(r));
    }
  });
  await Promise.all(workers);
}

await runAll();

const pass = results.filter(r => r.status === 'PASS').length;
const reject = results.filter(r => r.status === 'REJECT').length;
const unknown = results.filter(r => r.status === 'UNKNOWN').length;
console.error(`\nGate: ${pass} PASS / ${reject} REJECT / ${unknown} UNKNOWN (of ${results.length})`);
