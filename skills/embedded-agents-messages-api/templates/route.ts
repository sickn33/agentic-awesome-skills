import { z } from 'zod';
import { askAgent, listAgents } from '@/lib/agent';

// GET lists the agents (their directory names); POST streams one agent's answer as
// server-sent events. The agent is chosen per request: nothing here names one.

// The file tools read the disk and a stdio MCP server is a child process: never the edge runtime.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  agent: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  prompt: z.string().trim().min(1).max(4000),
  history: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(8000) })).max(20).default([]),
});

export function GET() {
  return Response.json({ agents: listAgents() });
}

export async function POST(req: Request) {
  // A mutation from another origin is refused: a cross-site form or script must not spend the caller's budget.
  const origin = req.headers.get('origin');
  if (origin && new URL(origin).host !== req.headers.get('host')) return new Response('Forbidden', { status: 403 });
  // Every call spends money. Before anyone but the developer can reach
  // this route, resolve the caller here and apply a per-actor limit and a maxBudgetUsd.
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !listAgents().includes(parsed.data.agent)) {
    return Response.json({ error: 'invalid request' }, { status: 400 });
  }
  const { agent, prompt, history } = parsed.data;

  const enc = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (data: unknown) => controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`));
      try {
        for await (const ev of askAgent({ agent, prompt, history })) {
          if (ev.type === 'text') send({ text: ev.text });
          if (ev.type === 'done') send({ done: true, agent, metadata: ev.metadata });
          if (ev.type === 'error') send({ error: ev.subtype, agent });
        }
      } catch (err) {
        // Log ids, never bodies: the prompt is the caller's text and stays out of the log.
        console.error('agent run failed', { agent, message: err instanceof Error ? err.message : String(err) });
        send({ error: 'failed', agent });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform' },
  });
}
