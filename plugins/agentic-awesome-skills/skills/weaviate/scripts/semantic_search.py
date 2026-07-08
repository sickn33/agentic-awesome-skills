#!/usr/bin/env python3
# /// script
# dependencies = [
#   "weaviate-client==4.19.2",
#   "typer==0.21.0",
# ]
# ///
"""
Semantic (vector) search on a Weaviate collection.

Usage:
    uv run semantic_search.py --query "your query" --collection "CollectionName" [--limit 10] [--json]

Environment Variables:
    WEAVIATE_URL: Weaviate Cloud cluster URL
    WEAVIATE_API_KEY: API key for authentication
    + Any provider API keys (OPENAI_API_KEY, COHERE_API_KEY, etc.) - auto-detected
"""

import json
import sys

import typer
import weaviate
from weaviate.classes.query import MetadataQuery

# Import shared connection utilities (local to this skill)
from weaviate_conn import get_client

app = typer.Typer()


@app.command()
def main(
    query: str = typer.Option(..., "--query", "-q", help="Search query text"),
    collection: str = typer.Option(..., "--collection", "-c", help="Collection name"),
    limit: int = typer.Option(10, "--limit", "-l", help="Maximum results to return"),
    distance: float = typer.Option(
        None, "--distance", "-d", help="Maximum distance threshold"
    ),
    target_vector: str = typer.Option(
        None,
        "--target-vector",
        "-t",
        help="Target vector name for named vector collections",
    ),
    json_output: bool = typer.Option(False, "--json", help="Output in JSON format"),
):
    """Perform semantic (vector similarity) search on a Weaviate collection."""
    try:
        with get_client() as client:
            if not client.collections.exists(collection):
                print(f"Error: Collection '{collection}' not found.", file=sys.stderr)
                raise typer.Exit(1)

            coll = client.collections.use(collection)

            print("Searching...", file=sys.stderr)
            response = coll.query.near_text(
                query=query,
                limit=limit,
                distance=distance,
                target_vector=target_vector,
                return_metadata=MetadataQuery(distance=True),
            )
            print("Done.", file=sys.stderr)

            objects = []
            for obj in response.objects:
                obj_data = {
                    "uuid": str(obj.uuid),
                    "properties": dict(obj.properties),
                    "distance": obj.metadata.distance if obj.metadata else None,
                }
                objects.append(obj_data)

            result = {
                "query": query,
                "collection": collection,
                "limit": limit,
                "distance_threshold": distance,
                "target_vector": target_vector,
                "objects": objects,
                "object_count": len(objects),
            }

            if json_output:
                print(json.dumps(result, indent=2, default=str))
            else:
                print(f"## Semantic Search Results\n")
                print(f"**Query:** {query}")
                print(f"**Collection:** {collection}")
                if distance:
                    print(f"**Max Distance:** {distance}")
                print(f"**Found:** {len(objects)} objects\n")

                if objects:
                    all_props = set()
                    for obj in objects:
                        all_props.update(obj.get("properties", {}).keys())
                    sorted_props = sorted(list(all_props))

                    headers = ["#", "UUID", "Distance"] + sorted_props
                    header_row = "| " + " | ".join(headers) + " |"
                    separator_row = "| " + " | ".join(["---"] * len(headers)) + " |"

                    print(header_row)
                    print(separator_row)

                    for idx, obj in enumerate(objects, 1):
                        dist = obj.get("distance")
                        dist_str = f"{dist:.4f}" if dist is not None else "N/A"
                        row_data = [
                            str(idx),
                            str(obj.get("uuid", "N/A")),
                            dist_str,
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
