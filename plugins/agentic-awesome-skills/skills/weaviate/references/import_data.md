# Import Data

Import one or more CSV, JSON, JSONL, or PDF files into a Weaviate collection with automatic type conversion and column mapping. Multiple files of the same format can be passed in a single invocation — all objects are appended to the same collection. PDF files are converted page-by-page to base64-encoded JPEG images; the collection is created automatically on first import and reused on subsequent runs.

## Usage

```bash
# CSV/JSON/JSONL — collection must already exist
uv run scripts/import.py "data.csv" --collection "CollectionName" [--mapping '{}'] [--tenant "name"] [--batch-size 100] [--json]

# Multiple files of the same format
uv run scripts/import.py a.csv b.csv c.csv --collection "CollectionName"

# PDF — collection is created automatically on first run; appended to on subsequent runs
uv run scripts/import.py "document.pdf" --collection "CollectionName" [--image-field "doc_page"] [--batch-size 100] [--json]

# Multiple PDFs into the same collection
uv run scripts/import.py page1.pdf page2.pdf page3.pdf --collection "PDFDocuments"
```

## Parameters

| Parameter | Flag | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `files` | — | Yes (positional, one or more) | — | One or more CSV, JSON, JSONL, or PDF files (all must be the same format) |
| `--collection` | `-c` | Yes | — | Target collection name (must already exist for CSV/JSON/JSONL; created automatically for PDF if absent, otherwise appended to) |
| `--mapping` | `-m` | No | — | JSON object mapping file columns/keys to collection properties (CSV/JSON/JSONL only) |
| `--tenant` | `-t` | No | — | Tenant name for multi-tenant collections (required if collection has multi-tenancy enabled) |
| `--batch-size` | `-b` | No | `100` | Number of objects per batch |
| `--image-field` | `-i` | No | `doc_page` | BLOB property name to store base64 page images (PDF imports only) |
| `--skip-fields` | — | No | — | Comma-separated field names to exclude from import (e.g. `vector`) |
| `--json` | — | No | `false` | Output in JSON format |

## File Formats

### CSV

- First row must be a header — column names must match collection property names (case-sensitive)
- Delimiter and quoting auto-detected via `csv.Sniffer`
- Files without a header row are rejected with a clear error

### JSON

- Must be an array of objects: `[{"prop1": "value1"}, {"prop2": "value2"}]`
- Keys must match collection property names
- The entire file is loaded into memory — for large datasets, always prefer JSONL

### JSONL

- One JSON object per line
- Each object's keys must match collection property names
- Streamed line-by-line — preferred format for large datasets

### PDF

- Each page is converted to a JPEG image and base64-encoded
- Each page becomes one Weaviate object with these properties:
  - `doc_page` (or `--image-field` value): base64-encoded JPEG image of the page
  - `page_number`: 1-indexed page number (int)
  - `file_name`: PDF filename without extension (text)
- The collection is **created automatically** with `multi2vec_weaviate` (`ModernVBERT/colmodernvbert` + MUVERA encoding) if it does not already exist. If the collection already exists, pages are appended to it — allowing multiple PDFs to be loaded into the same collection across multiple runs.
- Requires `poppler` to be installed on the system (for Mac, simply run `brew install poppler`)

## Type Conversion

For CSV, JSON, and JSONL imports the script uses the collection schema to guide conversion. Non-string values (JSON/JSONL native types) pass through unchanged. String values are cast based on the declared property type:

| Schema type | Conversion |
|---|---|
| `int` / `int[]` | `int(value)` — falls back to string if it fails |
| `number` / `number[]` | `float(value)` — falls back to string if it fails |
| `boolean` / `boolean[]` | `"true"`/`"false"` → bool — falls back to string |
| `date` / `date[]` | `"YYYY-MM-DD"` → `"YYYY-MM-DDT00:00:00Z"`, `"YYYY-MM-DD HH:MM:SS"` → RFC3339 with `Z` |
| `text[]`, `int[]`, `number[]`, `boolean[]`, `date[]`, `uuid[]`, `object`, `object[]`, `geoCoordinates`, `phoneNumber` | JSON/JSONL: native lists/dicts pass through unchanged. CSV: cell is parsed with `json.loads()` — falls back to string if it fails |
| `text`, `uuid` | kept as string |
| `blob` | kept as string — must already be base64-encoded in the source data |
| field not in schema | kept as string |

`None` and empty strings are always skipped.

## Reserved Fields

`id` and `_additional` are reserved by Weaviate and cannot be used as property names (even for nested properties). If your data contains these keys/columns the import will fail. Use `--skip-fields` to drop them or `--mapping` to rename them. 

**IMPORTANT NOTE:** Renaming must **always** be preferred over dropping when the field contains meaningful data. e.g. renaming `id` to `object_id` or `product_id` (based on the data).

`--mapping` and `--skip-fields` support dot notation for nested object fields (e.g. `author.id`).

```bash
# Drop the top-level id field entirely
uv run scripts/import.py data.json --collection "Articles" --skip-fields "id"

# Rename top-level id to source_id
uv run scripts/import.py data.json --collection "Articles" --mapping '{"id": "source_id"}'

# Rename a nested id field inside an object property (e.g. author.id → author.author_id)
uv run scripts/import.py data.json --collection "Articles" --mapping '{"author.id": "author.author_id"}'

# Drop a nested id field
uv run scripts/import.py data.json --collection "Articles" --skip-fields "author.id"
```

## Output

- **Default**: Import summary with total, imported, and failed counts (plus sample errors if any)
- **JSON**: Structured import stats

Returns exit code `1` if any imports fail.

## Examples

Import from CSV:

```bash
uv run scripts/import.py data.csv --collection "Articles"
```

Import with column mapping:

```bash
uv run scripts/import.py data.csv --collection "Articles" \
  --mapping '{"title_col": "title", "body_col": "content"}'
```

Import to multi-tenant collection:

```bash
uv run scripts/import.py data.jsonl --collection "Workspace" --tenant "tenant1"
```

Import JSON with custom batch size:

```bash
uv run scripts/import.py products.json --collection "Products" --batch-size 500
```

Import a PDF (collection is created automatically on first run):

```bash
uv run scripts/import.py paper.pdf --collection "PDFDocuments"
```

Import multiple PDFs into the same collection:

```bash
uv run scripts/import.py chapter1.pdf chapter2.pdf chapter3.pdf --collection "PDFDocuments"
```

Import a PDF with a custom image field name:

```bash
uv run scripts/import.py paper.pdf --collection "PDFDocuments" --image-field "page_image"
```

Import multiple CSV files into the same collection:

```bash
uv run scripts/import.py jan.csv feb.csv mar.csv --collection "Articles"
```

