import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { TopicLanding } from '../TopicLanding';
import { renderWithRouter } from '../../utils/testUtils';

describe('TopicLanding', () => {
  it('renders an SEO topic page and sets metadata', async () => {
    renderWithRouter(<TopicLanding />, {
      route: '/topics/antigravity-cli-skills',
      path: '/topics/:slug',
      useProvider: false,
    });

    expect(screen.getByRole('heading', { level: 1, name: /Antigravity CLI skills/i })).toBeInTheDocument();
    expect(screen.getByText(/Search intent covered/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Antigravity CLI skills/i).length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(document.title).toContain('Antigravity CLI Skills');
    });

    expect(document.querySelector('meta[name="description"]')).toHaveAttribute(
      'content',
      expect.stringContaining('Install Antigravity CLI skills'),
    );
  });

  it('renders a fallback for unknown topic slugs', async () => {
    renderWithRouter(<TopicLanding />, {
      route: '/topics/not-real',
      path: '/topics/:slug',
      useProvider: false,
    });

    expect(screen.getByText(/Topic guide not found/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(document.title).toContain('Topic guide loading');
    });
  });
});
