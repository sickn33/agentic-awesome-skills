#!/usr/bin/env python3
# /// script
# dependencies = [
#   "weaviate-client==4.19.2",
#   "typer==0.21.0",
# ]
# ///
"""
Explore a Weaviate collection's data: metrics, unique values (top occurrences), and sample objects.

Usage:
    uv run explore_collection.py "CollectionName" [--limit 5] [--no-metrics] [--json]

Environment Variables:
    WEAVIATE_URL: Weaviate Cloud cluster URL
    WEAVIATE_API_KEY: API key for authentication
"""

import json
import sys

import typer
import weaviate
import weaviate.classes as wvc
from weaviate.classes.aggregate import Metrics
from weaviate.collections.classes.config import DataType

# Import shared connection utilities (local to this skill)
from weaviate_conn import get_client

app = typer.Typer()


def get_metrics_for_property(prop_name: str, data_type: DataType | str) -> Metrics:
    """
    Return the appropriate Metrics object based on the property's data type.
    """
    # Text
    if data_type in [DataType.TEXT, DataType.TEXT_ARRAY]:
        return Metrics(prop_name).text(
            count=True,
            top_occurrences_count=True,
            top_occurrences_value=True,
            limit=5,
        )
    # Integer
    elif data_type in [DataType.INT, DataType.INT_ARRAY]:
        return Metrics(prop_name).integer(
            count=True,
            minimum=True,
            maximum=True,
            mean=True,
            median=True,
            mode=True,
            sum_=True,
        )
    # Number
    elif data_type in [DataType.NUMBER, DataType.NUMBER_ARRAY]:
        return Metrics(prop_name).number(
            count=True,
            minimum=True,
            maximum=True,
            mean=True,
            median=True,
            mode=True,
            sum_=True,
        )
    # Boolean
    elif data_type in [DataType.BOOL, DataType.BOOL_ARRAY]:
        return Metrics(prop_name).boolean(
            count=True,
            percentage_true=True,
            percentage_false=True,
            total_true=True,
            total_false=True,
        )
    # Date
    elif data_type in [DataType.DATE, DataType.DATE_ARRAY]:
        return Metrics(prop_name).date_(
            count=True,
            minimum=True,
            maximum=True,
            median=True,
            mode=True,
        )
    return None


@app.command()
def main(
    name: str = typer.Argument(..., help="Collection name"),
    limit: int = typer.Option(
        5, "--limit", "-l", help="Number of sample objects to show"
    ),
    no_metrics: bool = typer.Option(
        False, "--no-metrics", help="Skip calculating metrics (faster)"
    ),
    json_output: bool = typer.Option(False, "--json", help="Output in JSON format"),
):
    """Explore data within a Weaviate collection."""
    try:
        with get_client() as client:
            if not client.collections.exists(name):
                print(f"Error: Collection '{name}' not found.", file=sys.stderr)
                raise typer.Exit(1)

            collection = client.collections.use(name)
            config = collection.config.get()

            # 1. Fetch Aggregation Metrics
            metrics_data = {}
            total_count = 0

            if not no_metrics:
                if not json_output:
                    print("Calculating metrics...", file=sys.stderr)

                return_metrics = []
                # Add metrics for each property based on type
                for prop in config.properties:
                    m = get_metrics_for_property(prop.name, prop.data_type)
                    if m:
                        return_metrics.append(m)

                try:
                    # Always ask for total_count
                    if return_metrics:
                        agg_response = collection.aggregate.over_all(
                            total_count=True, return_metrics=return_metrics
                        )
                    else:
                        # Fallback if no properties to aggregate
                        agg_response = collection.aggregate.over_all(total_count=True)

                    total_count = agg_response.total_count

                    for prop_name, agg_res in agg_response.properties.items():
                        prop_metrics = {}

                        # Helpers to extract common fields safely
                        def extract_fields(obj, fields):
                            for f in fields:
                                val = getattr(obj, f, None)
                                if val is not None:
                                    prop_metrics[f] = val

                        # Identify type of result by checking attributes
                        if hasattr(agg_res, "top_occurrences"):
                            # Text
                            extract_fields(agg_res, ["count"])
                            if agg_res.top_occurrences:
                                prop_metrics["top_occurrences"] = [
                                    {"value": to.value, "count": to.count}
                                    for to in agg_res.top_occurrences
                                ]
                        elif hasattr(agg_res, "mean"):
                            # Number/Int
                            extract_fields(
                                agg_res,
                                [
                                    "count",
                                    "minimum",
                                    "maximum",
                                    "mean",
                                    "median",
                                    "mode",
                                    "sum_",
                                ],
                            )
                        elif hasattr(agg_res, "percentage_true"):
                            # Boolean
                            extract_fields(
                                agg_res,
                                [
                                    "count",
                                    "total_true",
                                    "total_false",
                                    "percentage_true",
                                    "percentage_false",
                                ],
                            )
                        elif hasattr(agg_res, "minimum") and not hasattr(
                            agg_res, "mean"
                        ):
                            # Date (has min/max but no mean)
                            extract_fields(
                                agg_res,
                                ["count", "minimum", "maximum", "median", "mode"],
                            )

                        if prop_metrics:
                            metrics_data[prop_name] = prop_metrics

                except Exception as e:
                    if not json_output:
                        print(f"Warning: Aggregation failed: {e}", file=sys.stderr)
                    metrics_data["error"] = str(e)
            else:
                # Just get total count if metrics skipped
                try:
                    agg_response = collection.aggregate.over_all(total_count=True)
                    total_count = agg_response.total_count
                except Exception:
                    pass

            # 2. Fetch Sample Objects
            if limit > 0:
                if not json_output:
                    print(f"Fetching {limit} sample objects...", file=sys.stderr)
                # Fetch objects with all properties
                objects_resp = collection.query.fetch_objects(limit=limit)
                sample_objects = []
                for obj in objects_resp.objects:
                    sample_objects.append(
                        {"uuid": str(obj.uuid), "properties": obj.properties}
                    )
            else:
                sample_objects = []

            # 3. Output
            result = {
                "collection": name,
                "total_count": total_count,
                "metrics": metrics_data,
                "sample_objects": sample_objects,
            }

            if json_output:
                print(json.dumps(result, indent=2, default=str))
            else:
                # Markdown Output
                print(f"## Collection Explorer: {name}\n")
                print(f"**Total Objects:** {total_count}")

                if metrics_data:
                    print("\n### Property Metrics\n")

                    prop_types = {p.name: p.data_type.value for p in config.properties}

                    for prop_name, data in metrics_data.items():
                        p_type = prop_types.get(prop_name, "unknown")
                        print(f"**{prop_name}** ({p_type})")
                        for k, v in data.items():
                            if k == "top_occurrences":
                                print(f"- Top Values:")
                                for item in v:
                                    # Escape pipes and newlines in values
                                    val_str = (
                                        str(item["value"])
                                        .replace("\n", " ")
                                        .replace("|", "\\|")
                                    )
                                    print(f"    - {val_str} ({item['count']})")
                            else:
                                label = k.replace("_", " ").capitalize()
                                print(f"- {label}: {v}")
                        print("")

                if sample_objects:
                    print(f"### Sample Objects (Limit: {limit})\n")

                    all_props = set()
                    for obj in sample_objects:
                        all_props.update(obj["properties"].keys())
                    sorted_props = sorted(list(all_props))

                    headers = ["#", "UUID"] + sorted_props
                    header_row = "| " + " | ".join(headers) + " |"
                    separator_row = "| " + " | ".join(["---"] * len(headers)) + " |"

                    print(header_row)
                    print(separator_row)

                    for idx, obj in enumerate(sample_objects, 1):
                        row_data = [str(idx), str(obj["uuid"])]
                        props = obj["properties"]
                        for prop in sorted_props:
                            val = props.get(prop, "-")
                            val_str = str(val).replace("\n", " ").replace("|", "\\|")
                            if len(val_str) > 100:
                                val_str = val_str[:97] + "..."
                            row_data.append(val_str)
                        print("| " + " | ".join(row_data) + " |")
                    print()

    except weaviate.exceptions.WeaviateConnectionError as e:
        print(f"Error: Connection failed - {e}", file=sys.stderr)
        raise typer.Exit(1)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        raise typer.Exit(1)


if __name__ == "__main__":
    app()
