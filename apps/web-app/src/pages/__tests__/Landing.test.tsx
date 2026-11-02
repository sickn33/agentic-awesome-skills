import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { Landing } from '../Landing';
import stack from '../../../../../docs/examples/workflows/mcp-contract/aas-stack.json';
import plan from '../../../../../docs/examples/workflows/mcp-contract/plan.json';

const mount = () => render(<MemoryRouter><Landing /></MemoryRouter>);
describe('Core product homepage', () => {
  it('introduces the skill library with catalog and Core setup entry points', () => {
    mount();
    expect(screen.getByRole('heading', { level: 1, name: 'Agentic Awesome Skills' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Get started with Core' })).toHaveAttribute('href', '#get-started');
    expect(screen.getByRole('link', { name: 'View recorded project' })).toHaveAttribute('href', 'https://github.com/sickn33/agentic-awesome-skills/tree/main/docs/examples/workflows/mcp-contract');
    expect(screen.getByRole('link', { name: 'Explore the skill catalog' })).toHaveAttribute('href', '/core/');
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Codex setup/ })).toHaveAttribute('href', '/docs/codex-cli-skills/');
    expect(screen.getByRole('link', { name: /^Claude Code setup/ })).toHaveAttribute('href', '/docs/claude-code-skills/');
    expect(screen.getByRole('tab', { name: /3 Plan preview/ })).toHaveAttribute('aria-selected', 'true');
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
