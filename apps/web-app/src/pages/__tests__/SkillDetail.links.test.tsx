import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { SkillDetail } from '../SkillDetail';
import { renderWithRouter } from '../../utils/testUtils';
import { createMockSkill } from '../../factories/skill';
import { useSkills } from '../../context/SkillContext';
import { catalogVersion } from '../../utils/catalogRelease';

vi.mock('../../context/SkillContext', async (importOriginal) => ({
  ...await importOriginal<object>(), useSkills: vi.fn(),
}));
vi.mock('../../components/SkillStarButton', () => ({ SkillStarButton: () => null }));

const markdown = `# Slides

## Create **without a template**
[Read the guide](html2pptx.md)
[Read the script](scripts/html2pptx.js)
[Go to creation](#create-without-a-template)

## Create *without a template*
## Résumé 中文

\`\`\`markdown
## Not a heading
\`\`\`

<script>alert('unsafe')</script>
`;

describe('SkillDetail rendered documentation links', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/agentic-awesome-skills/skill/pptx-official/');
    const base = document.createElement('base');
    base.href = '/agentic-awesome-skills/';
    document.head.appendChild(base);
    vi.mocked(useSkills).mockReturnValue({
      skills: [createMockSkill({ id: 'pptx-official', name: 'pptx-official', path: 'skills/pptx-official' })],
      stars: {}, loading: false, error: null, refreshSkills: vi.fn(),
    });
    vi.mocked(fetch).mockResolvedValue({ ok: true, text: async () => markdown } as Response);
  });

  afterEach(() => {
    document.querySelector('base')?.remove();
    window.history.replaceState({}, '', '/');
  });

  it('keeps fragments on the skill route and sends bundled files to the pinned release', async () => {
    const { container } = renderWithRouter(<SkillDetail />, { route: '/skill/pptx-official/', path: '/skill/:id', useProvider: false });
    const guide = await screen.findByRole('link', { name: 'Read the guide' }, { timeout: 5000 });
    expect(guide).toHaveAttribute('href', `https://github.com/sickn33/agentic-awesome-skills/blob/v${catalogVersion}/skills/pptx-official/html2pptx.md`);
    expect(screen.getByRole('link', { name: 'Read the script' })).toHaveAttribute('href', `https://github.com/sickn33/agentic-awesome-skills/blob/v${catalogVersion}/skills/pptx-official/scripts/html2pptx.js`);
    expect(screen.getByRole('link', { name: 'Go to creation' })).toHaveAttribute('href', `${window.location.href}#create-without-a-template`);
    expect(screen.getByRole('link', { name: /Browse all skill files/ })).toHaveAttribute('href', `https://github.com/sickn33/agentic-awesome-skills/tree/v${catalogVersion}/skills/pptx-official`);

    const toc = within(screen.getByRole('complementary', { name: 'On this page' }));
    const links = toc.getAllByRole('link');
    expect(links).toHaveLength(3);
    for (const link of links) {
      const url = new URL((link as HTMLAnchorElement).href);
      expect(url.pathname).toBe('/agentic-awesome-skills/skill/pptx-official/');
      expect(document.getElementById(decodeURIComponent(url.hash.slice(1)))).toHaveTextContent(link.textContent!);
    }
    expect(container.querySelector('.markdown-body #create-without-a-template-1')).toBeInTheDocument();
    expect(container.querySelector('.markdown-body script')).not.toBeInTheDocument();
    await waitFor(() => expect(container.textContent).not.toContain('[object Object]'));
  });
});
