# Explore Collection

Get statistical insights, aggregation metrics, and sample data from a collection.

## Usage

```bash
uv run scripts/explore_collection.py "CollectionName" [--limit 5] [--no-metrics] [--json]
```

## Parameters

| Parameter | Flag | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `name` | — | Yes (positional) | — | Collection name |
| `--limit` | `-l` | No | `5` | Number of sample objects to show |
| `--no-metrics` | — | No | `false` | Skip calculating individual property metrics (faster) |
| `--json` | — | No | `false` | Output in JSON format |

## Metrics by Data Type

The script calculates aggregation metrics based on property data types:

| Data Type | Metrics |
|-----------|---------|
| **Text** | count, top_occurrences (top 5 values with counts) |
| **Int / Number** | count, min, max, mean, median, mode, sum |
| **Boolean** | count, percentage_true, percentage_false, total_true, total_false |
| **Date** | count, min, max, median, mode |

Use `--no-metrics` to skip metric calculation for faster results when you only need sample objects.

## Output

- **Default**: Markdown-formatted report with total count, per-property metrics tables, and sample objects
- **JSON**: Structured metrics and sample data

## Examples

Explore with default settings:

```bash
uv run scripts/explore_collection.py "Articles"
```

More samples, skip metrics:

```bash
uv run scripts/explore_collection.py "Products" --limit 20 --no-metrics
```
