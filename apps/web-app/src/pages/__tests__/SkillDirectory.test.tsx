import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, it, expect, vi } from 'vitest';
import SkillDirectory from '../SkillDirectory';
const fixture = vi.hoisted(() => ({ skills: [{ id: 'z-last' }, { id: 'a-first' }], loading: false, error: null as string | null }));
vi.mock('../../context/SkillContext', () => ({ useSkills: () => fixture }));
describe('alphabetical skill directory', () => {
  it('renders every skill as a normal link in stable alphabetical order', () => {
    render(<MemoryRouter><SkillDirectory /></MemoryRouter>);
    expect(within(screen.getByRole('list')).getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual(['/skill/a-first/', '/skill/z-last/']);
    expect(screen.getByRole('link', { name: 'Search and filter the catalog' })).toHaveAttribute('href', '/core/');
  });
  it('reports loading failures without presenting an empty directory as complete', () => {
    fixture.error = 'Catalog unavailable';
    render(<MemoryRouter><SkillDirectory /></MemoryRouter>);
    expect(screen.getByRole('alert')).toHaveTextContent('Catalog unavailable');
    fixture.error = null;
  });
});
