#!/usr/bin/env python3
# /// script
# dependencies = [
#   "weaviate-client==4.19.2",
#   "typer==0.21.0",
# ]
# ///
"""
Fetch and filter objects from a Weaviate collection.

Usage:
    # Fetch random 10 objects
    uv run fetch_filter.py "JeopardyQuestion"

    # Fetch by ID
    uv run fetch_filter.py "JeopardyQuestion" --id "uuid-string"

    # Filter with simple JSON
    uv run fetch_filter.py "JeopardyQuestion" --filters '[{"property": "round", "operator": "equal", "value": "Double Jeopardy!"}]'

Environment Variables:
    WEAVIATE_URL: Weaviate Cloud cluster URL
    WEAVIATE_API_KEY: API key for authentication
"""

import json
import sys
from typing import Any, List, Optional

import typer
import weaviate
from weaviate.classes.query import Filter

# Import shared connection utilities (local to this skill)
from weaviate_conn import get_client

app = typer.Typer()


def parse_filter_item(item: Any, depth: int = 0) -> Filter:
    if depth > 20:
        raise ValueError("filter nesting exceeds 20")
    if isinstance(item, list):
        if not item or len(item) > 100:
            raise ValueError("filter lists must contain 1..100 predicates")
        return Filter.all_of([parse_filter_item(child, depth + 1) for child in item])
    if not isinstance(item, dict):
        raise ValueError("each filter must be an object or nonempty list")
    op = item.get("operator")
    if op in {"and", "or"}:
        children = item.get("filters")
        if not isinstance(children, list) or not children or len(children) > 100:
            raise ValueError("logical filters require 1..100 child predicates")
        values = [parse_filter_item(child, depth + 1) for child in children]
        return Filter.all_of(values) if op == "and" else Filter.any_of(values)
    operators = {"equal", "not_equal", "less_than", "less_or_equal", "greater_than",
                 "greater_or_equal", "like", "contains_any", "contains_all", "is_none"}
    prop = item.get("property")
    if not isinstance(prop, str) or not prop or op not in operators or "value" not in item:
        raise ValueError("invalid property filter or unsupported operator")
    value = item["value"]
    if op in {"contains_any", "contains_all"} and (not isinstance(value, list) or not value):
        raise ValueError("contains operators require a nonempty list")
    if op == "is_none" and not isinstance(value, bool):
        raise ValueError("is_none requires an actual boolean")
    return getattr(Filter.by_property(prop), op)(value)


def parse_filters(filter_json: str) -> Optional[Filter]:
    """
    Parse a JSON string of filters into a Weaviate Filter object.
    Supports complex nesting with AND/OR.
    """
    if not filter_json:
        return None

    if len(filter_json.encode()) > 65536:
        raise ValueError("filter exceeds 64 KiB")
    try:
        data = json.loads(filter_json)
    except json.JSONDecodeError as e:
        print(f"Error parsing filters JSON: {e}", file=sys.stderr)
        raise typer.Exit(1)

    return parse_filter_item(data)


@app.command()
def main(
    collection_name: str = typer.Argument(..., help="Collection name"),
    obj_id: str = typer.Option(None, "--id", help="Fetch specific object by UUID"),
    filters: str = typer.Option(None, "--filters", "-f", help="JSON string of filters"),
    limit: int = typer.Option(10, "--limit", "-l", help="Number of objects to fetch"),
    properties: str = typer.Option(
        None,
        "--properties",
        "-p",
        help="Comma-separated properties to include (default: all)",
    ),
    json_output: bool = typer.Option(False, "--json", help="Output in JSON format"),
):
    """Fetch objects with optional filtering."""
    if obj_id and filters:
        raise typer.BadParameter("--id and --filters are mutually exclusive")
    if not 1 <= limit <= 1000:
        raise typer.BadParameter("limit must be 1..1000")
    parsed_filter = parse_filters(filters)
    try:
        with get_client() as client:
            if not client.collections.exists(collection_name):
                print(
                    f"Error: Collection '{collection_name}' not found.", file=sys.stderr
                )
                raise typer.Exit(1)

            collection = client.collections.use(collection_name)

            # Determine return properties
            return_properties = None
            if properties:
                return_properties = [
                    p.strip() for p in properties.split(",") if p.strip()
                ]

            results = []

            if obj_id:
                # Fetch single object by ID
                if not json_output:
                    print(f"Fetching object {obj_id}...", file=sys.stderr)

                obj = collection.query.fetch_object_by_id(obj_id, return_properties=return_properties)

                if obj:
                    results.append(obj)
                else:
                    print(f"Error: Object {obj_id} not found.", file=sys.stderr)
                    raise typer.Exit(1)

            else:
                # Fetch multiple with filters
                weaviate_filter = parsed_filter

                if not json_output:
                    print(
                        f"Fetching objects from '{collection_name}'...", file=sys.stderr
                    )

                response = collection.query.fetch_objects(
                    filters=weaviate_filter,
                    limit=limit,
                    return_properties=return_properties,
                )
                results = list(response.objects)

            # Output Formatting
            output_data = []
            for obj in results:
                item = {
                    "uuid": str(obj.uuid),
                    "properties": obj.properties,
                    "metadata": {
                        "creation_time": str(obj.metadata.creation_time)
                        if obj.metadata and obj.metadata.creation_time
                        else None,
                    },
                }
                output_data.append(item)

            if json_output:
                print(json.dumps(output_data, indent=2, default=str))
            else:
                if not results:
                    print("No objects found.")
                else:
                    print(f"## Found {len(results)} Objects\n")

                    # Gather all property keys for the table headers
                    all_keys = set()
                    for item in output_data:
                        all_keys.update(item["properties"].keys())
                    sorted_keys = sorted(list(all_keys))

                    # Table Header
                    headers = ["UUID"] + sorted_keys
                    print("| " + " | ".join(headers) + " |")
                    print("| " + " | ".join(["---"] * len(headers)) + " |")

                    for item in output_data:
                        row = [str(item["uuid"])]
                        for k in sorted_keys:
                            val = item["properties"].get(k, "-")
                            val_str = str(val).replace("\n", " ").replace("|", "\\|")
                            if len(val_str) > 100:
                                val_str = val_str[:97] + "..."
                            row.append(val_str)
                        print("| " + " | ".join(row) + " |")

    except weaviate.exceptions.WeaviateConnectionError as e:
        print("Error: connection failed; inspect sanitized diagnostics separately", file=sys.stderr)
        raise typer.Exit(1)
    except Exception as e:
        print("Error: operation failed; inspect sanitized diagnostics separately", file=sys.stderr)
        raise typer.Exit(1)


if __name__ == "__main__":
    app()
