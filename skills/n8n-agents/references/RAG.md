# RAG (retrieval augmented generation)

RAG in n8n is built on the LangChain primitives — document loaders, text splitters, embeddings, vector stores, retrievers, rerankers. They wire onto agents and chains the same way models and memory do (via `ai_*` connections).

This reference is intentionally **thin**. The pieces work, but opinionated end-to-end recipes ("which vector store, which chunking, when to rerank") depend heavily on data shape and scale. Verify defaults against current n8n docs and your team's choices.

---

## Before you go vector: rule out cheaper lookups

Not every retrieval problem needs a vector store. Three cheaper alternatives to eliminate first:

- **Database or Data Table for exact lookups.** "Look up customer X's record", "fetch issue #1234", "get rows where status = 'open'" are NOT RAG problems — use a query directly. → **n8n-node-configuration** for DB nodes.
- **Live search for freshness.** Information not in anything you've indexed (current news, live API state, anything time-sensitive) wants a search tool (Tavily, etc.), not RAG.
- **Grep/file-browse tools for small or structured doc sets.** When the documents are few enough to list (a repo, a docs site, a few hundred markdown files), give the agent list/fetch/search tools and let it navigate. As an example, an agent browsing a GitHub repo can use `githubTool` (list files) plus an HTTP Request Tool against the repo contents endpoint to fetch raw text — no ingest, no embeddings, full source paths in citations.

Reach for vector RAG when there are too many documents to list, queries are semantic rather than navigational, and you need similarity-based retrieval at low latency.

---

## Quickest start: in-memory vector store

The fastest path to a working RAG flow uses `@n8n/n8n-nodes-langchain.vectorStoreInMemory` — no external service, no provisioning, no extra credential beyond whichever embedding / chat-model provider you already use. Data is lost on workflow restart, so it's right for prototypes, learning, and tests, not production.

- **Ingest**: any trigger producing documents → Default Data Loader → Vector Store In-Memory (`mode: 'insert'`) with an Embeddings node wired into `ai_embedding`. A Form Trigger with a file-upload field is a quick way to drop in PDFs/CSVs without scripting.
- **Query**: Chat Trigger → Agent → Vector Store In-Memory (`mode: 'retrieve-as-tool'`), same `memoryKey` and the same embedding model as ingest.

When the data must survive restarts or scale beyond one instance, swap the in-memory node for a persistent store — the rest of the wiring stays the same.

---

## Vector RAG: the pieces

n8n exposes the LangChain primitives as sub-nodes:

- **Document loaders** (`documentDefaultDataLoader`) — pull from sources, optionally with metadata. Wires into a vector store's `ai_document`.
- **Text splitters** (`textSplitter*`) — chunk into retrievable pieces. The default loader can do this inline for simple cases.
- **Embeddings** (`embeddingsOpenAi`, `embeddingsCohere`, …) — turn chunks into vectors. Wires into `ai_embedding` on **both** ingest and query.
- **Vector stores** — `vectorStoreInMemory`, `vectorStoreQdrant`, `vectorStoreSupabase` (Postgres pgvector), `vectorStorePinecone`. Each has modes: `insert` (ingest), `retrieve-as-tool` (the agent's `ai_tool` slot), and others for direct querying.

The Default Data Loader's `metadata` field is **load-bearing**: anything you want to filter or display alongside results (source URL, document type, tenant ID) goes there. Without it, results are just chunks with no provenance.

---

## Vector RAG: two workflows

### Ingest

```
[Trigger]
  →  [Vector Store, mode: 'insert']
        ai_document   <- [Default Data Loader (with metadata)]
        ai_embedding  <- [Embeddings]
```

**Ingest does not have to be a tool.** Most often it's a separate scheduled workflow pre-populating the store on a cadence (e.g. nightly), or a webhook-triggered workflow. Wire it as an agent tool only when the documents change dynamically based on conversation (the agent learns something it should remember). For static or system-managed sets, a standalone workflow is simpler.

### Query

```
[Chat / webhook trigger]
  →  [Agent]
        ai_tool          <- [Vector Store, mode: 'retrieve-as-tool']
                               ai_embedding <- [Embeddings (SAME model as ingest)]
        ai_languageModel <- [Chat Model]
        ai_memory        <- [Memory]
```

Wired as `ai_tool`, the vector store becomes a tool the agent calls when it judges retrieval relevant. Wire retrieval directly into the main flow (pre-agent) only when **every** turn requires retrieval — rare in practice.

**The embedding model must match.** Whatever embedded the documents on ingest must embed the query. Mismatched models produce garbage retrieval. Change models → re-ingest.

---

## Open decisions (verify per context)

### Vector store selection

- **In-memory** — zero ops, lost on restart. Prototypes and tests.
- **Qdrant** — open-source, self-hostable, fast, mature in n8n.
- **Postgres pgvector / Supabase** — ideal if you already run Postgres; SQL-side metadata filters and relational joins compose nicely.
- **Pinecone** — fully managed, per-request pricing.

### Embedding model

OpenAI `text-embedding-3-large`, Cohere `embed-v3`, and open-source models are common. Cost, dimension count, and quality differ — choose carefully upfront to avoid re-embedding.

### Retrieval-as-tool vs retrieval-before-agent

- **Retrieve-as-tool**: the agent decides when retrieval is relevant AND phrases the query itself (reformulate, decompose, expand vague wording). One extra round trip per retrieval, but fewer wasted retrievals and a better hit rate.
- **Retrieve-before-agent**: simpler and predictable, but pays the cost every turn AND uses the user's raw input as the query, so vague phrasing ("remind me how that thing works again?") goes straight into the search.

Tool-based composes better in multi-capability agents (retrieval is one tool among several). Always-retrieve is fine for narrow Q&A bots where every question is a knowledge-base question.

---

## Cross-references

- Agent fundamentals → parent **SKILL.md**
- Wiring sub-workflows (and agentic retrieval tools) → **SUBWORKFLOW_AS_TOOL.md**
- Tool naming/descriptions on retrieval tools → **TOOLS.md**
- Data Tables as an alternative to a vector store for small structured data → **n8n-node-configuration**
