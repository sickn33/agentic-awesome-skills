import { afterEach, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';

afterEach(() => window.history.replaceState({}, '', '/'));

it.each([
  ['/plugins/aas-core/', 'Find skills. Inspect sources. Validate your stack.'],
  ['/plugins/aas-core/privacy/', 'Privacy for the AAS Core remote preview.'],
  ['/plugins/aas-core/terms/', 'Terms of use for the remote preview.'],
  ['/plugins/aas-core/support/', 'Get help with AAS Core.'],
])('opens the remote plugin page at %s without loading the catalog', async (route, heading) => {
  window.history.replaceState({}, '', route);
  vi.clearAllMocks();
  render(<App />);
  expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
  expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute('href', `${window.location.origin}${route}`);
  expect(screen.getByText(/Publisher: Niccolò Lucioli|published by Niccolò Lucioli/)).toBeInTheDocument();
  expect(globalThis.fetch).not.toHaveBeenCalled();
});
