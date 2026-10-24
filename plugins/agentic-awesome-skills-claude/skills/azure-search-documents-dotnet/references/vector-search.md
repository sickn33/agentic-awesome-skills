# Vector Search Patterns

Detailed patterns for vector and hybrid search with Azure.Search.Documents.

## Index Configuration for Vector Search

```csharp
using Azure.Search.Documents.Indexes.Models;

var index = new SearchIndex("products")
{
    Fields =
    {
        new SimpleField("id", SearchFieldDataType.String) { IsKey = true },
        new SearchableField("name"),
        new SearchableField("description"),
        new SearchField("descriptionVector", SearchFieldDataType.Collection(SearchFieldDataType.Single))
        {
            VectorSearchDimensions = 1536,  // Must match embedding model
            VectorSearchProfileName = "vector-profile"
        }
    },
    VectorSearch = new VectorSearch
    {
        Profiles =
        {
            new VectorSearchProfile("vector-profile", "hnsw-algo")
            {
                VectorizerName = "openai-vectorizer"  // Optional: for integrated vectorization
            }
        },
        Algorithms =
        {
            new HnswAlgorithmConfiguration("hnsw-algo")
            {
                Parameters = new HnswParameters
                {
                    M = 4,
                    EfConstruction = 400,
                    EfSearch = 500,
                    Metric = VectorSearchAlgorithmMetric.Cosine
                }
            }
        },
        Vectorizers =
        {
            new AzureOpenAIVectorizer("openai-vectorizer")
            {
                Parameters = new AzureOpenAIVectorizerParameters
                {
                    ResourceUri = new Uri("https://<resource>.openai.azure.com"),
                    DeploymentName = "text-embedding-ada-002",
                    ModelName = "text-embedding-ada-002"
                }
            }
        }
    }
};
```

## Pure Vector Search

```csharp
using Azure.Search.Documents.Models;

// Get embedding from your embedding model
float[] embedding = await GetEmbeddingAsync("luxury hotel with pool");

var vectorQuery = new VectorizedQuery(embedding)
{
    KNearestNeighborsCount = 10,
    Fields = { "descriptionVector" },
    Exhaustive = false  // Use HNSW index (faster)
};

var options = new SearchOptions
{
    VectorSearch = new VectorSearchOptions
    {
        Queries = { vectorQuery }
    },
    Select = { "id", "name", "description" }
};

// Pass null for search text in pure vector search
var results = await searchClient.SearchAsync<Product>(null, options);

await foreach (var result in results.Value.GetResultsAsync())
{
    Console.WriteLine($"{result.Document.Name} (Score: {result.Score})");
}
```

## Hybrid Search (Vector + Keyword)

```csharp
var vectorQuery = new VectorizedQuery(embedding)
{
    KNearestNeighborsCount = 10,
    Fields = { "descriptionVector" }
};

var options = new SearchOptions
{
    VectorSearch = new VectorSearchOptions
    {
        Queries = { vectorQuery }
    },
    Select = { "id", "name", "description" },
    Size = 10
};

// Pass search text for hybrid search
var results = await searchClient.SearchAsync<Product>("luxury pool", options);
```

## Multi-Vector Search

Search across multiple vector fields:

```csharp
var titleVector = new VectorizedQuery(titleEmbedding)
{
    KNearestNeighborsCount = 10,
    Fields = { "titleVector" }
};

var descriptionVector = new VectorizedQuery(descriptionEmbedding)
{
    KNearestNeighborsCount = 10,
    Fields = { "descriptionVector" }
};

var options = new SearchOptions
{
    VectorSearch = new VectorSearchOptions
    {
        Queries = { titleVector, descriptionVector }
    }
};
```

## Vector Search with Filters

```csharp
var vectorQuery = new VectorizedQuery(embedding)
{
    KNearestNeighborsCount = 10,
    Fields = { "descriptionVector" }
};

var options = new SearchOptions
{
    VectorSearch = new VectorSearchOptions
    {
        Queries = { vectorQuery }
    },
    Filter = "category eq 'Electronics' and price lt 500",
    Select = { "id", "name", "price", "category" }
};

var results = await searchClient.SearchAsync<Product>(null, options);
```

## Integrated Vectorization (Text-to-Vector)

When a vectorizer is configured, you can search with text directly:

```csharp
var vectorQuery = new VectorizableTextQuery("luxury hotel with ocean view")
{
    KNearestNeighborsCount = 10,
    Fields = { "descriptionVector" }
};

var options = new SearchOptions
{
    VectorSearch = new VectorSearchOptions
    {
        Queries = { vectorQuery }
    }
};

// No need to generate embeddings client-side
var results = await searchClient.SearchAsync<Hotel>(null, options);
```

## Algorithm Configuration

### HNSW (Hierarchical Navigable Small World)

Best for most scenarios - fast approximate nearest neighbor search:

```csharp
new HnswAlgorithmConfiguration("hnsw-algo")
{
    Parameters = new HnswParameters
    {
        M = 4,              // Connections per layer (4-10 typical)
        EfConstruction = 400,  // Index build quality (higher = better, slower)
        EfSearch = 500,     // Search quality (higher = better, slower)
        Metric = VectorSearchAlgorithmMetric.Cosine
    }
}
```

### Exhaustive KNN

Exact nearest neighbor search (slower but precise):

```csharp
new ExhaustiveKnnAlgorithmConfiguration("exhaustive-algo")
{
    Parameters = new ExhaustiveKnnParameters
    {
        Metric = VectorSearchAlgorithmMetric.Cosine
    }
}
```

## Vector Search Metrics

| Metric | Use Case |
|--------|----------|
| `Cosine` | Text embeddings (most common) |
| `Euclidean` | When magnitude matters |
| `DotProduct` | Normalized vectors, performance |

## Best Practices

1. **Match dimensions** to your embedding model (e.g., 1536 for text-embedding-ada-002)
2. **Use HNSW** for production workloads (faster than exhaustive)
3. **Tune EfSearch** based on latency vs. recall requirements
4. **Apply filters** to reduce search space before vector comparison
5. **Use integrated vectorization** to simplify client code
6. **Combine with semantic ranking** and measure relevance

Integrated query vectorization needs an authorized Search-service identity (or securely configured credential), embedding-service roles, network access and a compatible model/deployment; index-time vector generation is a separate pipeline. The shown fields do not define later category/price/titleVector fields: extend the schema before those queries. GetEmbeddingAsync and Product are application-supplied. Preserve embedding model/dimension consistency and test filter recall and latency; HNSW is approximate and not universally preferable.
