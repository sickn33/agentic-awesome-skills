import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { InstallationHandoff } from '../InstallationHandoff';

describe('installation handoff', () => {
  it('requires a destination and updates exact IDs without persisting or running the command', () => {
    vi.clearAllMocks();
    const { rerender } = render(<InstallationHandoff ids={['react']} version="16.8.0" />);
    expect(screen.queryByLabelText('Installation preview command')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Prepare installation preview'));
    fireEvent.change(screen.getByLabelText('Skill directory'), { target: { value: '.agents/skills' } });
    expect((screen.getByLabelText('Installation preview command') as HTMLTextAreaElement).value).toContain("--skills 'react'");
    rerender(<InstallationHandoff ids={['other']} version="16.7.0" />);
    expect((screen.getByLabelText('Installation preview command') as HTMLTextAreaElement).value).toContain("--release 16.7.0");
    expect((screen.getByLabelText('Installation preview command') as HTMLTextAreaElement).value).not.toContain("--skills 'react'");
    expect(fetch).not.toHaveBeenCalled();
    expect(localStorage.setItem).not.toHaveBeenCalled();
  });
  it('offers manual copying when clipboard fails', async () => {
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValueOnce(new Error('blocked'));
    render(<InstallationHandoff ids={['react']} version="16.8.0" />);
    fireEvent.click(screen.getByText('Prepare installation preview'));
    fireEvent.change(screen.getByLabelText('Skill directory'), { target: { value: '.agents/skills' } });
    fireEvent.click(screen.getByText('Copy preview command'));
    expect(await screen.findByRole('status')).toHaveTextContent('Clipboard unavailable');
  });
});
