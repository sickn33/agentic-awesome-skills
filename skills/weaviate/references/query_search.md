# Query Agent - Search Mode

Retrieve raw objects using natural language queries across multiple collections via the Weaviate Query Agent.

## Usage

```bash
uv run scripts/query_search.py --query "USER_QUERY" --collections "Collection1,Collection2" [--limit 10] [--json]
```

## Parameters

| Parameter | Flag | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `--query` | `-q` | Yes | — | Natural language search query |
| `--collections` | `-c` | Yes | — | Comma-separated collection names to search across |
| `--limit` | `-l` | No | `10` | Maximum number of results to return |
| `--json` | — | No | `false` | Output in JSON format |

## Output

- **Default**: Markdown table with UUIDs, collection names, and all object properties (columns generated dynamically)
- **JSON**: Array of objects with `uuid`, `collection`, and `properties`

## Examples

Search across collections:

```bash
uv run scripts/query_search.py --query "machine learning papers" --collections "Articles,Research" --limit 5
```

JSON output:

```bash
uv run scripts/query_search.py --query "products under $50" --collections "Products" --json
```

