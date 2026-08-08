# Query Agent - Ask Mode

Generate AI-powered answers with source citations using the Weaviate Query Agent.

## Usage

```bash
uv run scripts/ask.py --query "USER_QUESTION" --collections "Collection1,Collection2" [--json]
```

## Parameters

| Parameter | Flag | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `--query` | `-q` | Yes | — | Natural language question |
| `--collections` | `-c` | Yes | — | Comma-separated collection names to query across |
| `--json` | — | No | `false` | Output in JSON format |

## Output

- **Default**: Markdown-formatted answer with a sources table
- **JSON**: Structured response with `answer` and `sources` fields

## Examples

Ask a question across multiple collections:

```bash
uv run scripts/ask.py --query "What are the main topics in the dataset?" --collections "Articles,Reports"
```

JSON output:

```bash
uv run scripts/ask.py --query "Summarize recent findings" --collections "Research" --json
```
