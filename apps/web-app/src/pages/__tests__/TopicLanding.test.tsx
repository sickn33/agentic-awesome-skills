import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { TopicLanding } from '../TopicLanding';
import { renderWithRouter } from '../../utils/testUtils';
import { createMockSkill } from '../../factories/skill';

vi.mock('../../context/SkillContext', () => ({
  useSkills: () => ({
    skills: [
      createMockSkill({
        id: 'antigravity-agent-manager',
        name: 'Antigravity Agent Manager',
        description: 'Configure and orchestrate Antigravity agents.',
        category: 'agent-orchestration',
      }),
      createMockSkill({
        id: 'antigravity-workflows',
        name: 'Antigravity Workflows',
        description: 'Run guided Antigravity workflows.',
        category: 'workflow',
      }),
    ],
  }),
}));

describe('TopicLanding', () => {
  it('renders an SEO topic page and sets metadata', async () => {
    renderWithRouter(<TopicLanding />, {
      route: '/topics/antigravity-cli-skills',
      path: '/topics/:slug',
      useProvider: false,
    });

    expect(screen.getByRole('heading', { level: 1, name: /Antigravity CLI skills/i })).toBeInTheDocument();
    expect(screen.getByText(/Search intent covered/i)).toBeInTheDocument();
    expect(screen.getByText(/Related topic guides/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Recommended skills for this workflow/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /@Antigravity Agent Manager/i })).toHaveAttribute(
      'href',
      '/skill/antigravity-agent-manager',
    );
    expect(screen.getByRole('link', { name: /GitHub repository for installable AI agent skills/i })).toHaveAttribute(
      'href',
      '/topics/github-ai-skills-repository',
    );
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
