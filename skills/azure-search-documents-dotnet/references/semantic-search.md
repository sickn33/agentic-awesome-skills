# Semantic Search Patterns

Detailed patterns for semantic ranking, captions, and answers with Azure.Search.Documents.

## Index Configuration for Semantic Search

```csharp
using Azure.Search.Documents.Indexes.Models;

var index = new SearchIndex("articles")
{
    Fields =
    {
        new SimpleField("id", SearchFieldDataType.String) { IsKey = true },
        new SearchableField("title"),
        new SearchableField("content"),
        new SearchableField("summary"),
        new SearchableField("category") { IsFilterable = true }
    },
    SemanticSearch = new SemanticSearch
    {
        DefaultConfigurationName = "my-semantic-config",
        Configurations =
        {
            new SemanticConfiguration("my-semantic-config", new SemanticPrioritizedFields
            {
                TitleField = new SemanticField("title"),
                ContentFields =
                {
                    new SemanticField("content"),
                    new SemanticField("summary")
                },
                KeywordsFields =
                {
                    new SemanticField("category")
                }
            })
        }
    }
};

await indexClient.CreateOrUpdateIndexAsync(index);
```

## Basic Semantic Search

```csharp
using Azure.Search.Documents.Models;

var options = new SearchOptions
{
    QueryType = SearchQueryType.Semantic,
    SemanticSearch = new SemanticSearchOptions
    {
        SemanticConfigurationName = "my-semantic-config"
    },
    Select = { "id", "title", "content" },
    Size = 10
};

var results = await searchClient.SearchAsync<Article>(
    "What are the best practices for cloud security?",
    options);

await foreach (var result in results.Value.GetResultsAsync())
{
    Console.WriteLine($"{result.Document.Title} (Score: {result.Score})");
}
```

## Semantic Search with Captions

Captions provide highlighted excerpts showing why a document matched:

```csharp
var options = new SearchOptions
{
    QueryType = SearchQueryType.Semantic,
    SemanticSearch = new SemanticSearchOptions
    {
        SemanticConfigurationName = "my-semantic-config",
        QueryCaption = new QueryCaption(QueryCaptionType.Extractive)
        {
            HighlightEnabled = true
        }
    }
};

var results = await searchClient.SearchAsync<Article>("cloud security best practices", options);

await foreach (var result in results.Value.GetResultsAsync())
{
    Console.WriteLine($"Title: {result.Document.Title}");

    if (result.SemanticSearch?.Captions != null)
    {
        foreach (var caption in result.SemanticSearch.Captions)
        {
            // Highlights contains <em> tags around key phrases
            Console.WriteLine($"Caption: {caption.Highlights ?? caption.Text}");
        }
    }
}
```

## Semantic Search with Answers

Answers extract direct responses from the content:

```csharp
var options = new SearchOptions
{
    QueryType = SearchQueryType.Semantic,
    SemanticSearch = new SemanticSearchOptions
    {
        SemanticConfigurationName = "my-semantic-config",
        QueryAnswer = new QueryAnswer(QueryAnswerType.Extractive)
        {
            Count = 3,  // Number of answers to return
            Threshold = 0.7  // Minimum confidence threshold
        },
        QueryCaption = new QueryCaption(QueryCaptionType.Extractive)
    }
};

var results = await searchClient.SearchAsync<Article>(
    "What is zero trust security?",
    options);

// Check for semantic answers (appear before documents)
if (results.Value.SemanticSearch?.Answers != null)
{
    foreach (var answer in results.Value.SemanticSearch.Answers)
    {
        Console.WriteLine($"Answer: {answer.Highlights ?? answer.Text}");
        Console.WriteLine($"Score: {answer.Score}");
        Console.WriteLine($"Document Key: {answer.Key}");
    }
}

// Process documents with captions
await foreach (var result in results.Value.GetResultsAsync())
{
    Console.WriteLine($"\nDocument: {result.Document.Title}");
    Console.WriteLine($"Reranker Score: {result.SemanticSearch?.RerankerScore}");
}
```

## Semantic Hybrid Search (Vector + Keyword + Semantic)

Combines modalities; compare relevance against a measured baseline:

```csharp
var vectorQuery = new VectorizedQuery(embedding)
{
    KNearestNeighborsCount = 50,
    Fields = { "contentVector" }
};

var options = new SearchOptions
{
    QueryType = SearchQueryType.Semantic,
    SemanticSearch = new SemanticSearchOptions
    {
        SemanticConfigurationName = "my-semantic-config",
        QueryCaption = new QueryCaption(QueryCaptionType.Extractive),
        QueryAnswer = new QueryAnswer(QueryAnswerType.Extractive)
    },
    VectorSearch = new VectorSearchOptions
    {
        Queries = { vectorQuery }
    },
    Select = { "id", "title", "content" },
    Size = 10
};

// Keyword search + vector search + semantic reranking
var results = await searchClient.SearchAsync<Article>(
    "best practices for securing cloud infrastructure",
    options);
```

## Semantic Configuration Options

### SemanticPrioritizedFields

| Field | Purpose | Recommendation |
|-------|---------|----------------|
| `TitleField` | Document title | Short, descriptive field |
| `ContentFields` | Main content (ordered by priority) | Up to 10 fields, most important first |
| `KeywordsFields` | Keywords/tags | Categorical or tag fields |

### QueryCaption Options

```csharp
new QueryCaption(QueryCaptionType.Extractive)
{
    HighlightEnabled = true  // Wrap key phrases in <em> tags
}
```

### QueryAnswer Options

```csharp
new QueryAnswer(QueryAnswerType.Extractive)
{
    Count = 3,        // Max answers to return (1-10)
    Threshold = 0.7   // Minimum confidence (0.0-1.0)
}
```

## Semantic Ranking Scores

| Score | Description |
|-------|-------------|
| `result.Score` | BM25 for text-only queries; RRF for hybrid queries |
| `result.SemanticSearch.RerankerScore` | Semantic relevance (0-4 scale) |
| `answer.Score` | Answer confidence (0-1 scale) |

## Error Handling

```csharp
var results = await searchClient.SearchAsync<Article>(query, options);

// Check if semantic search was applied
if (results.Value.SemanticSearch?.ErrorReason != null)
{
    Console.WriteLine($"Semantic search warning: {results.Value.SemanticSearch.ErrorReason}");
    // Results still returned, but without semantic ranking
}
```

## Best Practices

1. **Configure semantic fields carefully** - Title and content fields significantly impact quality
2. **Use answers for Q&A scenarios** - Set appropriate threshold to filter low-confidence answers
3. **Combine with vector search** - Measure whether semantic hybrid improves the target query set
4. **Monitor reranker scores** - Calibrate thresholds against labeled queries; scores are not universal confidence probabilities
5. **Enable captions** - Helps users understand why documents matched
6. **Set answer count appropriately** - More answers = more latency
7. **Use filters before semantic ranking** - Reduces documents to rerank

Highlight strings contain indexed text as well as tags: escape or sanitize with a strict markup policy before HTML rendering. Captions/answers may be absent. Partial semantic results do not establish whether ranking ran; inspect supported partial-response fields for the pinned SDK and handle RequestFailedException. The sketches omit Article, client setup and consistent JSON field mappings.
