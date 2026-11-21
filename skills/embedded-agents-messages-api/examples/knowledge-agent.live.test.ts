import { describe, test, expect, vi } from 'vitest';

vi.mock('server-only', () => ({}));
import { askAgent } from '@/lib/agent';

// The example knowledge-agent's own behaviour, against the real model (outside the gate).

async function ask(prompt: string): Promise<string> {
  let text = '';
  for await (const ev of askAgent({ agent: 'knowledge-agent', prompt })) if (ev.type === 'text') text += ev.text;
  return text;
}

describe('knowledge-agent', () => {
  test('its AGENTS.md is in force: the sign-off', async () => {
    expect(await ask('Say hello in one short sentence.')).toContain('Best, Knowledge Agent');
  });

  test('answers a covered topic from its knowledge file, and cites it', async () => {
    const reply = await ask('What is the recommended OKR scoring target, and why? Quote a short phrase from the knowledge file.');
    expect(reply).toContain('0.7');
    expect(reply).toMatch(/knowledge\/okrs\.md/);
  });

  test('refuses a topic its files do not cover', async () => {
    const reply = await ask('What is the capital of Mongolia?');
    expect(reply.toLowerCase()).toMatch(/not covered|knowledge base|don't (have|know)|isn't covered/);
    expect(reply).not.toMatch(/Ulaanbaatar|Ulan Bator/i);
  });
});
