import { render, screen, within } from '@testing-library/react';
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
  expect(within(screen.getByRole('navigation', { name: 'Primary navigation' })).getByRole('link', { name: 'Catalog' })).toHaveAttribute('href', '/core/');
  const footer = within(screen.getByRole('navigation', { name: 'Footer navigation' }));
  expect(footer.getByRole('link', { name: 'Skill catalog' })).toHaveAttribute('href', '/core/');
  expect(footer.getByRole('link', { name: 'All skills A–Z' })).toHaveAttribute('href', '/directory/');
  const mobile = container.querySelector('details.mobile-nav')!;
  mobile.setAttribute('open', '');
  expect(within(screen.getByRole('navigation', { name: 'Mobile navigation' })).getByRole('link', { name: 'Catalog' })).toHaveAttribute('href', '/core/');
});
