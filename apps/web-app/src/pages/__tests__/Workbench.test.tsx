import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import packageMetadata from '../../../../../package.json';
import { createMockSkill } from '../../factories/skill';
import { useSkills } from '../../context/SkillContext';
import { renderWithRouter } from '../../utils/testUtils';
import { Workbench } from '../Workbench';

vi.mock('../../context/SkillContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../context/SkillContext')>();
  return { ...actual, useSkills: vi.fn() };
});

vi.mock('react-virtuoso', () => ({
  VirtuosoGrid: ({ totalCount, itemContent }: { totalCount: number; itemContent: (index: number) => React.ReactNode }) => (
    <div data-testid="workbench-grid">
      {Array.from({ length: totalCount }, (_, index) => <div key={index}>{itemContent(index)}</div>)}
    </div>
  ),
}));

const skills = [
  createMockSkill({
    id: 'safe-skill',
    name: 'Safe Skill',
    category: 'development',
    tags: ['typescript', 'review'],
    risk: 'safe',
    source: 'official',
    source_type: 'official',
    source_repo: 'example/official-skills',
    plugin: {
      targets: { codex: 'supported', claude: 'supported' },
      setup: { type: 'none', summary: '', docs: null },
      reasons: [],
    },
  }),
  createMockSkill({
    id: 'data-pipeline',
    name: 'Data Pipeline',
    category: 'data',
    tags: ['python', 'etl'],
    risk: 'unknown',
    source: 'community',
    source_type: 'community',
    plugin: {
      targets: { codex: 'supported', claude: 'supported' },
      setup: { type: 'manual', summary: 'Install Python.', docs: 'SKILL.md' },
      reasons: [],
    },
  }),
  createMockSkill({
    id: 'blocked-skill',
    name: 'Blocked Skill',
    category: 'security',
    risk: 'critical',
    source: 'community',
    source_type: 'community',
    plugin: {
      targets: { codex: 'blocked', claude: 'supported' },
      setup: { type: 'none', summary: '', docs: null },
      reasons: ['Requires Claude-specific tools.'],
    },
  }),
];

function LocationProbe(): React.ReactElement {
  const location = useLocation();
  return <output data-testid="workbench-location">{location.pathname}{location.search}</output>;
}

function currentLocationParams(): URLSearchParams {
  const renderedLocation = screen.getByTestId('workbench-location').textContent ?? '';
  return new URLSearchParams(renderedLocation.split('?')[1] ?? '');
}

describe('Workbench', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useSkills as Mock).mockReturnValue({
      skills,
      stars: {},
      loading: false,
      error: null,
      refreshSkills: vi.fn().mockResolvedValue(undefined),
    });
  });

  it('loads URL selection and builds deterministic pinned preview/install commands', async () => {
    renderWithRouter(<Workbench />, {
      route: '/workbench?selected=safe-skill&host=codex',
      path: '/workbench',
      useProvider: false,
    });

    expect(screen.getByText('1 exact skills')).toBeInTheDocument();
    expect(screen.getByText(/--skills safe-skill --dry-run/)).toBeInTheDocument();
    expect(screen.getByText(/desired state for installer-managed entries/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Select Data Pipeline' }));

    await waitFor(() => {
      expect(screen.getByText('2 exact skills')).toBeInTheDocument();
      expect(screen.getByText(/--skills data-pipeline,safe-skill --dry-run/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Copy dry-run command' }));
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        `npx agentic-awesome-skills@${packageMetadata.version} --codex --release ${packageMetadata.version} --skills data-pipeline,safe-skill --dry-run`,
      );
    });
  });

  it('round-trips the exact selection and host through reviewable URL state', async () => {
    render(
      <MemoryRouter initialEntries={['/workbench?selected=safe-skill,safe-skill&host=codex&noise=drop']}>
        <Routes>
          <Route path="/workbench" element={<><Workbench /><LocationProbe /></>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Copy review URL' }));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalled());
    const copiedReviewUrl = new URL(vi.mocked(navigator.clipboard.writeText).mock.calls.at(-1)?.[0] ?? '');
    expect(copiedReviewUrl.searchParams.get('selected')).toBe('safe-skill');
    expect(copiedReviewUrl.searchParams.get('host')).toBe('codex');
    expect(copiedReviewUrl.searchParams.has('noise')).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'Select Data Pipeline' }));

    await waitFor(() => {
      expect(currentLocationParams().get('selected')).toBe('data-pipeline,safe-skill');
      expect(currentLocationParams().get('host')).toBe('codex');
    });

    fireEvent.change(screen.getByLabelText('Select workbench host'), { target: { value: 'claude' } });

    await waitFor(() => {
      expect(currentLocationParams().get('selected')).toBe('data-pipeline,safe-skill');
      expect(currentLocationParams().get('host')).toBe('claude');
    });
  });

  it('queries tags and filters raw provenance without recommendation logic', async () => {
    renderWithRouter(<Workbench />, { route: '/workbench', path: '/workbench', useProvider: false });

    fireEvent.change(screen.getByLabelText('Search recorded fields'), { target: { value: 'etl' } });

    await waitFor(() => {
      expect(screen.getByText('Data Pipeline')).toBeInTheDocument();
      expect(screen.queryByText('Safe Skill')).not.toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Search recorded fields'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Filter workbench by provenance'), { target: { value: 'official' } });

    await waitFor(() => {
      expect(screen.getByText('Safe Skill')).toBeInTheDocument();
      expect(screen.queryByText('Data Pipeline')).not.toBeInTheDocument();
    });
  });

  it('blocks install command copying for an explicitly incompatible host', async () => {
    renderWithRouter(<Workbench />, {
      route: '/workbench?selected=blocked-skill&host=codex',
      path: '/workbench',
      useProvider: false,
    });

    expect(screen.getByText(/explicitly blocked for this host/i)).toBeInTheDocument();
    expect(screen.getByText('blocked-skill — Requires Claude-specific tools.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Resolve blocked IDs first/i })).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Select workbench host'), { target: { value: 'claude' } });

    await waitFor(() => {
      expect(screen.queryByText(/explicitly blocked for this host/i)).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Copy pinned install command/i })).toBeEnabled();
      expect(screen.getAllByText(new RegExp(`--claude --release ${packageMetadata.version.replace(/\./g, '\\.')}`))).toHaveLength(2);
    });
  });

  it('keeps invalid shared IDs visible and fail-closed', () => {
    renderWithRouter(<Workbench />, {
      route: '/workbench?selected=missing-skill,safe-skill&host=codex',
      path: '/workbench',
      useProvider: false,
    });

    expect(screen.getByText(/1 selected IDs do not resolve/i)).toBeInTheDocument();
    expect(screen.getAllByText('missing-skill').some((element) => element.classList.contains('text-rose-300'))).toBe(true);
    expect(screen.getByRole('button', { name: /Resolve blocked IDs first/i })).toBeDisabled();
    expect(screen.getByText(/install command appears only after exact resolution/i)).toBeInTheDocument();
  });

  it('exposes named controls, live evidence, and semantic mobile reading order', () => {
    const { container } = renderWithRouter(<Workbench />, {
      route: '/workbench?selected=data-pipeline&host=codex',
      path: '/workbench',
      useProvider: false,
    });

    expect(screen.getByRole('heading', { level: 1, name: 'Build a precise, inspectable skill set' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Search recorded fields' })).toBeInTheDocument();
    for (const name of [
      'Filter workbench by category',
      'Filter workbench by risk',
      'Filter workbench by provenance',
      'Select workbench host',
      'Filter workbench by compatibility',
      'Filter workbench by setup',
    ]) {
      expect(screen.getByRole('combobox', { name })).toBeInTheDocument();
    }

    expect(
      [...container.querySelectorAll('aside[aria-label], main[aria-label]')]
        .map((element) => element.getAttribute('aria-label')),
    ).toEqual(['Workbench filters', 'Selected skill ledger', 'Workbench results']);
    expect(screen.getByText(/unknown risk labels/i).closest('[aria-live="polite"]')).toBeInTheDocument();
    expect(screen.getByText('data-pipeline — Install Python.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove Data Pipeline' })).toHaveAttribute('aria-pressed', 'true');
  });
});
