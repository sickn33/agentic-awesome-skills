import { afterEach, expect, it, vi } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import App from '../App';

afterEach(() => window.history.replaceState({}, '', '/'));
it('preserves the old Core overview URL and presents the reduced navigation', async () => {
  window.history.replaceState({}, '', '/aas-core/');
  vi.clearAllMocks(); render(<App />);
  await screen.findByRole('heading', { level: 1, name: 'Agentic Awesome Skills' });
  expect(window.location.pathname).toBe('/');
  expect(within(screen.getByRole('navigation', { name: 'Primary navigation' })).getAllByRole('link').map((link) => link.textContent)).toEqual(['Catalog', 'Docs', 'For teams']);
  expect(globalThis.fetch).not.toHaveBeenCalled();
});
it('preserves an old technical section link as a guide destination', async () => {
  window.history.replaceState({}, '', '/aas-core/#section-2');
  render(<App />);
  await waitFor(() => expect(window.location.pathname).toBe('/docs/aas-core/'));
  expect(window.location.hash).toBe('#configure-the-local-mcp');
});
