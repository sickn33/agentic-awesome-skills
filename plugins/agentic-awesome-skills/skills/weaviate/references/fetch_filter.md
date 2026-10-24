# Fetch and Filter

Fetch objects from a collection by UUID, with filters, or as a unfiltered bounded results. Supports complex nested filter logic (AND, OR).

## Usage

```bash
uv run scripts/fetch_filter.py "CollectionName" [--id "UUID"] [--filters 'JSON'] [--limit 10] [--properties "prop1,prop2"] [--json]
```

## Parameters

| Parameter | Flag | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `collection_name` | — | Yes (positional) | — | Collection name |
| `--id` | — | No | — | Fetch a specific object by UUID |
| `--filters` | `-f` | No | — | JSON string defining filters (see filter syntax below) |
| `--limit` | `-l` | No | `10` | Number of objects to fetch |
| `--properties` | `-p` | No | all | Comma-separated properties to include in output |
| `--json` | — | No | `false` | Output in JSON format |

## Modes

1. **Fetch by UUID**: Use `--id` to retrieve a specific object
2. **Fetch with filters**: Use `--filters` to retrieve filtered subsets
3. **Fetch unfiltered bounded results**: Omit both `--id` and `--filters` for unfiltered results

## Filter Syntax

### Simple property filter

```json
{"property": "category", "operator": "equal", "value": "Science"}
```

### Logical operators (AND / OR)

```json
{"operator": "and", "filters": [
  {"property": "category", "operator": "equal", "value": "Science"},
  {"property": "year", "operator": "greater_than", "value": 2020}
]}
```

### List of filters (implicit AND)

```json
[
  {"property": "category", "operator": "equal", "value": "Science"},
  {"property": "year", "operator": "greater_than", "value": 2020}
]
```

### Supported operators

`equal`, `not_equal`, `less_than`, `less_or_equal`, `greater_than`, `greater_or_equal`, `like`, `contains_any`, `contains_all`, `is_none`

## Output

- **Default**: Markdown table with object UUIDs and properties
- **JSON**: Array of objects with full metadata

## Examples

Fetch by UUID:

```bash
uv run scripts/fetch_filter.py "Articles" --id "550e8400-e29b-41d4-a716-446655440000"
```

Filter by property:

```bash
uv run scripts/fetch_filter.py "Products" --filters '{"property": "price", "operator": "less_than", "value": 50}'
```

Complex filter with AND/OR:

```bash
uv run scripts/fetch_filter.py "Articles" --filters '{"operator": "or", "filters": [{"property": "category", "operator": "equal", "value": "Science"}, {"property": "category", "operator": "equal", "value": "Tech"}]}'
```

Select specific properties:

```bash
uv run scripts/fetch_filter.py "Products" --properties "name,price" --limit 5
```


Malformed/empty predicates and unknown operators fail before querying. --id and
--filters cannot be combined. --properties also applies to UUID retrieval. A limit
is 1..1000. Unfiltered results are not a statistical random sample.
