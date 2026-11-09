const assert = require('node:assert/strict');

// Inspect server-delivered content, never metadata, comments or executable script text.
function bodyContent(html) {
  const content = String(html || '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|template|svg)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '');
  return content.match(/<body\b[^>]*>([\s\S]*?)<\/body\s*>/i)?.[1] || '';
}

function plainText(html) {
  return String(html).replace(/<[^>]*>/g, ' ')
    .replace(/&(?:amp|lt|gt|quot|apos|#39|#x27);/gi, (entity) => ({
      '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&#39;': "'", '&#x27;': "'",
    })[entity.toLowerCase()])
    .replace(/\s+/gu, ' ').trim();
}

function assertPageContent(html, label, { requiredText = [], linkPaths = [], baseUrl = 'https://aaskills.tech/' } = {}) {
  const body = bodyContent(html);
  const main = body.match(/<main\b[^>]*>([\s\S]*?)<\/main\s*>/i)?.[1];
  assert(main && plainText(main), `${label} must include readable initial main content`);
  assert(plainText(main.match(/<h1\b[^>]*>([\s\S]*?)<\/h1\s*>/i)?.[1] || ''), `${label} must include an initial H1`);
  const text = plainText(main);
  for (const value of requiredText) assert(text.includes(value), `${label} initial content must include: ${value}`);
  const links = [...main.matchAll(/<a\b[^>]*\bhref\s*=\s*(["'])(.*?)\1/gi)].flatMap((match) => {
    try { return [new URL(match[2], baseUrl)]; } catch { return []; }
  });
  for (const route of linkPaths) {
    const expected = new URL(route.replace(/^\//, ''), `${baseUrl.replace(/\/+$/, '')}/`);
    assert(links.some((link) => link.origin === expected.origin && link.pathname === expected.pathname), `${label} initial content must link to ${route}`);
  }
  return { body, main, text, links };
}

function assertPluginsContent(html, { pluginCount, baseUrl } = {}) {
  const content = assertPageContent(html, 'Plugins', {
    baseUrl, requiredText: ['Install related skills as one pack.', 'Included skills', 'Using your pack'],
    linkPaths: ['/docs/plugins/', '/core/'],
  });
  const packIds = [...content.main.matchAll(/\bdata-plugin-pack=["']([^"']+)["']/g)].map((match) => match[1]);
  assert(packIds.length > 0 && new Set(packIds).size === packIds.length, 'Plugins must expose distinct pack sections');
  if (pluginCount !== undefined) assert.equal(packIds.length, pluginCount, 'Plugins initial content must include every pack');
  assert(content.links.some((link) => link.pathname.includes('/skill/')), 'Plugins initial content must link to included skills');
}

function assertWorkbenchContent(html, { baseUrl } = {}) {
  assertPageContent(html, 'Workbench', {
    baseUrl, requiredText: ['aas-stack.json', 'aas-selection-evidence.json', 'Imports stay in memory', 'cannot install, apply, share, or persist'],
    linkPaths: ['/core/', '/docs/aas-core/'],
  });
}

module.exports = { bodyContent, plainText, assertPageContent, assertPluginsContent, assertWorkbenchContent };
