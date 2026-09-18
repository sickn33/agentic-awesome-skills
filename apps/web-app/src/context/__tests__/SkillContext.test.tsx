import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import { SkillProvider, useSkills } from '../SkillContext';

// Keep tests deterministic by skipping real Supabase requests.
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}));

function SkillsProbe() {
  const { skills, loading, error, refreshSkills } = useSkills();

  return (
    <div>
      <span data-testid="loading">{loading ? 'loading' : 'ready'}</span>
      <span data-testid="count">{skills.length}</span>
      <span data-testid="ids">{skills.map((skill) => skill.id).join(',')}</span>
      <span data-testid="error">{error ?? ''}</span>
      <button type="button" onClick={() => void refreshSkills()}>refresh</button>
    </div>
  );
}

describe('SkillProvider', () => {
  beforeEach(() => {
    (global.fetch as Mock).mockReset();
    (global.fetch as Mock).mockImplementation(() => Promise.reject(new Error('unexpected fetch')));
    window.history.pushState({}, '', '/agentic-awesome-skills/');
  });

  it('loads skills from a fallback candidate when the first URL fails', async () => {
    const mockSkills = [
      {
        id: 'skill-sample',
        path: 'skills/skill-sample',
        category: 'core',
        name: 'Sample skill',
        description: 'Sample description',
      },
    ];

    (global.fetch as Mock)
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
      })
      .mockResolvedValueOnce({
        ok: true,
        headers: {
          get: () => 'application/json',
        },
        text: async () => JSON.stringify(mockSkills),
      });

    render(
      <SkillProvider>
        <SkillsProbe />
      </SkillProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('ready');
      expect(screen.getByTestId('count').textContent).toBe('1');
    });

    await act(async () => {
      await Promise.resolve();
    });
  });

  it('falls back to the bundled backup catalog when the primary index is invalid', async () => {
    const mockSkills = [
      {
        id: 'skill-backup',
        path: 'skills/skill-backup',
        category: 'core',
        name: 'Backup skill',
        description: 'Loaded from backup',
      },
    ];

    (global.fetch as Mock)
      .mockResolvedValueOnce({
        ok: true,
        headers: {
          get: () => 'text/html',
        },
        text: async () => '<!doctype html><html></html>',
      })
      .mockResolvedValueOnce({
        ok: true,
        headers: {
          get: () => 'application/json',
        },
        text: async () => JSON.stringify(mockSkills),
      });

    render(
      <SkillProvider>
        <SkillsProbe />
      </SkillProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('ready');
      expect(screen.getByTestId('count').textContent).toBe('1');
    });
  });

  it('rejects a JSON array containing malformed records and tries the next candidate', async () => {
    const validSkills = [{
      id: 'validated-skill',
      path: 'skills/validated-skill',
      category: 'core',
      name: 'Validated skill',
      description: 'Loaded after rejecting a malformed record',
    }];

    (global.fetch as Mock)
      .mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        text: async () => JSON.stringify([{}]),
      })
      .mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        text: async () => JSON.stringify(validSkills),
      });

    render(
      <SkillProvider>
        <SkillsProbe />
      </SkillProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('ids').textContent).toBe('validated-skill');
      expect(screen.getByTestId('error').textContent).toBe('');
    });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('keeps the newest refresh result when an older request resolves later', async () => {
    let resolveInitial: ((value: Response) => void) | undefined;
    const initialResponse = new Promise<Response>((resolve) => {
      resolveInitial = resolve;
    });
    const response = (id: string) => ({
      ok: true,
      headers: { get: () => 'application/json' },
      text: async () => JSON.stringify([{
        id,
        path: `skills/${id}`,
        category: 'core',
        name: id,
        description: `${id} description`,
      }]),
    } as unknown as Response);

    (global.fetch as Mock)
      .mockImplementationOnce(() => initialResponse)
      .mockResolvedValueOnce(response('newest-skill'));

    render(
      <SkillProvider>
        <SkillsProbe />
      </SkillProvider>,
    );

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: 'refresh' }));

    await waitFor(() => {
      expect(screen.getByTestId('ids').textContent).toBe('newest-skill');
      expect(screen.getByTestId('loading').textContent).toBe('ready');
    });

    await act(async () => {
      resolveInitial?.(response('stale-skill'));
      await initialResponse;
    });

    expect(screen.getByTestId('ids').textContent).toBe('newest-skill');
    expect(screen.getByTestId('error').textContent).toBe('');
  });

});
