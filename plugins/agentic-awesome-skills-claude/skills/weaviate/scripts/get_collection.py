#!/usr/bin/env python3
# /// script
# dependencies = [
#   "weaviate-client==4.19.2",
#   "typer==0.21.0",
# ]
# ///
"""
Get details of a specific Weaviate collection.

Usage:
    uv run get_collection.py --name "CollectionName" [--json]

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
    name: str = typer.Option(..., "--name", "-n", help="Collection name"),
    json_output: bool = typer.Option(False, "--json", help="Output in JSON format"),
):
    """Get detailed configuration of a Weaviate collection."""
    try:
        with get_client() as client:
            if not client.collections.exists(name):
                print(f"Error: Collection '{name}' not found.", file=sys.stderr)
                raise typer.Exit(1)

            print("Fetching collection details...", file=sys.stderr)
            collection = client.collections.use(name)
            config = collection.config.get()

            # Extract vectorizer config
            vectorizer_config = None
            if hasattr(config, "vectorizer_config") and config.vectorizer_config:
                vc = config.vectorizer_config
                if hasattr(vc, "vectorizer"):
                    vectorizer_config = {
                        "vectorizer": str(vc.vectorizer.value)
                        if hasattr(vc.vectorizer, "value")
                        else str(vc.vectorizer),
                        "model": getattr(vc, "model", None),
                    }

            # Extract properties
            properties = []
            if hasattr(config, "properties") and config.properties:
                for p in config.properties:
                    prop_info = {
                        "name": p.name,
                        "data_type": str(p.data_type),
                        "description": getattr(p, "description", None),
                    }
                    properties.append(prop_info)

            result = {
                "name": name,
                "description": config.description,
                "vectorizer_config": vectorizer_config,
                "properties": properties,
                "replication_factor": getattr(config.replication_config, "factor", None)
                if hasattr(config, "replication_config")
                else None,
                "multi_tenancy_enabled": getattr(
                    config.multi_tenancy_config, "enabled", False
                )
                if hasattr(config, "multi_tenancy_config")
                else False,
            }

            if json_output:
                print(json.dumps(result, indent=2, default=str))
            else:
                print(f"## Collection: {name}\n")
                print(f"**Description:** {config.description or 'N/A'}")

                if vectorizer_config:
                    print(
                        f"**Vectorizer:** {vectorizer_config.get('vectorizer', 'N/A')}"
                    )
                    if vectorizer_config.get("model"):
                        print(f"**Model:** {vectorizer_config['model']}")

                print(
                    f"**Replication Factor:** {result['replication_factor'] or 'N/A'}"
                )
                print(
                    f"**Multi-Tenancy:** {'Enabled' if result['multi_tenancy_enabled'] else 'Disabled'}"
                )

                if properties:
                    print(f"\n### Properties ({len(properties)})\n")
                    print("| Name | Data Type | Description |")
                    print("|------|-----------|-------------|")
                    for prop in properties:
                        desc = prop.get("description") or "-"
                        print(f"| {prop['name']} | {prop['data_type']} | {desc} |")

    except weaviate.exceptions.WeaviateConnectionError as e:
        print(f"Error: Connection failed - {e}", file=sys.stderr)
        raise typer.Exit(1)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        raise typer.Exit(1)


if __name__ == "__main__":
    app()
