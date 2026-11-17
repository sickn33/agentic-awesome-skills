import { afterEach, expect, it, vi } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import App from '../App';

afterEach(() => window.history.replaceState({}, '', '/'));
it('preserves the old Core overview URL and keeps catalog discovery alongside the Core navigation', async () => {
  window.history.replaceState({}, '', '/aas-core/');
  vi.clearAllMocks(); const { container } = render(<App />);
  // Loading the lazy route can take longer than the default query timeout on CI.
  await screen.findByRole('heading', { level: 1, name: 'AAS Core' }, { timeout: 4000 });
  expect(window.location.pathname).toBe('/aas-core/');
  expect(within(screen.getByRole('navigation', { name: 'Primary navigation' })).getAllByRole('link').map((link) => link.textContent)).toEqual(['Catalog', 'Core', 'Packs', 'Docs', 'Contribute', 'Changelog']);
  expect(screen.getByText('Find skills for this project.')).toBeInTheDocument();
  expect(container.querySelector('.core-demo iframe')).toBeNull();
  expect(globalThis.fetch).not.toHaveBeenCalled();
});
it('preserves an old technical section link as a guide destination', async () => {
  window.history.replaceState({}, '', '/aas-core/#section-2');
  render(<App />);
  await waitFor(() => expect(window.location.pathname).toBe('/docs/aas-core/'));
  expect(window.location.hash).toBe('#configure-the-local-mcp');
});
