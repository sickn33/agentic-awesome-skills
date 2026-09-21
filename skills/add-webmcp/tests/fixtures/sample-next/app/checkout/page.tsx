"use client";

export default function CheckoutPage() {
  localStorage.setItem("catalog-draft", "");
  localForage.setItem("catalog-history", []);
  const searchCatalog = async (query: string) => fetch(`/api/catalog?q=${query}`);
  navigator.modelContext?.registerTool({
    name: "catalog_lookup",
    description: "Look up a catalog item.",
    inputSchema: { type: "object", properties: {} },
    execute: async ({ query }) => ({ found: Boolean(await searchCatalog(query)) }),
  });

  return <form onSubmit={() => undefined}><button type="submit">Check</button></form>;
}
