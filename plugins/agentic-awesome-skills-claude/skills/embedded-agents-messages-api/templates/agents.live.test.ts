import { describe, test, expect, vi } from 'vitest';

vi.mock('server-only', () => ({}));
import { agentDir, agentRequest, askAgent, listAgents } from '@/lib/agent';
import { connectMcp, openMcpTools, readMcpConfig } from '@/lib/agent-mcp';

// Every agent, against the real model and its real MCP servers. Costs money and needs
// ANTHROPIC_API_KEY plus each agent's MCP secrets. Runs outside the gate as `npm run agents:live`,
// before any release that adds or changes an agent.

describe.each(listAgents())('%s', (agent) => {
  test('every MCP server it declares starts and still offers every tool it is allowed', async () => {
    for (const [name, server] of Object.entries(readMcpConfig(agentDir(agent)))) {
      const { client, offered } = await connectMcp(name, server);
      try {
        const names = offered.map((t) => t.name);
        for (const allowed of server.allowedTools ?? []) expect(names, `${name} no longer offers ${allowed}`).toContain(allowed);
      } finally {
        await client.close();
      }
    }
  });

  test('the model is shown exactly its own tools: its files, skills and allowed MCP tools, nothing else', async () => {
    const mcp = await openMcpTools(agentDir(agent));
    try {
      const allowed = Object.values(readMcpConfig(agentDir(agent))).flatMap((s) => s.allowedTools ?? []);
      const fileAndSkillTools = ['list_files', 'read_file', 'search_files', 'load_skill', 'read_skill_file'];
      for (const t of agentRequest({ agent }, [], mcp.tools).tools) expect([...fileAndSkillTools, ...allowed]).toContain(t.name);
    } finally {
      await mcp.close();
    }
  });

  test('answers', async () => {
    let done = false;
    for await (const ev of askAgent({ agent, prompt: 'Introduce yourself in one sentence.' })) {
      if (ev.type === 'done') {
        done = true;
        expect(ev.metadata.cost).toBeGreaterThan(0);
      }
    }
    expect(done).toBe(true);
  });
});
