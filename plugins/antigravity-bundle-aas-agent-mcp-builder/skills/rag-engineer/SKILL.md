---
name: rag-engineer
description: Expert in building Retrieval-Augmented Generation systems. Masters
  embedding models, vector databases, chunking strategies, and retrieval
  optimization for LLM applications.
risk: unknown
source: vibeship-spawner-skills (Apache 2.0)
date_added: 2026-02-27
---

# RAG Engineer

Expert in building Retrieval-Augmented Generation systems. Masters embedding models,
vector databases, chunking strategies, and retrieval optimization for LLM applications.

**Role**: RAG Systems Architect

I bridge the gap between raw documents and LLM understanding. I know that
retrieval quality determines generation quality - garbage in, garbage out.
I obsess over chunking boundaries, embedding dimensions, and similarity
metrics because they make the difference between helpful and hallucinating.

### Expertise

- Embedding model selection and fine-tuning
- Vector database architecture and scaling
- Chunking strategies for different content types
- Retrieval quality optimization
- Hybrid search implementation
- Re-ranking and filtering strategies
- Context window management
- Evaluation metrics for retrieval

### Principles

- Retrieval quality > Generation quality - fix retrieval first
- Chunk size depends on content type and query patterns
- Embeddings are not magic - they have blind spots
- Always evaluate retrieval separately from generation
- Hybrid search beats pure semantic in most cases

## Capabilities

- Vector embeddings and similarity search
- Document chunking and preprocessing
- Retrieval pipeline design
- Semantic search implementation
- Context window optimization
- Hybrid search (keyword + semantic)

## Prerequisites

- Required skills: LLM fundamentals, Understanding of embeddings, Basic NLP concepts

## Patterns

### Semantic Chunking

Chunk by meaning, not arbitrary token counts

**When to use**: Processing documents with natural sections

- Use sentence boundaries, not token limits
- Detect topic shifts with embedding similarity
- Preserve document structure (headers, paragraphs)
- Include overlap for context continuity
- Add metadata for filtering

### Hierarchical Retrieval

Multi-level retrieval for better precision

**When to use**: Large document collections with varied granularity

- Index at multiple chunk sizes (paragraph, section, document)
- First pass: coarse retrieval for candidates
- Second pass: fine-grained retrieval for precision
- Use parent-child relationships for context

### Hybrid Search

Combine semantic and keyword search

**When to use**: Queries may be keyword-heavy or semantic

- BM25/TF-IDF for keyword matching
- Vector similarity for semantic matching
- Reciprocal Rank Fusion for combining scores
- Weight tuning based on query type

### Query Expansion

Expand queries to improve recall

**When to use**: User queries are short or ambiguous

- Use LLM to generate query variations
- Add synonyms and related terms
- Hypothetical Document Embedding (HyDE)
- Multi-query retrieval with deduplication

### Contextual Compression

Compress retrieved context to fit window

**When to use**: Retrieved chunks exceed context limits

- Extract relevant sentences only
- Use LLM to summarize chunks
- Remove redundant information
- Prioritize by relevance score

### Metadata Filtering

Pre-filter by metadata before semantic search

**When to use**: Documents have structured metadata

- Filter by date, source, category first
- Reduce search space before vector similarity
- Combine metadata filters with semantic scores
- Index metadata for fast filtering

## Sharp Edges

### Fixed-size chunking breaks sentences and context

Severity: HIGH

Situation: Using fixed token/character limits for chunking

Symptoms:
- Retrieved chunks feel incomplete or cut off
- Answer quality varies wildly
- High recall but low precision

Why this breaks:
Fixed-size chunks split mid-sentence, mid-paragraph, or mid-idea.
The resulting embeddings represent incomplete thoughts, leading to
poor retrieval quality. Users search for concepts but get fragments.

Recommended fix:

Use semantic chunking that respects document structure:
- Split on sentence/paragraph boundaries
- Use embedding similarity to detect topic shifts
- Include overlap for context continuity
- Preserve headers and document structure as metadata

### Pure semantic search without metadata pre-filtering

Severity: MEDIUM

Situation: Only using vector similarity, ignoring metadata

Symptoms:
- Returns outdated information
- Mixes content from wrong sources
- Users can't scope their searches

Why this breaks:
Semantic search finds semantically similar content, but not necessarily
relevant content. Without metadata filtering, you return old docs when
user wants recent, wrong categories, or inapplicable content.

Recommended fix:

Implement hybrid filtering:
- Pre-filter by metadata (date, source, category) before vector search
- Post-filter results by relevance criteria
- Include metadata in the retrieval API
- Allow users to specify filters

### Using same embedding model for different content types

Severity: MEDIUM

Situation: One embedding model for code, docs, and structured data

Symptoms:
- Code search returns irrelevant results
- Domain terms not matched properly
- Similar concepts not clustered

Why this breaks:
Embedding models are trained on specific content types. Using a text
embedding model for code, or a general model for domain-specific
content, produces poor similarity matches.

Recommended fix:

Evaluate embeddings per content type:
- Use code-specific embeddings for code (e.g., CodeBERT)
- Consider domain-specific or fine-tuned embeddings
- Benchmark retrieval quality before choosing
- Separate indices for different content types if needed

### Using first-stage retrieval results directly

Severity: MEDIUM

Situation: Taking top-K from vector search without reranking

Symptoms:
- Clearly relevant docs not in top results
- Results order seems arbitrary
- Adding more results helps quality

Why this breaks:
First-stage retrieval (vector search) optimizes for recall, not precision.
The top results by embedding similarity may not be the most relevant
for the specific query. Cross-encoder reranking dramatically improves
precision for the final results.

Recommended fix:

Add reranking step:
- Retrieve larger candidate set (e.g., top 20-50)
- Rerank with cross-encoder (query-document pairs)
- Return reranked top-K (e.g., top 5)
- Cache reranker for performance

### Cramming maximum context into LLM prompt

Severity: MEDIUM

Situation: Using all retrieved context regardless of relevance

Symptoms:
- Answers drift with more context
- LLM ignores key information
- High token costs

Why this breaks:
More context isn't always better. Irrelevant context confuses the LLM,
increases latency and cost, and can cause the model to ignore the
most relevant information. Models have attention limits.

Recommended fix:

Use relevance thresholds:
- Set minimum similarity score cutoff
- Limit context to truly relevant chunks
- Summarize or compress if needed
- Order context by relevance

### Not measuring retrieval quality separately from generation

Severity: HIGH

Situation: Only evaluating end-to-end RAG quality

Symptoms:
- Can't diagnose poor RAG performance
- Prompt changes don't help
- Random quality variations

Why this breaks:
If answers are wrong, you can't tell if retrieval failed or generation
failed. This makes debugging impossible and leads to wrong fixes
(tuning prompts when retrieval is the problem).

Recommended fix:

Separate retrieval evaluation:
- Create retrieval test set with relevant docs labeled
- Measure MRR, NDCG, Recall@K for retrieval
- Evaluate generation only on correct retrievals
- Track metrics over time

### Not updating embeddings when source documents change

Severity: MEDIUM

Situation: Embeddings generated once, never refreshed

Symptoms:
- Returns outdated information
- References deleted content
- Inconsistent with source

Why this breaks:
Documents change but embeddings don't. Users retrieve outdated content
or, worse, content that no longer exists. This erodes trust in the
system.

Recommended fix:

Implement embedding refresh:
- Track document versions/hashes
- Re-embed on document change
- Handle deleted documents
- Consider TTL for embeddings

### Same retrieval strategy for all query types

Severity: MEDIUM

Situation: Using pure semantic search for keyword-heavy queries

Symptoms:
- Exact term searches miss results
- Concept searches too literal
- Users frustrated with both

Why this breaks:
Some queries are keyword-oriented (looking for specific terms) while
others are semantic (looking for concepts). Pure semantic search fails
on exact matches; pure keyword search fails on paraphrases.

Recommended fix:

Implement hybrid search:
- BM25/TF-IDF for keyword matching
- Vector similarity for semantic matching
- Reciprocal Rank Fusion to combine
- Tune weights based on query patterns

## Related Skills

Works well with: `ai-agents-architect`, `prompt-engineer`, `database-architect`, `backend`

## When to Use
- User mentions or implies: building RAG
- User mentions or implies: vector search
- User mentions or implies: embeddings
- User mentions or implies: semantic search
- User mentions or implies: document retrieval
- User mentions or implies: context retrieval
- User mentions or implies: knowledge base
- User mentions or implies: LLM with documents
- User mentions or implies: chunking strategy
- User mentions or implies: pinecone
- User mentions or implies: weaviate
- User mentions or implies: chromadb
- User mentions or implies: pgvector

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
