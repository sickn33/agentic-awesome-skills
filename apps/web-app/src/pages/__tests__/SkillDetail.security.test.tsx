import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { waitFor } from '@testing-library/react';
import { SkillDetail } from '../SkillDetail';
import { renderWithRouter } from '../../utils/testUtils';
import { createMockSkill } from '../../factories/skill';
import { useSkills } from '../../context/SkillContext';

let capturedRehypePlugins: unknown[] | undefined;

vi.mock('../../components/SkillStarButton', () => ({
  SkillStarButton: () => <button data-testid="star-button">Save locally</button>,
}));

vi.mock('../../context/SkillContext', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    useSkills: vi.fn(),
  };
});

vi.mock('react-markdown', () => ({
  default: ({ children, rehypePlugins }: { children: string; rehypePlugins?: unknown[] }) => {
    capturedRehypePlugins = rehypePlugins;
    return <div data-testid="markdown-content">{children}</div>;
  },
}));

describe('SkillDetail security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedRehypePlugins = undefined;
  });

  it('does not enable raw HTML rendering for skill markdown', async () => {
    const mockSkill = createMockSkill({
      id: 'unsafe-skill',
      name: 'unsafe-skill',
      description: 'Skill with embedded html',
    });

    (useSkills as Mock).mockReturnValue({
      skills: [mockSkill],
      stars: {},
      loading: false,
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => '# Demo\n\n<img src=x onerror=alert(1) />',
    });

    renderWithRouter(<SkillDetail />, {
      route: '/skill/unsafe-skill',
      path: '/skill/:id',
      useProvider: false,
    });

    await waitFor(() => {
      expect(capturedRehypePlugins).toBeDefined();
    });

    const pluginNames = (capturedRehypePlugins ?? []).map((plugin) =>
      typeof plugin === 'function' ? plugin.name : String(plugin),
    );

    expect(pluginNames).not.toContain('rehypeRaw');
  });
});
