import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { render } from '@testing-library/react';
import OutcomeExplorer from '../OutcomeExplorer';
import { createMockSkill } from '../../factories/skill';

const skill = createMockSkill({ id: 'react-auth', name: 'React authentication', description: 'Handle authentication in React', tags: ['react'], category: 'frontend' });
function mount(catalog?: typeof skill[]) { return render(<MemoryRouter><OutcomeExplorer catalog={catalog} /></MemoryRouter>); }

describe('optional outcome discovery', () => {
  beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); vi.mocked(fetch).mockReset(); });

  it('does not fetch, persist or inspect anything until opened, and never transmits the goal', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify([skill])));
    mount();
    expect(fetch).not.toHaveBeenCalled();
    expect(localStorage.setItem).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Explore skills by outcome' }));
    await screen.findByLabelText('Describe your goal');
    const calls = vi.mocked(fetch).mock.calls.length;
    fireEvent.change(screen.getByLabelText('Describe your goal'), { target: { value: 'React authentication private-project' } });
    fireEvent.click(screen.getByRole('button', { name: 'Find relevant skills' }));
    expect(await screen.findByRole('link', { name: 'React authentication' })).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(calls);
    expect(JSON.stringify(vi.mocked(fetch).mock.calls)).not.toContain('private-project');
    expect(JSON.stringify(vi.mocked(localStorage.setItem).mock.calls)).not.toContain('private-project');
    const add = screen.getByRole('button', { name: 'Add to shortlist React authentication' });
    expect(add).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(add);
    fireEvent.click(screen.getByText(/Compare 1 selected skill and prepare/));
    fireEvent.click(screen.getByRole('button', { name: 'Use discovery goal in brief' }));
    expect((screen.getByLabelText('Agent brief preview') as HTMLTextAreaElement).value).toContain('private-project');
  });

  it('reuses the catalog supplied by the home page and exposes evidence gaps and no-match recovery', async () => {
    mount([skill]);
    fireEvent.click(screen.getByRole('button', { name: 'Explore skills by outcome' }));
    fireEvent.change(screen.getByLabelText('Describe your goal'), { target: { value: 'React authentication' } });
    fireEvent.click(screen.getByRole('button', { name: 'Find relevant skills' }));
    const card = screen.getByRole('article');
    expect(within(card).getByText(/Why it appears/)).toBeInTheDocument();
    fireEvent.click(within(card).getByText('Evidence and gaps'));
    expect(within(card).getByText(/do not certify effectiveness/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Describe your goal'), { target: { value: 'unmatchable' } });
    fireEvent.click(screen.getByRole('button', { name: 'Find relevant skills' }));
    expect(screen.getByText('No clear matches for this goal')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Browse the complete catalog' })).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
    expect(screen.queryByText(/usage history/i)).not.toBeInTheDocument();
  });

  it('recovers from invalid catalog responses without accepting malformed records', async () => {
    vi.mocked(fetch).mockImplementation(async () => new Response(JSON.stringify([{ ...skill, plugin: {} }])));
    mount(); fireEvent.click(screen.getByRole('button', { name: 'Explore skills by outcome' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('catalog could not be loaded');
    expect(screen.queryByLabelText('Describe your goal')).not.toBeInTheDocument();
    vi.mocked(fetch).mockImplementation(async () => new Response(JSON.stringify([skill])));
    fireEvent.click(screen.getByRole('button', { name: 'Retry catalog download' }));
    await waitFor(() => expect(screen.getByLabelText('Describe your goal')).toBeInTheDocument());
  });
});
