import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import Docs from '../Docs';
import docs from '../../data/docs.json';
import { docsUrl } from '../../utils/docs';

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
    expect(nav.getByRole('link', { name: 'Codex CLI' })).toBeInTheDocument();
    expect(nav.queryByRole('link', { name: 'Cursor' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: /Start with your first skill stack/ }));
    expect(await screen.findByRole('heading', { name: 'Getting Started with AAS Core' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'AAS Core guide' })).toHaveAttribute('href', '/docs/aas-core/');
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toContain('/docs/getting-started/');
  });

  it('reports an unknown guide', () => {
    open('/docs/not-a-guide/');
    expect(screen.getByRole('heading', { name: /not found/i })).toBeInTheDocument();
  });

  it('resolves guides, anchors, images and external references safely', () => {
    expect(docsUrl('aas-core.md#use-the-reviewed-selection', 'getting-started')).toBe('/docs/aas-core/#use-the-reviewed-selection');
    expect(docsUrl('#install', 'usage')).toBe('#install');
    expect(docsUrl('../../README.md', 'usage')).toMatch(/\/blob\/v[^/]+\/README.md$/);
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
