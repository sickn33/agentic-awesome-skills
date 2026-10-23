# Import Data

Import one or more CSV, JSON, JSONL, or PDF files into a Weaviate collection with automatic type conversion and column mapping. Multiple supported tabular files can be passed in a single invocation — all objects are appended to the same collection. PDF files are converted page-by-page to base64-encoded JPEG images; the collection is created automatically on first import and reused on subsequent runs.

## Usage

```bash
# CSV/JSON/JSONL — collection must already exist
uv run scripts/import.py --allow-write "data.csv" --collection "CollectionName" [--mapping '{}'] [--tenant "name"] [--batch-size 100] [--json]

# Multiple supported tabular files
uv run scripts/import.py --allow-write a.csv b.csv c.csv --collection "CollectionName"

# PDF — collection is created automatically on first run; appended to on subsequent runs
uv run scripts/import.py --allow-write "document.pdf" --collection "CollectionName" [--image-field "doc_page"] [--batch-size 100] [--json]

# Multiple PDFs into the same collection
uv run scripts/import.py --allow-write page1.pdf page2.pdf page3.pdf --collection "PDFDocuments"
```

## Parameters

| Parameter | Flag | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `files` | — | Yes (positional, one or more) | — | One or more CSV, JSON, JSONL, or PDF files (CSV/JSON/JSONL may be mixed; PDFs imported separately) |
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
- Missing/duplicate/empty headers and inconsistent row widths are rejected. A heuristic warning cannot reliably distinguish all headerless text files; confirm the header manually.

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

For CSV, JSON, and JSONL imports the script uses the collection schema to guide conversion. Values are validated against supported primitive schema types. Invalid conversions fail rather than silently corrupt values:

| Schema type | Conversion |
|---|---|
| `int` / `int[]` | `int(value)` — invalid values fail |
| `number` / `number[]` | `float(value)` — invalid values fail |
| `boolean` / `boolean[]` | `"true"`/`"false"` → bool — invalid values fail |
| `date` / `date[]` | `"YYYY-MM-DD"` → `"YYYY-MM-DDT00:00:00Z"`, timestamps must carry an explicit timezone; never silently reinterpret local times as UTC |
| `text[]`, `int[]`, `number[]`, `boolean[]`, `date[]`, `uuid[]`, `object`, `object[]`, `geoCoordinates`, `phoneNumber` | JSON/JSONL: native arrays/objects must match the declared container type. CSV: cell is parsed with `json.loads()` — invalid values fail |
| `text`, `uuid` | kept as string |
| `blob` | kept as string — must already be base64-encoded in the source data |
| field not in schema | rejected unless explicitly skipped |

`None` and empty strings are skipped. This is not an atomic migration: validate whether those omissions are intended before import.

## Reserved Fields

`id` and `_additional` are reserved by Weaviate and cannot be used as property names (even for nested properties). If your data contains these keys/columns the import will fail. Use `--skip-fields` to drop them or `--mapping` to rename them. 

**IMPORTANT NOTE:** Renaming must **always** be preferred over dropping when the field contains meaningful data. e.g. renaming `id` to `object_id` or `product_id` (based on the data).

`--mapping` and `--skip-fields` operate on top-level fields only. Dot-path
mapping is rejected; nested transformations need a separately reviewed local step.
Mappings that overwrite another top-level field fail. Native nested object
semantics and UUID/blob formats still require server-compatible source validation.

```bash
uv run scripts/import.py --allow-write data.json --allow-write --collection Articles --mapping '{"id":"source_id"}'
```

Imports are nontransactional. The helper validates bounded per-file data before
enqueueing it, but a later-file failure can leave earlier writes. Preserve actual
counts and inspect destination IDs before any retry. It does not provide exactly-once
semantics or automatic rollback. Generated UUIDs may duplicate on a retry.

## Output

- **Default**: Import summary with total, imported, and failed counts (plus sample errors if any)
- **JSON**: Structured import stats

Returns exit code `1` if any imports fail.

## Examples

Import from CSV:

```bash
uv run scripts/import.py --allow-write data.csv --collection "Articles"
```

Import with column mapping:

```bash
uv run scripts/import.py --allow-write data.csv --collection "Articles" \
  --mapping '{"title_col": "title", "body_col": "content"}'
```

Import to multi-tenant collection:

```bash
uv run scripts/import.py --allow-write data.jsonl --collection "Workspace" --tenant "tenant1"
```

Import JSON with custom batch size:

```bash
uv run scripts/import.py --allow-write products.json --collection "Products" --batch-size 500
```

Import a PDF (collection is created automatically on first run):

```bash
uv run scripts/import.py --allow-write paper.pdf --collection "PDFDocuments"
```

Import multiple PDFs into the same collection:

```bash
uv run scripts/import.py --allow-write chapter1.pdf chapter2.pdf chapter3.pdf --collection "PDFDocuments"
```

Import a PDF with a custom image field name:

```bash
uv run scripts/import.py --allow-write paper.pdf --collection "PDFDocuments" --image-field "page_image"
```

Import multiple CSV files into the same collection:

```bash
uv run scripts/import.py --allow-write jan.csv feb.csv mar.csv --collection "Articles"
```


## Bounds and privacy

Use --allow-write only after confirming the instance, collection, tenant and data
transfer authorization. Files must be regular non-symlinks, at most 50 MiB each;
an invocation imports at most 10000 records. JSON is loaded within that bound.
PDF rendering is one page at a time, at most 100 pages, max dimension 1600 pixels,
with subprocess timeouts; resulting images may expose the entire document to the
configured vectorizer. Poppler and model availability are separate prerequisites.
Validate the PDF schema/provider configuration before creation. Auto-tenant creation
can cause side effects and must be separately understood on the target collection.
