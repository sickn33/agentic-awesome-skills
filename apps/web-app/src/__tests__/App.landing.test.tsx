import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import App from '../App';

it('renders the Core homepage without catalog requests', async () => {
  window.history.replaceState({}, '', '/');
  vi.clearAllMocks();
  const { container } = render(<App />);
  expect(await screen.findByRole('heading', {
    level: 1, name: /Your agent.*The right skills/i,
  })).toBeInTheDocument();
  expect(screen.getByText('Use this skill for my task.')).toBeInTheDocument();
  expect(container.querySelector('.workflow-demo iframe')).toBeNull();
  expect(globalThis.fetch).not.toHaveBeenCalled();
});
