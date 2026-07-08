#!/usr/bin/env python3
# /// script
# dependencies = [
#   "weaviate-client==4.19.2",
#   "typer==0.21.0",
# ]
# ///
"""
Keyword (BM25) search on a Weaviate collection.

Usage:
    uv run keyword_search.py --query "your query" --collection "CollectionName" [--limit 10] [--json]

Environment Variables:
    WEAVIATE_URL: Weaviate Cloud cluster URL
    WEAVIATE_API_KEY: API key for authentication
"""

import json
import sys

import typer
import weaviate
from weaviate.classes.query import MetadataQuery

# Import shared connection utilities (local to this skill)
from weaviate_conn import get_client

app = typer.Typer()


def parse_properties(properties_str: str | None) -> list[str] | None:
    """Parse comma-separated property names with optional boost."""
    if not properties_str:
        return None
    return [p.strip() for p in properties_str.split(",") if p.strip()]


@app.command()
def main(
    query: str = typer.Option(..., "--query", "-q", help="Keyword search query"),
    collection: str = typer.Option(..., "--collection", "-c", help="Collection name"),
    limit: int = typer.Option(10, "--limit", "-l", help="Maximum results to return"),
    properties: str = typer.Option(
        None,
        "--properties",
        "-p",
        help="Properties to search with optional boost (e.g., 'title^2,content')",
    ),
    json_output: bool = typer.Option(False, "--json", help="Output in JSON format"),
):
    """Perform keyword (BM25) search on a Weaviate collection."""
    query_properties = parse_properties(properties)

    try:
        with get_client() as client:
            if not client.collections.exists(collection):
                print(f"Error: Collection '{collection}' not found.", file=sys.stderr)
                raise typer.Exit(1)

            coll = client.collections.use(collection)

            print("Searching...", file=sys.stderr)
            response = coll.query.bm25(
                query=query,
                limit=limit,
                query_properties=query_properties,
                return_metadata=MetadataQuery(score=True),
            )
            print("Done.", file=sys.stderr)

            objects = []
            for obj in response.objects:
                obj_data = {
                    "uuid": str(obj.uuid),
                    "properties": dict(obj.properties),
                    "score": obj.metadata.score if obj.metadata else None,
                }
                objects.append(obj_data)

            result = {
                "query": query,
                "collection": collection,
                "limit": limit,
                "query_properties": query_properties,
                "objects": objects,
                "object_count": len(objects),
            }

            if json_output:
                print(json.dumps(result, indent=2, default=str))
            else:
                print(f"## Keyword Search Results\n")
                print(f"**Query:** {query}")
                print(f"**Collection:** {collection}")
                if query_properties:
                    print(f"**Properties:** {', '.join(query_properties)}")
                print(f"**Found:** {len(objects)} objects\n")

                if objects:
                    all_props = set()
                    for obj in objects:
                        all_props.update(obj.get("properties", {}).keys())
                    sorted_props = sorted(list(all_props))

                    headers = ["#", "UUID", "Score"] + sorted_props
                    header_row = "| " + " | ".join(headers) + " |"
                    separator_row = "| " + " | ".join(["---"] * len(headers)) + " |"

                    print(header_row)
                    print(separator_row)

                    for idx, obj in enumerate(objects, 1):
                        score = obj.get("score")
                        score_str = f"{score:.4f}" if score is not None else "N/A"
                        row_data = [
                            str(idx),
                            str(obj.get("uuid", "N/A")),
                            score_str,
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
