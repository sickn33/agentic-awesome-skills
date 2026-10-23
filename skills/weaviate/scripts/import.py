#!/usr/bin/env python3
# /// script
# dependencies = [
#   "weaviate-client==4.19.2",
#   "typer==0.21.0",
#   "pdf2image>=1.17.0",
#   "pillow>=10.0.0",
# ]
# ///
"""
Import data from CSV, JSON, JSONL, or PDF files to a Weaviate collection.

Usage:
    uv run import.py data.csv --collection "CollectionName" [options]
    uv run import.py document.pdf --collection "CollectionName" [options]

Environment Variables:
    WEAVIATE_URL: Weaviate Cloud cluster URL
    WEAVIATE_API_KEY: API key for authentication
    + Explicit WEAVIATE_PROVIDER_KEYS allowlist only; unrelated credentials are never forwarded
"""

import base64
import math
import os
import stat
from datetime import datetime
import csv
import itertools
import json
import re
import sys
from collections.abc import Iterator
from io import BytesIO
from pathlib import Path
from typing import Any

_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
_DATETIME_RE = re.compile(r"^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}$")
_RESERVED_FIELDS = {"id", "_additional"}

import typer
import weaviate
from weaviate.classes.config import Configure, DataType, Property

# Import shared connection utilities (local to this skill)
from weaviate_conn import get_client

# Types whose string values must never be JSON-parsed (already correct as strings)
_KEEP_AS_STRING = {DataType.TEXT, DataType.UUID, DataType.BLOB}

app = typer.Typer()


MAX_INPUT_BYTES = 50 * 1024 * 1024
MAX_OBJECTS = 10000


def check_input(path):
    if path.is_symlink() or any(parent.is_symlink() for parent in path.absolute().parents):
        raise ValueError("input symlinks are not supported")
    st = path.stat()
    if not stat.S_ISREG(st.st_mode) or st.st_size > MAX_INPUT_BYTES:
        raise ValueError("input must be a regular file of at most 50 MiB")


def strict_json(text):
    def pairs(values):
        result = {}
        for key, value in values:
            if key in result:
                raise ValueError("duplicate JSON key")
            result[key] = value
        return result
    return json.loads(text, object_pairs_hook=pairs,
                      parse_constant=lambda value: (_ for _ in ()).throw(ValueError("nonfinite JSON number")))


def mapped_object(obj, mapping):
    if not isinstance(obj, dict):
        raise ValueError("each source record must be an object")
    result = {}
    for key, value in obj.items():
        target = mapping.get(key, key) if mapping else key
        if target in result:
            raise ValueError("mapping would overwrite another field")
        result[target] = value
    return result


def detect_file_format(file_path: Path) -> str:
    """
    Detect file format based on extension.

    Args:
        file_path: Path to the file

    Returns:
        File format: "csv", "json", or "jsonl"

    Raises:
        ValueError: If file format is not supported
    """
    extension = file_path.suffix.lower()

    if extension == ".csv":
        return "csv"
    elif extension == ".json":
        return "json"
    elif extension == ".jsonl":
        return "jsonl"
    elif extension == ".pdf":
        return "pdf"
    else:
        raise ValueError(
            f"Unsupported file format: {extension}. "
            f"Supported formats: .csv, .json, .jsonl, .pdf"
        )


def read_csv(
    file_path: Path, mapping: dict[str, str] | None = None
) -> Iterator[dict[str, Any]]:
    """
    Read data from CSV file with automatic dialect detection.

    Yields rows one at a time — suitable for large files.

    Args:
        file_path: Path to CSV file
        mapping: Optional column name mapping

    Yields:
        Row dictionaries with data
    """
    check_input(file_path)
    with open(file_path, "r", encoding="utf-8") as f:
        # Read a sample to detect the CSV dialect
        sample = f.read(8192)
        f.seek(0)

        # Use Sniffer to detect the dialect (delimiter, quoting, etc.)
        sniffer = csv.Sniffer()
        try:
            dialect = sniffer.sniff(sample)
        except csv.Error:
            dialect = csv.excel

        reader = csv.DictReader(f, dialect=dialect)

        # Warn if the header row looks like data (all-numeric or JSON-like values
        # suggest the file has no header row and the first data row was misread as one).
        if reader.fieldnames:
            suspicious = [
                k
                for k in reader.fieldnames
                if k
                and (
                    k.lstrip("-").replace(".", "", 1).isdigit()
                    or k.startswith(("[", "{"))
                )
            ]
            if suspicious:
                print(
                    f"Warning: CSV column names look like data values: {suspicious}. "
                    f"Ensure the first row is a header row with property names.",
                    file=sys.stderr,
                )

        if not reader.fieldnames or len(set(reader.fieldnames)) != len(reader.fieldnames) or any(not name for name in reader.fieldnames):
            raise ValueError("CSV needs distinct nonempty header fields")
        for row in reader:
            if None in row or any(value is None for value in row.values()):
                raise ValueError("CSV row does not match the header width")
            yield mapped_object(row, mapping)


def read_json(
    file_path: Path, mapping: dict[str, str] | None = None
) -> list[dict[str, Any]]:
    """
    Read data from JSON file (expects array of objects).

    Args:
        file_path: Path to JSON file
        mapping: Optional key name mapping

    Returns:
        List of dictionaries with data

    Raises:
        ValueError: If JSON is not an array
    """
    check_input(file_path)
    with open(file_path, "r", encoding="utf-8") as f:
        data = strict_json(f.read())

    if not isinstance(data, list):
        raise ValueError(
            f"JSON file must contain an array of objects, got {type(data).__name__}"
        )

    if len(data) > MAX_OBJECTS:
        raise ValueError("JSON exceeds 10000 records")
    return [mapped_object(obj, mapping) for obj in data]


def read_jsonl(
    file_path: Path, mapping: dict[str, str] | None = None
) -> Iterator[dict[str, Any]]:
    """
    Read data from JSONL file (one JSON object per line).

    Yields objects one at a time — suitable for large files.

    Args:
        file_path: Path to JSONL file
        mapping: Optional key name mapping

    Yields:
        Object dictionaries with data
    """
    check_input(file_path)
    with open(file_path, "r", encoding="utf-8") as f:
        for line_num, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            try:
                obj = strict_json(line)
                yield mapped_object(obj, mapping)
            except json.JSONDecodeError as e:
                raise ValueError(f"Invalid JSON on line {line_num}: {e}")


def read_pdf(
    file_path: Path, image_field: str = "doc_page"
) -> Iterator[dict[str, Any]]:
    """
    Convert each page of a PDF to a base64-encoded JPEG and yield as objects.

    Each page becomes one Weaviate object with the base64 image stored in
    `image_field`, plus `page_number` and `file_name` metadata properties.
    Page images are freed from memory after encoding.

    Args:
        file_path: Path to the PDF file
        image_field: Name of the BLOB property to store the base64 image

    Yields:
        Dicts with image_field, page_number, and file_name keys

    Raises:
        RuntimeError: If poppler is not installed
    """
    check_input(file_path)
    from pdf2image import convert_from_path, pdfinfo_from_path
    count = pdfinfo_from_path(str(file_path), timeout=30).get("Pages")
    if not isinstance(count, int) or not 1 <= count <= 100:
        raise ValueError("PDF must contain 1..100 pages")
    for page_num in range(1, count + 1):
        pages = convert_from_path(str(file_path), first_page=page_num, last_page=page_num,
                                  size=1600, timeout=60, thread_count=1)
        if len(pages) != 1:
            raise ValueError("unexpected rendered PDF page count")
        page_img = pages[0]
        try:
            buffer = BytesIO()
            page_img.convert("RGB").save(buffer, format="JPEG")
            yield {image_field: base64.b64encode(buffer.getvalue()).decode("ascii"),
                   "page_number": page_num, "file_name": file_path.stem}
        finally:
            page_img.close()


def create_pdf_collection(
    client: weaviate.WeaviateClient, name: str, image_field: str
) -> None:
    """
    Create a Weaviate collection with the standard multimodal PDF schema.

    Properties: image_field (BLOB), page_number (INT), file_name (TEXT)
    Vectorizer: multi2vec_weaviate with ModernVBERT/colmodernvbert + MUVERA encoding

    Args:
        client: Connected Weaviate client
        name: Collection name
        image_field: Name of the BLOB property to store base64 page images
    """
    client.collections.create(
        name=name,
        properties=[
            Property(name=image_field, data_type=DataType.BLOB),
            Property(name="page_number", data_type=DataType.INT),
            Property(name="file_name", data_type=DataType.TEXT),
        ],
        vector_config=[
            Configure.MultiVectors.multi2vec_weaviate(
                name="doc_vector",
                image_field=image_field,
                model="ModernVBERT/colmodernvbert",
                encoding=Configure.VectorIndex.MultiVector.Encoding.muvera(
                    ksim=4,
                    dprojections=16,
                    repetitions=20,
                ),
            )
        ],
    )


def convert_types(obj, prop_types):
    if not isinstance(obj, dict):
        raise ValueError("source row must be an object")
    def scalar(value, kind):
        if kind == DataType.INT:
            if isinstance(value, bool) or not (isinstance(value, int) or
                    isinstance(value, str) and re.fullmatch(r"[+-]?\d+", value)):
                raise ValueError("integer conversion would lose data")
            return int(value)
        if kind == DataType.NUMBER:
            if isinstance(value, bool) or not isinstance(value, (str,int,float)):
                raise ValueError("number required")
            result = float(value)
            if not math.isfinite(result):
                raise ValueError("number must be finite")
            return result
        if kind == DataType.BOOL:
            if isinstance(value, bool): return value
            if isinstance(value, str) and value.lower() in {"true", "false"}:
                return value.lower() == "true"
            raise ValueError("boolean must be true or false")
        if kind == DataType.DATE:
            if not isinstance(value, str): raise ValueError("date must be text")
            if _DATE_RE.fullmatch(value): value += "T00:00:00Z"
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
            if parsed.tzinfo is None:
                raise ValueError("datetime needs an explicit timezone")
            return parsed.isoformat()
        if kind in _KEEP_AS_STRING and not isinstance(value, str):
            raise ValueError("text/uuid/blob must remain strings")
        return value
    arrays = {DataType.INT_ARRAY: DataType.INT, DataType.NUMBER_ARRAY:DataType.NUMBER,
              DataType.BOOL_ARRAY:DataType.BOOL, DataType.DATE_ARRAY:DataType.DATE,
              DataType.TEXT_ARRAY:DataType.TEXT, DataType.UUID_ARRAY:DataType.UUID}
    result = {}
    for key,value in obj.items():
        if value is None or value == "": continue
        if key in _RESERVED_FIELDS or key == "_id":
            raise ValueError("reserved field must be explicitly renamed or skipped")
        if key not in prop_types:
            raise ValueError("unknown property; define schema or explicitly skip it")
        kind = prop_types[key]
        if kind in arrays:
            value = strict_json(value) if isinstance(value,str) else value
            if not isinstance(value,list): raise ValueError("array property requires an array")
            result[key] = [scalar(element,arrays[kind]) for element in value]
        elif kind in {DataType.OBJECT,DataType.OBJECT_ARRAY,DataType.GEO_COORDINATES,DataType.PHONE_NUMBER}:
            value = strict_json(value) if isinstance(value,str) else value
            if not isinstance(value, list if kind == DataType.OBJECT_ARRAY else dict):
                raise ValueError("object property shape mismatch")
            result[key] = value
        else: result[key] = scalar(value,kind)
    return result


def import_objects(
    coll: Any,
    data: Iterator[dict[str, Any]],
    prop_types: dict[str, DataType],
    skip_set: set[str],
    batch_size: int,
) -> tuple[int, int, int, list[str]]:
    """
    Batch-insert objects from *data* into *coll*.

    Returns:
        (total_count, imported_count, failed_count, errors)
    """
    total_count = 0
    imported_count = 0
    failed_count = 0
    errors: list[str] = []

    with coll.batch.fixed_size(batch_size=batch_size) as batch:
        for i, obj in enumerate(data, 1):
            total_count += 1
            try:
                converted_obj = convert_types({k:v for k,v in obj.items() if k not in skip_set}, prop_types)
                batch.add_object(properties=converted_obj)
                imported_count += 1

                if i % batch_size == 0:
                    print(f"Progress: {i} objects processed", file=sys.stderr)

            except Exception as e:
                failed_count += 1
                error_msg = f"Object {i}: validation or enqueue failed"
                if len(errors) < 10:
                    errors.append(error_msg)
                    if len(errors) <= 5:
                        print(f"Warning: {error_msg}", file=sys.stderr)

    # Check for server-side failures
    server_failed = 0
    for failed_obj in coll.batch.failed_objects:
        server_failed += 1
        if len(errors) < 10:
            errors.append("Server rejected an enqueued object; inspect sanitized diagnostics separately")

    failed_count += server_failed
    return total_count, max(0, imported_count - server_failed), failed_count, errors


@app.command()
def main(
    files: list[str] = typer.Argument(
        ..., help="One or more CSV, JSON, JSONL, or PDF files"
    ),
    collection: str = typer.Option(
        ..., "--collection", "-c", help="Target collection name"
    ),
    mapping: str = typer.Option(
        None,
        "--mapping",
        "-m",
        help="JSON object mapping file columns/keys to properties",
    ),
    tenant: str = typer.Option(
        None, "--tenant", "-t", help="Tenant name for multi-tenant collections"
    ),
    batch_size: int = typer.Option(
        100, "--batch-size", "-b", help="Number of objects per batch"
    ),
    image_field: str = typer.Option(
        "doc_page",
        "--image-field",
        "-i",
        help="BLOB property name to store base64 page images (PDF imports only)",
    ),
    skip_fields: str = typer.Option(
        None,
        "--skip-fields",
        help="Comma-separated field names to exclude from import (e.g. 'id,created_at')",
    ),
    allow_write: bool = typer.Option(False, "--allow-write", help="Authorize bounded import and optional PDF collection creation"),
    json_output: bool = typer.Option(False, "--json", help="Output in JSON format"),
):
    """Import data from CSV, JSON, JSONL, or PDF files to a Weaviate collection."""
    if not allow_write:
        raise typer.BadParameter("data mutation requires --allow-write")
    try:
        # Validate all file paths up front
        file_paths: list[Path] = []
        for f in files:
            fp = Path(f)
            check_input(fp)
            if not fp.exists():
                print(f"Error: File not found: {f}", file=sys.stderr)
                raise typer.Exit(1)
            file_paths.append(fp)

        # Parse mapping if provided
        mapping_dict = None
        if mapping:
            try:
                mapping_dict = json.loads(mapping)
                if not isinstance(mapping_dict, dict) or not all(
                        isinstance(k,str) and isinstance(v,str) and k and v and "." not in k and "." not in v
                        for k,v in mapping_dict.items()):
                    raise ValueError("mapping supports nonempty top-level string keys only")
            except json.JSONDecodeError as e:
                print(f"Error: Invalid JSON in mapping: {e}", file=sys.stderr)
                raise typer.Exit(1)

        # Parse skip_fields
        skip_set: set[str] = (
            {f.strip() for f in skip_fields.split(",")} if skip_fields else set()
        )

        # Validate batch size
        if not 1 <= batch_size <= 1000:
            print("Error: Batch size must be 1..1000", file=sys.stderr)
            raise typer.Exit(1)

        # Detect formats. CSV/JSON/JSONL can be mixed freely; PDF cannot be mixed with them.
        try:
            fmt_by_path = {fp: detect_file_format(fp) for fp in file_paths}
        except ValueError as e:
            print("Error: operation failed; inspect sanitized diagnostics separately", file=sys.stderr)
            raise typer.Exit(1)

        has_pdf = any(f == "pdf" for f in fmt_by_path.values())
        has_non_pdf = any(f != "pdf" for f in fmt_by_path.values())
        if has_pdf and has_non_pdf:
            print(
                "Error: PDF files cannot be mixed with CSV/JSON/JSONL files. "
                "Import PDFs separately.",
                file=sys.stderr,
            )
            raise typer.Exit(1)

        # Connect to Weaviate once for all files
        with get_client() as client:
            # PDF: create collection if absent, append if it exists. CSV/JSON/JSONL: must already exist.
            if has_pdf:
                if not client.collections.exists(collection):
                    print(
                        f"Creating collection '{collection}' with multimodal PDF schema...",
                        file=sys.stderr,
                    )
                    create_pdf_collection(client, collection, image_field)
                    print(f"Collection '{collection}' created.", file=sys.stderr)
                else:
                    print(
                        f"Collection '{collection}' exists — appending pages to it.",
                        file=sys.stderr,
                    )
            else:
                if not client.collections.exists(collection):
                    print(
                        f"Error: Collection '{collection}' does not exist. "
                        f"Read `weaviate` skill's `create_collection.md` reference to create it first.",
                        file=sys.stderr,
                    )
                    raise typer.Exit(1)

            # Fetch schema once — used for multi-tenancy check and type-safe coercion
            coll = client.collections.get(collection)
            config = coll.config.get()
            prop_types: dict[str, DataType] = {
                p.name: p.data_type for p in config.properties
            }
            is_multi_tenant = (
                config.multi_tenancy_config.enabled
                if config.multi_tenancy_config
                else False
            )

            # Validate tenant parameter
            if is_multi_tenant and not tenant:
                print(
                    f"Error: Collection '{collection}' is multi-tenant, "
                    f"--tenant parameter is required",
                    file=sys.stderr,
                )
                raise typer.Exit(1)
            elif not is_multi_tenant and tenant:
                print(
                    f"Warning: Collection '{collection}' is not multi-tenant, "
                    f"--tenant parameter will be ignored",
                    file=sys.stderr,
                )
                raise ValueError("tenant supplied for a non-multi-tenant collection")

            if tenant:
                coll = coll.with_tenant(tenant)
                print(f"Using tenant: {tenant}", file=sys.stderr)

            # Process each file
            grand_total = grand_imported = grand_failed = 0
            all_errors: list[str] = []
            file_results = []

            for file_path in file_paths:
                file_fmt = fmt_by_path[file_path]
                print(
                    f"\n[{file_fmt.upper()}] {file_path}",
                    file=sys.stderr,
                )

                try:
                    if file_fmt == "csv":
                        data: Iterator[dict[str, Any]] = read_csv(
                            file_path, mapping_dict
                        )
                    elif file_fmt == "json":
                        data = iter(read_json(file_path, mapping_dict))
                    elif file_fmt == "jsonl":
                        data = read_jsonl(file_path, mapping_dict)
                    elif file_fmt == "pdf":
                        if mapping_dict:
                            print(
                                "Warning: --mapping is not supported for PDF imports and will be ignored.",
                                file=sys.stderr,
                            )
                        data = read_pdf(file_path, image_field)
                except Exception as e:
                    print(f"Error reading file: {e}", file=sys.stderr)
                    raise typer.Exit(1)

                # Read bounded records before enqueueing this file. Imports remain nontransactional.
                data = list(itertools.islice(data, MAX_OBJECTS + 1))
                if len(data) > MAX_OBJECTS or grand_total + len(data) > MAX_OBJECTS:
                    raise ValueError("invocation exceeds 10000 objects")
                for row in data:
                    convert_types({k:v for k,v in row.items() if k not in skip_set}, prop_types)
                data = iter(data)
                # Peek: validate non-empty and warn on reserved fields
                first = next(data, None)
                if first is None:
                    print(
                        f"Warning: No data found in {file_path}, skipping.",
                        file=sys.stderr,
                    )
                    continue
                if file_fmt != "pdf":
                    reserved_found = (set(first.keys()) & _RESERVED_FIELDS) - skip_set
                    if reserved_found:
                        print(
                            f"Warning: Reserved Weaviate field(s) detected in data: "
                            f"{', '.join(sorted(reserved_found))}. "
                            f"These will cause import failures. "
                            f"Use --skip-fields to exclude or --mapping to rename them.",
                            file=sys.stderr,
                        )
                data = itertools.chain([first], data)

                print(
                    f"Importing objects in batches of {batch_size}...", file=sys.stderr
                )
                total, imported, failed, errors = import_objects(
                    coll, data, prop_types, skip_set, batch_size
                )
                grand_total += total
                grand_imported += imported
                grand_failed += failed
                all_errors.extend(errors)
                file_results.append(
                    {
                        "file": str(file_path),
                        "format": file_fmt,
                        "total_objects": total,
                        "imported": imported,
                        "failed": failed,
                        **({"errors": errors[:10]} if errors else {}),
                    }
                )

            grand_success = grand_imported

            result = {
                "collection": collection,
                "tenant": tenant,
                "total_objects": grand_total,
                "imported": grand_success,
                "failed": grand_failed,
                "files": file_results,
            }
            if has_pdf:
                result["image_field"] = image_field
            if all_errors:
                result["errors"] = all_errors[:10]

            if json_output:
                print(json.dumps(result, indent=2))
            else:
                print("\nImport finished; inspect counts for partial failures.", file=sys.stderr)
                print(f"\n**Collection:** {collection}")
                if tenant:
                    print(f"**Tenant:** {tenant}")
                if len(file_paths) > 1:
                    print(f"**Files Processed:** {len(file_results)}")
                print(f"**Total Objects:** {grand_total}")
                print(f"**Successfully Imported:** {grand_success}")
                if grand_failed > 0:
                    print(f"**Failed:** {grand_failed}")
                    if all_errors:
                        print(f"\n**Sample Errors:**")
                        for error in all_errors[:5]:
                            print(f"  - {error}")

            if grand_failed > 0:
                raise typer.Exit(1)

    except weaviate.exceptions.WeaviateConnectionError as e:
        print("Error: connection failed; inspect sanitized diagnostics separately", file=sys.stderr)
        raise typer.Exit(1)
    except Exception as e:
        print("Error: operation failed; inspect sanitized diagnostics separately", file=sys.stderr)
        raise typer.Exit(1)


if __name__ == "__main__":
    app()
