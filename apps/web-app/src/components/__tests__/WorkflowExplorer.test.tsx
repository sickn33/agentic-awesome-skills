import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { render } from '@testing-library/react';
import WorkflowExplorer from '../WorkflowExplorer';
import { createMockSkill } from '../../factories/skill';

const catalog = [
  createMockSkill({ id: 'brainstorming', name: 'Brainstorming' }),
  createMockSkill({ id: 'concise-planning', name: 'Concise planning' }),
  createMockSkill({ id: 'writing-plans', name: 'Writing plans' }),
];

describe('workflow explorer', () => {
  beforeEach(() => localStorage.clear());

  it('filters workflows and exposes an ordered, inspectable phase path', () => {
    render(<MemoryRouter><WorkflowExplorer catalog={catalog} shortlistIds={[]} onToggleShortlist={() => undefined} /></MemoryRouter>);
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search workflows' }), { target: { value: 'security audit' } });
    expect(screen.getByText('1 of 5 workflows')).toBeInTheDocument();
    expect(screen.getByText('Security Audit for a Web App')).toBeInTheDocument();
    expect(screen.queryByText('Ship a SaaS MVP')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'View workflow' }));
    expect(screen.getByText('Phase 1')).toBeInTheDocument();
    expect(screen.getByText('Define scope and threat model')).toBeInTheDocument();
  });

  it('adds only catalog-backed, not-yet-selected workflow skills to the shortlist', () => {
    const selected: string[] = ['brainstorming'];
    const onToggle = (id: string) => selected.push(id);
    render(<MemoryRouter><WorkflowExplorer catalog={catalog} shortlistIds={selected} onToggleShortlist={onToggle} /></MemoryRouter>);
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search workflows' }), { target: { value: 'SaaS MVP' } });
    const card = screen.getByRole('article');
    fireEvent.click(within(card).getByRole('button', { name: /View workflow/ }));
    expect(within(card).getByRole('button', { name: 'Add 2 skills to shortlist' })).toBeInTheDocument();
    fireEvent.click(within(card).getByRole('button', { name: 'Add 2 skills to shortlist' }));
    expect(onToggle).toBeDefined();
    expect(selected).toEqual(['brainstorming', 'concise-planning', 'writing-plans']);
    expect(within(card).getByText(/referenced skill IDs are not in the published catalog/)).toBeInTheDocument();
  });
});
