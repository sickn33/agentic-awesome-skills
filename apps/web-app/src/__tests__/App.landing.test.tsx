import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import App from '../App';

it('renders the Core homepage without catalog requests', async () => {
  window.history.replaceState({}, '', '/');
  vi.clearAllMocks();
  render(<App />);
  expect(await screen.findByRole('heading', {
    level: 1, name: 'Agentic Awesome Skills',
  })).toBeInTheDocument();
  expect(globalThis.fetch).not.toHaveBeenCalled();
});
