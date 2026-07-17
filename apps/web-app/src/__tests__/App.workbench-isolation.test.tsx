import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from '../App';

describe('Workbench route isolation', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/workbench');
    vi.clearAllMocks();
  });

  afterEach(() => {
    window.history.replaceState({}, '', '/');
  });

  it('mounts the Workbench without catalog requests or browser persistence', async () => {
    const fetchSpy = vi.mocked(globalThis.fetch);
    const localGet = vi.spyOn(window.localStorage, 'getItem');
    const localSet = vi.spyOn(window.localStorage, 'setItem');
    const sessionGet = vi.spyOn(window.sessionStorage, 'getItem');
    const sessionSet = vi.spyOn(window.sessionStorage, 'setItem');

    render(<App />);

    await screen.findByRole('heading', { level: 1, name: 'Review what your agent chose.' });
    const stack = {
      schemaVersion: 1,
      name: 'isolated-stack',
      catalog: { package: 'agentic-awesome-skills', version: '15.0.0', integrity: `sha256-${'a'.repeat(64)}` },
      targets: [{ host: 'codex', scope: 'project' }],
      intent: { goals: ['build'] },
      policy: { allowedRisk: ['safe'], requireKnownSource: true, allowManualSetup: false },
      skills: [{ id: 'react-best-practices' }],
    };
    fireEvent.change(screen.getAllByLabelText('Paste JSON')[0], { target: { value: JSON.stringify(stack) } });
    fireEvent.click(screen.getByRole('button', { name: 'Review pasted stack' }));
    expect(await screen.findByRole('heading', { level: 2, name: 'isolated-stack' })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(localGet).not.toHaveBeenCalled();
    expect(localSet).not.toHaveBeenCalled();
    expect(sessionGet).not.toHaveBeenCalled();
    expect(sessionSet).not.toHaveBeenCalled();
  });
});
