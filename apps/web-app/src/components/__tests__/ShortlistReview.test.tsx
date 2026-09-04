import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { ShortlistReview } from '../ShortlistReview';
import { renderWithRouter } from '../../utils/testUtils';
import { createMockSkill } from '../../factories/skill';
import { catalogVersion } from '../../utils/catalogRelease';

const skills = [createMockSkill({
  id: 'slides', description: 'Build a presentation', license: 'MIT',
  plugin: { targets: { codex: 'supported', claude: 'blocked' }, setup: { type: 'manual', summary: 'Configure the presentation API.', docs: 'SKILL.md' }, reasons: ['Requires a local dependency'] },
}), createMockSkill({ id: 'review', description: 'Review the presentation', risk: 'unknown' })];

describe('shortlist comparison and agent handoff', () => {
  beforeEach(() => {
    vi.mocked(navigator.clipboard.writeText).mockReset().mockResolvedValue();
    vi.mocked(localStorage.setItem).mockClear();
  });

  it('compares visible requirements and copies a previewable goal-specific brief without persisting it', async () => {
    renderWithRouter(<ShortlistReview skills={skills} onRemove={vi.fn()} onClear={vi.fn()} />, { useProvider: false });
    fireEvent.click(screen.getByText('Compare 2 selected skills and prepare an agent brief'));
    expect(screen.getByText('Manual: Configure the presentation API.')).toBeInTheDocument();
    expect(screen.getByText('Codex: included · Claude: not packaged')).toBeInTheDocument();
    expect(screen.getByText('MIT')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy agent brief' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('What do you want to accomplish?'), { target: { value: 'Prepare a quarterly review' } });
    fireEvent.change(screen.getByLabelText('Target'), { target: { value: 'claude:project' } });
    fireEvent.click(screen.getByRole('button', { name: 'Copy agent brief' }));
    await screen.findByRole('status');
    const brief = vi.mocked(navigator.clipboard.writeText).mock.calls[0][0];
    expect(brief).toContain('Prepare a quarterly review');
    expect(brief).toContain('Target: claude:project');
    expect(brief).toContain(`catalog v${catalogVersion}`);
    expect(brief).toContain('- slides\n- review');
    expect(brief).toContain('candidates to inspect, not a complete or approved stack');
    expect(brief).toContain('Do not install or apply skills.');
    expect(screen.getByLabelText('Agent brief preview')).toHaveValue(brief);
    expect(localStorage.setItem).not.toHaveBeenCalled();
  });

  it('exports exact IDs and handles blocked clipboard access with a visible manual fallback', async () => {
    const onRemove = vi.fn();
    const onClear = vi.fn();
    renderWithRouter(<ShortlistReview skills={skills} onRemove={onRemove} onClear={onClear} />, { useProvider: false });
    fireEvent.click(screen.getByRole('button', { name: 'Copy exact IDs' }));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith('slides\nreview'));
    vi.mocked(navigator.clipboard.writeText).mockRejectedValueOnce(new Error('Denied'));
    fireEvent.click(screen.getByRole('button', { name: 'Copy exact IDs' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Clipboard unavailable'));
    expect(screen.getByLabelText('Agent brief preview')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Remove slides' }));
    expect(onRemove).toHaveBeenCalledWith('slides');
    fireEvent.click(screen.getByRole('button', { name: 'Clear shortlist' }));
    expect(onClear).toHaveBeenCalledOnce();
  });
});
