---
name: embedding-strategies
description: "Guide to selecting and optimizing embedding models for vector search applications."
risk: unknown
source: community
date_added: "2026-02-27"
---

# Embedding Strategies

Guide to selecting and optimizing embedding models for vector search applications.

## Do not use this skill when

- The task is unrelated to embedding strategies
- You need a different domain or tool outside this scope

## Instructions

- Clarify goals, constraints, and required inputs.
- Apply relevant best practices and validate outcomes.
- Provide actionable steps and verification.
- If detailed examples are required, open `resources/implementation-playbook.md`.

## Use this skill when

- Choosing embedding models for RAG
- Optimizing chunking strategies
- Fine-tuning embeddings for domains
- Comparing embedding model performance
- Reducing embedding dimensions
- Handling multilingual content

## Core Concepts

### 1. Embedding Model Comparison

| Model | Dimensions | Max Tokens | Best For |
|-------|------------|------------|----------|
| **text-embedding-3-large** | 3072 | 8191 | High accuracy |
| **text-embedding-3-small** | 1536 | 8191 | Cost-effective |
| **voyage-2** | 1024 | 4000 | Code, legal |
| **bge-large-en-v1.5** | 1024 | 512 | Open source |
| **all-MiniLM-L6-v2** | 384 | 256 | Fast, lightweight |
| **multilingual-e5-large** | 1024 | 512 | Multi-language |

### 2. Embedding Pipeline

```
Document → Chunking → Preprocessing → Embedding Model → Vector
                ↓
        [Overlap, Size]  [Clean, Normalize]  [API/Local]
```

## Templates

### Template 1: OpenAI Embeddings

```python
from openai import OpenAI
from typing import List
import numpy as np

client = OpenAI()

def get_embeddings(
    texts: List[str],
    model: str = "text-embedding-3-small",
    dimensions: int = None
) -> List[List[float]]:
    """Get embeddings from OpenAI."""
    # Handle batching for large lists
    batch_size = 100
    all_embeddings = []

    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]

        kwargs = {"input": batch, "model": model}
        if dimensions:
            kwargs["dimensions"] = dimensions

        response = client.embeddings.create(**kwargs)
        embeddings = [item.embedding for item in response.data]
        all_embeddings.extend(embeddings)

    return all_embeddings


def get_embedding(text: str, **kwargs) -> List[float]:
    """Get single embedding."""
    return get_embeddings([text], **kwargs)[0]


# Dimension reduction with OpenAI
def get_reduced_embedding(text: str, dimensions: int = 512) -> List[float]:
    """Get embedding with reduced dimensions (Matryoshka)."""
    return get_embedding(
        text,
        model="text-embedding-3-small",
        dimensions=dimensions
    )
```

### Template 2: Local Embeddings with Sentence Transformers

```python
from sentence_transformers import SentenceTransformer
from typing import List, Optional
import numpy as np

class LocalEmbedder:
    """Local embedding with sentence-transformers."""

    def __init__(
        self,
        model_name: str = "BAAI/bge-large-en-v1.5",
        device: str = "cuda"
    ):
        self.model = SentenceTransformer(model_name, device=device)

    def embed(
        self,
        texts: List[str],
        normalize: bool = True,
        show_progress: bool = False
    ) -> np.ndarray:
        """Embed texts with optional normalization."""
        embeddings = self.model.encode(
            texts,
            normalize_embeddings=normalize,
            show_progress_bar=show_progress,
            convert_to_numpy=True
        )
        return embeddings

    def embed_query(self, query: str) -> np.ndarray:
        """Embed a query with BGE-style prefix."""
        # BGE models benefit from query prefix
        if "bge" in self.model.get_sentence_embedding_dimension():
            query = f"Represent this sentence for searching relevant passages: {query}"
        return self.embed([query])[0]

    def embed_documents(self, documents: List[str]) -> np.ndarray:
        """Embed documents for indexing."""
        return self.embed(documents)


# E5 model with instructions
class E5Embedder:
    def __init__(self, model_name: str = "intfloat/multilingual-e5-large"):
        self.model = SentenceTransformer(model_name)

    def embed_query(self, query: str) -> np.ndarray:
        return self.model.encode(f"query: {query}")

    def embed_document(self, document: str) -> np.ndarray:
        return self.model.encode(f"passage: {document}")
```

### Template 3: Chunking Strategies

```python
from typing import List, Tuple
import re

def chunk_by_tokens(
    text: str,
    chunk_size: int = 512,
    chunk_overlap: int = 50,
    tokenizer=None
) -> List[str]:
    """Chunk text by token count."""
    import tiktoken
    tokenizer = tokenizer or tiktoken.get_encoding("cl100k_base")

    tokens = tokenizer.encode(text)
    chunks = []

    start = 0
    while start < len(tokens):
        end = start + chunk_size
        chunk_tokens = tokens[start:end]
        chunk_text = tokenizer.decode(chunk_tokens)
        chunks.append(chunk_text)
        start = end - chunk_overlap

    return chunks


def chunk_by_sentences(
    text: str,
    max_chunk_size: int = 1000,
    min_chunk_size: int = 100
) -> List[str]:
    """Chunk text by sentences, respecting size limits."""
    import nltk
    sentences = nltk.sent_tokenize(text)

    chunks = []
    current_chunk = []
    current_size = 0

    for sentence in sentences:
        sentence_size = len(sentence)

        if current_size + sentence_size > max_chunk_size and current_chunk:
            chunks.append(" ".join(current_chunk))
            current_chunk = []
            current_size = 0

        current_chunk.append(sentence)
        current_size += sentence_size

    if current_chunk:
        chunks.append(" ".join(current_chunk))

    return chunks


def chunk_by_semantic_sections(
    text: str,
    headers_pattern: str = r'^#{1,3}\s+.+$'
) -> List[Tuple[str, str]]:
    """Chunk markdown by headers, preserving hierarchy."""
    lines = text.split('\n')
    chunks = []
    current_header = ""
    current_content = []

    for line in lines:
        if re.match(headers_pattern, line, re.MULTILINE):
            if current_content:
                chunks.append((current_header, '\n'.join(current_content)))
            current_header = line
            current_content = []
        else:
            current_content.append(line)

    if current_content:
        chunks.append((current_header, '\n'.join(current_content)))

    return chunks


def recursive_character_splitter(
    text: str,
    chunk_size: int = 1000,
    chunk_overlap: int = 200,
    separators: List[str] = None
) -> List[str]:
    """LangChain-style recursive splitter."""
    separators = separators or ["\n\n", "\n", ". ", " ", ""]

    def split_text(text: str, separators: List[str]) -> List[str]:
        if not text:
            return []

        separator = separators[0]
        remaining_separators = separators[1:]

        if separator == "":
            # Character-level split
            return [text[i:i+chunk_size] for i in range(0, len(text), chunk_size - chunk_overlap)]

        splits = text.split(separator)
        chunks = []
        current_chunk = []
        current_length = 0

        for split in splits:
            split_length = len(split) + len(separator)

            if current_length + split_length > chunk_size and current_chunk:
                chunk_text = separator.join(current_chunk)

                # Recursively split if still too large
                if len(chunk_text) > chunk_size and remaining_separators:
                    chunks.extend(split_text(chunk_text, remaining_separators))
                else:
                    chunks.append(chunk_text)

                # Start new chunk with overlap
                overlap_splits = []
                overlap_length = 0
                for s in reversed(current_chunk):
                    if overlap_length + len(s) <= chunk_overlap:
                        overlap_splits.insert(0, s)
                        overlap_length += len(s)
                    else:
                        break
                current_chunk = overlap_splits
                current_length = overlap_length

            current_chunk.append(split)
            current_length += split_length

        if current_chunk:
            chunks.append(separator.join(current_chunk))

        return chunks

    return split_text(text, separators)
```

### Template 4: Domain-Specific Embedding Pipeline

```python
class DomainEmbeddingPipeline:
    """Pipeline for domain-specific embeddings."""

    def __init__(
        self,
        embedding_model: str = "text-embedding-3-small",
        chunk_size: int = 512,
        chunk_overlap: int = 50,
        preprocessing_fn=None
    ):
        self.embedding_model = embedding_model
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.preprocess = preprocessing_fn or self._default_preprocess

    def _default_preprocess(self, text: str) -> str:
        """Default preprocessing."""
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text)
        # Remove special characters
        text = re.sub(r'[^\w\s.,!?-]', '', text)
        return text.strip()

    async def process_documents(
        self,
        documents: List[dict],
        id_field: str = "id",
        content_field: str = "content",
        metadata_fields: List[str] = None
    ) -> List[dict]:
        """Process documents for vector storage."""
        processed = []

        for doc in documents:
            content = doc[content_field]
            doc_id = doc[id_field]

            # Preprocess
            cleaned = self.preprocess(content)

            # Chunk
            chunks = chunk_by_tokens(
                cleaned,
                self.chunk_size,
                self.chunk_overlap
            )

            # Create embeddings
            embeddings = get_embeddings(chunks, self.embedding_model)

            # Create records
            for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
                record = {
                    "id": f"{doc_id}_chunk_{i}",
                    "document_id": doc_id,
                    "chunk_index": i,
                    "text": chunk,
                    "embedding": embedding
                }

                # Add metadata
                if metadata_fields:
                    for field in metadata_fields:
                        if field in doc:
                            record[field] = doc[field]

                processed.append(record)

        return processed


# Code-specific pipeline
class CodeEmbeddingPipeline:
    """Specialized pipeline for code embeddings."""

    def __init__(self, model: str = "voyage-code-2"):
        self.model = model

    def chunk_code(self, code: str, language: str) -> List[dict]:
        """Chunk code by functions/classes."""
        import tree_sitter

        # Parse with tree-sitter
        # Extract functions, classes, methods
        # Return chunks with context
        pass

    def embed_with_context(self, chunk: str, context: str) -> List[float]:
        """Embed code with surrounding context."""
        combined = f"Context: {context}\n\nCode:\n{chunk}"
        return get_embedding(combined, model=self.model)
```

### Template 5: Embedding Quality Evaluation

```python
import numpy as np
from typing import List, Tuple

def evaluate_retrieval_quality(
    queries: List[str],
    relevant_docs: List[List[str]],  # List of relevant doc IDs per query
    retrieved_docs: List[List[str]],  # List of retrieved doc IDs per query
    k: int = 10
) -> dict:
    """Evaluate embedding quality for retrieval."""

    def precision_at_k(relevant: set, retrieved: List[str], k: int) -> float:
        retrieved_k = retrieved[:k]
        relevant_retrieved = len(set(retrieved_k) & relevant)
        return relevant_retrieved / k

    def recall_at_k(relevant: set, retrieved: List[str], k: int) -> float:
        retrieved_k = retrieved[:k]
        relevant_retrieved = len(set(retrieved_k) & relevant)
        return relevant_retrieved / len(relevant) if relevant else 0

    def mrr(relevant: set, retrieved: List[str]) -> float:
        for i, doc in enumerate(retrieved):
            if doc in relevant:
                return 1 / (i + 1)
        return 0

    def ndcg_at_k(relevant: set, retrieved: List[str], k: int) -> float:
        dcg = sum(
            1 / np.log2(i + 2) if doc in relevant else 0
            for i, doc in enumerate(retrieved[:k])
        )
        ideal_dcg = sum(1 / np.log2(i + 2) for i in range(min(len(relevant), k)))
        return dcg / ideal_dcg if ideal_dcg > 0 else 0

    metrics = {
        f"precision@{k}": [],
        f"recall@{k}": [],
        "mrr": [],
        f"ndcg@{k}": []
    }

    for relevant, retrieved in zip(relevant_docs, retrieved_docs):
        relevant_set = set(relevant)
        metrics[f"precision@{k}"].append(precision_at_k(relevant_set, retrieved, k))
        metrics[f"recall@{k}"].append(recall_at_k(relevant_set, retrieved, k))
        metrics["mrr"].append(mrr(relevant_set, retrieved))
        metrics[f"ndcg@{k}"].append(ndcg_at_k(relevant_set, retrieved, k))

    return {name: np.mean(values) for name, values in metrics.items()}


def compute_embedding_similarity(
    embeddings1: np.ndarray,
    embeddings2: np.ndarray,
    metric: str = "cosine"
) -> np.ndarray:
    """Compute similarity matrix between embedding sets."""
    if metric == "cosine":
        # Normalize
        norm1 = embeddings1 / np.linalg.norm(embeddings1, axis=1, keepdims=True)
        norm2 = embeddings2 / np.linalg.norm(embeddings2, axis=1, keepdims=True)
        return norm1 @ norm2.T
    elif metric == "euclidean":
        from scipy.spatial.distance import cdist
        return -cdist(embeddings1, embeddings2, metric='euclidean')
    elif metric == "dot":
        return embeddings1 @ embeddings2.T
```

## Best Practices

### Do's
- **Match model to use case** - Code vs prose vs multilingual
- **Chunk thoughtfully** - Preserve semantic boundaries
- **Normalize embeddings** - For cosine similarity
- **Batch requests** - More efficient than one-by-one
- **Cache embeddings** - Avoid recomputing

### Don'ts
- **Don't ignore token limits** - Truncation loses info
- **Don't mix embedding models** - Incompatible spaces
- **Don't skip preprocessing** - Garbage in, garbage out
- **Don't over-chunk** - Lose context

## Resources

- [OpenAI Embeddings](https://platform.openai.com/docs/guides/embeddings)
- [Sentence Transformers](https://www.sbert.net/)
- [MTEB Benchmark](https://huggingface.co/spaces/mteb/leaderboard)

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
