import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SelectionFeedback } from '../SelectionFeedback';

describe('voluntary local feedback', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('exports only supplied feedback, performs no network/persistence, and invalidates an edited preview', async () => {
    const create = vi.fn((_value: Blob | MediaSource) => 'blob:feedback-test');
    const revoke = vi.fn((_url: string) => {});
    vi.stubGlobal('URL', class extends URL { static createObjectURL = create; static revokeObjectURL = revoke; });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe('aas-feedback.json');
      expect(this.href).toBe('blob:feedback-test');
    });
    const network = vi.spyOn(globalThis, 'fetch');
    const storage = vi.spyOn(Storage.prototype, 'setItem');
    render(<SelectionFeedback />);
    fireEvent.click(screen.getByText('Record feedback locally'));
    fireEvent.change(screen.getByLabelText(/Minutes to a useful selection/), { target: { value: '4.5' } });
    fireEvent.change(screen.getByLabelText('Installation experience'), { target: { value: 'setup' } });
    fireEvent.click(screen.getByRole('button', { name: 'Preview feedback JSON' }));
    expect(JSON.parse(screen.getByLabelText('Feedback JSON preview').textContent!)).toEqual({ schemaVersion: 1, kind: 'aas.voluntary-feedback', minutesToUsefulSelection: 4.5, installationFriction: 'setup', reusedSelection: 'not-yet' });
    expect(screen.getByRole('button', { name: 'Save feedback JSON' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save feedback JSON' }));
    expect(click).toHaveBeenCalledOnce();
    const blob = create.mock.calls[0][0] as Blob;
    const content = await new Promise<string>((resolve) => {
      const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.readAsText(blob);
    });
    expect(JSON.parse(content)).toEqual(JSON.parse(screen.getByLabelText('Feedback JSON preview').textContent!));
    await vi.waitFor(() => expect(revoke).toHaveBeenCalledWith('blob:feedback-test'));
    fireEvent.change(screen.getByLabelText('Installation experience'), { target: { value: 'none' } });
    expect(screen.queryByRole('button', { name: 'Save feedback JSON' })).not.toBeInTheDocument();
    expect(network).not.toHaveBeenCalled();
    expect(storage).not.toHaveBeenCalled();
  });
});
