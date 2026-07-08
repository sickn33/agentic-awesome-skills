# List Collections

Show all available Weaviate collections with their properties.

## Usage

```bash
uv run scripts/list_collections.py [--json]
```

## Parameters

| Parameter | Flag | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `--json` | — | No | `false` | Output in JSON format |

## Output

- **Default**: Markdown table with collection names, descriptions, and property lists
- **JSON**: Array of collection objects with full property details

## Examples

```bash
uv run scripts/list_collections.py
```

```bash
uv run scripts/list_collections.py --json
```

