import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('App route loading', () => {
  it('lazy loads route pages to keep the initial bundle smaller', () => {
    const appPath = path.resolve(__dirname, '..', 'App.tsx');
    const source = fs.readFileSync(appPath, 'utf8');

    expect(source).toMatch(/lazy\(\(\) => import\('\.\/pages\/Home'\)\)/);
    expect(source).toMatch(/lazy\(\(\) => import\('\.\/pages\/SkillDetail'\)\)/);
    expect(source).toMatch(/lazy\(\(\) => import\('\.\/pages\/Workbench'\)\)/);
    expect(source).toMatch(/<Suspense/);
  });
});
