(() => {
  const modelContext = navigator.modelContext || document.modelContext;
  if (!modelContext?.registerTool) return;

  const state = { draft: null };

  modelContext.registerTool({
    name: "catalog_lookup",
    description: "Look up a synthetic catalog item without changing application state.",
    inputSchema: {
      type: "object",
      properties: {
        sku: { type: "string" },
      },
      required: ["sku"],
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: true,
      untrustedContentHint: false,
    },
    execute: async ({ sku }) => ({
      sku,
      name: "Stagehand Notebook",
      available: true,
    }),
  });

  modelContext.registerTool({
    name: "save_draft",
    description: "Save a synthetic in-memory draft that is discarded with the browser session.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
      },
      required: ["title"],
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: false,
    },
    execute: async ({ title }) => {
      state.draft = { title, saved: true };
      return state.draft;
    },
  });
})();
