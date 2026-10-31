import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { DOCS_RUNTIME_SLOT, renderDocsRuntime, applyDocsRuntime, docsRuntimePlugin, verifyDocsRuntime } from './docs-runtime.js';

describe('fresh docs provenance outside cached JavaScript', () => {
  const first = { usage: { commit: 'a'.repeat(40), modified: '2026-01-01', sourcePath: 'docs/users/usage.md' } };
  const next = { usage: { ...first.usage, commit: 'b'.repeat(40) } };
  it('leaves a deterministic slot during compilation, without reading current Git metadata', () => {
    expect(docsRuntimePlugin().transformIndexHtml('<head></head>', {})).toBe(`<head>${DOCS_RUNTIME_SLOT}\n</head>`);
  });
  it('replaces restored metadata with the current commit and rejects absent or duplicate slots', () => {
    const html = `<head>${DOCS_RUNTIME_SLOT}</head>`;
    expect(applyDocsRuntime(applyDocsRuntime(html, first), next)).toBe(`<head>${renderDocsRuntime(next)}</head>`);
    for (const broken of ['<head></head>', html + html, html + renderDocsRuntime(first)]) {
      expect(() => applyDocsRuntime(broken, next)).toThrow(/exactly one/);
    }
  });
  it('escapes executable markup and preserves metadata strings', () => {
    const value = { usage: { commit: '</script><script>alert(1)</script>&\u2028\u2029' } };
    const rendered = renderDocsRuntime(value);
    expect(rendered.match(/<script/g)).toHaveLength(1);
    const json = rendered.match(/__AAS_DOCS_METADATA__=(.*);<\/script>/)[1];
    expect(JSON.parse(json)).toEqual(value);
    let alerts = 0;
    const browser = new JSDOM(rendered, { runScripts: 'dangerously', beforeParse(window) { window.alert = () => { alerts += 1; }; } });
    expect(browser.window.__AAS_DOCS_METADATA__).toEqual(value);
    expect(alerts).toBe(0);
    browser.window.close();
  });
  it('fails on stale, missing, duplicated and unfinished runtime metadata', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aas-docs-runtime-'));
    try {
      const file = path.join(dir, 'index.html');
      const guide = path.join(dir, 'docs/usage/index.html');
      fs.mkdirSync(path.dirname(guide), { recursive: true });
      const article = { '@type': ['WebPage', 'TechArticle'], version: next.usage.commit, dateModified: next.usage.modified };
      fs.writeFileSync(guide, renderDocsRuntime(next) + `<script type="application/ld+json">${JSON.stringify(article)}</script>`);
      fs.writeFileSync(file, renderDocsRuntime(next));
      expect(verifyDocsRuntime(dir, next)).toBe(2);
      for (const html of [renderDocsRuntime(first), renderDocsRuntime(next).repeat(2), DOCS_RUNTIME_SLOT,
        '<script type="module" src="/assets/main.js"></script>']) {
        fs.writeFileSync(file, html);
        expect(() => verifyDocsRuntime(dir, next)).toThrow();
      }
      fs.writeFileSync(file, renderDocsRuntime(next));
      fs.writeFileSync(guide, renderDocsRuntime(next) + `<script type="application/ld+json">${JSON.stringify({ ...article, version: first.usage.commit })}</script>`);
      expect(() => verifyDocsRuntime(dir, next)).toThrow(/prerendered guide provenance/);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });
});
