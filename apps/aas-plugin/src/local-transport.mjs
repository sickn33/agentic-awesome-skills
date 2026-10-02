import stdio from '../../../tools/lib/aas-v1/mcp/stdio.js';
// Reuse Core's bounded, strictly parsed, serialized framing rather than a second parser.
export function createLocalTransport(input = process.stdin, output = process.stdout) {
  let waiting;
  let runner;
  const transport = {
    async start() {
      runner = stdio.runStdio({ handle(request) {
        return new Promise((resolve) => {
          const notification = !Object.hasOwn(request, 'id');
          if (!notification) waiting = { id: request.id, resolve };
          transport.onmessage?.(request);
          if (notification) queueMicrotask(() => resolve(null));
        });
      } }, { input, output });
      input.once('end', () => { runner.completed().then(() => transport.onclose?.()); });
    },
    async send(message) {
      if (waiting && Object.hasOwn(message, 'id') && message.id === waiting.id) {
        const current = waiting; waiting = undefined; current.resolve(message);
      } else stdio.writeJsonLine(output, message);
    },
    async close() { input.pause(); transport.onclose?.(); },
  };
  return transport;
}
