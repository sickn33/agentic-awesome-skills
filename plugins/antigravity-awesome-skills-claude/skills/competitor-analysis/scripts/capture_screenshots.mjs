#!/usr/bin/env node

// Capture homepage hero screenshot for each competitor in the research directory.
// Reads per-competitor markdown files, extracts `website` from frontmatter, navigates
// via `browse`, and writes one PNG per competitor to `{OUTPUT_DIR}/screenshots/`.
//
// Requires: `browse` CLI (`npm install -g browse`), either local Chrome (--mode local)
// or a Browserbase remote session (--mode remote, the default).
//
// The browser mode is selected per `browse` command via the --remote / --local flag,
// so there is no separate environment-config step — see SKILL.md Step 6 for setup notes.
//
// Usage: node capture_screenshots.mjs <research-dir> [--mode remote|local] [--concurrency 2]

import { readdirSync, readFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { spawnSync } from 'child_process';
import { parseFrontmatter } from './md_utils.mjs';

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h') || args.length === 0) {
  console.error(`Usage: node capture_screenshots.mjs <research-dir> [options]

Reads all .md files in <research-dir>, extracts the "website" field from each
competitor's YAML frontmatter, and captures a 1280x800 viewport screenshot of the
homepage. Writes one PNG per competitor as {slug}-hero.png.

Output goes to <research-dir>/screenshots/.

Options:
  --mode <remote|local>  Which browse session to use (default: remote).
                         Passed as --remote / --local on each browse command.
  --concurrency <n>      How many competitors to capture in parallel (default: 1)
                         (screenshot takes ~3s; serial is usually fine)
  --skip-existing        Skip competitors that already have screenshots
  --help, -h             Show this help message`);
  process.exit(args.includes('--help') || args.includes('-h') ? 0 : 1);
}

const dir = args[0];
const modeIdx = args.indexOf('--mode');
const browseMode = modeIdx !== -1 ? args[modeIdx + 1] : 'remote';
const modeFlag = browseMode === 'local' ? '--local' : '--remote';
// Drive a dedicated named session so we never collide with whatever `browse` session
// the user already has open (the default session is bound to one mode — opening it
// --remote while a --local session is live errors out). Stopped at the end of the run.
const SESSION = 'competitor-analysis-shots';
const browseFlags = [modeFlag, '-s', SESSION];
const concurrencyIdx = args.indexOf('--concurrency');
let concurrency = concurrencyIdx !== -1 ? parseInt(args[concurrencyIdx + 1], 10) : 1;
// Floor at 1: `--concurrency 0` would spawn zero workers (no screenshots captured, yet the
// script exits "successfully"), and a non-numeric value (NaN) would throw on Array(NaN).
// Normalize before the >1 clamp below.
if (!Number.isFinite(concurrency) || concurrency < 1) concurrency = 1;
const skipExisting = args.includes('--skip-existing');

// All captures share one named `browse` session; parallel `browse open/screenshot` calls would
// race on the same tab. Clamp concurrency to 1 and warn rather than silently corrupt output.
// (Each capture is fast — ~3-4s — so serial is acceptable.)
if (concurrency > 1) {
  console.error(`Note: clamping --concurrency ${concurrency} to 1 — \`browse\` shares a single session across calls, so parallel screenshots would race on the same tab.`);
  concurrency = 1;
}

const shotsDir = join(dir, 'screenshots');
mkdirSync(shotsDir, { recursive: true });

function run(cmd, args, { timeout = 30000 } = {}) {
  return spawnSync(cmd, args, { encoding: 'utf-8', timeout, maxBuffer: 4 * 1024 * 1024 });
}

async function captureOne(slug, website) {
  const heroPath = join(shotsDir, `${slug}-hero.png`);
  const result = { slug, hero: null, errors: [] };

  if (skipExisting && existsSync(heroPath)) {
    return { ...result, hero: heroPath, skipped: true };
  }

  // Hero: viewport 1280x800, single-screen shot. The mode + session flags are passed on
  // each command so every call resolves to the same dedicated browser session.
  try {
    const openRes = run('browse', ['open', website, ...browseFlags], { timeout: 30000 });
    // `browse open` exits 0 even when navigation fails — it just lands the tab on
    // `chrome-error://chromewebdata/`. Detect failure from the resulting URL, not the exit
    // code, so we never screenshot a Chrome error page (and, since the session is reused
    // across competitors, never save one competitor's page under another's slug).
    let landedUrl = '';
    try { landedUrl = (JSON.parse(openRes.stdout || '{}').url) || ''; } catch { /* non-JSON stdout */ }
    if (openRes.status !== 0 || !landedUrl || /^chrome-error:\/\//.test(landedUrl) || landedUrl === 'about:blank') {
      result.errors.push(`open failed (landed: ${landedUrl || 'unknown'}): ${openRes.stderr || openRes.stdout || `exit ${openRes.status}`}`.slice(0, 200));
      return result;
    }
    run('browse', ['viewport', '1280', '800', ...browseFlags]);
    run('browse', ['wait', 'timeout', '1500', ...browseFlags]); // let the hero settle
    const r = run('browse', ['screenshot', '--path', heroPath, '--animations', 'disabled', ...browseFlags]);
    if (r.status === 0 && existsSync(heroPath)) result.hero = heroPath;
    else result.errors.push(`hero: ${r.stderr || r.stdout}`);
  } catch (err) { result.errors.push(`hero exception: ${err.message}`); }

  return result;
}

// Load competitor records
const files = readdirSync(dir).filter(f => f.endsWith('.md')).sort();
const jobs = [];
for (const f of files) {
  const content = readFileSync(join(dir, f), 'utf-8');
  const fm = parseFrontmatter(content);
  if (!fm || !fm.website) continue;
  const slug = f.replace('.md', '');
  jobs.push({ slug, website: fm.website });
}

console.error(`Capturing hero screenshots for ${jobs.length} competitors → ${shotsDir}`);

const results = [];
const queue = [...jobs];
async function worker() {
  while (queue.length > 0) {
    const job = queue.shift();
    const started = Date.now();
    const r = await captureOne(job.slug, job.website);
    results.push(r);
    const elapsed = ((Date.now() - started) / 1000).toFixed(1);
    const mark = r.hero ? 'H' : '-';
    console.error(`  [${mark}] ${job.slug.padEnd(24)} ${elapsed}s ${r.skipped ? '(skipped)' : ''}`);
    if (r.errors.length) for (const e of r.errors) console.error(`       ! ${e.slice(0, 120)}`);
  }
}
await Promise.all(Array(Math.min(concurrency, jobs.length || 1)).fill(0).map(worker));

// Tear down the dedicated session so we don't leak a running browser (or remote
// Browserbase session) after the run. `browse stop` takes only `-s <session>` — it does NOT
// accept --remote/--local (passing them errors out), and `stop -s <session>` reliably stops
// a remote Browserbase session (verified against browse v0.8.5). Best-effort — ignore failures.
run('browse', ['stop', '-s', SESSION]);

const okHero = results.filter(r => r.hero).length;
console.error(`\nDone: ${okHero}/${jobs.length} hero`);
console.log(JSON.stringify({ total: jobs.length, hero: okHero, outputDir: shotsDir }));
