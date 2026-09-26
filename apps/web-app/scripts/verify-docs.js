import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { JSDOM } from 'jsdom';
import { assignHeadings } from '../src/utils/markdownHeadings.js';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(appRoot, '../..');
const parser = unified().use(remarkParse).use(remarkGfm);

export function inspectMarkdown(markdown) {
  const tree = parser.parse(markdown);
  assignHeadings(tree);
  const ids = new Set();
  const links = [];
  const definitions = new Map();
  function visit(node) {
    if (node.data?.hProperties?.id) ids.add(node.data.hProperties.id);
    if (node.type === 'definition') definitions.set(node.identifier, node.url);
    if (node.type === 'link' || node.type === 'image') links.push({ url: node.url, line: node.position.start.line });
    node.children?.forEach(visit);
  }
  visit(tree);
  function references(node) {
    if (node.type === 'linkReference' || node.type === 'imageReference') {
      links.push({ url: definitions.get(node.identifier), line: node.position.start.line });
    }
    node.children?.forEach(references);
  }
  references(tree);
  return { ids, links };
}

export function verifyDocs({ root = repoRoot, dist = path.join(appRoot, 'dist') } = {}) {
  const docs = JSON.parse(fs.readFileSync(path.join(root, 'apps/web-app/src/data/docs.json'), 'utf8'));
  const socialGuides = JSON.parse(fs.readFileSync(path.join(root, 'apps/web-app/src/data/docs-social.json'), 'utf8'));
  const issues = [];
  let externalLinks = 0;
  for (const slug of socialGuides) {
    if (!docs.some((doc) => doc.slug === slug)) { issues.push(`Unknown social guide: ${slug}`); continue; }
    const filename = path.join(dist, 'social/docs', `${slug}.png`);
    if (!fs.existsSync(filename)) { issues.push(`Missing social card: ${slug}`); continue; }
    const bytes = fs.readFileSync(filename);
    if (bytes.length < 24 || bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' || bytes.readUInt32BE(16) !== 1200 || bytes.readUInt32BE(20) !== 630) {
      issues.push(`Social card must be a 1200×630 PNG: ${slug}`);
    }
  }
  const htmlCache = new Map();
  function readHtml(filename) {
    if (!htmlCache.has(filename)) {
      const dom = new JSDOM(fs.readFileSync(filename, 'utf8'));
      const document = dom.window.document;
      htmlCache.set(filename, {
        headings: document.querySelectorAll('h1').length,
        ids: [...document.querySelectorAll('[id]')].map((node) => node.id),
        links: [...document.querySelectorAll('a[href]')].map((node) => node.getAttribute('href')),
        images: [...document.querySelectorAll('img[src]')].map((node) => node.getAttribute('src')),
        jsonLd: [...document.querySelectorAll('script[type="application/ld+json"]')].flatMap((node) => JSON.parse(node.textContent)),
        social: document.querySelector('meta[property="og:image"]')?.getAttribute('content'),
        base: document.querySelector('base[href]')?.getAttribute('href'),
      });
      dom.window.close();
    }
    return htmlCache.get(filename);
  }
  for (const doc of docs) {
    const source = path.join(root, `docs/users/${doc.slug}.md`);
    const { links } = inspectMarkdown(fs.readFileSync(source, 'utf8'));
    for (const link of links) {
      const report = (message) => issues.push(`${doc.slug}:${link.line}: ${message}`);
      if (!link.url) { report('Unresolved link reference'); continue; }
      if (/^(https?:|mailto:)/i.test(link.url)) { externalLinks++; continue; }
      if (/^[a-z][a-z0-9+.-]*:|^\/\//i.test(link.url)) { report(`Unsafe URL: ${link.url}`); continue; }
      const url = new URL(link.url, `file://${source}`);
      const target = fileURLToPath(url);
      if (!target.startsWith(`${root}${path.sep}`)) { report(`Path escapes repository: ${link.url}`); continue; }
      if (!fs.existsSync(target)) { report(`Missing target: ${link.url}`); continue; }
      if (url.hash && target.endsWith('.md')) {
        const ids = inspectMarkdown(fs.readFileSync(target, 'utf8')).ids;
        if (!ids.has(decodeURIComponent(url.hash.slice(1)))) report(`Missing anchor: ${link.url}`);
      }
    }
  }
  for (const slug of ['', ...docs.map((doc) => `${doc.slug}/`)]) {
    const filename = path.join(dist, 'docs', slug, 'index.html');
    if (!fs.existsSync(filename)) { issues.push(`Missing prerendered route: /docs/${slug}`); continue; }
    const html = readHtml(filename);
    if (html.headings !== 1) issues.push(`/docs/${slug}: expected exactly one h1`);
    const ids = html.ids;
    if (new Set(ids).size !== ids.length) issues.push(`/docs/${slug}: duplicate HTML IDs`);
    if (slug) {
      const expected = inspectMarkdown(fs.readFileSync(path.join(root, 'docs/users', `${slug.slice(0, -1)}.md`), 'utf8')).ids;
      for (const id of expected) if (!ids.includes(id)) issues.push(`/docs/${slug}: source heading missing from static HTML: ${id}`);
      const article = html.jsonLd.find((entry) => [entry['@type']].flat().includes('TechArticle'));
      if (!article || !/^[a-f0-9]{40}$/.test(article.version || '') || Number.isNaN(Date.parse(article.dateModified))) issues.push(`/docs/${slug}: missing article source metadata`);
    }
    if (!html.jsonLd.some((entry) => entry['@type'] === 'BreadcrumbList')) issues.push(`/docs/${slug}: missing breadcrumb metadata`);
    for (const src of [...html.images, html.social].filter(Boolean)) {
      const url = new URL(src, `https://aaskills.tech/docs/${slug}`);
      if (url.origin !== 'https://aaskills.tech') continue;
      if (!fs.existsSync(path.join(dist, decodeURIComponent(url.pathname)))) issues.push(`/docs/${slug}: missing image ${url.pathname}`);
    }
    for (const href of html.links) {
      const documentUrl = `https://aaskills.tech/docs/${slug}`;
      const url = new URL(href, html.base ? new URL(html.base, documentUrl).href : documentUrl);
      if (href.startsWith('#') && url.pathname !== `/docs/${slug}`) issues.push(`/docs/${slug}: fragment escapes guide through base URL: ${href}`);
      if (url.origin !== 'https://aaskills.tech' || !url.pathname.startsWith('/docs/')) continue;
      const target = path.join(dist, url.pathname, 'index.html');
      if (!fs.existsSync(target)) { issues.push(`/docs/${slug}: broken route ${url.pathname}`); continue; }
      if (url.hash) {
        if (!readHtml(target).ids.includes(decodeURIComponent(url.hash.slice(1)))) issues.push(`/docs/${slug}: broken rendered anchor ${url.pathname}${url.hash}`);
      }
    }
  }
  return { issues, guides: docs.length, externalLinks };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = verifyDocs();
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.issues.length ? 1 : 0;
}
