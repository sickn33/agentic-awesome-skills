import { describe, it, expect } from 'vitest';
import { renderSkillBody, setRootFallback } from './render-skill-body.js';

describe('initial skill HTML', () => {
  it('includes instructions, tables, code and stable anchors without YAML metadata', () => {
    const html = renderSkillBody('---\nname: sample\nrisk: safe\n---\n# Sample\n\n## When to Use\n\nInspect the full project.\n\n| Input | Output |\n| --- | --- |\n| Code | Review |\n\n```js\nconst value = 1;\n```\n\n[Jump](#when-to-use)', 'skills/sample', 'https://aaskills.tech/skill/sample/');
    expect(html).toContain('id="when-to-use"');
    expect(html).toContain('Inspect the full project.');
    expect(html).toContain('<table>');
    expect(html).toContain('const value = 1;');
    expect(html).toContain('href="https://aaskills.tech/skill/sample/#when-to-use"');
    expect(html).not.toContain('risk: safe');
  });
  it('pins bundle links and images and rejects executable URLs, traversal and raw HTML', () => {
    const html = renderSkillBody('[Guide](references/guide.md)\n\n![Diagram](images/example.png)\n\n[Bad](javascript:alert)\n\n[Escape](../../../../secret)\n\n<script>alert(1)</script>', 'skills/sample', 'https://aaskills.tech/skill/sample/');
    expect(html).toMatch(/github\.com\/sickn33\/agentic-awesome-skills\/blob\/v[\d.]+\/skills\/sample\/references\/guide\.md/);
    expect(html).toMatch(/raw\.githubusercontent\.com\/sickn33\/agentic-awesome-skills\/v[\d.]+\/skills\/sample\/images\/example\.png/);
    expect(html).not.toContain('href="javascript:');
    expect(html).not.toContain('href="https://github.com/secret');
    expect(html).not.toContain('<script>');
  });
});

it('preserves literal replacement tokens from skill instructions when embedding the HTML', () => {
  const body = "<p>$& $' $` $$</p>";
  expect(setRootFallback('<html><div id="root"></div></html>', body)).toBe(`<html><div id="root">${body}</div></html>`);
});
