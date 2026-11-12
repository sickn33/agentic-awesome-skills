# Agent Memory Systems - Detailed Guide

> This file contains the detailed procedure and reference material extracted from `SKILL.md` for focused loading. The root skill defines activation, examples, safety constraints, and limitations.

## Execution and example status

Only fenced pure helpers explicitly described as complete are runnable without project dependencies. Historical SDK sketches below are pseudocode: verify package/version signatures, configure indexes and bind every read/write to authenticated tenant/user identity before adapting them. Undefined helpers, decorators and external providers are not bundled. Never execute a sketch or claim a tested integration merely because it names an SDK.

## Principles

- Memory quality = retrieval quality, not storage quantity
- Chunk for retrieval, not for storage
- Context isolation is the enemy of memory
- Right memory type for right information
- Decay old memories - not everything should be forever
- Test retrieval accuracy before production
- Background memory formation beats real-time


## Capabilities

- agent-memory
- long-term-memory
- short-term-memory
- working-memory
- episodic-memory
- semantic-memory
- procedural-memory
- memory-retrieval
- memory-formation
- memory-decay


## Scope

- vector-database-operations → data-engineer
- rag-pipeline-architecture → llm-architect
- embedding-model-selection → ml-engineer
- knowledge-graph-design → knowledge-engineer


## Tooling

### Memory_frameworks

- LangMem (LangChain) - When: LangGraph agents with persistent memory Note: Semantic, episodic, procedural memory types
- MemGPT / Letta - When: Virtual context management, OS-style memory Note: Hierarchical memory tiers, automatic paging
- Mem0 - When: User memory layer for personalization Note: Designed for user preferences and history

### Vector_stores

- Pinecone - When: Managed, enterprise-scale (billions of vectors) Note: Verify workload performance and actual cost
- Qdrant - When: Complex metadata filtering, open-source Note: Rust-based, excellent filtering
- Weaviate - When: Hybrid search, knowledge graph features Note: GraphQL interface, good for relationships
- ChromaDB - When: Prototyping, small/medium apps Note: Measure persistence, latency and isolation in the target deployment
- pgvector - When: Already using PostgreSQL, simpler setup Note: Good for <1M vectors, familiar tooling

### Embedding_models

- OpenAI text-embedding-3-large - When: Best quality, 3072 dimensions Note: Verify current provider pricing and data terms
- OpenAI text-embedding-3-small - When: Good balance, 1536 dimensions Note: Verify current provider pricing and data terms
- nomic-embed-text-v1.5 - When: Open-source, local deployment Note: 768 dimensions, good quality
- all-MiniLM-L6-v2 - When: Lightweight, fast local embedding Note: 384 dimensions, lowest latency


## Patterns

### Memory Type Architecture

Choosing the right memory type for different information

**When to use**: Designing agent memory system

# MEMORY TYPE ARCHITECTURE (CoALA Framework):

"""
Three memory types for different purposes:

1. Semantic Memory: Facts and knowledge
   - What you know about the world
   - User preferences, domain knowledge
   - Stored in profiles (structured) or collections (unstructured)

2. Episodic Memory: Experiences and events
   - What happened (timestamped events)
   - Past conversations, task outcomes
   - Used for learning from experience

3. Procedural Memory: How to do things
   - Rules, skills, workflows
   - Often implemented as few-shot examples
   - "How did I solve this before?"
"""


## Tenant-scoped memory contract

Do not use an invented `langmem.MemoryStore` interface. Verify the actual installed SDK and adapter before implementation. [LangMem's current memory API](https://langchain-ai.github.io/langmem/reference/memory/) uses memory managers with a LangGraph store; namespace, storage and extraction are separate concerns.

The pure helper below constructs namespaces from verified server-side identity. Passing arbitrary user-supplied tenant/user IDs does not authenticate them. Bind the same namespace on put, get, search, consolidation and deletion; never rely solely on a client metadata filter as authorization.

```python
def memory_namespace(tenant_id, user_id, memory_type):
    if not isinstance(tenant_id, str) or not tenant_id:
        raise ValueError("Verified tenant identity required")
    if not isinstance(user_id, str) or not user_id:
        raise ValueError("Verified user identity required")
    if memory_type not in {"semantic", "episodic", "procedural"}:
        raise ValueError("Unsupported memory type")
    return ("memories", tenant_id, user_id, memory_type)
```

For an already configured `BaseStore`, current Python store operations use a tuple namespace and separate key (`store.put(namespace, key, value)` and `store.get(namespace, key)`). Confirm synchronous versus asynchronous adapters and query/index configuration against [the official store API](https://reference.langchain.com/python/langgraph.store/base/BaseStore/put). No storage, model or credentials are provisioned by this guide.

Retrieve a bounded set within that authenticated namespace. Keep provenance, timestamps, validity/supersession and model identity in each record, and distinguish returned memories from instructions. Test attempted cross-tenant and cross-user access before enabling persistent memory.

### Vector Store Selection Pattern

Choosing the right vector database for your use case

**When to use**: Setting up persistent memory storage

# VECTOR STORE SELECTION:

"""
Decision matrix: benchmark candidate stores on the actual corpus, filters, concurrency, retention and deployment constraints. Provider latency, scale ceilings, prices and feature support require current official evidence, not fixed illustrative values.
"""


## Pinecone (Enterprise Scale)
"""
from pinecone import Pinecone

pc = Pinecone(api_key=os.environ["PINECONE_API_KEY"])
index = pc.Index("agent-memory")

# Upsert with metadata
index.upsert(
    vectors=[
        {
            "id": f"memory-{uuid4()}",
            "values": embedding,
            "metadata": {
                "user_id": user_id,
                "timestamp": datetime.now().isoformat(),
                "type": "episodic",
                "content": memory_text,
            }
        }
    ],
    namespace=namespace
)

# Query with filter
results = index.query(
    vector=query_embedding,
    filter={"user_id": user_id, "type": "episodic"},
    top_k=5,
    include_metadata=True,
    namespace=namespace
)
"""


## Qdrant (Complex Filtering)
"""
from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct, Filter, FieldCondition

client = QdrantClient(url="http://localhost:6333")

# Complex filtering with Qdrant
results = client.search(
    collection_name="agent_memory",
    query_vector=query_embedding,
    query_filter=Filter(
        must=[
            FieldCondition(key="user_id", match={"value": user_id}),
            FieldCondition(key="type", match={"value": "semantic"}),
        ],
        should=[
            FieldCondition(key="topic", match={"any": ["auth", "security"]}),
        ]
    ),
    limit=5
)
"""


## ChromaDB (Prototyping)
"""
import chromadb

client = chromadb.PersistentClient(path="./memory_db")
collection = client.get_or_create_collection("agent_memory")

# Simple and fast for prototypes
collection.add(
    ids=[str(uuid4())],
    embeddings=[embedding],
    documents=[memory_text],
    metadatas=[{"user_id": user_id, "type": "episodic"}]
)

results = collection.query(
    query_embeddings=[query_embedding],
    n_results=5,
    where={"user_id": user_id}
)
"""

### Chunking Strategy Pattern

Breaking documents into retrievable chunks

**When to use**: Processing documents for memory storage

# CHUNKING STRATEGIES:

"""
The chunking dilemma:
- Too large: Vector loses specificity
- Too small: Loses context

Optimal chunk size depends on:
- Document type (code vs prose vs data)
- Query patterns (factual vs exploratory)
- Embedding model (each has sweet spot)

General guidance: 256-512 tokens for most use cases
"""


## Fixed-Size Chunking (Baseline)
"""
from langchain.text_splitter import RecursiveCharacterTextSplitter

splitter = RecursiveCharacterTextSplitter(
    chunk_size=500,      # Characters
    chunk_overlap=50,    # Overlap prevents cutting sentences
    separators=["\n\n", "\n", ". ", " ", ""]  # Priority order
)

chunks = splitter.split_text(document)
"""


## Semantic Chunking (Candidate to Benchmark)
"""
from langchain_experimental.text_splitter import SemanticChunker
from langchain_openai import OpenAIEmbeddings

# Splits based on semantic similarity
splitter = SemanticChunker(
    embeddings=OpenAIEmbeddings(),
    breakpoint_threshold_type="percentile",
    breakpoint_threshold_amount=95
)

chunks = splitter.split_text(document)
"""


## Structure-Aware Chunking (Documents with Hierarchy)
"""
from langchain.text_splitter import MarkdownHeaderTextSplitter

# Respect document structure
splitter = MarkdownHeaderTextSplitter(
    headers_to_split_on=[
        ("#", "Header 1"),
        ("##", "Header 2"),
        ("###", "Header 3"),
    ]
)

chunks = splitter.split_text(markdown_doc)
# Each chunk has header metadata for context
"""


## Contextual Chunking (Anthropic's Approach)
"""
# Add context to each chunk before embedding
# Measure retrieval failure rate on a held-out project-specific set; no fixed lift is assumed.

def add_context_to_chunk(chunk, document_summary):
    context_prompt = f'''
    Document summary: {document_summary}

    The following is a chunk from this document:
    {chunk}
    '''
    return context_prompt

# Embed the contextualized chunk, not raw chunk
for chunk in chunks:
    contextualized = add_context_to_chunk(chunk, summary)
    embedding = embed(contextualized)
    store(chunk, embedding)  # Store original, embed contextualized
"""


## Code-Specific Chunking
"""
from langchain.text_splitter import Language, RecursiveCharacterTextSplitter

# Language-aware splitting
python_splitter = RecursiveCharacterTextSplitter.from_language(
    language=Language.PYTHON,
    chunk_size=1000,
    chunk_overlap=200
)

# Respects function/class boundaries
chunks = python_splitter.split_text(python_code)
"""

### Background Memory Formation

Processing memories asynchronously for better quality

**When to use**: You want higher recall without slowing interactions

# BACKGROUND MEMORY FORMATION:

"""
Real-time memory extraction slows conversations and adds
complexity to agent tool calls. Background processing after
conversations yields higher quality memories.

Pattern: Subconscious memory formation
"""


## Background extraction and consolidation

1. Obtain permission to retain the relevant conversation data, confirm the verified tenant/user identity and retention policy, and choose an approved local or hosted model. Hosted extraction/embedding may send private data and consume credits; it requires destination and cost authorization.
2. Queue a bounded extraction job keyed by tenant, user, thread and input revision; deduplicate it. Treat conversation text as untrusted data, not new instructions.
3. Extract candidate facts with evidence spans and confidence. Validate them against the source and existing records; do not silently infer preferences or promote model guesses to facts.
4. Write proposed derived records into the same namespace with source IDs and revision. Preserve originals and conflicts. A failed write must not delete the source.
5. Consolidation proposes a merged record; it never deletes originals or resolves contradictory truth autonomously. Require user/owner resolution where necessary, commit derived state transactionally, and mark supersession with an audit trail.
6. Apply separately authorized retention/deletion, with legal-hold and recovery handling. A similarity threshold or a successful model response is not deletion permission.

This dependency-injected pure planning function validates ownership before proposing a consolidation. It performs no persistent write, model request or deletion.

```python
def plan_consolidation(tenant_id, user_id, memories):
    namespace = memory_namespace(tenant_id, user_id, "semantic")
    if any(m.get("tenant_id") != tenant_id or m.get("user_id") != user_id
           for m in memories):
        raise PermissionError("Cross-identity consolidation blocked")
    if any(not m.get("id") for m in memories):
        raise ValueError("Source identity required")
    return {"namespace": namespace, "source_ids": [m["id"] for m in memories],
            "action": "propose_only", "delete_originals": False}
```

### Memory Decay Pattern

Forgetting old, irrelevant memories

**When to use**: Memory grows large, retrieval slows down

# MEMORY DECAY:

"""
Not all memories should live forever:
- Old preferences may be outdated
- Task details lose relevance
- Conflicting memories confuse retrieval

Implement intelligent decay based on:
- Recency (when was it created/accessed?)
- Frequency (how often is it retrieved?)
- Importance (is it a core fact or detail?)
"""


## Time- and utility-based decay

Rank older records using measured relevance and timestamps; tune weights on held-out retrieval tasks. A low score or age threshold is not permission to mutate all users' data. Propose archival only inside the verified namespace, preserve provenance and conflicts, honor legal holds, and execute approved retention through a real transactional adapter. No global `list_all` pruning job is provided.

## Sharp Edges

### Chunking Isolates Information From Its Context

Severity: CRITICAL

Situation: Processing documents for vector storage

Symptoms:
Retrieval finds chunks but they don't make sense alone. Agent
answers miss the big picture. "The function returns X" retrieved
without knowing which function. References to "this" without
knowing what "this" refers to.

Why this breaks:
When we chunk for AI processing, we're breaking connections,
reducing a holistic narrative to isolated fragments that often
miss the big picture. A chunk about "the configuration" without
context about what system is being configured is nearly useless.

Recommended fix:

### Contextual Chunking (Anthropic's approach)
# Add document context to each chunk before embedding
# Measure retrieval failure rate on a held-out project-specific set; no fixed lift is assumed.

def contextualize_chunk(chunk, document):
    summary = summarize(document)

    # LLM generates context for chunk
    context = llm.invoke(f'''
        Document summary: {summary}

        Generate a brief context statement for this chunk
        that would help someone understand what it refers to:

        {chunk}
    ''')

    return f"{context}\n\n{chunk}"

# Embed the contextualized version
for chunk in chunks:
    contextualized = contextualize_chunk(chunk, full_doc)
    embedding = embed(contextualized)
    # Store original chunk, embed contextualized
    store(original=chunk, embedding=embedding)


## Hierarchical Chunking
# Store at multiple granularities
chunks_small = split(doc, size=256)
chunks_medium = split(doc, size=512)
chunks_large = split(doc, size=1024)

# Retrieve at appropriate level based on query

### Chunk Size Mismatched to Query Patterns

Severity: HIGH

Situation: Configuring chunking for memory storage

Symptoms:
High-quality documents produce low-quality retrievals. Simple
questions miss relevant information. Complex questions get
fragments instead of complete answers.

Why this breaks:
Optimal chunk size depends on query patterns:
- Factual queries need small, specific chunks
- Conceptual queries need larger context
- Code needs function-level boundaries

The sweet spot varies by document type and embedding model.
Default 1000 characters works for nothing specific.

Recommended fix:


## Test different sizes
from sklearn.metrics import recall_score

def evaluate_chunk_size(documents, test_queries, chunk_size):
    chunks = split_documents(documents, size=chunk_size)
    index = build_index(chunks)

    correct_retrievals = 0
    for query, expected_chunk in test_queries:
        results = index.search(query, k=5)
        if expected_chunk in results:
            correct_retrievals += 1

    return correct_retrievals / len(test_queries)

# Test multiple sizes
for size in [256, 512, 768, 1024]:
    recall = evaluate_chunk_size(docs, test_queries, size)
    print(f"Size {size}: Recall@5 = {recall:.2%}")


## Size recommendations by content type
CHUNK_SIZES = {
    "documentation": 512,   # Complete concepts
    "code": 1000,          # Function-level
    "conversation": 256,   # Turn-level
    "articles": 768,       # Paragraph-level
}


## Use overlap to prevent boundary issues
splitter = RecursiveCharacterTextSplitter(
    chunk_size=512,
    chunk_overlap=50,  # 10% overlap
)

### Semantic Search Returns Irrelevant Results

Severity: HIGH

Situation: Querying memory for context

Symptoms:
Agent retrieves memories that seem related but aren't useful.
"Tell me about the user's preferences" returns conversation
about preferences in general, not this user's. High similarity
scores for wrong content.

Why this breaks:
Semantic similarity isn't the same as relevance. "The user
likes Python" and "Python is a programming language" are
semantically similar but very different types of information.
Without metadata filtering, retrieval is just word matching.

Recommended fix:


## Always filter by metadata first
# Don't rely on semantic similarity alone

# Bad: Only semantic search
results = index.query(
    vector=query_embedding,
    top_k=5
)

# Good: Filter then search
results = index.query(
    vector=query_embedding,
    filter={
        "user_id": current_user.id,
        "type": "preference",
        "created_after": cutoff_date,
    },
    top_k=5
)


## Use hybrid search (semantic + keyword)
from qdrant_client import QdrantClient

client = QdrantClient(...)

# Hybrid search with fusion
results = client.search(
    collection_name="memories",
    query_vector=semantic_embedding,
    query_text=query,  # Also keyword match
    fusion={"method": "rrf"},  # Reciprocal Rank Fusion
)


## Rerank results with cross-encoder
from sentence_transformers import CrossEncoder

reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")

# Initial retrieval (recall-oriented)
candidates = index.query(query_embedding, top_k=20)

# Rerank (precision-oriented)
pairs = [(query, c.text) for c in candidates]
scores = reranker.predict(pairs)
reranked = sorted(zip(candidates, scores), key=lambda x: x[1], reverse=True)

### Old Memories Override Current Information

Severity: HIGH

Situation: User preferences or facts change over time

Symptoms:
Agent uses outdated preferences. "User prefers dark mode" from
6 months ago overrides recent "switch to light mode" request.
Agent confidently uses stale data.

Why this breaks:
Vector stores don't have temporal awareness by default. A memory
from a year ago has the same retrieval weight as one from today.
Recent information should generally override old information
for preferences and mutable facts.

Recommended fix:


## Add temporal scoring
from datetime import datetime, timedelta

def time_decay_score(memory, half_life_days=30):
    age = (datetime.now() - memory.created_at).days
    decay = 0.5 ** (age / half_life_days)
    return decay

def retrieve_with_recency(query, user_id):
    # Get candidates
    candidates = index.query(
        vector=embed(query),
        filter={"user_id": user_id},
        top_k=20
    )

    # Apply time decay
    for candidate in candidates:
        time_score = time_decay_score(candidate)
        candidate.final_score = candidate.similarity * 0.7 + time_score * 0.3

    # Re-sort by final score
    return sorted(candidates, key=lambda x: x.final_score, reverse=True)[:5]


## Update instead of append for preferences
async def update_preference(user_id, category, value):
    # Pseudocode: verify tenant/user identity and atomically version the preference.
    # Preserve the original; failed writes must not remove it.
    # Store the proposed new preference
    await memory.upsert(
        id=f"pref-{user_id}-{category}",
        content={"category": category, "value": value},
        metadata={"updated_at": datetime.now()}
    )


## Explicit versioning for facts
await memory.upsert(
    id=f"fact-{fact_id}-v{version}",
    content=new_fact,
    metadata={
        "version": version,
        "supersedes": previous_id,
        "valid_from": datetime.now()
    }
)

### Contradictory Memories Retrieved Together

Severity: MEDIUM

Situation: User has changed preferences or provided conflicting info

Symptoms:
Agent retrieves "user prefers dark mode" and "user prefers light
mode" in same context. Gives inconsistent answers. Seems confused
or forgetful to user.

Why this breaks:
Without conflict resolution, both old and new information coexist.
Semantic search might return both because they're both about the
same topic (preferences). Agent has no way to know which is current.

Recommended fix:


## Detect conflicts on storage
Review candidate conflicts within the authenticated namespace. Write the proposed new version successfully before recording supersession, in one transaction where supported. Preserve both originals when verification or the write fails. Resolve contradictory facts through source evidence and the owner; an LLM similarity or YES/NO result is advisory.

## Conflict detection heuristic
def is_contradictory(new_content, old_content):
    # Use LLM to detect contradiction
    result = llm.invoke(f'''
        Do these two statements contradict each other?

        Statement 1: {old_content}
        Statement 2: {new_content}

        Respond with just YES or NO.
    ''')
    return result.strip().upper() == "YES"


## Periodic consolidation
async def consolidate_memories(user_id):
    all_memories = await index.list(filter={"user_id": user_id})
    clusters = cluster_by_topic(all_memories)

    for cluster in clusters:
        if has_conflicts(cluster):
            resolved = await llm.invoke(f'''
                These memories may conflict. Create one consolidated
                memory that represents the current truth:
                {cluster}
            ''')
            await propose_cluster_revision(cluster, resolved)  # No destructive replacement

### Retrieved Memories Exceed Context Window

Severity: MEDIUM

Situation: Retrieving too many memories at once

Symptoms:
Token limit errors. Agent truncates important information.
System prompt gets cut off. Retrieved memories compete with
user query for space.

Why this breaks:
Retrieval typically returns top-k results. If k is too high or
chunks are too large, retrieved context overwhelms the window.
Critical information (system prompt, recent messages) gets pushed
out.

Recommended fix:


## Budget tokens for different memory types
TOKEN_BUDGET = {
    "system_prompt": 500,
    "user_profile": 200,
    "recent_messages": 2000,
    "retrieved_memories": 1000,
    "current_query": 500,
    "buffer": 300,  # Safety margin
}

def budget_aware_retrieval(query, context_limit=4000):
    remaining = (context_limit - TOKEN_BUDGET["system_prompt"]
                 - TOKEN_BUDGET["current_query"] - TOKEN_BUDGET["buffer"])

    # Prioritize recent messages
    recent = get_recent_messages(limit=TOKEN_BUDGET["recent_messages"])
    remaining -= count_tokens(recent)

    # Then user profile
    profile = get_user_profile(limit=TOKEN_BUDGET["user_profile"])
    remaining -= count_tokens(profile)

    # Finally retrieved memories with remaining budget
    memories = retrieve_memories(query, max_tokens=max(0, remaining))

    return build_context(profile, recent, memories)


## Dynamic k based on chunk size
def retrieve_with_budget(query, max_tokens=1000):
    avg_chunk_tokens = 150  # From your data
    max_k = max_tokens // avg_chunk_tokens

    results = index.query(query, top_k=max_k)

    # Trim if still over budget
    total_tokens = 0
    filtered = []
    for result in results:
        tokens = count_tokens(result.text)
        if total_tokens + tokens <= max_tokens:
            filtered.append(result)
            total_tokens += tokens
        else:
            break

    return filtered

### Query and Document Embeddings From Different Models

Severity: MEDIUM

Situation: Upgrading embedding model or mixing providers

Symptoms:
Retrieval quality suddenly drops. Relevant documents not found.
Random results returned. Works for new documents, fails for old.

Why this breaks:
Embedding models produce different vector spaces. A query embedded
with text-embedding-3 won't match documents embedded with text-ada-002.
Mixing models creates garbage similarity scores.

Recommended fix:


## Track embedding model in metadata
await index.upsert(
    id=doc_id,
    vector=embedding,
    metadata={
        "embedding_model": "text-embedding-3-small",
        "embedding_version": "2024-01",
        "content": content
    }
)


## Filter by model version on retrieval
results = index.query(
    vector=query_embedding,
    filter={"embedding_model": current_model},
    top_k=10
)


## Migration strategy for model upgrades
Build a separate authorized collection/namespace with the new model identity and exact source revisions. Keep the serving collection intact, reconcile coverage and retrieval quality, then switch atomically with a rollback route. Do not overwrite every user's live vectors in place or send their content to a new provider without authorization.

## Use separate collections during migration
# Old collection: production queries
# New collection: re-embedding in progress
# Switch over when complete


## Validation Checks

### In-Memory Store in Production Code

Severity: ERROR

In-memory stores lose data on restart

Message: In-memory store detected. Use persistent storage (Postgres, Qdrant, Pinecone) for production.

### Vector Upsert Without Metadata

Severity: WARNING

Vectors should have metadata for filtering

Message: Vector upsert without metadata. Add user_id, type, timestamp for proper filtering.

### Query Without User Filtering

Severity: ERROR

Queries should filter by user to prevent data leakage

Message: Vector query without user filtering. Always filter by user_id to prevent data leakage.

### Hardcoded Chunk Size Without Justification

Severity: INFO

Chunk size should be tested and justified

Message: Hardcoded chunk size. Test different sizes for your content type and measure retrieval accuracy.

### Chunking Without Overlap

Severity: WARNING

Chunk overlap prevents boundary issues

Message: Text splitting without overlap. Add chunk_overlap (10-20%) to prevent boundary issues.

### Semantic Search Without Filters

Severity: WARNING

Pure semantic search often returns irrelevant results

Message: Pure semantic search. Add metadata filters (user, type, time) for better relevance.

### Retrieval Without Result Limit

Severity: WARNING

Unbounded retrieval can overflow context

Message: Retrieval without limit. Set top_k to prevent context overflow.

### Embeddings Without Model Version Tracking

Severity: WARNING

Track embedding model to handle migrations

Message: Store embedding model version in metadata to handle model migrations.

### Different Models for Document and Query Embedding

Severity: ERROR

Documents and queries must use same embedding model

Message: Ensure same embedding model for indexing and querying.


## Collaboration

### Delegation Triggers

- user needs vector database at scale -> data-engineer (Production vector store operations)
- user needs embedding model optimization -> ml-engineer (Custom embeddings, fine-tuning)
- user needs knowledge graph -> knowledge-engineer (Graph-based memory structures)
- user needs RAG pipeline -> llm-architect (End-to-end retrieval augmented generation)
- user needs multi-agent shared memory -> multi-agent-orchestration (Memory sharing between agents)


## Related Skills

Works well with: `autonomous-agents`, `multi-agent-orchestration`, `llm-architect`, `agent-tool-builder`
