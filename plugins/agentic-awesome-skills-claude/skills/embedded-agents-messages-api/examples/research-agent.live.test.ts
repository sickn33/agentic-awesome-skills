import { describe, test, expect, vi } from 'vitest';

vi.mock('server-only', () => ({}));
import { askAgent } from '@/lib/agent';

// The example research-agent's own behaviour, against the real model (outside the gate).
// Needs PERPLEXITY_API_KEY; the second test calls Perplexity and spends its credits.

async function ask(prompt: string): Promise<{ text: string; done: boolean }> {
  let text = '';
  let done = false;
  for await (const ev of askAgent({ agent: 'research-agent', prompt })) {
    if (ev.type === 'text') text += ev.text;
    if (ev.type === 'done') done = true;
  }
  return { text, done };
}

describe('research-agent', () => {
  test('its AGENTS.md is in force: the sign-off', async () => {
    const { text } = await ask('Say hello in one short sentence. Do not call any tools.');
    expect(text).toContain('Best, Research Agent');
  });

  test('researches with Perplexity and cites a source', async () => {
    const { text, done } = await ask('What is the latest stable version of Node.js? One line, with a source URL.');
    expect(done).toBe(true);
    expect(text).toMatch(/https?:\/\//);
  });
});
