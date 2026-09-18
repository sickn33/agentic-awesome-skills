import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import candidates from '../../../../../data/specialized-plugin-candidates.json';
import bundles from '../../../../../data/editorial-bundles.json';
import { specializedPlugins } from '../../data/specializedPlugins';
import { catalogVersion } from '../../utils/catalogRelease';
import { Plugins } from '../Plugins';
import { renderWithRouter } from '../../utils/testUtils';

describe('Plugins', () => {
  it('renders the specialized plugin catalog and sets metadata', () => {
    renderWithRouter(<Plugins />, { route: '/plugins', path: '/plugins', useProvider: false });

    expect(screen.getByRole('heading', { name: /Choose the focused AAS plugin/i })).toBeInTheDocument();
    expect(screen.getByText('AAS Web App Builder')).toBeInTheDocument();
    expect(screen.getByText('AAS Security Engineer')).toBeInTheDocument();
    expect(screen.getByText('AAS Marketing, SEO & Growth')).toBeInTheDocument();
    expect(screen.getByText(/distributions of the full skill library/i)).toBeInTheDocument();
    expect(screen.queryByText(/1,550\+/i)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Install one skill with GitHub CLI/i })).toHaveAttribute(
      'href',
      expect.stringContaining('docs/users/getting-started.md'),
    );
    expect(screen.getByText(/Plugins, bundles, and workflows serve different decisions/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '@frontend-developer' })).toHaveAttribute(
      'href',
      '/skill/frontend-developer/',
    );
    expect(document.title).toContain('AAS Specialized Plugins');
    expect(document.querySelector('meta[name="description"]')).toHaveAttribute(
      'content',
      expect.stringContaining('specialized plugin'),
    );
  });
});

describe('canonical specialized plugin definitions', () => {
  it('shows every source plugin with exactly its installable composition and current copy', () => {
    expect(specializedPlugins.map((plugin) => plugin.id)).toEqual(candidates.candidates.map((plugin) => plugin.id));
    for (const plugin of specializedPlugins) {
      const bundle = bundles.bundles.find((entry) => entry.id === plugin.id)!;
      expect(plugin.skills).toEqual(bundle.skills.map((skill) => skill.id));
      expect(plugin.why).toBe(bundle.description);
      expect(plugin.defaultPrompts).toEqual(bundle.defaultPrompts);
      expect(plugin.notFor).toEqual(bundle.notFor);
    }
  });

  it('filters by exact included skill and exposes the full list and scope', () => {
    renderWithRouter(<Plugins />, { route: '/plugins', path: '/plugins', useProvider: false });
    expect(screen.getByRole('status')).toHaveTextContent(`${specializedPlugins.length} plugins`);
    fireEvent.change(screen.getByLabelText('Filter plugins'), { target: { value: 'aas-web-app-builder' } });
    expect(screen.getByRole('status')).toHaveTextContent('1 plugin');
    const row = screen.getByText('AAS Web App Builder').closest('[role="row"]')! as HTMLElement;
    fireEvent.click(within(row).getByText('Show all 10 skills'));
    expect(within(row).getByRole('link', { name: '@browser-automation' })).toBeVisible();
    expect(within(row).queryByRole('link', { name: '@nextjs-best-practices' })).not.toBeInTheDocument();
    fireEvent.click(within(row).getByText('Scope and starting prompt'));
    expect(within(row).getByText(/report checks actually run/)).toBeVisible();
    expect(within(row).getByRole('link', { name: 'View plugin' })).toHaveAttribute('href', expect.stringContaining(`/tree/v${catalogVersion}/plugins/`));
    fireEvent.change(screen.getByLabelText('Filter plugins'), { target: { value: 'no-such-plugin-unique' } });
    expect(screen.getByText(/No plugins match/)).toBeVisible();
  });
});
