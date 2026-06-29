# Keyword Search

BM25 keyword matching search on a single collection.

## Usage

```bash
uv run scripts/keyword_search.py --query "USER_QUERY" --collection "CollectionName" [--limit 10] [--properties "title^2,content"] [--json]
```

## Parameters

| Parameter | Flag | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `--query` | `-q` | Yes | — | Keyword search query |
| `--collection` | `-c` | Yes | — | Collection name |
| `--limit` | `-l` | No | `10` | Maximum number of results |
| `--properties` | `-p` | No | all | Properties to search with optional boost (e.g., `title^2,content`) |
| `--json` | — | No | `false` | Output in JSON format |

## Output

- **Default**: Markdown table with object properties and BM25 scores
- **JSON**: Array of objects with properties and score metadata

## Examples

Basic keyword search:

```bash
uv run scripts/keyword_search.py --query "Python tutorial" --collection "Articles"
```

Search with property boosting:

```bash
uv run scripts/keyword_search.py --query "authentication" --collection "Docs" --properties "title^2,body"
```
