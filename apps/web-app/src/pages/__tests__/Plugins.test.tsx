import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import bundles from '../../../../../data/editorial-bundles.json';
import { specializedPlugins } from '../../data/specializedPlugins';
import { catalogVersion } from '../../utils/catalogRelease';
import { Plugins } from '../Plugins';
import { renderWithRouter } from '../../utils/testUtils';

describe('Packs', () => {
  it('opens the migrated web pack from its older URL', () => {
    renderWithRouter(<Plugins />, { route: '/plugins?pack=aas-web-app-builder', path: '/plugins', useProvider: false });
    expect(screen.getByRole('heading', { name: 'Build a web app' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'frontend-developer' })).toHaveAttribute('href', '/skill/frontend-developer/');
    expect(document.title).toContain('AAS Specialized Plugins');
  });
});

describe('canonical specialized plugin definitions', () => {
  it('shows every source plugin with exactly its installable composition and current copy', () => {
    expect(specializedPlugins.map((plugin) => plugin.id)).toEqual(bundles.bundles.map((plugin) => plugin.id));
    for (const plugin of specializedPlugins) {
      const bundle = bundles.bundles.find((entry) => entry.id === plugin.id)!;
      expect(plugin.skills).toEqual(bundle.skills.map((skill) => skill.id));
      expect(plugin.why).toBe(bundle.description);
      expect(plugin.defaultPrompts).toEqual(bundle.defaultPrompts);
      expect(plugin.notFor).toEqual(bundle.notFor);
    }
  });

  it('offers one replacement for retired packs and includes the remaining distinct jobs', () => {
    expect(specializedPlugins).toHaveLength(bundles.bundles.length);
    const ids = new Set(specializedPlugins.map((plugin) => plugin.id));
    for (const migration of bundles.migrations) {
      expect(ids.has(migration.from)).toBe(false);
      expect(ids.has(migration.to)).toBe(true);
    }
    expect(ids.has('odoo-erp')).toBe(true);
    expect(ids.has('oss-maintainer')).toBe(true);
  });

  it('finds the current pack when searching for a retired ID', () => {
    renderWithRouter(<Plugins />, { route: '/plugins?work=all', path: '/plugins', useProvider: false });
    fireEvent.change(screen.getByLabelText('Filter packs'), { target: { value: 'web-wizard' } });
    expect(screen.getByRole('heading', { name: 'Build a web app' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View pack source' })).toHaveAttribute('href', expect.stringContaining(`/tree/v${catalogVersion}/plugins/agentic-bundle-web-app`));
    fireEvent.change(screen.getByLabelText('Filter packs'), { target: { value: 'no-such-pack-unique' } });
    expect(screen.getByText(/No packs match/)).toBeVisible();
  });

  it.each(specializedPlugins)('exposes every member in $name', (plugin) => {
    renderWithRouter(<Plugins />, { route: `/plugins?pack=${encodeURIComponent(plugin.id)}`, path: '/plugins', useProvider: false });
    const detail = within(screen.getByRole('article'));
    for (const id of plugin.skills) {
      expect(detail.getByRole('link', { name: id })).toHaveAttribute('href', `/skill/${encodeURIComponent(id)}/`);
    }
  });
});
