import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { Workbench } from '../pages/Workbench';
import { selectionFixture } from '../utils/__tests__/selectionEvidenceFixture';

describe('plugin Workbench boundary', () => {
  it('validates host tool artifacts without fetching and replaces stale results', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const { stack, evidence } = selectionFixture();
    const { rerender } = render(<MemoryRouter><Workbench embedded hostArtifacts={{ manifest: stack, evidence }} /></MemoryRouter>);
    await screen.findByRole('heading', { name: 'evidence-test' });
    await screen.findByRole('heading', { name: 'Selection evidence' });
    expect(screen.queryByText('Explore skills by outcome')).not.toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(screen.queryByText('Prepare installation preview')).not.toBeInTheDocument();
    rerender(<MemoryRouter><Workbench embedded hostArtifacts={{ manifest: { invalid: true } }} /></MemoryRouter>);
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'evidence-test' })).not.toBeInTheDocument());
    expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
    expect(screen.queryByRole('heading', { name: 'Selection evidence' })).not.toBeInTheDocument();
    fetchSpy.mockRestore();
  });
  it('rejects tampered host evidence through the existing digest verification', async () => {
    const { stack, evidence } = selectionFixture();
    evidence.digest = `sha256-${'0'.repeat(64)}`;
    render(<MemoryRouter><Workbench embedded hostArtifacts={{ manifest: stack, evidence }} /></MemoryRouter>);
    await screen.findByRole('alert');
    expect(screen.queryByRole('heading', { name: 'Selection evidence' })).not.toBeInTheDocument();
  });
});
