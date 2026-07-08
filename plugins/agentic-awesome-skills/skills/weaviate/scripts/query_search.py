#!/usr/bin/env python3
# /// script
# dependencies = [
#   "weaviate-client==4.19.2",
#   "weaviate-agents==1.2.0",
#   "typer==0.21.0",
# ]
# ///
"""
Query Weaviate using Query Agent in Search mode.

Usage:
    uv run search.py --query "your query" --collections "Collection1,Collection2" [--limit 10] [--json]

Environment Variables:
    WEAVIATE_URL: Weaviate Cloud cluster URL
    WEAVIATE_API_KEY: API key for authentication
    + Any provider API keys (OPENAI_API_KEY, COHERE_API_KEY, etc.) - auto-detected
"""

import json
import sys

import typer
import weaviate
from weaviate.agents.query import QueryAgent

# Import shared connection utilities (local to this skill)
from weaviate_conn import get_client

app = typer.Typer()


def parse_collections(collections_str: str) -> list[str]:
    """Parse comma-separated collection names."""
    collections = [c.strip() for c in collections_str.split(",") if c.strip()]
    if not collections:
        print("Error: At least one collection name required", file=sys.stderr)
        raise typer.Exit(1)
    return collections


@app.command()
def main(
    query: str = typer.Option(
        ..., "--query", "-q", help="Natural language search query"
    ),
    collections: str = typer.Option(
        ..., "--collections", "-c", help="Comma-separated collection names"
    ),
    limit: int = typer.Option(10, "--limit", "-l", help="Maximum results to return"),
    json_output: bool = typer.Option(False, "--json", help="Output in JSON format"),
):
    """Query Weaviate using Query Agent in Search mode (retrieves raw objects)."""
    collection_list = parse_collections(collections)

    try:
        with get_client() as client:
            agent = QueryAgent(client=client, collections=collection_list)

            print("Searching...", file=sys.stderr)
            response = agent.search(query, limit=limit)
            print("Done.", file=sys.stderr)

            # Extract objects from search results
            objects = []
            if hasattr(response, "search_results") and response.search_results:
                search_results = response.search_results
                if hasattr(search_results, "objects") and search_results.objects:
                    for obj in search_results.objects:
                        obj_data = {
                            "uuid": str(getattr(obj, "uuid", "")),
                            "collection": getattr(obj, "collection", None),
                            "properties": dict(getattr(obj, "properties", {})),
                        }
                        objects.append(obj_data)

            result = {
                "query": query,
                "collections": collection_list,
                "limit": limit,
                "objects": objects,
                "object_count": len(objects),
            }

            if json_output:
                print(json.dumps(result, indent=2, default=str))
            else:
                print(f"## Search Results\n")
                print(f"**Query:** {query}")
                print(f"**Collections:** {', '.join(collection_list)}")
                print(f"**Found:** {len(objects)} objects\n")

                if objects:
                    # Collect all property keys
                    all_props = set()
                    for obj in objects:
                        all_props.update(obj.get("properties", {}).keys())
                    sorted_props = sorted(list(all_props))

                    headers = ["#", "UUID", "Collection"] + sorted_props
                    header_row = "| " + " | ".join(headers) + " |"
                    separator_row = "| " + " | ".join(["---"] * len(headers)) + " |"

                    print(header_row)
                    print(separator_row)

                    for idx, obj in enumerate(objects, 1):
                        row_data = [
                            str(idx),
                            str(obj.get("uuid", "N/A")),
                            str(obj.get("collection", "N/A")),
                        ]

                        props = obj.get("properties", {})
                        for prop in sorted_props:
                            val = props.get(prop, "-")
                            val_str = str(val).replace("\n", " ").replace("|", "\\|")
                            row_data.append(val_str)

                        print("| " + " | ".join(row_data) + " |")
                    print()
                else:
                    print("No objects found matching the query.\n")

    except weaviate.exceptions.WeaviateConnectionError as e:
        print(f"Error: Connection failed - {e}", file=sys.stderr)
        raise typer.Exit(1)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        raise typer.Exit(1)


if __name__ == "__main__":
    app()
