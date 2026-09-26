import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Docs from '../Docs';
import { loadGuide } from '../../utils/docsContent';

vi.mock('../../utils/docsContent', () => ({ loadGuide: vi.fn() }));

function open() {
  return render(<MemoryRouter initialEntries={['/docs/usage/']}><Routes><Route path="/docs/:slug" element={<Docs />} /></Routes></MemoryRouter>);
}

beforeEach(() => {
  vi.mocked(loadGuide).mockReset();
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});

describe('Documentation loading', () => {
  it('shows a recoverable network error instead of a false 404', async () => {
    vi.mocked(loadGuide).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce('# Recovered guide');
    open();
    fireEvent.click(await screen.findByRole('button', { name: 'Retry guide' }));
    expect(await screen.findByRole('heading', { name: 'Recovered guide' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(document.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'index, follow');
  });

  it('does not display a stale response after navigation to another guide', async () => {
    let resolveOld: (text: string) => void = () => {};
    vi.mocked(loadGuide).mockReturnValueOnce(new Promise<string>((resolve) => { resolveOld = resolve; })).mockResolvedValueOnce('# New guide');
    open();
    expect(screen.getByRole('status')).toHaveTextContent('Loading guide');
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Documentation' })).getByRole('link', { name: 'AAS Core' }));
    expect(await screen.findByRole('heading', { name: 'New guide' })).toBeInTheDocument();
    await act(async () => { resolveOld('# Stale guide'); });
    expect(screen.queryByRole('heading', { name: 'Stale guide' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'New guide' })).toBeInTheDocument();
  });
});
