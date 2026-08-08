#!/usr/bin/env python3
# /// script
# dependencies = [
#   "weaviate-client==4.19.2",
#   "weaviate-agents==1.2.0",
#   "typer==0.21.0",
# ]
# ///
"""
Query Weaviate using Query Agent in Ask mode.

Usage:
    uv run ask.py --query "your question" --collections "Collection1,Collection2" [--json]

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
    query: str = typer.Option(..., "--query", "-q", help="Natural language question"),
    collections: str = typer.Option(
        ..., "--collections", "-c", help="Comma-separated collection names"
    ),
    json_output: bool = typer.Option(False, "--json", help="Output in JSON format"),
):
    """Query Weaviate using Query Agent in Ask mode (generates answer with sources)."""
    collection_list = parse_collections(collections)

    try:
        with get_client() as client:
            agent = QueryAgent(client=client, collections=collection_list)

            print("Generating answer...", file=sys.stderr)
            response = agent.ask(query)
            print("Done.", file=sys.stderr)

            # Extract data from response
            answer = getattr(response, "final_answer", "") or ""
            sources = []
            if hasattr(response, "sources") and response.sources:
                for src in response.sources:
                    sources.append(
                        {
                            "collection": getattr(src, "collection", None),
                            "object_id": getattr(src, "object_id", None),
                        }
                    )

            result = {
                "query": query,
                "collections": collection_list,
                "answer": answer,
                "sources": sources,
                "source_count": len(sources),
            }

            if json_output:
                print(json.dumps(result, indent=2, default=str))
            else:
                # Markdown output for agent consumption
                print(f"## Answer\n\n{answer}\n")

                if sources:
                    print(f"## Sources ({len(sources)})\n")
                    print("| # | Collection | Object ID |")
                    print("|---|------------|-----------|")
                    for idx, src in enumerate(sources, 1):
                        print(
                            f"| {idx} | {src.get('collection', 'Unknown')} | `{src.get('object_id', 'N/A')}` |"
                        )

    except weaviate.exceptions.WeaviateConnectionError as e:
        print(f"Error: Connection failed - {e}", file=sys.stderr)
        raise typer.Exit(1)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        raise typer.Exit(1)


if __name__ == "__main__":
    app()
