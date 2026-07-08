#!/usr/bin/env python3
# /// script
# dependencies = [
#   "weaviate-client==4.19.2",
#   "typer==0.21.0",
# ]
# ///
"""
List all Weaviate collections.

Usage:
    uv run list_collections.py [--json]

Environment Variables:
    WEAVIATE_URL: Weaviate Cloud cluster URL
    WEAVIATE_API_KEY: API key for authentication
"""

import json
import sys

import typer
import weaviate

# Import shared connection utilities (local to this skill)
from weaviate_conn import get_client

app = typer.Typer()


@app.command()
def main(
    json_output: bool = typer.Option(False, "--json", help="Output in JSON format"),
):
    """List all Weaviate collections."""
    try:
        with get_client() as client:
            print("Fetching collections...", file=sys.stderr)
            collections = client.collections.list_all(simple=False)
            print(f"Found {len(collections)} collections.", file=sys.stderr)

            if json_output:
                result = []
                for name, config in collections.items():
                    result.append(
                        {
                            "name": name,
                            "description": config.description,
                            "properties": [
                                {"name": p.name, "data_type": str(p.data_type)}
                                for p in config.properties
                            ],
                        }
                    )
                print(json.dumps(result, indent=2, default=str))
            else:
                if not collections:
                    print("No collections found.")
                else:
                    print("## Collections\n")
                    print("| Name | Description | Properties |")
                    print("|------|-------------|------------|")
                    for name, config in collections.items():
                        props = ", ".join([p.name for p in config.properties])
                        desc = config.description or "N/A"
                        print(f"| {name} | {desc} | {props} |")

    except weaviate.exceptions.WeaviateConnectionError as e:
        print(f"Error: Connection failed - {e}", file=sys.stderr)
        raise typer.Exit(1)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        raise typer.Exit(1)


if __name__ == "__main__":
    app()
