#!/usr/bin/env node
/**
 * Check every grant in the Meta permission chain before you try to create
 * anything. Writes nothing: every call is a GET.
 *
 * Each of the four grants in the chain fails with an error that names none of
 * the others, so the point of this script is to tell you which one is missing
 * instead of making you guess from a 400.
 *
 * Usage:
 *   META_ACCESS_TOKEN=... META_AD_ACCOUNT_ID=act_123 node scripts/preflight.mjs   (from the skill folder)
 *
 * Optional: META_PIXEL_ID, META_PAGE_ID, META_APP_ID
 */

// Marketing API versions expire (v24.0 expired 2026-11-10). Override with
// META_GRAPH_VERSION when Meta retires this default; see references/meta-facts.md.
const GRAPH = `https://graph.facebook.com/${process.env.META_GRAPH_VERSION || 'v26.0'}`;
// META_ACCESS_TOKEN is the library's ads key; META_ADS_TOKEN is accepted as an older alias.
const TOKEN = process.env.META_ACCESS_TOKEN || process.env.META_ADS_TOKEN;
const AD_ACCOUNT = process.env.META_AD_ACCOUNT_ID;
const PIXEL_ID = process.env.META_PIXEL_ID;
const PAGE_ID = process.env.META_PAGE_ID;
const APP_ID = process.env.META_APP_ID;

if (!TOKEN) {
  console.error('\n  META_ACCESS_TOKEN not set. See references/setup.md.\n');
  process.exit(2);
}
if (!AD_ACCOUNT) {
  console.error('\n  META_AD_ACCOUNT_ID not set (format: act_1234567890).\n');
  process.exit(2);
}
if (!AD_ACCOUNT.startsWith('act_')) {
  console.error(`\n  META_AD_ACCOUNT_ID must start with "act_": got "${AD_ACCOUNT}".\n`);
  process.exit(2);
}

async function graph(path) {
  const res = await fetch(`${GRAPH}/${path}`, { headers: { Authorization: `Bearer ${TOKEN}` } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = json.error || {};
    throw new Error(`${e.message || res.status}${e.error_user_msg ? ` | ${e.error_user_msg}` : ''}`);
  }
  return json;
}

const ok = (label, value) => console.log(`  ${'ok  '} ${label.padEnd(22)} ${value}`);
const bad = (label, value) => console.log(`  ${'FAIL'} ${label.padEnd(22)} ${value}`);
const note = (label, value) => console.log(`  ${'--  '} ${label.padEnd(22)} ${value}`);

let failures = 0;
const fail = (label, value) => { bad(label, value); failures++; };

console.log('\n  Meta ads preflight: no writes\n');

// 1. Who the token is
try {
  const me = await graph('me?fields=id,name');
  ok('token identity', `${me.name || '(system user)'} (${me.id})`);
} catch (e) {
  fail('token identity', e.message);
  console.log('\n  Token is invalid or expired. Regenerate it in Business Settings.\n');
  process.exit(1);
}

// 2. Scopes. A system-user token often returns an empty permissions edge even
//    when the scopes are present, so an empty list is inconclusive, not a fail.
try {
  const perms = await graph('me/permissions');
  const granted = (perms.data || []).filter((p) => p.status === 'granted').map((p) => p.permission);
  if (!granted.length) {
    note('scopes', 'not reported (normal for system users): checked below by use');
  } else if (granted.includes('ads_management')) {
    ok('scopes', granted.join(', '));
  } else {
    fail('scopes', `ads_management MISSING: has: ${granted.join(', ') || 'none'}`);
  }
} catch {
  note('scopes', 'not reported: checked below by use');
}

// 3. Ad account: assignment, status, currency, and whether it can actually spend
try {
  const a = await graph(`${AD_ACCOUNT}?fields=name,account_status,currency,timezone_name,`
    + 'disable_reason,funding_source_details,spend_cap,amount_spent');
  ok('ad account', `${a.name}`);
  const active = a.account_status === 1;
  (active ? ok : fail)('account status', active ? '1 (active)' : `${a.account_status}: cannot deliver`);
  if (a.disable_reason) note('disable reason', a.disable_reason);
  // Budgets are sent in the minor unit of THIS currency. Getting it wrong by a
  // factor of 100 is the most expensive mistake available in this API.
  ok('currency / tz', `${a.currency} (budgets in minor units) · ${a.timezone_name}`);
  if (!a.funding_source_details) {
    fail('payment method', 'none attached: account cannot deliver');
  } else {
    ok('payment method', a.funding_source_details.display_string || 'attached');
  }
} catch (e) {
  fail('ad account', e.message);
  note('', 'assign the ad account to the system user with "Manage campaigns"');
}

// 4. Pages. An ad cannot exist without one.
try {
  const pages = await graph('me/accounts?fields=id,name');
  const list = pages.data || [];
  if (!list.length) {
    fail('pages', 'none available: assign a Page with the "Ads" task');
  } else {
    ok('pages', `${list.length} available`);
    for (const p of list) {
      const mark = PAGE_ID && p.id === PAGE_ID ? ' <- META_PAGE_ID' : '';
      console.log(`         ${p.id}  ${p.name}${mark}`);
    }
    if (PAGE_ID && !list.some((p) => p.id === PAGE_ID)) {
      fail('META_PAGE_ID', `${PAGE_ID} is not in the list above`);
    }
  }
} catch (e) {
  fail('pages', e.message);
}

// 5. Pixel. last_fired_time is the cheapest real signal that tracking lives.
if (PIXEL_ID) {
  try {
    const p = await graph(`${PIXEL_ID}?fields=id,name,last_fired_time`);
    ok('pixel', `${p.name || p.id}`);
    if (p.last_fired_time) {
      const days = (Date.now() - new Date(p.last_fired_time)) / 86400000;
      (days < 2 ? ok : bad)('pixel last fired', `${p.last_fired_time} (${days.toFixed(1)}d ago)`);
      if (days >= 2) failures++;
    } else {
      fail('pixel last fired', 'never: tracking is not installed or is blocked');
    }
  } catch (e) {
    fail('pixel', `${e.message}: assign the dataset with "Use events dataset"`);
  }
} else {
  note('pixel', 'META_PIXEL_ID not set: skipped');
}

// 6. Instagram. Only fails at ad-creation time, which is why it is checked here.
try {
  const ig = await graph(`${AD_ACCOUNT}/instagram_accounts?fields=id,username`);
  const list = ig.data || [];
  if (list.length) ok('instagram', list.map((i) => `@${i.username || i.id}`).join(', '));
  else fail('instagram', 'none connected: Advantage+ placements will reject ad creation');
} catch {
  note('instagram', 'could not read: connect in Business Settings if using IG placements');
}

// 7. App mode. The Graph API exposes no reliable "is live" field, so this is a
//    pointer rather than a check. Development mode blocks creative creation only,
//    so it fails at the very end of a long script.
if (APP_ID) {
  note('app', `https://developers.facebook.com/apps/${APP_ID}/settings/basic/`);
  note('', 'confirm the toggle reads Live, not Development');
} else {
  note('app mode', 'set META_APP_ID for the dashboard link: must be Live, not Development');
}

console.log(
  failures
    ? `\n  ${failures} problem(s). See references/setup.md for the fix for each.\n`
    : '\n  All checks passed. Safe to create campaigns (PAUSED).\n'
);
process.exit(failures ? 1 : 0);
