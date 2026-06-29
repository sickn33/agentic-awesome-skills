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


def parse_filter_item(item: Any) -> Optional[Filter]:
    """
    Recursively parse a single filter item (dict or list).

    Supported structures:
    1. List of filters (implicit AND): [filter1, filter2]
    2. Explicit Logical Operators:
       {"operator": "and", "filters": [...]}
       {"operator": "or", "filters": [...]}
    3. Property Filter:
       {"property": "name", "operator": "equal", "value": "foo"}
    """
    if isinstance(item, list):
        # Implicit AND for lists
        sub_filters = [parse_filter_item(x) for x in item]
        # Filter out Nones
        sub_filters = [f for f in sub_filters if f is not None]
        if not sub_filters:
            return None
        return Filter.all_of(sub_filters)

    if not isinstance(item, dict):
        return None

    # Check for logical operators
    op = item.get("operator")

    if op == "and":
        sub_items = item.get("filters", [])
        sub_filters = [parse_filter_item(x) for x in sub_items]
        sub_filters = [f for f in sub_filters if f is not None]
        return Filter.all_of(sub_filters) if sub_filters else None

    if op == "or":
        sub_items = item.get("filters", [])
        sub_filters = [parse_filter_item(x) for x in sub_items]
        sub_filters = [f for f in sub_filters if f is not None]
        return Filter.any_of(sub_filters) if sub_filters else None

    # Property Filter
    prop = item.get("property")
    val = item.get("value")

    if not prop or not op:
        return None

    current_filter = Filter.by_property(prop)

    # Map operator string to method
    if op == "equal":
        return current_filter.equal(val)
    elif op == "not_equal":
        return current_filter.not_equal(val)
    elif op == "less_than":
        return current_filter.less_than(val)
    elif op == "less_or_equal":
        return current_filter.less_or_equal(val)
    elif op == "greater_than":
        return current_filter.greater_than(val)
    elif op == "greater_or_equal":
        return current_filter.greater_or_equal(val)
    elif op == "like":
        return current_filter.like(val)
    elif op == "contains_any":
        if not isinstance(val, list):
            print(
                f"Error: Value for 'contains_any' must be a list, got {type(val)}",
                file=sys.stderr,
            )
            raise typer.Exit(1)
        return current_filter.contains_any(val)
    elif op == "contains_all":
        if not isinstance(val, list):
            print(
                f"Error: Value for 'contains_all' must be a list, got {type(val)}",
                file=sys.stderr,
            )
            raise typer.Exit(1)
        return current_filter.contains_all(val)
    elif op == "is_none":
        return current_filter.is_none(bool(val))
    else:
        print(
            f"Warning: Unknown operator '{op}' for property '{prop}'. Skipping.",
            file=sys.stderr,
        )
        return None


def parse_filters(filter_json: str) -> Optional[Filter]:
    """
    Parse a JSON string of filters into a Weaviate Filter object.
    Supports complex nesting with AND/OR.
    """
    if not filter_json:
        return None

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

                obj = collection.query.fetch_object_by_id(obj_id)

                if obj:
                    results.append(obj)
                else:
                    print(f"Error: Object {obj_id} not found.", file=sys.stderr)
                    raise typer.Exit(1)

            else:
                # Fetch multiple with filters
                weaviate_filter = parse_filters(filters)

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
                        if obj.metadata.creation_time
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
        print(f"Error: Connection failed - {e}", file=sys.stderr)
        raise typer.Exit(1)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        raise typer.Exit(1)


if __name__ == "__main__":
    app()
