# Entropy Box API reference

Base URL: `https://xiangshang.ngrok.app`

The public API requires no key. It accepts Chinese and English queries. These examples
target API version 2.0.0 as reviewed on 2026-09-02. Inspect the live OpenAPI document
when behavior changes.

## Search the compiled knowledge base

`POST /api/search`

```bash
curl --fail-with-body --silent --show-error \
  --max-time 60 \
  -X POST "https://xiangshang.ngrok.app/api/search" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mobile manipulation navigation and grasp planning",
    "scope": "all",
    "top_k": 10,
    "mode": "hybrid",
    "rerank": false
  }'
```

Request fields:

| Field | Required | Meaning |
| --- | --- | --- |
| `query` | yes | Natural-language need or technical terms |
| `scope` | no | Search scope; default `all` |
| `top_k` | no | Result count; default 20 |
| `mode` | no | Retrieval mode; default `hybrid` |
| `rerank` | no | Enable reranking; default `false` |

The response contains `query` and a service-defined `results` object. Inspect result
groups before selecting candidates.

Quick response anatomy (verified against /api/search; the live schema wins):

- `results` is grouped into three scopes — `assets` (implementation assets), `caps`
  (capabilities), `topics` (topics) — each hit carries `record`, `matched`
  (vec/lex/graph), and `score`;
- `chains`: capability subgraphs (anchor + hierarchy/dependency edges) from retrieval,
  useful for understanding structural relations between capabilities;
- `dup_folded` / `dup_of` / `dup_group`: dedup-related — the same capability may appear
  as multiple records; dedup by entity when presenting, do not count it twice;
- when `low_confidence` is true, or `record.provenance` is `generated`, or the source
  carries `[verify]`, treat the record as low-confidence: verify against an upstream
  source before citing and label it "verified / to verify";
- `score` / `rerank_score` are ranking scores, not factual confidence.

## Search evidence

`POST /api/evidence/search`

```bash
curl --fail-with-body --silent --show-error \
  --max-time 60 \
  -X POST "https://xiangshang.ngrok.app/api/evidence/search" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "robot obstacle avoidance algorithms",
    "top_k": 5,
    "mode": "hybrid",
    "rerank": true
  }'
```

Request fields:

| Field | Required | Meaning |
| --- | --- | --- |
| `query` | yes | Natural-language question or technical concept |
| `topic` | no | Optional topic constraint |
| `top_k` | no | Result count; default 10 |
| `mode` | no | Retrieval mode; default `hybrid` |
| `rerank` | no | Enable reranking; default `true` |

The response contains `query`, a `results` array, and `latency_ms`. Preserve source and
provenance fields from each result; do not cite a score as evidence.

## Look up an entity

Prefer `POST /api/lookup` for portable clients.

```bash
curl --fail-with-body --silent --show-error \
  --max-time 60 \
  -X POST "https://xiangshang.ngrok.app/api/lookup" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "CAP_8a7a03ae",
    "format": "json"
  }'
```

Request fields:

| Field | Required | Meaning |
| --- | --- | --- |
| `query` | yes | Keyword, Chinese name, `CAP_...`, or `AST_...` |
| `type` | no | `topic`, `cap`, or `asset` |
| `format` | no | `json` or `md`; default `json` |
| `list` | no | Request a candidate list |
| `first` | no | Select the first exact or ranked match |

The response can contain `found`, `query`, `entity_type`, `record`, `markdown`, and
`candidates`. Topic lookups may return summary metadata rather than bulk topic content.

For an exact `CAP_...` or `AST_...` ID, the optional `type` filter can be omitted because
the ID prefix already identifies the entity type. This form is also more portable across
deployments. Use `type` to narrow name or keyword lookups.

Note: Lookup's exact matching is not guaranteed for Chinese natural phrases (e.g.,
"柔性控制", "柔顺控制") and may return `found: false` or an empty candidate list. This
does not mean the concept is absent from the graph — confirm with `/api/search`. Prefer
exact IDs or English/technical aliases for Lookup.

## Generate a candidate workflow

`POST /api/consult`

By default, Consult runs hybrid retrieval (vector + BM25 + one-hop graph expansion +
rerank) and returns the **structured knowledge graph** for the question — `results`
(topics/caps/assets with full records and `graph_via` attribution edges), `task_steps`
(LLM intent decomposition), and `chains` (capability subgraphs discovered during
retrieval). This is fast and fully grounded; no LLM assembly is performed.

Set `integrate: true` to additionally ask the backend to assemble the candidates into a
visualization-ready technical chain via `integrate_planner` (the LLM "post-assembly"
layer). Even then, the graph results are still returned alongside `synthesis`.

```bash
# Default: graph only (fast, grounded)
curl --fail-with-body --silent --show-error \
  --max-time 60 \
  -X POST "https://xiangshang.ngrok.app/api/consult" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Design a simulation-first obstacle-avoidance workflow for a differential-drive ROS 2 robot using a 2D lidar, with 50 ms control latency and no cloud dependency.",
    "top_k": 30,
    "rerank": true
  }'

# With LLM assembly (slower; allow >= 180 s)
curl --fail-with-body --silent --show-error \
  --max-time 200 \
  -X POST "https://xiangshang.ngrok.app/api/consult" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Design a simulation-first obstacle-avoidance workflow for a differential-drive ROS 2 robot using a 2D lidar, with 50 ms control latency and no cloud dependency.",
    "top_k": 30,
    "rerank": true,
    "integrate": true
  }'
```

Request fields:

| Field | Required | Meaning |
| --- | --- | --- |
| `question` | yes | Complete robotics engineering question and constraints |
| `top_k` | no | Candidate count from 10 to 100; default 30 |
| `rerank` | no | Enable reranking; default `true` |
| `prev_context` | no | Prior conclusion for a continuing design discussion |
| `brief` | no | Return only a short chain skeleton; default `false` |
| `integrate` | no | Enable LLM technical-chain assembly; default `false` (graph only). When `true`, `synthesis` is populated; the graph (`results`/`task_steps`/`chains`) is still returned |

The response always contains `question`, `pool`, `results`, `task_steps`, `chains`, and
`latency_ms`. When `integrate` is `false` (default), `synthesis` is `null` and the graph
is the full answer. When `integrate` is `true`, `synthesis` is added (a normal run can
take 30-180 seconds). The generated workflow is a candidate and must be validated against
evidence, interfaces, and user constraints.

`synthesis` (only present when `integrate=true`) is a visualization-ready chain structure
(assembled by the backend integrate_planner):

- `mode`: `chains` (task-chain solution) or `nodes_only` (capability/asset inventory and gaps);
- `chains`: list of task chains; each step carries `caps` (real capability ID nodes) and may branch or merge; directly renderable as a task-chain graph;
- `proposed_capabilities`: capabilities proposed by the LLM that are not yet defined in the registry (`NEW_CAP_*`);
- `gap_annotations` / `summary` / `completeness`: ownership/gap statistics and completeness;
- `explanation` / `warnings`: rationale and alerts (e.g., "LLM assembly failed, fell back", "all capability references were hallucinations").

With `brief=true`, `synthesis` keeps only `mode` and each chain's `name`/`n_steps`
skeleton.

## Operational checks

- Use `Content-Type: application/json`.
- Set explicit timeouts; allow at least 180 seconds when `integrate=true`. Graph-only consult (default) is much faster.
- Log request parameters and returned IDs, but do not log unrelated credentials or
  private project data.
- Avoid automatic repeated consult calls.
- Recheck the live schema and official integration page after an API-version change.
