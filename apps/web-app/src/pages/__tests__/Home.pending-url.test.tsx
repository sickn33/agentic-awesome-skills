import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Home } from '../Home';
import { renderWithRouter } from '../../utils/testUtils';

const navigation = vi.hoisted(() => ({ params: new URLSearchParams(), write: vi.fn() }));
// Browser history changes before React Router commits its new searchParams. Keep
// that previous snapshot pending while the user immediately returns to search.
vi.mock('react-router', async (importOriginal) => ({
  ...await importOriginal<typeof import('react-router')>(),
  useSearchParams: () => [navigation.params, navigation.write],
}));
vi.mock('../../context/SkillContext', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../context/SkillContext')>();
  const { createMockSkill } = await import('../../factories/skill');
  const skills = [createMockSkill()];
  return { ...original, useSkills: () => ({ skills, stars: {}, loading: false, error: null }) };
});

describe('pending catalog URL navigation', () => {
  it('replaces an in-flight view URL when the keyboard shortcut returns to search', () => {
    renderWithRouter(<Home />, { useProvider: false });
    fireEvent.click(screen.getByRole('button', { name: 'Workflows' }));
    expect(navigation.write.mock.lastCall?.[0].get('view')).toBe('workflows');
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    expect(screen.getByLabelText('Search skills')).toHaveFocus();
    expect(navigation.write.mock.lastCall?.[0].has('view')).toBe(false);
  });
});
