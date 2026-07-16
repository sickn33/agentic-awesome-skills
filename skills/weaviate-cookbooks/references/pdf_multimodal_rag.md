# Multi-vector RAG: Building Multimodal Document Search Systems With Weaviate

## Overview

This cookbook provides instructions for implementing a Multimodal Retrieval-Augmented Generation (RAG) system over PDF document collections using Weaviate Embeddings multimodal model for embeddings and Ollama with a Vision Language Model (VLM) for generation.

Weaviate Embeddings handles all embedding generation server-side — no local GPU or model downloads required. Simply upload document images as base64 blobs and Weaviate generates multi-vector embeddings automatically.

### Architecture

A multimodal RAG system consists of two main pipelines:

**Ingestion Pipeline:**
- Documents (PDFs, images) are converted to page images
- Images are uploaded as base64 blobs to Weaviate
- Weaviate Embeddings generates multi-vector embeddings server-side using `ModernVBERT/colmodernvbert`
- Embeddings are stored in the vector index automatically

**Query Pipeline:**
- Text queries are sent to Weaviate, which embeds them server-side
- Relevant documents are retrieved using similarity search (MaxSim)
- Retrieved document images are passed to a Vision Language Model (VLM) running on Ollama with the query
- The VLM generates a natural language response based on visual and textual context



**Requirements:**
- Weaviate Cloud instance (Weaviate Embeddings is cloud-only)
- Python 3.11 or higher
- `uv` package manager ([installation guide](https://docs.astral.sh/uv/getting-started/installation/))
- [Ollama](https://ollama.com/) installed locally for VLM generation

## Workflow Instructions

### Step 1: Setup Project and Install Dependencies

#### Project Bootstrap

Initialize a new project with `uv`:

```bash
uv init multimodal-rag
cd multimodal-rag
uv venv
```

**Install uv if needed:**
```bash
# macOS/Linux
curl -LsSf https://astral.sh/uv/install.sh -o /tmp/uv-install.sh
less /tmp/uv-install.sh
sh /tmp/uv-install.sh

# Or with pip
pip install uv

# Or with Homebrew
brew install uv
```

#### Install Core Dependencies

Install required libraries using `uv`:

```bash
uv add weaviate-client
```

**Package breakdown:**
- `weaviate-client`: Python client for Weaviate vector database (v4.x) — Weaviate Embeddings handles all embedding generation

#### Additional Dependencies (Install as Needed)

```bash
# For loading Hugging Face datasets
uv add datasets

# For PDF processing (pdf2image requires poppler to be installed!)
uv add pdf2image pillow

# For VLM generation via Ollama
uv add ollama
```

### Step 2: Prepare Your Document Dataset

#### Option A: Load Existing Dataset
If using a pre-existing dataset:
- Use Hugging Face `datasets` library
- Ensure dataset contains document images or can be converted to images
- Verify image format compatibility (JPEG, PNG)

#### Option B: Process Your Own Documents
For custom document collections:
1. Convert documents to images (if not already images)
   - PDFs: Use `pdf2image` or similar libraries
   - Office documents: Convert to PDF first, then to images
2. Organize with metadata (document ID, page number, title, etc.)
3. Store in a format suitable for batch processing

**Recommended structure:**
```python
{
    "document_id": str,
    "page_number": int,
    "image": PIL.Image,
    "metadata": dict  # title, author, date, etc.
}
```

### Step 3: Configure Weaviate Collection

#### Weaviate Connection

```python
import os
import weaviate
from weaviate.classes.init import Auth

WEAVIATE_URL = os.getenv("WEAVIATE_URL")
WEAVIATE_API_KEY = os.getenv("WEAVIATE_API_KEY")

client = weaviate.connect_to_weaviate_cloud(
    cluster_url=WEAVIATE_URL,
    auth_credentials=Auth.api_key(WEAVIATE_API_KEY),
)
```

#### Create Collection Schema

Define a collection with `multi2vec_weaviate` vectorizer for automatic multimodal embeddings:

```python
from weaviate.classes.config import Configure, Property, DataType

collection_name = "PDFDocuments"  # Use a descriptive name for your use case

collection = client.collections.create(
    name=collection_name,
    properties=[
        Property(name="doc_page", data_type=DataType.BLOB),
        Property(name="page_id", data_type=DataType.INT),
        Property(name="document_id", data_type=DataType.TEXT),
        Property(name="page_number", data_type=DataType.INT),
        Property(name="title", data_type=DataType.TEXT),
        # Add other metadata properties as needed
    ],
    vector_config=[
        Configure.MultiVectors.multi2vec_weaviate(
            name="doc_vector"
            image_field="doc_page",
            model="ModernVBERT/colmodernvbert",
            encoding=Configure.VectorIndex.MultiVector.Encoding.muvera(
                ksim=4,
                dprojections=16,
                repetitions=20,
            ),
        )
    ],
)
```

**Key Configuration Options:**
- **`doc_page`**: BLOB property that holds base64-encoded page images — the vectorizer reads this field
- **`image_field`**: Must match the BLOB property name (`"doc_page"`)
- **`model`**: `ModernVBERT/colmodernvbert` — 250M parameter late-interaction vision-language encoder, fine-tuned for visual document retrieval
- **MUVERA encoding**: Compresses multi-vectors into efficient single vectors while preserving retrieval quality
  - `ksim`: Number of similar vectors to consider (default: 4)
  - `dprojections`: Number of projection dimensions (default: 16)
  - `repetitions`: Number of encoding repetitions (default: 20)
- **Properties**: Add all metadata you want to filter or display

**Without MUVERA encoding** (uses more memory but preserves full multi-vector representation):
```python
vector_config=[
    Configure.MultiVectors.multi2vec_weaviate(
        name="doc_vector",
        image_field="doc_page",
        model="ModernVBERT/colmodernvbert",
    )
],
```

### Step 4: Index Documents

#### Convert Images to Base64

```python
import base64
from io import BytesIO

def image_to_base64(image):
    """Convert a PIL Image to a base64-encoded string.

    Args:
        image: PIL.Image object

    Returns:
        Base64-encoded string of the JPEG image
    """
    buffer = BytesIO()
    image.save(buffer, format="JPEG")
    return base64.b64encode(buffer.getvalue()).decode("utf-8")
```

#### Batch Import

Weaviate Embeddings generates embeddings server-side during import — no local model needed:

```python
collection = client.collections.get(collection_name)

with collection.batch.dynamic() as batch:
    for idx, document in enumerate(your_document_dataset):
        # Convert image to base64
        img_base64 = image_to_base64(document["image"])

        # Add object to batch — Weaviate generates embeddings automatically
        batch.add_object(
            properties={
                "doc_page": img_base64,
                "page_id": document["page_id"],
                "document_id": document["document_id"],
                "page_number": document["page_number"],
                "title": document.get("title", ""),
                # Add other properties from your dataset
            },
        )

        # Progress tracking
        if idx % 25 == 0:
            print(f"Indexed {idx+1}/{len(your_document_dataset)} documents")

# Clean up dataset if memory is limited
del your_document_dataset

print(f"Total documents indexed: {len(collection)}")
```

**Performance Tips:**
- **Batch size**: Weaviate automatically manages batch size with `dynamic()` mode
- **No local GPU needed**: Weaviate Embeddings runs server-side
- **Image format**: JPEG is recommended for smaller payload sizes
- **Large datasets**: Process in chunks, delete intermediate variables to free memory

### Step 5: Implement Retrieval

#### Basic Query Function

Weaviate handles query embedding automatically — just pass text:

```python
from weaviate.classes.query import MetadataQuery

def search_documents(query_text, limit=3):
    """Search for documents using Weaviate Embeddings multimodal model.

    Args:
        query_text: Natural language query string
        limit: Number of results to return (default: 3)

    Returns:
        List of dicts with document properties, similarity scores, and base64 images
    """
    collection = client.collections.get(collection_name)

    # Search — Weaviate embeds the query server-side
    # Include doc_page in return_properties to get the base64-encoded image blob
    response = collection.query.near_text(
        query=query_text,
        limit=limit,
        return_properties=["page_id", "document_id", "page_number", "title", "doc_page"],
        return_metadata=MetadataQuery(distance=True),
    )

    # Process and format results
    results = []
    for i, obj in enumerate(response.objects):
        props = obj.properties
        results.append({
            "rank": i + 1,
            "page_id": props["page_id"],
            "document_id": props["document_id"],
            "page_number": props["page_number"],
            "title": props["title"],
            "distance": obj.metadata.distance,
            "image_base64": props["doc_page"],  # Already base64-encoded
        })

    return results

# Example usage
query = "How does DeepSeek-V2 compare against the LLaMA family of LLMs?"
results = search_documents(query, limit=3)

for result in results:
    print(f"{result['rank']}) Distance: {result['distance']:.4f}, "
          f"Title: \"{result['title']}\", Page: {result['page_number']}")
```

**Query Parameters:**
- **`limit`**: Number of results (1-10 recommended, consider VLM memory limits)
- **`return_metadata`**: Include `distance=True` to get similarity scores
- **Filters**: Add `filters=` for metadata filtering (see below)

**Accessing the image field in results:**
BLOB properties like `doc_page` are not returned by default when used as the `image_field` property of the `multi2vec_weaviate` vectorizer. You must request them explicitly via `return_properties` (as shown in `search_documents()` above). The returned blob is base64-encoded. The Ollama Python SDK's `images` key accepts raw `bytes` or path-like strings (not base64 strings), so decode with `base64.b64decode()` before passing to Ollama (as shown in `OllamaVLM.generate_answer()`).

#### Metadata Filtering

Add filters to narrow search scope by document properties:

```python
import weaviate.classes.config as wc

# Example: Filter by document ID
response = collection.query.near_text(
    query="query text",
    limit=5,
    filters=wc.Filter.by_property("document_id").equal("paper_123"),
)

# Example: Filter by page range
response = collection.query.near_text(
    query="query text",
    limit=5,
    filters=wc.Filter.by_property("page_number").less_than(10),
)

# Example: Combine multiple filters
from weaviate.classes.query import Filter

response = collection.query.near_text(
    query="query text",
    limit=5,
    filters=(
        Filter.by_property("document_id").equal("paper_123") &
        Filter.by_property("page_number").less_than(10)
    ),
)
```

#### Hybrid Search

Combine vector search with BM25 keyword search:

```python
# Hybrid search: vector + keyword (Weaviate handles embedding)
response = collection.query.hybrid(
    query="query text",
    alpha=0.7,  # 0.0=keyword only, 0.5=balanced, 1.0=vector only
    limit=5,
)
```

**When to use hybrid search:**
- When exact keyword matches are important (e.g., searching for specific terms, IDs)
- To combine semantic understanding with exact text matching (BM25)
- Adjust `alpha` based on whether you prioritize semantic vs. keyword matching

### Step 6: Extend to Full RAG with a Vision Language Model

#### About Ollama

[Ollama](https://ollama.com/) makes it easy to run vision language models locally with a single command. No manual model downloads, GPU configuration, or dependency management required.

**Recommended VLM models for Ollama:**
- `qwen3-vl:4b`: ~4 GB, good for limited hardware
- `qwen3-vl:8b`: ~8 GB, better quality
- `qwen3-vl:32b`: ~32 GB, highest quality
- `gemma3`: Google's multimodal model, available in 4B/12B/27B sizes
- `llava`: LLaVA model, lightweight and fast

#### Install Ollama and Pull a Model

```bash
# Install Ollama (macOS/Linux)
curl -fsSL https://ollama.com/install.sh -o /tmp/ollama-install.sh
less /tmp/ollama-install.sh
sh /tmp/ollama-install.sh

# Or on macOS with Homebrew
brew install ollama

# Pull a vision language model
ollama pull qwen3-vl:4b
```

Verify the model is available:
```bash
ollama list
```

#### Implement Ollama VLM Wrapper

```python
import base64
import ollama

class OllamaVLM:
    def __init__(self, model_name="qwen3-vl:4b"):
        """Initialize with an Ollama vision model name.

        Args:
            model_name: Ollama model tag (must support vision)
        """
        self.model_name = model_name

    def generate_answer(self, query, images_base64, max_tokens=128):
        """Generate text response based on query and retrieved document images.

        Args:
            query: String text query
            images_base64: List of base64-encoded image strings (as returned by Weaviate)
            max_tokens: Maximum tokens to generate (default: 128)

        Returns:
            Generated text answer as string
        """
        # The Ollama SDK "images" key accepts bytes or path-like strings,
        # so decode the base64 strings from Weaviate into raw bytes
        images_bytes = [base64.b64decode(img) for img in images_base64]

        response = ollama.chat(
            model=self.model_name,
            messages=[{
                "role": "user",
                "content": query,
                "images": images_bytes,
            }],
            options={"num_predict": max_tokens},
        )

        return response["message"]["content"]

# Instantiate the VLM
vlm = OllamaVLM(model_name="qwen3-vl:4b")
```

#### Complete RAG Pipeline

```python
def multimodal_rag(query, num_documents=3, max_tokens=128):
    """Complete multimodal RAG pipeline using Weaviate Embeddings + Ollama VLM.

    Args:
        query: Natural language question
        num_documents: Number of documents to retrieve (1-3 recommended)
        max_tokens: Maximum tokens for VLM response

    Returns:
        Dict with query, answer, sources, and metadata
    """
    # Step 1: Retrieve relevant documents (Weaviate handles embedding)
    print(f"Searching for: {query}")
    retrieved_docs = search_documents(query, limit=num_documents)

    # Display retrieved sources
    print(f"\nRetrieved {len(retrieved_docs)} documents:")
    for doc in retrieved_docs:
        print(f"  - {doc['title']}, Page {doc['page_number']} "
              f"(Distance: {doc['distance']:.4f})")

    # Step 2: Extract base64 images from results
    context_images = [doc["image_base64"] for doc in retrieved_docs]

    # Step 3: Generate answer using Ollama VLM
    print(f"\nGenerating answer...")
    answer = vlm.generate_answer(query, context_images, max_tokens=max_tokens)

    # Step 4: Return structured response
    return {
        "query": query,
        "answer": answer,
        "sources": retrieved_docs,
        "num_sources": len(retrieved_docs)
    }

# Example usage
query = "How does DeepSeek-V2 compare against the LLaMA family of LLMs?"
result = multimodal_rag(query, num_documents=1, max_tokens=128)

print(f"\nQuery: {result['query']}")
print(f"Answer: {result['answer']}")
print(f"\nBased on {result['num_sources']} source(s)")
```

#### Response Citation

Include source attribution in generated answers:

```python
def generate_with_citations(query, retrieved_docs, max_tokens=256):
    """Generate answer with source citations.

    Args:
        query: User question
        retrieved_docs: List of documents from search_documents()
        max_tokens: Maximum response length

    Returns:
        Answer string with embedded citations
    """
    # Build source references
    sources_text = "\n".join([
        f"Source {i+1}: \"{doc['title']}\", Page {doc['page_number']}"
        for i, doc in enumerate(retrieved_docs)
    ])

    # Enhanced prompt with citation instructions
    enhanced_query = f"""{query}

Available sources:
{sources_text}

Instructions: Answer the question based on the provided document images.
Cite sources in your answer using [Source N] notation."""

    # Generate answer with citations
    answer = vlm.generate_answer(
        enhanced_query,
        [doc["image_base64"] for doc in retrieved_docs],
        max_tokens=max_tokens
    )

    return answer, retrieved_docs

# Example usage
query = "What is the architecture of GPT-4?"
answer, sources = generate_with_citations(query, search_documents(query, limit=3))
print(f"Answer: {answer}\n")
print("Sources:")
for src in sources:
    print(f"  - {src['title']}, Page {src['page_number']}")
```

## Troubleshooting

### Missing Environment Variables
```
Error: WEAVIATE_URL environment variable is not set
```
**Solution:** Set `WEAVIATE_URL` and `WEAVIATE_API_KEY` environment variables. See `environment_requirements.md`.

### Connection Errors
```
WeaviateConnectionError: Failed to connect to Weaviate
```
**Solution:** Verify `WEAVIATE_URL` is correct and your network can reach the Weaviate Cloud instance.

### Ollama Connection Error
```
ConnectionError: Failed to connect to Ollama
```
**Solution:** Make sure Ollama is running. Start it with:
```bash
ollama serve
```

### Ollama Model Not Found
```
ollama._types.ResponseError: model 'qwen3-vl:4b' not found
```
**Solution:** Pull the model first:
```bash
ollama pull qwen3-vl:4b
```

### Out of Memory (OOM) During VLM Generation
**Symptoms:** Out of memory errors when generating answers.

**Solutions:**
- Reduce `num_documents` — retrieve fewer documents (even 1 can work well)
- Reduce `max_tokens` — shorter responses use less memory
- Use a smaller model variant (`qwen3-vl:4b` instead of `8b`)
- Use API-based VLMs (GPT-4V, Claude, Gemini) to avoid local resource requirements entirely

### BLOB Property Not Returned in Query Results
**Symptom:** `doc_page` field is missing from query results.

**Solution:** BLOB properties used as `image_field` in `multi2vec_weaviate` are not returned by default. Specify them explicitly:
```python
response = collection.query.near_text(
    query=query_text,
    limit=limit,
    return_properties=["page_id", "document_id", "page_number", "title", "doc_page"],
)
```

### Poppler Not Installed (PDF Processing)
```
Exception: Unable to get page count. Is poppler installed and in PATH?
```
**Solution:** Install poppler for `pdf2image`:
```bash
# macOS
brew install poppler

# Ubuntu/Debian
sudo apt-get install poppler-utils
```

### TypeError: unexpected keyword argument 'image_fields'
```
TypeError: _MultiVectors.multi2vec_weaviate() got an unexpected keyword argument 'image_fields'
```
**Cause:** The parameter is singular, not a list.

**Solution:** Use `image_field` (singular) instead of `image_fields`:
```python
Configure.MultiVectors.multi2vec_weaviate(
    name="doc_vector",
    image_field="doc_page",
    ...
)
```

## Done Criteria

The implementation is complete when:
- [ ] Project is initialized with `uv` and all dependencies are installed
- [ ] Document images are converted and uploaded to a Weaviate collection with `multi2vec_weaviate` vectorizer
- [ ] The collection uses `ModernVBERT/colmodernvbert` model with MUVERA encoding configured
- [ ] `search_documents()` returns ranked results with similarity scores for text queries
- [ ] Ollama with a vision language model generates natural language answers from retrieved document images
- [ ] The full `multimodal_rag()` pipeline retrieves documents and generates answers end-to-end

## Next Steps

- **Add metadata filtering** to narrow search scope by document ID, page range, or other properties
- **Implement hybrid search** combining vector similarity with BM25 keyword matching for better precision
- **Add response citations** using `generate_with_citations()` to attribute answers to source documents
- **Scale the dataset** by processing larger document collections with batch chunking and memory management
- **Swap in API-based VLMs** (GPT, Claude, Gemini) or other Ollama vision models (`gemma3`, `llava`) as alternatives
- **Evaluate retrieval quality** by testing queries against known-relevant documents and tuning MUVERA parameters
