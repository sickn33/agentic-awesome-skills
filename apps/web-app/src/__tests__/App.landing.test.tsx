import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import App from '../App';

it('renders the real homepage through its catalog provider', async () => {
  window.history.replaceState({}, '', '/');
  render(<App />);
  expect(await screen.findByRole('heading', {
    level: 1, name: /open skill catalog for coding agents/i,
  })).toBeInTheDocument();
});
