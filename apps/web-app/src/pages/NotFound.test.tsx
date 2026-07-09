import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, it } from 'vitest';
import NotFound from './NotFound';

it('renders a navigable noindex 404 page', () => {
  document.head.innerHTML = '';
  render(
    <MemoryRouter initialEntries={['/missing-page']}>
      <NotFound />
    </MemoryRouter>,
  );

  expect(screen.getByRole('heading', { name: /page not found/i })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /browse skills/i })).toHaveAttribute('href', '/');
  expect(document.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow');
});
