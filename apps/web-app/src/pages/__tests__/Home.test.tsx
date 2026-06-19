import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { Home } from '../Home';
import { renderWithRouter } from '../../utils/testUtils';
import { createMockSkill } from '../../factories/skill';
import { useSkills } from '../../context/SkillContext';

// Mock useSkills hook
vi.mock('../../context/SkillContext', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return { ...actual, useSkills: vi.fn() };
});

const virtuosoGridMock = vi.fn(({ totalCount, itemContent }: any) => (
  <div data-testid="virtuoso-grid">
    {Array.from({ length: totalCount || 0 }).map((_, index) => (
      <div key={index} data-testid="skill-item">
        {itemContent(index)}
      </div>
    ))}
  </div>
));

// Mock VirtuosoGrid to render items normally for easier testing
vi.mock('react-virtuoso', () => ({
  VirtuosoGrid: (props: any) => virtuosoGridMock(props),
}));

describe('Home', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('Rendering', () => {
    it('should show loading spinner when loading is true', () => {
      (useSkills as Mock).mockReturnValue({
        skills: [],
        stars: {},
        loading: true,
        error: null,
      });

      renderWithRouter(<Home />, { useProvider: false });
      expect(screen.getByTestId('loader')).toBeInTheDocument();
    });

    it('should render skill cards when skills are loaded', async () => {
      const mockSkills = [
        createMockSkill({ id: 'skill-1', name: 'Skill 1' }),
        createMockSkill({ id: 'skill-2', name: 'Skill 2' }),
      ];

      (useSkills as Mock).mockReturnValue({
        skills: mockSkills,
        stars: {},
        loading: false,
        error: null,
      });

      renderWithRouter(<Home />, { useProvider: false });

      await waitFor(() => {
        expect(screen.getByText('@Skill 1')).toBeInTheDocument();
        expect(screen.getByText('@Skill 2')).toBeInTheDocument();
      });

      expect(virtuosoGridMock).toHaveBeenCalledWith(
        expect.objectContaining({ useWindowScroll: true }),
      );
    });

    it('should set homepage SEO metadata', async () => {
      const mockSkills = [
        createMockSkill({ id: 'skill-1', name: 'Skill 1' }),
      ];

      (useSkills as Mock).mockReturnValue({
        skills: mockSkills,
        stars: {},
        loading: false,
        error: null,
      });

      renderWithRouter(<Home />, { useProvider: false });

      await waitFor(() => {
        expect(document.title).toContain('Antigravity Awesome Skills');
      });

      expect(screen.getByRole('button', { name: /Copy install command/i })).toBeInTheDocument();
      expect(screen.getAllByText(/npx antigravity-awesome-skills/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/What is the difference between skills and MCP tools/i)).toBeInTheDocument();
      expect(document.querySelector('meta[property="og:title"]')).toHaveAttribute(
        'content',
        expect.stringContaining('Antigravity Awesome Skills'),
      );
    });

    it('should copy install command from hero CTA', async () => {
      (useSkills as Mock).mockReturnValue({
        skills: [],
        stars: {},
        loading: false,
        error: null,
      });

      renderWithRouter(<Home />, { useProvider: false });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Copy install command/i })).toBeInTheDocument();
      });

      vi.useFakeTimers();
      try {
        await act(async () => {
          fireEvent.click(screen.getByRole('button', { name: /Copy install command/i }));
          await vi.runAllTimersAsync();
        });
      } finally {
        vi.useRealTimers();
      }

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('npx antigravity-awesome-skills');
    });
  });

  describe('Search and Filtering', () => {
    it('should filter skills based on search term', async () => {
      const mockSkills = [
        createMockSkill({ id: 'react', name: 'React Patterns' }),
        createMockSkill({ id: 'vue', name: 'Vue Basics' }),
      ];

      (useSkills as Mock).mockReturnValue({
        skills: mockSkills,
        stars: {},
        loading: false,
        error: null,
      });

      renderWithRouter(<Home />, { useProvider: false });

      const searchInput = screen.getByLabelText(/Search skills/i);
      fireEvent.change(searchInput, { target: { value: 'React' } });

      await waitFor(() => {
        expect(searchInput).toHaveValue('React');
        expect(screen.getByText('@React Patterns')).toBeInTheDocument();
        expect(screen.queryByText('@Vue Basics')).not.toBeInTheDocument();
      });
    });

    it('should filter skills by category', async () => {
      const mockSkills = [
        createMockSkill({ id: 's1', category: 'frontend', name: 'Frontend Skill' }),
        createMockSkill({ id: 's2', category: 'backend', name: 'Backend Skill' }),
      ];

      (useSkills as Mock).mockReturnValue({
        skills: mockSkills,
        stars: {},
        loading: false,
        error: null,
      });

      renderWithRouter(<Home />, { useProvider: false });

      const categorySelect = screen.getByLabelText(/Filter by category/i);
      fireEvent.change(categorySelect, { target: { value: 'frontend' } });

      await waitFor(() => {
        expect(categorySelect).toHaveValue('frontend');
        expect(screen.getByText('@Frontend Skill')).toBeInTheDocument();
        expect(screen.queryByText('@Backend Skill')).not.toBeInTheDocument();
      });
    });
  });

  describe('User Settings and Sync', () => {
    it('hides sync actions on the public catalog and explains why', async () => {
      const mockSkills = [createMockSkill({ id: 'skill-1' })];

      (useSkills as Mock).mockReturnValue({
        skills: mockSkills,
        stars: { 'skill-1': 5 },
        loading: false,
        error: null,
        refreshSkills: vi.fn().mockResolvedValue(undefined),
      });

      renderWithRouter(<Home />, { useProvider: false });

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /Sync Skills/i })).not.toBeInTheDocument();
        expect(screen.getByText(/Public catalog mode/i)).toBeInTheDocument();
        expect(screen.getByText(/maintainer-only workflow/i)).toBeInTheDocument();
      });
    });
  });

  it('shows a catalog load error instead of a generic empty state', async () => {
    const refreshSkills = vi.fn().mockResolvedValue(undefined);

    (useSkills as Mock).mockReturnValue({
      skills: [],
      stars: {},
      loading: false,
      error: 'Non-JSON response from /skills.json (text/html)',
      refreshSkills,
    });

    renderWithRouter(<Home />, { useProvider: false });

    await waitFor(() => {
      expect(screen.getByText(/Unable to load skills/i)).toBeInTheDocument();
      expect(screen.getByText(/Non-JSON response/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Retry loading catalog/i }));

    expect(refreshSkills).toHaveBeenCalled();
  });
});
