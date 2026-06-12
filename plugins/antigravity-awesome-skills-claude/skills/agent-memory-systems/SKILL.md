---
name: agent-memory-systems
description: "Memory is the cornerstone of intelligent agents. Without it, every
  interaction starts from zero. This skill covers the architecture of agent
  memory: short-term (context window), long-term (vector stores), and the
  cognitive architectures that organize them."
risk: safe
source: vibeship-spawner-skills (Apache 2.0)
date_added: 2026-02-27
---

# Agent Memory Systems

Memory is the cornerstone of intelligent agents. Without it, every interaction
starts from zero. This skill covers the architecture of agent memory: short-term
(context window), long-term (vector stores), and the cognitive architectures
that organize them.

Key insight: Memory isn't just storage - it's retrieval. A million stored facts
mean nothing if you can't find the right one. Chunking, embedding, and retrieval
strategies determine whether your agent remembers or forgets.

The field is fragmented with inconsistent terminology. We use the CoALA cognitive
architecture framework: semantic memory (facts), episodic memory (experiences),
and procedural memory (how-to knowledge).

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

- Pinecone - When: Managed, enterprise-scale (billions of vectors) Note: Best query performance, highest cost
- Qdrant - When: Complex metadata filtering, open-source Note: Rust-based, excellent filtering
- Weaviate - When: Hybrid search, knowledge graph features Note: GraphQL interface, good for relationships
- ChromaDB - When: Prototyping, small/medium apps Note: Developer-friendly, ~20ms p50 at 100K vectors
- pgvector - When: Already using PostgreSQL, simpler setup Note: Good for <1M vectors, familiar tooling

### Embedding_models

- OpenAI text-embedding-3-large - When: Best quality, 3072 dimensions Note: $0.13/1M tokens
- OpenAI text-embedding-3-small - When: Good balance, 1536 dimensions Note: $0.02/1M tokens, 5x cheaper
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

## LangMem Implementation
"""
from langmem import MemoryStore
from langgraph.graph import StateGraph

# Initialize memory store
memory = MemoryStore(
    connection_string=os.environ["POSTGRES_URL"]
)

# Semantic memory: user profile
await memory.semantic.upsert(
    namespace="user_profile",
    key=user_id,
    content={
        "name": "Alice",
        "preferences": ["dark mode", "concise responses"],
        "expertise_level": "developer",
    }
)

# Episodic memory: past interaction
await memory.episodic.add(
    namespace="conversations",
    content={
        "timestamp": datetime.now(),
        "summary": "Helped debug authentication issue",
        "outcome": "resolved",
        "key_insights": ["Token expiry was root cause"],
    },
    metadata={"user_id": user_id, "topic": "debugging"}
)

# Procedural memory: learned pattern
await memory.procedural.add(
    namespace="skills",
    content={
        "task_type": "debug_auth",
        "steps": ["Check token expiry", "Verify refresh flow"],
        "example_interaction": few_shot_example,
    }
)
"""

## Memory Retrieval at Runtime
"""
async def prepare_context(user_id, query):
    # Get user profile (semantic)
    profile = await memory.semantic.get(
        namespace="user_profile",
        key=user_id
    )

    # Find relevant past experiences (episodic)
    similar_experiences = await memory.episodic.search(
        namespace="conversations",
        query=query,
        filter={"user_id": user_id},
        limit=3
    )

    # Find relevant skills (procedural)
    relevant_skills = await memory.procedural.search(
        namespace="skills",
        query=query,
        limit=2
    )

    return {
        "profile": profile,
        "past_experiences": similar_experiences,
        "relevant_skills": relevant_skills,
    }
"""

### Vector Store Selection Pattern

Choosing the right vector database for your use case

**When to use**: Setting up persistent memory storage

# VECTOR STORE SELECTION:

"""
Decision matrix:

|            | Pinecone | Qdrant | Weaviate | ChromaDB | pgvector |
|------------|----------|--------|----------|----------|----------|
| Scale      | Billions | 100M+  | 100M+    | 1M       | 1M       |
| Managed    | Yes      | Both   | Both     | Self     | Self     |
| Filtering  | Basic    | Best   | Good     | Basic    | SQL      |
| Hybrid     | No       | Yes    | Best     | No       | Yes      |
| Cost       | High     | Medium | Medium   | Free     | Free     |
| Latency    | 5ms      | 7ms    | 10ms     | 20ms     | 15ms     |
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
    include_metadata=True
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

## Semantic Chunking (Better Quality)
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
# Reduces retrieval failures by 35%

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

## LangGraph Background Processing
"""
from langgraph.graph import StateGraph
from langgraph.checkpoint.postgres import PostgresSaver

async def background_memory_processor(thread_id: str):
    # Run after conversation ends or goes idle
    conversation = await load_conversation(thread_id)

    # Extract insights without time pressure
    insights = await llm.invoke('''
        Analyze this conversation and extract:
        1. Key facts learned about the user
        2. User preferences revealed
        3. Tasks completed or pending
        4. Patterns in user behavior

        Be thorough - this runs in background.

        Conversation:
        {conversation}
    ''')

    # Store to long-term memory
    for insight in insights:
        await memory.semantic.upsert(
            namespace="user_insights",
            key=generate_key(insight),
            content=insight,
            metadata={"source_thread": thread_id}
        )

# Trigger on conversation end or idle timeout
@on_conversation_idle(timeout_minutes=5)
async def process_conversation(thread_id):
    await background_memory_processor(thread_id)
"""

## Memory Consolidation (Like Sleep)
"""
# Periodically consolidate and deduplicate memories

async def consolidate_memories(user_id: str):
    # Get all memories for user
    memories = await memory.semantic.list(
        namespace="user_insights",
        filter={"user_id": user_id}
    )

    # Find similar memories (potential duplicates)
    clusters = cluster_by_similarity(memories, threshold=0.9)

    # Merge similar memories
    for cluster in clusters:
        if len(cluster) > 1:
            merged = await llm.invoke(f'''
                Consolidate these related memories into one:
                {cluster}

                Preserve all important information.
            ''')
            await memory.semantic.upsert(
                namespace="user_insights",
                key=generate_key(merged),
                content=merged
            )
            # Delete originals
            for old in cluster:
                await memory.semantic.delete(old.id)
"""

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

## Time-Based Decay
"""
from datetime import datetime, timedelta

async def decay_old_memories(namespace: str, max_age_days: int):
    cutoff = datetime.now() - timedelta(days=max_age_days)

    old_memories = await memory.episodic.list(
        namespace=namespace,
        filter={"last_accessed": {"$lt": cutoff.isoformat()}}
    )

    for mem in old_memories:
        # Soft delete (mark as archived)
        await memory.episodic.update(
            id=mem.id,
            metadata={"archived": True, "archived_at": datetime.now()}
        )
"""

## Utility-Based Decay (MIRIX Approach)
"""
def calculate_memory_utility(memory):
    '''
    Composite utility score inspired by cognitive science:
    - Recency: When was it last accessed?
    - Frequency: How often is it accessed?
    - Importance: How critical is this information?
    '''
    now = datetime.now()

    # Recency score (exponential decay with 72h half-life)
    hours_since_access = (now - memory.last_accessed).total_seconds() / 3600
    recency_score = 0.5 ** (hours_since_access / 72)

    # Frequency score
    frequency_score = min(memory.access_count / 10, 1.0)

    # Importance (from metadata or heuristic)
    importance = memory.metadata.get("importance", 0.5)

    # Weighted combination
    utility = (
        0.4 * recency_score +
        0.3 * frequency_score +
        0.3 * importance
    )

    return utility

async def prune_low_utility_memories(threshold=0.2):
    all_memories = await memory.list_all()
    for mem in all_memories:
        if calculate_memory_utility(mem) < threshold:
            await memory.archive(mem.id)
"""

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
# Reduces retrieval failures by 35%

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
    # Delete old preference
    await memory.delete(
        filter={"user_id": user_id, "type": "preference", "category": category}
    )

    # Store new preference
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
async def store_with_conflict_check(memory, user_id):
    # Find potentially conflicting memories
    similar = await index.query(
        vector=embed(memory.content),
        filter={"user_id": user_id, "type": memory.type},
        threshold=0.9,  # Very similar
        top_k=5
    )

    for existing in similar:
        if is_contradictory(memory.content, existing.content):
            # Ask for resolution
            resolution = await resolve_conflict(memory, existing)
            if resolution == "replace":
                await index.delete(existing.id)
            elif resolution == "version":
                await mark_superseded(existing.id, memory.id)

    await index.upsert(memory)

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
            await replace_cluster(cluster, resolved)

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
    remaining = context_limit - TOKEN_BUDGET["system_prompt"] - TOKEN_BUDGET["buffer"]

    # Prioritize recent messages
    recent = get_recent_messages(limit=TOKEN_BUDGET["recent_messages"])
    remaining -= count_tokens(recent)

    # Then user profile
    profile = get_user_profile(limit=TOKEN_BUDGET["user_profile"])
    remaining -= count_tokens(profile)

    # Finally retrieved memories with remaining budget
    memories = retrieve_memories(query, max_tokens=remaining)

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
async def migrate_embeddings(old_model, new_model):
    # Get all documents with old model
    old_docs = await index.list(filter={"embedding_model": old_model})

    for doc in old_docs:
        # Re-embed with new model
        new_embedding = await embed(doc.content, model=new_model)

        # Update in place
        await index.update(
            id=doc.id,
            vector=new_embedding,
            metadata={"embedding_model": new_model}
        )

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

## When to Use
- User mentions or implies: agent memory
- User mentions or implies: long-term memory
- User mentions or implies: memory systems
- User mentions or implies: remember across sessions
- User mentions or implies: memory retrieval
- User mentions or implies: episodic memory
- User mentions or implies: semantic memory
- User mentions or implies: vector store
- User mentions or implies: rag
- User mentions or implies: langmem
- User mentions or implies: memgpt
- User mentions or implies: conversation history

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
