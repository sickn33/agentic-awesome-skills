#!/usr/bin/env node
/**
 * Create a Meta campaign, ad set, and ads from a JSON config. Everything is
 * created PAUSED: nothing here can spend money.
 *
 *   node scripts/campaign.mjs --config my-campaign.json            # dry run, no writes
 *   node scripts/campaign.mjs --config my-campaign.json --apply
 *   node scripts/campaign.mjs --config my-campaign.json --replace-ads <adset_id>           # dry run: lists the ads it would delete
 *   node scripts/campaign.mjs --config my-campaign.json --replace-ads <adset_id> --apply  # deletes them, recreates PAUSED
 *   (run from the skill folder)
 *
 * See scripts/campaign.example.json for the config shape, and
 * references/publishing.md for what each field does and why.
 *
 * Env: META_ACCESS_TOKEN (ads_management; META_ADS_TOKEN also accepted). Optional META_PAGE_ID to pick a Page
 * when the token can see several.
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, basename, isAbsolute, dirname, resolve } from 'path';

// Marketing API versions expire (v24.0 expired 2026-11-10). Override with
// META_GRAPH_VERSION when Meta retires this default; see references/meta-facts.md.
const GRAPH = `https://graph.facebook.com/${process.env.META_GRAPH_VERSION || 'v26.0'}`;
// META_ACCESS_TOKEN is the library's ads key; META_ADS_TOKEN is accepted as an older alias.
const TOKEN = process.env.META_ACCESS_TOKEN || process.env.META_ADS_TOKEN;

// ---------------------------------------------------------------- args

const argv = process.argv.slice(2);

/**
 * `argv[argv.indexOf(f) + 1]` returns argv[0] when the flag is absent, because
 * indexOf gives -1. That produced a `null` daily_budget in production and a
 * confusing "budget must be greater than $0" from Meta. Check presence first.
 */
function flag(name) {
  const i = argv.indexOf(name);
  if (i === -1) return null;
  const v = argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
}

const APPLY = argv.includes('--apply');
const CONFIG_PATH = flag('--config');
const REPLACE_ADSET = flag('--replace-ads');

if (!TOKEN) die('META_ACCESS_TOKEN not set (a system-user token with ads_management). See references/setup.md.');
if (!CONFIG_PATH || CONFIG_PATH === true) die('--config <file.json> is required.');

const cfg = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
const CONFIG_DIR = dirname(resolve(CONFIG_PATH));

function die(msg) { console.error(`\n  ${msg}\n`); process.exit(2); }

// ---------------------------------------------------------------- config validation
// Validate before any network call, so a typo fails in a second rather than
// halfway through creating objects that then need cleaning up.

for (const k of ['ad_account_id', 'campaign', 'adset', 'creative']) {
  if (!cfg[k]) die(`config is missing "${k}"`);
}
if (!cfg.ad_account_id.startsWith('act_')) die('ad_account_id must start with "act_"');

const AD_ACCOUNT = cfg.ad_account_id;
const budget = cfg.adset.daily_budget;

// Budgets are in the account's MINOR currency unit: 3000 = $30.00 in USD.
// Passing dollars is a 100x overspend, so this assertion is load-bearing.
if (!Number.isInteger(budget) || budget < 100 || budget > 1_000_00) {
  die(`adset.daily_budget must be an integer in MINOR units (cents) between 100 and 100000.\n`
    + `  Got: ${JSON.stringify(budget)}. For $30.00/day use 3000.`);
}

// Content guards. Each entry is a regex the copy must NOT match. Employment and
// Financial products and services ads reject earnings claims, so that pattern ships as the default in the
// example config, but the mechanism is general.
const guards = (cfg.copy_guards || []).map((g) => ({ name: g.name, re: new RegExp(g.pattern, g.flags || 'i') }));
const COPY = [cfg.creative.message, cfg.creative.headline, cfg.creative.description].filter(Boolean);

function checkCopy() {
  const hits = [];
  for (const g of guards) for (const text of COPY) if (g.re.test(text)) hits.push(`${g.name}: "${text.slice(0, 60)}"`);
  return hits;
}

// ---------------------------------------------------------------- graph

async function graph(path, { method = 'GET', body } = {}) {
  const init = { method, headers: { Authorization: `Bearer ${TOKEN}` } };
  if (body) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  const res = await fetch(`${GRAPH}/${path}`, init);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = json.error || {};
    // error_user_msg is the human-readable half; the two often disagree about
    // the cause, so surface both.
    throw new Error(`${res.status} ${e.message || JSON.stringify(json).slice(0, 300)}`
      + (e.error_user_msg ? ` | ${e.error_user_msg}` : ''));
  }
  return json;
}

function images() {
  const dir = isAbsolute(cfg.creative.image_dir)
    ? cfg.creative.image_dir
    : join(CONFIG_DIR, cfg.creative.image_dir);
  if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) die(`creative.image_dir not found: ${dir}`);
  const files = readdirSync(dir).filter((f) => /\.(jpe?g|png)$/i.test(f)).sort();
  if (!files.length) die(`no .jpg/.png files in ${dir}`);
  return files.map((f) => ({ file: join(dir, f), name: basename(f).replace(/\.[^.]+$/, '') }));
}

// ---------------------------------------------------------------- check

async function check(showNext = true) {
  console.log('\n  check: no writes\n');

  const me = await graph('me?fields=id,name');
  console.log(`  token identity      : ${me.name || me.id}`);

  const acct = await graph(`${AD_ACCOUNT}?fields=name,account_status,currency,timezone_name`);
  console.log(`  ad account          : ${acct.name} (${acct.currency}, ${acct.timezone_name})`);
  console.log(`  account status      : ${acct.account_status}${acct.account_status === 1 ? ' (active)' : ' (NOT active)'}`);

  const pages = (await graph('me/accounts?fields=id,name').catch(() => ({ data: [] }))).data || [];
  console.log(`  pages available     : ${pages.length}`);
  for (const p of pages) console.log(`      ${p.id}  ${p.name}`);

  const imgs = images();
  console.log(`  creative images     : ${imgs.length} in ${cfg.creative.image_dir}`);

  const hits = checkCopy();
  console.log(`  copy guards         : ${hits.length ? 'FAIL' : `clean (${guards.length} checked)`}`);
  for (const h of hits) console.log(`      ${h}`);

  console.log(`  daily budget        : ${(budget / 100).toFixed(2)} ${acct.currency}`);
  console.log(`  category            : ${(cfg.campaign.special_ad_categories || []).join(', ') || 'none'}`);
  if (showNext) console.log(`\n  next: --apply (creates everything PAUSED)\n`);

  if (hits.length) die('copy guard failed: fix the copy before applying');
  return { pages };
}

// ---------------------------------------------------------------- create

async function uploadImage(file) {
  // Multipart: the JSON helper above cannot carry a file.
  const form = new FormData();
  form.append('filename', new Blob([readFileSync(file)]), basename(file));
  const res = await fetch(`${GRAPH}/${AD_ACCOUNT}/adimages`, {
    method: 'POST', headers: { Authorization: `Bearer ${TOKEN}` }, body: form,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`image upload: ${JSON.stringify(json.error || json).slice(0, 200)}`);
  // Keyed by a mangled filename: read the value, don't look the key up.
  return Object.values(json.images)[0].hash;
}

function creativeBody(pageId, hash, name) {
  const link = new URL(cfg.creative.link);
  for (const [k, v] of Object.entries(cfg.creative.utm || {})) link.searchParams.set(k, v);
  // utm_content carries the variant so performance is attributable in your own
  // analytics, not only in Ads Manager.
  link.searchParams.set('utm_content', name);

  return {
    name,
    object_story_spec: {
      page_id: pageId,
      link_data: {
        image_hash: hash,
        link: link.toString(),
        message: cfg.creative.message,
        name: cfg.creative.headline,
        description: cfg.creative.description,
        call_to_action: { type: cfg.creative.call_to_action || 'LEARN_MORE' },
      },
    },
    // NOTE: Advantage+ creative enhancements cannot be reliably disabled here:
    // `standard_enhancements` is deprecated and its per-feature replacement
    // moves. Turn them off in Ads Manager before enabling, or Meta will
    // auto-crop the image and overlay its own text. See references/browser.md.
  };
}

async function makeAd(pageId, adsetId, img) {
  const hash = await uploadImage(img.file);
  const creative = await graph(`${AD_ACCOUNT}/adcreatives`, { method: 'POST', body: creativeBody(pageId, hash, img.name) });
  const ad = await graph(`${AD_ACCOUNT}/ads`, {
    method: 'POST',
    body: { name: img.name, adset_id: adsetId, creative: { creative_id: creative.id }, status: 'PAUSED' },
  });
  console.log(`    ad ${ad.id}  ${img.name}`);
  return ad.id;
}

function pickPage(pages) {
  const id = process.env.META_PAGE_ID || cfg.page_id || pages[0]?.id;
  if (!id) die('no Page available: an ad must run from a Page');
  return id;
}

async function apply() {
  const { pages } = await check();
  const pageId = pickPage(pages);
  console.log(`  using page          : ${pageId}\n`);

  console.log('  creating campaign (PAUSED)...');
  const campaign = await graph(`${AD_ACCOUNT}/campaigns`, {
    method: 'POST',
    body: {
      name: cfg.campaign.name,
      objective: cfg.campaign.objective,
      status: 'PAUSED',
      // Immutable after creation: a wrong category means delete and rebuild.
      special_ad_categories: cfg.campaign.special_ad_categories || [],
      buying_type: 'AUCTION',
      // Required whenever the budget sits on the ad set rather than the campaign.
      is_adset_budget_sharing_enabled: false,
    },
  });
  console.log(`    campaign ${campaign.id}`);

  console.log('  creating ad set (PAUSED)...');
  const adset = await graph(`${AD_ACCOUNT}/adsets`, {
    method: 'POST',
    body: {
      name: cfg.adset.name,
      campaign_id: campaign.id,
      status: 'PAUSED',
      daily_budget: budget,
      billing_event: 'IMPRESSIONS',
      // Explicit rather than inherited: Meta rejects an ad set that has a budget
      // but no stated strategy, and a bid cap on a pixel with no conversion
      // history throttles delivery before it can learn anything.
      bid_strategy: cfg.adset.bid_strategy || 'LOWEST_COST_WITHOUT_CAP',
      optimization_goal: cfg.adset.optimization_goal || 'OFFSITE_CONVERSIONS',
      ...(cfg.adset.pixel_id
        ? { promoted_object: { pixel_id: cfg.adset.pixel_id, custom_event_type: cfg.adset.custom_event_type || 'LEAD' } }
        : {}),
      targeting: cfg.adset.targeting,
    },
  });
  console.log(`    adset ${adset.id}`);

  const made = [];
  for (const img of images()) made.push(await makeAd(pageId, adset.id, img));

  console.log(`\n  done: campaign ${campaign.id}, ${made.length} ads, ALL PAUSED.`);
  console.log('  Before enabling: check ad previews per placement and turn off');
  console.log('  Advantage+ creative enhancements in Ads Manager.\n');
}

// Dry run for --replace-ads: shows what --apply would delete and writes nothing.
async function checkReplace(adsetId) {
  await check(false);
  const existing = await graph(`${adsetId}/ads?fields=id,name,status&limit=50`);
  console.log(`  --replace-ads ${adsetId}: would delete ${existing.data.length} existing ad(s):`);
  for (const ad of existing.data) console.log(`      ${ad.id}  ${ad.name} (${ad.status})`);
  console.log('\n  Nothing was deleted. Add --apply to delete these ads and recreate them PAUSED.');
  console.log('  Recreated ads start PAUSED: if the ad set is live, delivery stops until a person turns them on.\n');
}

async function replaceAds(adsetId) {
  const { pages } = await check();
  const pageId = pickPage(pages);

  // Creatives are immutable, so iterating means delete-and-recreate the ads.
  // Deleting the ads keeps the ad set's learning; deleting the ad set resets it.
  const existing = await graph(`${adsetId}/ads?fields=id,name&limit=50`);
  console.log(`\n  deleting ${existing.data.length} existing ads...`);
  for (const ad of existing.data) {
    await graph(ad.id, { method: 'DELETE' });
    console.log(`    removed ${ad.name}`);
  }

  console.log('  uploading refreshed creative (PAUSED)...');
  for (const img of images()) await makeAd(pageId, adsetId, img);
  console.log('\n  creative replaced. Still PAUSED: a person turns the new ads on after checking previews.\n');
}

if (REPLACE_ADSET === true) die('--replace-ads needs an ad set id: --replace-ads <adset_id> [--apply].');
const run = REPLACE_ADSET
  ? (APPLY ? replaceAds(REPLACE_ADSET) : checkReplace(REPLACE_ADSET))
  : APPLY ? apply() : check();
run.catch((e) => { console.error(`\n  error: ${e.message}\n`); process.exit(1); });
