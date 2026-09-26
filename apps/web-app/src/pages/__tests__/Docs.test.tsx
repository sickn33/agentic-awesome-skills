import { fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import Docs from '../Docs';
import docs from '../../data/docs.json';
import { docsUrl } from '../../utils/docs';
import DocsCodeBlock from '../../components/DocsCodeBlock';
import { searchGuides } from '../../utils/docsContent';

function open(path = '/docs/') {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  return render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/docs" element={<Docs />} /><Route path="/docs/:slug" element={<Docs />} /></Routes></MemoryRouter>);
}

describe('Documentation', () => {
  it('lists and filters guides, then opens the original Markdown', async () => {
    open();
    const nav = within(screen.getByRole('navigation', { name: 'Documentation' }));
    expect(nav.getAllByRole('link')).toHaveLength(docs.length + 1);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Codex' } });
    const results = within(await screen.findByRole('region', { name: 'Search results' }));
    expect(results.getByRole('link', { name: /Codex CLI/ })).toBeInTheDocument();
    expect(results.getAllByRole('link').length).toBeGreaterThan(1);
    fireEvent.click(screen.getByRole('link', { name: /Start with your first skill stack/ }));
    expect(await screen.findByRole('heading', { name: 'Getting Started with AAS Core' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'AAS Core guide' })).toHaveAttribute('href', '/docs/aas-core/');
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toContain('/docs/getting-started/');
  });

  it('searches body content with all terms and returns the matching excerpt', () => {
    const corpus = [{ title: 'Setup', group: 'Basics', text: `${'intro '.repeat(50)}unique-value clipboard troubleshooting` }];
    expect(searchGuides(corpus, 'unique-value clipboard')[0].snippet).toContain('unique-value clipboard');
    expect(searchGuides(corpus, 'unique-value absent')).toEqual([]);
    expect(searchGuides(corpus, 'SETUP')).toHaveLength(1);
  });

  it('copies exact code and announces clipboard failures', async () => {
    const write = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
    render(<DocsCodeBlock><code><span>npm</span>{' run test\n'}</code></DocsCodeBlock>);
    fireEvent.click(screen.getByRole('button', { name: 'Copy code' }));
    await waitFor(() => expect(write).toHaveBeenCalledWith('npm run test\n'));
    expect(await screen.findByText('Code copied.')).toBeInTheDocument();
    write.mockRejectedValueOnce(new Error('Denied'));
    fireEvent.click(screen.getByRole('button', { name: 'Copy code' }));
    expect(await screen.findByText(/Clipboard unavailable/)).toBeInTheDocument();
  });

  it('reports an unknown guide', () => {
    open('/docs/not-a-guide/');
    expect(screen.getByRole('heading', { name: /not found/i })).toBeInTheDocument();
  });

  it('resolves guides, anchors, images and external references safely', () => {
    expect(docsUrl('aas-core.md#use-the-reviewed-selection', 'getting-started')).toBe('/docs/aas-core/#use-the-reviewed-selection');
    expect(docsUrl('#install', 'usage')).toBe('/docs/usage/#install');
    expect(docsUrl('../../README.md', 'usage')).toBe(`https://github.com/sickn33/agentic-awesome-skills/blob/${__DOCS_METADATA__.usage.commit}/README.md`);
    expect(docsUrl('../../assets/banner.png', 'usage', true)).toContain('raw.githubusercontent.com');
    expect(docsUrl('javascript:alert(1)', 'usage')).toBe('');
    expect(docsUrl('//other.test/file', 'usage')).toBe('');
    expect(docsUrl('../../../outside', 'usage')).toBe('');
  });

  it('has a source for every published guide', () => {
    const sources = import.meta.glob('../../../../../docs/users/*.md');
    expect(docs.every((doc) => `../../../../../docs/users/${doc.slug}.md` in sources)).toBe(true);
    expect(new Set(docs.map((doc) => doc.slug)).size).toBe(docs.length);
  });
});
