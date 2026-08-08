#!/usr/bin/env python3
# /// script
# dependencies = [
#   "weaviate-client==4.19.2",
#   "typer==0.21.0",
# ]
# ///
"""
Create a Weaviate collection.

Usage:
    uv run create_collection.py CollectionName --properties '[...]' [options]

Environment Variables:
    WEAVIATE_URL: Weaviate Cloud cluster URL
    WEAVIATE_API_KEY: API key for authentication
    + Any provider API keys (OPENAI_API_KEY, COHERE_API_KEY, etc.) - auto-detected
"""

import json
import sys

import typer
import weaviate
from weaviate.classes.config import (
    Configure,
    DataType,
    Property,
    Tokenization,
)

# Import shared connection utilities (local to this skill)
from weaviate_conn import get_client

app = typer.Typer()

# Data type string to enum mapping
DATA_TYPE_MAP = {
    "text": DataType.TEXT,
    "text[]": DataType.TEXT_ARRAY,
    "boolean": DataType.BOOL,
    "boolean[]": DataType.BOOL_ARRAY,
    "bool": DataType.BOOL,
    "bool[]": DataType.BOOL_ARRAY,
    "int": DataType.INT,
    "int[]": DataType.INT_ARRAY,
    "number": DataType.NUMBER,
    "number[]": DataType.NUMBER_ARRAY,
    "date": DataType.DATE,
    "date[]": DataType.DATE_ARRAY,
    "uuid": DataType.UUID,
    "uuid[]": DataType.UUID_ARRAY,
    "geoCoordinates": DataType.GEO_COORDINATES,
    "phoneNumber": DataType.PHONE_NUMBER,
    "blob": DataType.BLOB,
    "object": DataType.OBJECT,
    "object[]": DataType.OBJECT_ARRAY,
}

# Types that support index_range_filters (enabled by default for better range query performance)
RANGE_FILTER_TYPES = {"int", "int[]", "number", "number[]", "date", "date[]"}

# Tokenization string to enum mapping
TOKENIZATION_MAP = {
    "word": Tokenization.WORD,
    "lowercase": Tokenization.LOWERCASE,
    "whitespace": Tokenization.WHITESPACE,
    "field": Tokenization.FIELD,
}

# Vectorizer string to config mapping
VECTORIZER_MAP = {
    "text2vec_weaviate": lambda: Configure.Vectors.text2vec_weaviate(),
    "text2vec_openai": lambda: Configure.Vectors.text2vec_openai(),
    "text2vec_cohere": lambda: Configure.Vectors.text2vec_cohere(),
    "text2vec_huggingface": lambda: Configure.Vectors.text2vec_huggingface(),
    "text2vec_google_gemini": lambda: Configure.Vectors.text2vec_google_gemini(),
    "text2vec_jinaai": lambda: Configure.Vectors.text2vec_jinaai(),
    "text2vec_voyageai": lambda: Configure.Vectors.text2vec_voyageai(),
    "text2vec_model2vec": lambda: Configure.Vectors.text2vec_model2vec(),
    "text2vec_transformers": lambda: Configure.Vectors.text2vec_transformers(),
    "text2vec_ollama": lambda: Configure.Vectors.text2vec_ollama(),
    "multi2vec_clip": lambda: Configure.Vectors.multi2vec_clip(),
    "multi2vec_bind": lambda: Configure.Vectors.multi2vec_bind(),
    "none": lambda: Configure.Vectors.self_provided(),
}


def parse_property(prop_dict: dict) -> Property:
    """
    Parse a property definition from a dictionary.

    Args:
        prop_dict: Dictionary with property definition

    Returns:
        Property instance

    Raises:
        ValueError: If property definition is invalid
    """
    if "name" not in prop_dict:
        raise ValueError("Property must have a 'name' field")
    if "data_type" not in prop_dict:
        raise ValueError(
            f"Property '{prop_dict['name']}' must have a 'data_type' field"
        )

    name = prop_dict["name"]
    data_type_str = prop_dict["data_type"].lower()

    if data_type_str not in DATA_TYPE_MAP:
        raise ValueError(
            f"Invalid data_type '{prop_dict['data_type']}' for property '{name}'. "
            f"Supported types: {', '.join(DATA_TYPE_MAP.keys())}"
        )

    data_type = DATA_TYPE_MAP[data_type_str]

    # Build property kwargs
    kwargs = {
        "name": name,
        "data_type": data_type,
    }

    # Add optional fields
    if "description" in prop_dict:
        kwargs["description"] = prop_dict["description"]

    if "index_filterable" in prop_dict:
        kwargs["index_filterable"] = bool(prop_dict["index_filterable"])

    if "index_searchable" in prop_dict:
        kwargs["index_searchable"] = bool(prop_dict["index_searchable"])

    if "index_range_filters" in prop_dict:
        kwargs["index_range_filters"] = bool(prop_dict["index_range_filters"])

    # Handle tokenization for text types
    if "tokenization" in prop_dict:
        tokenization_str = prop_dict["tokenization"].lower()
        if tokenization_str not in TOKENIZATION_MAP:
            raise ValueError(
                f"Invalid tokenization '{prop_dict['tokenization']}' for property '{name}'. "
                f"Supported: {', '.join(TOKENIZATION_MAP.keys())}"
            )
        kwargs["tokenization"] = TOKENIZATION_MAP[tokenization_str]

    # Handle nested properties for object types
    if "nested_properties" in prop_dict:
        if data_type not in [DataType.OBJECT, DataType.OBJECT_ARRAY]:
            raise ValueError(
                f"nested_properties can only be used with 'object' or 'object[]' data types "
                f"(property '{name}' has type '{data_type_str}')"
            )
        kwargs["nested_properties"] = [
            parse_property(nested_prop)
            for nested_prop in prop_dict["nested_properties"]
        ]

    return Property(**kwargs)


@app.command()
def main(
    name: str = typer.Argument(..., help="Collection name (capitalize first letter)"),
    properties: str = typer.Option(
        ...,
        "--properties",
        "-p",
        help="JSON array of property definitions. Add a 'description' field to each property — the Query Agent uses these to understand your schema and construct accurate queries.",
    ),
    description: str = typer.Option(
        None,
        "--description",
        "-d",
        help="Collection description. Weaviate agents read this to understand what the collection contains and decide which collection to query.",
    ),
    vectorizer: str = typer.Option(
        "text2vec_weaviate",
        "--vectorizer",
        "-v",
        help=f"Vectorizer to use. Options: {', '.join(VECTORIZER_MAP.keys())}",
    ),
    replication_factor: int = typer.Option(
        None, "--replication-factor", "-r", help="Replication factor (default: 1)"
    ),
    multi_tenancy: bool = typer.Option(
        False, "--multi-tenancy", "-m", help="Enable multi-tenancy for data isolation"
    ),
    auto_tenant_creation: bool = typer.Option(
        False,
        "--auto-tenant-creation",
        "-a",
        help="Auto-create tenants on insert (requires --multi-tenancy)",
    ),
    json_output: bool = typer.Option(False, "--json", help="Output in JSON format"),
):
    """Create a new Weaviate collection with specified properties."""
    try:
        # Validate multi-tenancy options
        if auto_tenant_creation and not multi_tenancy:
            print(
                "Error: --auto-tenant-creation requires --multi-tenancy to be enabled",
                file=sys.stderr,
            )
            raise typer.Exit(1)

        # Validate collection name (should start with uppercase)
        if not name[0].isupper():
            print(
                f"Warning: Collection name '{name}' should start with an uppercase letter "
                f"(GraphQL naming convention).",
                file=sys.stderr,
            )
            name = name.capitalize()
            print(f"Using '{name}' instead.", file=sys.stderr)

        # Parse properties JSON
        try:
            properties_list = json.loads(properties)
            if not isinstance(properties_list, list):
                raise ValueError("Properties must be a JSON array")
            if len(properties_list) == 0:
                raise ValueError("Properties array cannot be empty")
        except json.JSONDecodeError as e:
            print(f"Error: Invalid JSON in properties: {e}", file=sys.stderr)
            raise typer.Exit(1)

        # Parse each property
        try:
            parsed_properties = [parse_property(prop) for prop in properties_list]
        except ValueError as e:
            print(f"Error: {e}", file=sys.stderr)
            raise typer.Exit(1)

        # Prepare collection config
        collection_config = {
            "name": name,
            "properties": parsed_properties,
        }

        if description:
            collection_config["description"] = description

        # Add vectorizer if specified
        if vectorizer:
            vectorizer_lower = vectorizer.lower()
            if vectorizer_lower not in VECTORIZER_MAP:
                print(
                    f"Error: Invalid vectorizer '{vectorizer}'. "
                    f"Supported: {', '.join(VECTORIZER_MAP.keys())}",
                    file=sys.stderr,
                )
                raise typer.Exit(1)
            collection_config["vector_config"] = VECTORIZER_MAP[vectorizer_lower]()

        # Add replication config if specified
        if replication_factor is not None:
            if replication_factor < 1:
                print("Error: Replication factor must be at least 1", file=sys.stderr)
                raise typer.Exit(1)
            collection_config["replication_config"] = Configure.replication(
                factor=replication_factor
            )

        # Add multi-tenancy config if specified
        if multi_tenancy:
            collection_config["multi_tenancy_config"] = Configure.multi_tenancy(
                enabled=True, auto_tenant_creation=auto_tenant_creation
            )

        with get_client() as client:
            # Check if collection already exists
            if client.collections.exists(name):
                print(
                    f"Error: Collection '{name}' already exists. "
                    f"Delete it first or use a different name.",
                    file=sys.stderr,
                )
                raise typer.Exit(1)

            print(f"Creating collection '{name}'...", file=sys.stderr)
            client.collections.create(**collection_config)

            # Verify creation by fetching the config
            collection = client.collections.get(name)
            config = collection.config.get()

            result = {
                "name": name,
                "description": config.description,
                "properties": [
                    {
                        "name": p.name,
                        "data_type": str(p.data_type),
                        "description": getattr(p, "description", None),
                    }
                    for p in config.properties
                ],
                "multi_tenancy": {
                    "enabled": (
                        config.multi_tenancy_config.enabled
                        if config.multi_tenancy_config
                        else False
                    ),
                    "auto_tenant_creation": (
                        config.multi_tenancy_config.auto_tenant_creation
                        if config.multi_tenancy_config
                        else False
                    ),
                },
                "status": "created",
            }

            if json_output:
                print(json.dumps(result, indent=2, default=str))
            else:
                print(f"\n✓ Collection '{name}' created successfully!\n")
                if not result["description"]:
                    print(
                        "Tip: No collection description provided. "
                        "Weaviate agents read the collection description to understand what data it contains and decide which collection to query.",
                        file=sys.stderr,
                    )
                props_without_desc = [
                    p["name"] for p in result["properties"] if not p.get("description")
                ]
                if props_without_desc:
                    print(
                        f"Tip: {len(props_without_desc)} propert{'y has' if len(props_without_desc) == 1 else 'ies have'} no description. "
                        f"Adding descriptions helps the Query Agent understand your schema and construct accurate queries.",
                        file=sys.stderr,
                    )
                print(f"**Description:** {config.description or 'N/A'}")

                # Display multi-tenancy status
                if result["multi_tenancy"]["enabled"]:
                    print(f"**Multi-Tenancy:** Enabled")
                    if result["multi_tenancy"]["auto_tenant_creation"]:
                        print(f"**Auto-Tenant Creation:** Enabled")

                print(f"\n### Properties ({len(config.properties)})\n")
                print("| Name | Data Type | Description |")
                print("|------|-----------|-------------|")
                for prop in result["properties"]:
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
