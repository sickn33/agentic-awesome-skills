# Semantic Search

Pure vector similarity search using embeddings on a single collection.

## Usage

```bash
uv run scripts/semantic_search.py --query "USER_QUERY" --collection "CollectionName" [--limit 10] [--distance 0.5] [--target-vector "vector_name"] [--json]
```

## Parameters

| Parameter | Flag | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `--query` | `-q` | Yes | — | Search query text |
| `--collection` | `-c` | Yes | — | Collection name |
| `--limit` | `-l` | No | `10` | Maximum number of results |
| `--distance` | `-d` | No | — | Maximum distance threshold (filters out less similar results) |
| `--target-vector` | `-t` | No | — | Target vector name for named vector collections |
| `--json` | — | No | `false` | Output in JSON format |

## Output

- **Default**: Markdown table with object properties and distance scores
- **JSON**: Array of objects with properties and distance metadata

## Examples

Basic semantic search:

```bash
uv run scripts/semantic_search.py --query "environmental impact of urbanization" --collection "Research"
```

With distance threshold:

```bash
uv run scripts/semantic_search.py --query "machine learning" --collection "Papers" --distance 0.3 --limit 5
```

With named vector:

```bash
uv run scripts/semantic_search.py --query "abstract art" --collection "Artworks" --target-vector "description_vector"
```

