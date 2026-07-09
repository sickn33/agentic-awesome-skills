import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import { createMockSkill } from '../factories/skill';

vi.mock('./SkillStarButton', () => ({
  SkillStarButton: () => <button type="button">Save locally</button>,
}));

import { SkillCard } from './SkillCard';

it('keeps the save control outside the card link', () => {
  render(
    <MemoryRouter>
      <SkillCard skill={createMockSkill()} starCount={0} />
    </MemoryRouter>,
  );

  const link = screen.getByRole('link', { name: /read skill/i });
  const button = screen.getByRole('button', { name: /save locally/i });
  expect(link).not.toContainElement(button);
});
