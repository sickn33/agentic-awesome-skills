// Reads a site's look into a draft theme (references/theme.md, "Sources", 4). A draft: show it to the person and
// decide every role before building.
//
//   node scripts/theme-from-site.mjs <url> [--out src/<name>/theme.json]
//
// Opens the page in Remotion's headless Chrome, light and then dark (prefers-color-scheme, then a `dark` class and
// data-theme on <html>), and reads computed styles: the page's ground and text, its headings' and body's fonts, the
// first filled button, link colour, and every CSS custom property whose value is a colour. Fonts are checked against
// Google Fonts' OFL list; a font that isn't there is reported as unknown licence, and the draft falls back to the
// nearest open face you choose. Never reads or stores anything but styles.
import fs from 'node:fs';
import {ensureBrowser, openBrowser} from '@remotion/renderer';

const args = process.argv.slice(2);
const url = args.find((a) => /^https?:\/\//.test(a));
const outAt = args.indexOf('--out');
if (!url) {
  console.error('Usage: node scripts/theme-from-site.mjs <https://...> [--out src/<name>/theme.json]');
  process.exit(1);
}

const READ = () => {
  const cs = (el) => (el ? getComputedStyle(el) : null);
  // Every colour through a 1x1 canvas, so oklch(), lab(), color() and named colours all come back as #rrggbb in sRGB.
  const ctx = Object.assign(document.createElement('canvas'), {width: 1, height: 1}).getContext('2d', {willReadFrequently: true});
  const toHex = (c) => {
    if (!c) return null;
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = '#000';
    ctx.fillStyle = c;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
  };
  const solid = (c) => c && !/rgba\(.*,\s*0\)$/.test(c) && c !== 'transparent';
  const body = document.body, root = document.documentElement;
  let ground = cs(body).backgroundColor;
  if (!solid(ground)) ground = cs(root).backgroundColor;
  const h = document.querySelector('h1') || document.querySelector('h2');
  const p = [...document.querySelectorAll('p')].find((e) => e.textContent.trim().length > 40) || body;
  const button = [...document.querySelectorAll('button, a[class*="button" i], a[class*="btn" i], [role="button"]')]
    .find((e) => solid(cs(e).backgroundColor) && cs(e).backgroundColor !== ground && e.getBoundingClientRect().width > 40);
  const link = [...document.querySelectorAll('a')].find((e) => cs(e).color !== cs(body).color);
  const vars = {};
  for (const sheet of document.styleSheets) {
    let rules;
    try { rules = sheet.cssRules; } catch { continue; }
    for (const r of rules) {
      if (!r.style || !/^(:root|html|body|\.dark|\[data-theme)/.test(r.selectorText || '')) continue;
      for (const name of r.style) if (name.startsWith('--')) vars[name] = cs(root).getPropertyValue(name).trim();
    }
  }
  const colourVars = Object.fromEntries(Object.entries(vars).filter(([, v]) => /^(#|rgb|hsl|oklch|lab|color\()/.test(v)).slice(0, 60));
  return {
    ground: toHex(ground), text: toHex(cs(body).color), muted: toHex(cs(p).color),
    headingFont: h ? cs(h).fontFamily : null, headingWeight: h ? cs(h).fontWeight : null,
    bodyFont: cs(p).fontFamily, monoFont: cs(document.querySelector('code, pre, kbd') || body).fontFamily,
    button: button ? {background: toHex(cs(button).backgroundColor), text: toHex(cs(button).color), radius: cs(button).borderRadius} : null,
    link: link ? toHex(cs(link).color) : null, colourVars,
  };
};

// The page already turned every colour into #rrggbb (READ, toHex).
const hex = (c) => c;
const first = (f) => (f || '').split(',')[0].replace(/["']/g, '').trim();

await ensureBrowser({logLevel: 'error'});
const browser = await openBrowser('chrome', {logLevel: 'error'});

// Some sites close a headless page (bot protection, a client redirect). Try twice, then say so plainly.
async function read(tries = 2) {
  const page = await browser.newPage({context: () => null, logLevel: 'error', indent: false, pageIndex: 0, onLog: () => {}, onBrowserLog: () => {}});
  try {
    await page.setViewport({width: 1440, height: 900, deviceScaleFactor: 1});
    await page.goto({url, timeout: 45000, options: {waitUntil: 'load'}});
    await new Promise((r) => setTimeout(r, 1500)); // late stylesheets and web fonts
    const light = await page.evaluate(READ);
    await page._client().send('Emulation.setEmulatedMedia', {features: [{name: 'prefers-color-scheme', value: 'dark'}]});
    await page.evaluate(() => { document.documentElement.classList.add('dark'); document.documentElement.dataset.theme = 'dark'; });
    await new Promise((r) => setTimeout(r, 400));
    return {light, dark: await page.evaluate(READ)};
  } catch (e) {
    if (tries > 1) return read(tries - 1);
    await browser.close({silent: true});
    console.error(`${url} closed the headless page (${String(e.message).split('.')[0]}). It may block automated browsers.`);
    console.error('Read the theme by hand instead: open the site, take the colours and fonts from its CSS, and write theme.json.');
    process.exit(2);
  }
}
const {light, dark} = await read();
await browser.close({silent: true});

async function google(family) {
  if (!family || /system-ui|apple|segoe|helvetica|arial|sans-serif|serif|monospace/i.test(family)) return 'system';
  const slug = family.toLowerCase().replace(/[^a-z0-9]/g, '');
  try {
    const r = await fetch(`https://raw.githubusercontent.com/google/fonts/main/ofl/${slug}/METADATA.pb`, {headers: {'User-Agent': 'make-motion'}});
    return r.ok ? 'ofl' : 'unknown';
  } catch {
    return 'unknown';
  }
}
const text = first(light.bodyFont), display = first(light.headingFont) || text, mono = first(light.monoFont);
const lic = {display: await google(display), text: await google(text), mono: await google(mono)};
const gurl = (f, w) => `https://fonts.googleapis.com/css2?family=${encodeURIComponent(f).replace(/%20/g, '+')}:wght@${w}&display=block`;
const face = (f, kind, w) => lic[kind] === 'ofl'
  ? {family: f, weight: w, fallback: kind === 'mono' ? 'ui-monospace, monospace' : 'Arial, sans-serif', src: {google: gurl(f, kind === 'mono' ? '400;500' : '400;500;600;700')}, licence: 'ofl'}
  : {family: f, weight: w, fallback: kind === 'mono' ? 'ui-monospace, monospace' : 'Arial, sans-serif', licence: lic[kind] === 'system' ? undefined : 'unknown'};
const draft = {
  name: new URL(url).hostname,
  _source: `Draft read from ${url} on ${new Date().toISOString().slice(0, 10)}. Decide every role before building.`,
  color: {
    paper: hex(light.ground), ink: hex(light.text), muted: hex(light.muted), accent: hex(light.button?.background ?? light.link ?? light.text),
    onAccent: hex(light.button?.text ?? light.ground),
    dark: {paper: hex(dark.ground), ink: hex(dark.text), muted: hex(dark.muted), accent: hex(dark.button?.background ?? dark.link ?? dark.text), onAccent: hex(dark.button?.text ?? dark.ground)},
  },
  font: {display: face(display, 'display', Number(light.headingWeight) || 600), text: face(text, 'text', 400), mono: face(mono, 'mono', 400)},
};
console.log(JSON.stringify({light, dark, licences: lic}, null, 2));
if (dark.ground === light.ground) console.log('\nThe dark read matches the light one: the site has no dark mode this script can switch to. Derive dark roles (theme.md).');
for (const [k, v] of Object.entries(lic)) if (v === 'unknown') console.log(`\n${k} face "${{display, text, mono}[k]}" isn't an OFL family on Google Fonts. Ask about its licence, or pick the nearest open face.`);
if (outAt > 0) {
  fs.writeFileSync(args[outAt + 1], JSON.stringify(draft, null, 2) + '\n');
  console.log(`\nwrote the draft to ${args[outAt + 1]}`);
}
