import core from "../../tools/lib/aas-v1/mcp/server.js";

const traced = new Set([
  "search_skills",
  "get_skill",
  "compare_skills",
  "compose_stack",
  "inspect_stack",
  "export_selection_evidence",
]);
const tokenSchema = {
  type: "string",
  pattern: "^[a-f0-9]{64}$",
  description:
    "Private short-lived selection handle from the first audited search. Pass on each subsequent selection call.",
};
const compare = {
  name: "compare_skills",
  description:
    "Compare two to six exact IDs in supplied order. Returns descriptive metadata and bundle inventory summaries. The agent judges suitability.",
  annotations: core.TOOL_DEFINITIONS[0].annotations,
  inputSchema: {
    type: "object",
    additionalProperties: false,
    required: ["ids"],
    properties: {
      ids: {
        type: "array",
        minItems: 2,
        maxItems: 6,
        uniqueItems: true,
        items: { type: "string", minLength: 1, maxLength: 256 },
      },
    },
  },
};

export const productTools = [...core.TOOL_DEFINITIONS, compare].map((tool) => {
  if (!traced.has(tool.name)) return tool;
  const properties = {
    ...tool.inputSchema.properties,
    selectionHandle: tokenSchema,
  };
  if (tool.name === "search_skills")
    properties.startSelection = {
      type: "boolean",
      const: true,
      description:
        "Start an audited workflow and return its private handle. Only use on the first search.",
    };
  return { ...tool, inputSchema: { ...tool.inputSchema, properties } };
});

export function withPayload(result, fields) {
  const payload = { ...result.structuredContent, ...fields };
  return {
    ...result,
    structuredContent: payload,
    content: [{ type: "text", text: JSON.stringify(payload) }],
  };
}

export async function productRequest(server, request, catalog, payloads) {
  if (
    request.method === "tools/call" &&
    request.params?.name === "compare_skills" &&
    server.initialized &&
    Object.hasOwn(request, "id")
  ) {
    const args = request.params.arguments;
    const ids = args?.ids;
    if (
      !Array.isArray(ids) ||
      ids.length < 2 ||
      ids.length > 6 ||
      new Set(ids).size !== ids.length ||
      ids.some(
        (id) => typeof id !== "string" || !id.length || id.length > 256,
      ) ||
      Object.keys(args).some((k) => k !== "ids")
    )
      return server.rpcError(
        request.id,
        -32602,
        "Supply two to six distinct skill IDs",
      );
    const rows = [];
    for (const id of ids) {
      const lookup = await server.handle({
        ...request,
        params: { ...request.params, name: "get_skill", arguments: { id } },
      });
      if (!lookup.result || lookup.result.isError) return lookup;
      const { skill } = lookup.result.structuredContent;
      const item = catalog.skills.find((s) => s.id === id);
      rows.push({
        ...skill,
        fileCount: item.untrustedFiles?.length ?? 0,
        catalogPath: item.untrustedContentPath,
        authority: "untrusted",
        source: payloads[id].source,
        limitationsExcerpt: payloads[id].limitations,
      });
    }
    return server.rpcResult(
      request.id,
      withPayload(
        { isError: false },
        { ok: true, catalogDigest: catalog.digest, results: rows },
      ),
    );
  }
  const response = await server.handle(request);
  if (response?.result?.tools) response.result.tools = productTools;
  if (response?.result?.instructions) {
    const original = response.result.instructions;
    response.result.instructions =
      "Remote read-only AAS catalog. Answer focused searches directly. Ask a short question only if the answer changes the selection. Reply in the user's language. On zero matches, translate the capability to English, then broaden the query before reporting a gap. For audited workflows start the first search with startSelection:true and pass its private selectionHandle on each subsequent traced call, including export. Never expose handles in documents. When a handle expires, repeat the actual searches, comparisons, composition and inspection. " +
      original.slice(original.indexOf("Before composing a stack"));
  }
  if (response?.result?.structuredContent?.totalMatches === 0)
    response.result = withPayload(response.result, {
      nextStep:
        "Retry with the capability in English, then a broader term before reporting a catalog gap.",
    });
  if (
    response?.result?.structuredContent?.code ===
    "AAS_EVIDENCE_MANIFEST_SESSION_MISSING"
  )
    response.result = withPayload(response.result, {
      nextStep:
        "Use the same selectionHandle as the first audited search. If unavailable, repeat search, comparison, composition and inspection with a fresh handle.",
    });
  return response;
}
