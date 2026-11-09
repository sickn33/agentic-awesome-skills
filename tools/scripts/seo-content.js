const assert = require('node:assert/strict');
const { parse } = require('parse5');

function attribute(node, name) {
  return node.attrs?.find((item) => item.name === name)?.value;
}

function isReadable(node) {
  return !['head', 'script', 'style', 'template', 'svg'].includes(node.tagName)
    && attribute(node, 'hidden') === undefined
    && attribute(node, 'aria-hidden') !== 'true';
}

function elements(node) {
  if (!isReadable(node)) return [];
  return [node, ...(node.childNodes || []).flatMap(elements)];
}

function textContent(node) {
  return elements(node).filter((item) => item.nodeName === '#text').map((item) => item.value).join(' ').replace(/\s+/gu, ' ').trim();
}

function assertPageContent(html, label, { requiredText = [], linkPaths = [], baseUrl = 'https://aaskills.tech/' } = {}) {
  // Parse an inert document: never execute JavaScript, fetch resources, or rewrite
  // HTML with regexes. Comments, metadata and non-content subtrees do not count.
  const document = parse(String(html || ''));
  const body = document.childNodes.find((node) => node.tagName === 'html')?.childNodes.find((node) => node.tagName === 'body');
  const main = body && elements(body).find((node) => node.tagName === 'main');
  assert(main && textContent(main), `${label} must include readable initial main content`);
  const h1 = elements(main).find((node) => node.tagName === 'h1');
  assert(h1 && textContent(h1), `${label} must include an initial H1`);
  const text = textContent(main);
  for (const value of requiredText) assert(text.includes(value), `${label} initial content must include: ${value}`);
  const links = elements(main).filter((node) => node.tagName === 'a' && attribute(node, 'href')).flatMap((node) => {
    try { return [new URL(attribute(node, 'href'), baseUrl)]; } catch { return []; }
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
  const packIds = elements(content.main).map((node) => attribute(node, 'data-plugin-pack')).filter((id) => id !== undefined);
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

module.exports = { assertPageContent, assertPluginsContent, assertWorkbenchContent };
