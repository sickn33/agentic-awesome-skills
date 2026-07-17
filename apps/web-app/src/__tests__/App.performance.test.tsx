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
    expect(source).toMatch(/lazy\(\(\) => import\('\.\/context\/CatalogRouteProvider'\)\)/);
    expect(source).toMatch(/<Suspense/);
  });

  it('keeps the Workbench outside the catalog provider route', () => {
    const appPath = path.resolve(__dirname, '..', 'App.tsx');
    const mainPath = path.resolve(__dirname, '..', 'main.tsx');
    const appSource = fs.readFileSync(appPath, 'utf8');
    const mainSource = fs.readFileSync(mainPath, 'utf8');

    expect(appSource).toMatch(/<Route path="\/workbench" element={<Workbench \/>} \/>/);
    expect(appSource).toMatch(/<Route element={<CatalogRouteProvider \/>}>/);
    expect(appSource).not.toContain("from './context/SkillContext'");
    expect(mainSource).not.toContain('<SkillProvider>');
  });

  it('keeps the Workbench source free of remote, persistence, and mutation APIs', () => {
    const workbenchPath = path.resolve(__dirname, '..', 'pages', 'Workbench.tsx');
    const source = fs.readFileSync(workbenchPath, 'utf8');

    for (const forbidden of [
      'useSkills',
      'useSearchParams',
      'supabase',
      'fetch(',
      'localStorage',
      'sessionStorage',
      'navigator.clipboard',
      'dangerouslySetInnerHTML',
      'ReactMarkdown',
      'showOpenFilePicker',
    ]) {
      expect(source, `Workbench must not contain ${forbidden}`).not.toContain(forbidden);
    }
  });
});
