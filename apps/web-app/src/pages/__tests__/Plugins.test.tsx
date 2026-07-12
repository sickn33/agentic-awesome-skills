import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Plugins } from '../Plugins';
import { renderWithRouter } from '../../utils/testUtils';

describe('Plugins', () => {
  it('renders the specialized plugin catalog and sets metadata', () => {
    renderWithRouter(<Plugins />, { route: '/plugins', path: '/plugins', useProvider: false });

    expect(screen.getByRole('heading', { name: /Choose the focused AAS plugin/i })).toBeInTheDocument();
    expect(screen.getByText('AAS Web App Builder')).toBeInTheDocument();
    expect(screen.getByText('AAS Security Engineer')).toBeInTheDocument();
    expect(screen.getByText('AAS Marketing, SEO & Growth')).toBeInTheDocument();
    expect(screen.getByText(/distributions of the full skill library/i)).toBeInTheDocument();
    expect(screen.queryByText(/1,550\+/i)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Install one skill with GitHub CLI/i })).toHaveAttribute(
      'href',
      expect.stringContaining('docs/users/getting-started.md'),
    );
    expect(screen.getByText(/Plugins, bundles, and workflows serve different decisions/i)).toBeInTheDocument();
    expect(document.title).toContain('AAS Specialized Plugins');
    expect(document.querySelector('meta[name="description"]')).toHaveAttribute(
      'content',
      expect.stringContaining('specialized plugin'),
    );
  });
});
