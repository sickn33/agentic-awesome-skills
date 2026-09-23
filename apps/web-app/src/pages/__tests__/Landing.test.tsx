import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, Mock } from 'vitest';
import { Landing } from '../Landing';
import { renderWithRouter } from '../../utils/testUtils';
import { useSkills } from '../../context/SkillContext';
import { catalogVersion } from '../../utils/catalogRelease';

vi.mock('../../context/SkillContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../context/SkillContext')>();
  return { ...actual, useSkills: vi.fn() };
});

describe('Landing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useSkills as Mock).mockReturnValue({
      skills: Array.from({ length: 2445 }, (_, index) => ({
        id: `skill-${index}`,
        name: `skill-${index}`,
        description: 'test',
        category: 'ai',
        path: `skills/skill-${index}`,
      })),
      stars: {},
      loading: false,
      error: null,
      refreshSkills: vi.fn(),
    });
  });

  it('renders the brand-first intro with install command and Core CTA', () => {
    renderWithRouter(<Landing />, { useProvider: false });

    expect(screen.getByRole('heading', {
      level: 1,
      name: /open skill catalog for coding agents/i,
    })).toBeInTheDocument();
    expect(screen.getByText('Search. Choose. Validate. Preview.')).toBeInTheDocument();
    expect(screen.getByText('2,445+')).toBeInTheDocument();
    expect(screen.getByText(`npx agentic-awesome-skills@${catalogVersion}`)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /Works with every agent/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /Current surfaces/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /From intent to a reviewable plan/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Enter Core$/i })).toHaveAttribute('href', '/core/');
    expect(screen.getByRole('link', { name: /Open Workbench/i })).toHaveAttribute('href', '/workbench/');
    expect(screen.getByRole('link', { name: /Compare plugins/i })).toHaveAttribute('href', '/plugins/');
    expect(screen.getByRole('link', { name: /@sickn33/i })).toHaveAttribute(
      'href',
      'https://github.com/sickn33',
    );
    expect(document.title).toContain('Agentic Awesome Skills');
  });

  it('copies the install command when requested', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', {
      ...navigator,
      clipboard: { writeText },
    });

    renderWithRouter(<Landing />, { useProvider: false });

    fireEvent.click(screen.getByRole('button', { name: /Copy install command/i }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(`npx agentic-awesome-skills@${catalogVersion}`);
      expect(screen.getByRole('button', { name: /Copied/i })).toBeInTheDocument();
    });

    vi.unstubAllGlobals();
  });
});
