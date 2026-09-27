import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { inspectMarkdown, verifyDocs } from './verify-docs.js';

describe('Documentation link verification', () => {
  it('uses rendered heading IDs, excludes code, and resolves reference links', () => {
    const result = inspectMarkdown('## Hello *world*\n## Hello world\n```\n## Not a heading\n```\n[link][target]\n\n[target]: #hello-world');
    expect([...result.ids]).toEqual(['hello-world', 'hello-world-1']);
    expect(result.links).toEqual([{ url: '#hello-world', line: 6 }]);
  });

  it('rejects missing files, anchors, and prerendered routes', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'aas-docs-verifier-'));
    try {
      fs.mkdirSync(path.join(root, 'apps/web-app/src/data'), { recursive: true });
      fs.mkdirSync(path.join(root, 'docs/users'), { recursive: true });
      fs.writeFileSync(path.join(root, 'apps/web-app/src/data/docs.json'), JSON.stringify([{ slug: 'sample' }]));
      fs.writeFileSync(path.join(root, 'apps/web-app/src/data/docs-social.json'), JSON.stringify(['sample']));
      fs.writeFileSync(path.join(root, 'docs/users/sample.md'), '# Sample\n[bad](#missing)\n![missing](image.png)\n');
      const result = verifyDocs({ root, dist: path.join(root, 'dist') });
      expect(result.issues).toEqual(expect.arrayContaining([
        expect.stringContaining('Missing anchor'),
        expect.stringContaining('Missing target'),
        expect.stringContaining('Missing prerendered route'),
        expect.stringContaining('Missing social card'),
      ]));
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
