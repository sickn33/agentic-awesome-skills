import path from 'node:path';
import { readFileSync } from 'node:fs';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema, ListResourcesRequestSchema, ReadResourceRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import coreMcp from '../../../tools/lib/aas-v1/mcp/index.js';
const { McpServer, TOOL_DEFINITIONS, AGENT_SELECTION_CONTRACT } = coreMcp;
export const UI_URI = 'ui://aas/workbench-v1.html';
const OPEN_WORKBENCH = {
  name: 'open_workbench', title: 'Review an AAS stack',
  description: 'Open the local AAS Workbench to review the current stack and optional evidence. Imports stay on the user computer; no network, installation or project scan.',
  inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  _meta: { ui: { resourceUri: UI_URI } },
};

export function createProtocolSession({ root = process.cwd(), catalog, html }) {
  const version = JSON.parse(readFileSync(`${root}/package.json`, 'utf8')).version;
  catalog ??= new McpServer({ root }).catalog;
  const core = new McpServer({ root, catalog });
  const entry = { core, artifacts: {} };
  const server = new Server({ name: 'agentic-awesome-skills', version }, {
    capabilities: { tools: {}, resources: {} },
    instructions: `Read-only AAS catalog. ${AGENT_SELECTION_CONTRACT} Project inspection and filesystem operations belong to the client. Workbench imports remain in browser memory. Session state stays in this local process and ends when the client closes it.`,
  });
  entry.server = server;
  server.oninitialized = () => { core.clientInfo = server.getClientVersion() ?? core.clientInfo ?? null; };
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [
    ...TOOL_DEFINITIONS.map((tool) => ({ ...tool, description: tool.description,
      ...(['compose_stack', 'export_selection_evidence'].includes(tool.name) ? { _meta: { ui: { resourceUri: UI_URI } } } : {}),
    })), OPEN_WORKBENCH,
  ] }));
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === 'open_workbench') {
      if (Object.keys(request.params.arguments ?? {}).length) return { isError: true, content: [{ type: 'text', text: 'open_workbench accepts no artifact uploads. Import files in the browser.' }] };
      return { content: [{ type: 'text', text: 'Review the session stack in Workbench, or explicitly import local artifacts. Browser checks do not certify skill suitability. Hosts without UI can inspect the returned manifest and open the bundled Workbench HTML locally.' }],
        structuredContent: { ok: true, localWorkbenchPath: path.resolve(root, '../ui/workbench.html'), localCliPath: path.resolve(root, '../runtime/aas-core.cjs'), catalog: { package: catalog.package, version: catalog.version, integrity: catalog.digest }, ...entry.artifacts },
      };
    }
    // Core owns argument validation and all tool semantics. The stdio adapter does not choose skills.
    const response = await core.callTool({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: request.params });
    if (response.error) return { isError: true, content: [{ type: 'text', text: response.error.message }] };
    const result = response.result;
    if (!result.isError && result.structuredContent?.manifest) {
      entry.artifacts = { manifest: result.structuredContent.manifest };
    }
    if (!result.isError && result.structuredContent?.evidence) entry.artifacts.evidence = result.structuredContent.evidence;
    return result;
  });
  server.setRequestHandler(ListResourcesRequestSchema, async () => ({ resources: [{ uri: UI_URI, name: 'AAS Workbench', mimeType: 'text/html;profile=mcp-app' }] }));
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    if (request.params.uri !== UI_URI) throw new Error('Unknown UI resource');
    return { contents: [{ uri: UI_URI, mimeType: 'text/html;profile=mcp-app', text: html,
      _meta: { ui: { prefersBorder: true, csp: { connectDomains: [], resourceDomains: [] } } },
    }] };
  });
  return entry;
}
