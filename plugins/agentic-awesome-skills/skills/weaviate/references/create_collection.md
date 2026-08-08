# Create Collection

Create a new Weaviate collection with a custom schema, optional vectorizer, and multi-tenancy support.

## Usage

```bash
uv run scripts/create_collection.py CollectionName --properties '[...]' [--description "..."] [--vectorizer "..."] [--replication-factor N] [--multi-tenancy] [--auto-tenant-creation] [--json]
```

## Parameters

| Parameter | Flag | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `name` | — | Yes (positional) | — | Collection name (auto-capitalized per GraphQL convention) |
| `--properties` | `-p` | Yes | — | JSON array of property definitions |
| `--description` | `-d` | No | — | Collection description — **strongly recommended**. Weaviate agents (Query Agent, Personalization Agent) read this to understand what the collection contains and decide which collection to query |
| `--vectorizer` | `-v` | No | `text2vec_weaviate` | Vectorizer module to use |
| `--replication-factor` | `-r` | No | — | Replication factor (defers to server default when not set) |
| `--multi-tenancy` | `-m` | No | `false` | Enable multi-tenancy for data isolation |
| `--auto-tenant-creation` | `-a` | No | `false` | Auto-create tenants on insert (requires `--multi-tenancy`) |
| `--json` | — | No | `false` | Output in JSON format |

## Property Definition Format

```json
{
  "name": "property_name",
  "data_type": "text",
  "description": "Optional description",
  "tokenization": "word",
  "index_filterable": true,
  "index_searchable": true,
  "index_range_filters": false,
  "nested_properties": []
}
```

- `name` (required): Property name
- `data_type` (required): One of the supported data types below
- `description` (optional): Human-readable description — **strongly recommended**. The Query Agent reads property descriptions to understand your schema, choose the right collection, and construct accurate queries. Good descriptions include units, formats, and valid values (e.g., `"Price in US dollars (USD)"`, `"ISO two-character country code"`, `"Date the paper was published on arXiv"`)
- `tokenization` (optional): For text types — `word`, `lowercase`, `whitespace`, or `field`
- `index_filterable` (optional): Enable roaring-bitmap filter index for `where` clauses. Default `true` for all types except `blob`, `geoCoordinates`, `object`, `object[]`, `phoneNumber`
- `index_searchable` (optional): Enable BM25/inverted index for keyword and hybrid search. Only applies to `text` and `text[]`. Default `true`
- `index_range_filters` (optional): Enable range-comparison index (`>`, `<`, `>=`, `<=`, `between`) for `int`, `int[]`, `number`, `number[]`, `date`, `date[]`. Default `false` — **set to `true` for any numeric or date field you plan to range-filter**
- `nested_properties` (optional): For `object` / `object[]` types — array of nested property definitions

## Supported Data Types

`text`, `text[]`, `boolean`, `boolean[]`, `int`, `int[]`, `number`, `number[]`, `date`, `date[]`, `uuid`, `uuid[]`, `geoCoordinates`, `phoneNumber`, `blob`, `object`, `object[]`

Aliases: `bool` → `boolean`, `bool[]` → `boolean[]`

## Supported Vectorizers

`text2vec_weaviate`, `text2vec_openai`, `text2vec_cohere`, `text2vec_huggingface`, `text2vec_palm`, `text2vec_jinaai`, `text2vec_voyageai`, `text2vec_contextionary`, `text2vec_transformers`, `text2vec_gpt4all`, `text2vec_ollama`, `multi2vec_clip`, `multi2vec_bind`, `multi2vec_palm`, `img2vec_neural`, `ref2vec_centroid`, `none`

## Inferring Schema from Data Files

Before creating a collection, inspect a few rows from the source file to understand field names and value types. Use the commands below — they read only the first 3 objects and are safe on large files.

**CSV:**
```bash
python3 -c "
import csv, json
with open('data.csv') as f:
    rows = list(csv.DictReader(f))[:3]
print(json.dumps(rows, indent=2))
"
```

**JSON:**
```bash
python3 -c "
import json
print(json.dumps(json.load(open('data.json'))[:3], indent=2))
"
```

**JSONL:**
```bash
python3 -c "
import json
lines = []
with open('data.jsonl') as f:
    for line in f:
        if len(lines) >= 3: break
        if line.strip(): lines.append(json.loads(line))
print(json.dumps(lines, indent=2))
"
```

From the sample, map each field to a Weaviate data type:

| Value looks like | data_type |
|---|---|
| `"hello"`, any text | `text` |
| `123`, `"123"` | `int` |
| `1.5`, `"1.5"` | `number` |
| `true`/`false` | `boolean` |
| `"2024-01-15"`, `"2024-01-15T10:30:00Z"` | `date` |
| UUID-shaped string | `uuid` |
| List of strings | `text[]` |
| List of numbers | `int[]` or `number[]` |
| Nested object | `object` |

**Important:** `id`, `_id`, and `_additional` are reserved by Weaviate — never use them as property names. If they appear in your data, use `--skip-fields` or `--mapping` in `import.py` to handle them.

## Examples

Basic collection:

```bash
uv run scripts/create_collection.py Article \
  --description "News articles with title and full body text." \
  --properties '[
    {"name": "title", "data_type": "text", "description": "Title of the article"},
    {"name": "body", "data_type": "text", "description": "Full text body of the article"}
  ]'
```

Collection with various data types, descriptions, and recommended index flags:

```bash
uv run scripts/create_collection.py Product \
  --description "E-commerce product catalog with pricing, brand, stock status, and tags." \
  --properties '[
    {"name": "name", "data_type": "text", "description": "Name or title of the product"},
    {"name": "sku", "data_type": "text", "index_searchable": false, "description": "Stock-keeping unit identifier"},
    {"name": "price", "data_type": "number", "index_range_filters": true, "description": "Product price in US dollars (USD)"},
    {"name": "created_at", "data_type": "date", "index_range_filters": true, "description": "Date the product was added to the catalog"},
    {"name": "in_stock", "data_type": "boolean", "description": "Whether the product is currently in stock"},
    {"name": "tags", "data_type": "text[]", "description": "List of descriptive tags for the product"}
  ]'
```

With explicit vectorizer:

```bash
uv run scripts/create_collection.py Article \
  --description "News articles with title and full body text." \
  --properties '[{"name": "title", "data_type": "text", "description": "Title of the article"}]' \
  --vectorizer "text2vec_openai"
```

With multi-tenancy:

```bash
uv run scripts/create_collection.py Workspace \
  --properties '[{"name": "content", "data_type": "text"}]' \
  --multi-tenancy --auto-tenant-creation
```
