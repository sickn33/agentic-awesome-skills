import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithRouter } from '../../utils/testUtils';
import { Workbench } from '../Workbench';
import { canonicalWorkbenchJson } from '../../utils/workbenchReview';

const D1 = `sha256-${'1'.repeat(64)}`;
const D2 = `sha256-${'2'.repeat(64)}`;
const D3 = `sha256-${'3'.repeat(64)}`;
const D4 = `sha256-${'4'.repeat(64)}`;
const D5 = `sha256-${'5'.repeat(64)}`;

function stackFixture(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: 1,
    name: 'reviewed-web-stack',
    catalog: { package: 'agentic-awesome-skills', version: '15.0.0', integrity: D1 },
    targets: [{ host: 'codex', scope: 'project' }],
    intent: { goals: ['build', 'test'] },
    policy: { allowedRisk: ['none', 'safe'], requireKnownSource: true, allowManualSetup: false },
    skills: [{ id: 'react-best-practices' }, { id: 'playwright-skill' }],
    ...overrides,
  };
}

function planFixture(unknownField = 'metadata.source'): Record<string, unknown> {
  const plan = {
    schemaVersion: 1,
    kind: 'aas.stack-plan',
    digest: D5,
    payload: {
      schemaVersion: 1,
      kind: 'aas.stack-plan.payload',
      versions: {
        protocolVersion: '2025-06-18',
        coreVersion: '1.0.0',
        metadataSchemaVersion: '1.0.0',
        scorerVersion: '1.0.0',
      },
      manifestDigest: D2,
      catalog: { package: 'agentic-awesome-skills', version: '15.0.0', integrity: D1 },
      runtime: { package: 'agentic-awesome-skills', version: '15.0.0', integrity: 'sha512-runtime', closureDigest: D3 },
      target: { host: 'codex', scope: 'project', adapterVersion: '1.0.0', identityDigest: D4 },
      installedState: { digest: D2, entries: [] },
      desiredSkills: ['react-best-practices'],
      policy: { allowedRisk: ['none', 'safe'], requireKnownSource: true, allowManualSetup: false },
      operations: [{
        kind: 'install',
        skillId: 'react-best-practices',
        sourceTreeDigest: D3,
        expectedTreeDigest: null,
        resultTreeDigest: D3,
        backupRequired: false,
      }],
      overrides: [{
        kind: 'discoveryCandidate',
        skillId: 'react-best-practices',
        reasonCodes: ['AAS_DISCOVERY_PROMOTED'],
        unknownFields: [unknownField],
      }],
      stateCommit: { previousDigest: D2, nextDigest: D4, position: 'final' },
    },
  };
  const payload = plan.payload;
  plan.digest = `sha256-${createHash('sha256').update(canonicalWorkbenchJson(payload)).digest('hex')}`;
  return plan;
}

function paste(label: 'Paste JSON', value: unknown, index = 0): void {
  const inputs = screen.getAllByLabelText(label);
  fireEvent.change(inputs[index], { target: { value: JSON.stringify(value) } });
}

describe('Workbench review UI', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reviews a valid stack without offering install, apply, or share actions', () => {
    renderWithRouter(<Workbench />, { route: '/workbench', path: '/workbench', useProvider: false });

    paste('Paste JSON', stackFixture());
    fireEvent.click(screen.getByRole('button', { name: 'Review pasted stack' }));

    expect(screen.getByRole('heading', { level: 2, name: 'reviewed-web-stack' })).toBeInTheDocument();
    expect(screen.getByText('react-best-practices')).toBeInTheDocument();
    expect(screen.getByText('playwright-skill')).toBeInTheDocument();
    expect(screen.getByText('Declared identity only.', { exact: false })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /install|apply|share/i })).not.toBeInTheDocument();
    expect(window.location.search).toBe('');
  });

  it('reviews plan bindings, operations, overrides, and unknown fields', async () => {
    renderWithRouter(<Workbench />, { route: '/workbench', path: '/workbench', useProvider: false });

    paste('Paste JSON', planFixture(), 1);
    fireEvent.click(screen.getByRole('button', { name: 'Review pasted plan' }));

    expect(await screen.findByRole('heading', { level: 2, name: 'Single-target change review' })).toBeInTheDocument();
    expect(screen.getByText('install')).toBeInTheDocument();
    expect(screen.getAllByText('react-best-practices')).toHaveLength(2);
    expect(screen.getAllByText('AAS_DISCOVERY_PROMOTED', { exact: false })).toHaveLength(2);
    expect(screen.getAllByText('metadata.source', { exact: false })).toHaveLength(2);
    expect(screen.getByText('1 overrides · 1 unknown fields')).toBeInTheDocument();
  });

  it('fails closed on schema drift and clears the previous review', () => {
    renderWithRouter(<Workbench />, { route: '/workbench', path: '/workbench', useProvider: false });

    paste('Paste JSON', stackFixture());
    fireEvent.click(screen.getByRole('button', { name: 'Review pasted stack' }));
    expect(screen.getByText('reviewed-web-stack')).toBeInTheDocument();

    paste('Paste JSON', stackFixture({ unexpected: 'field' }));
    fireEvent.click(screen.getByRole('button', { name: 'Review pasted stack' }));

    expect(screen.getByRole('alert')).toHaveTextContent('unsupported property');
    expect(screen.queryByText('reviewed-web-stack')).not.toBeInTheDocument();
  });

  it('rejects a plan whose digest no longer matches its canonical payload', async () => {
    const plan = planFixture();
    plan.digest = D5;
    renderWithRouter(<Workbench />, { route: '/workbench', path: '/workbench', useProvider: false });

    paste('Paste JSON', plan, 1);
    fireEvent.click(screen.getByRole('button', { name: 'Review pasted plan' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('digest does not match');
    expect(screen.queryByRole('heading', { level: 2, name: 'Single-target change review' })).not.toBeInTheDocument();
  });

  it('renders hostile schema-valid strings as text and never creates executable elements', async () => {
    const payload = '</script><img src=x onerror="globalThis.pwned=true">javascript:alert(1)';
    renderWithRouter(<Workbench />, { route: '/workbench', path: '/workbench', useProvider: false });

    paste('Paste JSON', planFixture(payload), 1);
    fireEvent.click(screen.getByRole('button', { name: 'Review pasted plan' }));

    expect((await screen.findAllByText(payload, { exact: false })).length).toBeGreaterThan(0);
    expect(document.querySelector('.workbench-page script, .workbench-page img, .workbench-page svg, .workbench-page iframe')).toBeNull();
    expect(document.querySelector('.workbench-page [onerror], .workbench-page [onload], .workbench-page a[href^="javascript:"]')).toBeNull();
  });

  it('imports only the file explicitly supplied by the file input', async () => {
    renderWithRouter(<Workbench />, { route: '/workbench', path: '/workbench', useProvider: false });
    const file = new File([JSON.stringify(stackFixture())], 'aas-stack.json', { type: 'application/json' });
    Object.defineProperty(file, 'arrayBuffer', {
      value: vi.fn().mockResolvedValue(new TextEncoder().encode(JSON.stringify(stackFixture())).buffer),
    });

    fireEvent.change(screen.getByLabelText('Choose stack JSON'), { target: { files: [file] } });

    await waitFor(() => expect(screen.getByText('Valid stack loaded from file. Held in this page only.')).toBeInTheDocument());
    expect(screen.getByText('reviewed-web-stack')).toBeInTheDocument();
    expect(file.arrayBuffer).toHaveBeenCalledOnce();
  });

  it('keeps imported data in component memory and clears it on unmount', () => {
    const first = renderWithRouter(<Workbench />, { route: '/workbench', path: '/workbench', useProvider: false });
    paste('Paste JSON', stackFixture());
    fireEvent.click(screen.getByRole('button', { name: 'Review pasted stack' }));
    expect(screen.getByText('reviewed-web-stack')).toBeInTheDocument();

    first.unmount();
    renderWithRouter(<Workbench />, { route: '/workbench', path: '/workbench', useProvider: false });

    expect(screen.queryByText('reviewed-web-stack')).not.toBeInTheDocument();
    expect(screen.getByText('No artifact loaded')).toBeInTheDocument();
  });
});
