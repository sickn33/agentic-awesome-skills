import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { Landing } from '../Landing';
import { CoreRecordedExample } from '../CoreRecordedExample';
import stack from '../../../../../docs/examples/workflows/mcp-contract/aas-stack.json';
import plan from '../../../../../docs/examples/workflows/mcp-contract/plan.json';

const mount = () => render(<MemoryRouter><CoreRecordedExample /></MemoryRouter>);
describe('Core product homepage', () => {
  it('introduces the skill library with catalog and Core setup entry points', () => {
    render(<MemoryRouter><Landing /></MemoryRouter>);
    expect(screen.getByRole('heading', { level: 1, name: /Your agent.*The right skills/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Get started' })).toHaveAttribute('href', '/docs/');
    expect(screen.getByRole('link', { name: 'Browse packs' })).toHaveAttribute('href', '/plugins/');
    expect(screen.getByRole('link', { name: 'Contribute to AAS' })).toHaveAttribute('href', '/contribute/');
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    expect(document.title).toContain('AAS Core');
  });
  it('shows all exact recorded IDs and renders the real artifact, including its historical version', () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: '+4 more' }));
    for (const { id } of stack.skills) expect(screen.getByText(id)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'plan.json' }));
    expect(screen.getByText(/Example catalog v16.7.0/)).toBeInTheDocument();
    expect(JSON.parse(document.querySelector('pre')!.textContent!)).toEqual(plan);
    fireEvent.click(screen.getByRole('button', { name: 'aas-stack.json' }));
    expect(JSON.parse(document.querySelector('pre')!.textContent!)).toEqual(stack);
    expect(screen.getByRole('link', { name: 'Open the plan reviewer' })).toHaveAttribute('href', '/workbench/');
  });
  it('supports tab keyboard navigation and explains selection without suggesting browser AI execution', () => {
    mount();
    fireEvent.keyDown(screen.getByRole('tab', { name: /3 Plan preview/ }), { key: 'Home' });
    expect(screen.getByRole('tab', { name: /1 Goal/ })).toHaveFocus();
    expect(screen.getByRole('tab', { name: /1 Goal/ })).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(screen.getByRole('tab', { name: /1 Goal/ }), { key: 'ArrowRight' });
    expect(screen.getByText(/Core records and validates this choice/)).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /2 Agent selection/ })).toHaveFocus();
  });
});
