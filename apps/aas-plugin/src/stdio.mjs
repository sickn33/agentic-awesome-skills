import path from 'node:path';
import { readFileSync } from 'node:fs';
import { createLocalTransport } from './local-transport.mjs';
import { createProtocolSession } from './server.mjs';
async function main() {
if (!process.argv[2]) throw new Error('Provide the local plugin root directory');
const root = path.resolve(process.argv[2]);
const html = readFileSync(path.join(root, 'ui/workbench.html'), 'utf8');
const entry = createProtocolSession({ root, html });
await entry.server.connect(createLocalTransport());
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { entry.server.close().then(() => process.exit(0)); });
}
main().catch(() => { process.stderr.write('AAS local MCP startup failed; verify the plugin files and Node.js version.\n'); process.exitCode = 1; });
