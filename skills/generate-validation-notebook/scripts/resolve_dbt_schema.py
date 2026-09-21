#!/usr/bin/env python3
"""
Resolve the output schema for a dbt model.

Usage:
    python3 resolve_dbt_schema.py <dbt_project_yml_path> <model_sql_path>

Returns the resolved schema name (uppercase), e.g., "PROD", "PROD_STAGE", "PROD_LINEAGE"
"""

import argparse
import re
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union

import yaml


def parse_model_config_schema(model_content: str) -> Optional[str]:
    """Extract schema from model's config block."""
    pattern = r"\{\{\s*config\s*\([^)]*\bschema\s*=\s*['\"]([^'\"]+)['\"][^)]*\)\s*\}\}"
    match = re.search(pattern, model_content, re.IGNORECASE | re.DOTALL)
    if match:
        return match.group(1).upper()

    snapshot_pattern = r"target_schema\s*=\s*generate_schema_name\s*\(\s*['\"]([^'\"]+)['\"]"
    match = re.search(snapshot_pattern, model_content, re.IGNORECASE | re.DOTALL)
    if match:
        return match.group(1).upper()

    return None


def parse_dbt_project_routing(
    dbt_project: dict, project_name: str
) -> Tuple[Dict[str, str], Dict[str, str]]:
    """Extract schema and database routing rules from dbt_project.yml."""
    schema_routing = {}  # type: Dict[str, str]
    database_routing = {}  # type: Dict[str, str]

    models_config = dbt_project.get("models", {})
    project_config = models_config.get(project_name, {})

    def extract_routing(config: dict, current_path: str = "") -> None:
        for key, value in config.items():
            if key.startswith("+"):
                continue
            if not isinstance(value, dict):
                continue
            new_path = f"{current_path}/{key}" if current_path else key
            schema = value.get("schema") or value.get("+schema")
            if schema:
                if "{{" not in schema:
                    schema_routing[new_path] = schema.upper()
            database = value.get("database") or value.get("+database")
            if database:
                if "{{" not in database:
                    database_routing[new_path] = database.upper()
            extract_routing(value, new_path)

    extract_routing(project_config)
    return schema_routing, database_routing


def parse_dbt_project_schema_routing(dbt_project: dict, project_name: str) -> Dict[str, str]:
    schema_routing, _ = parse_dbt_project_routing(dbt_project, project_name)
    return schema_routing


def get_model_relative_path(dbt_project_path: Path, model_path: Path) -> str:
    dbt_project_dir = dbt_project_path.parent
    model_relative = model_path.relative_to(dbt_project_dir)
    parts = model_relative.parts
    if parts and parts[0] == "models":
        return str(Path(*parts[1:]))
    return str(model_relative)


def find_matching_schema(
    model_relative_path: str, routing: Dict[str, str]
) -> Optional[str]:
    model_dir = str(Path(model_relative_path).parent)
    matches = []  # type: List[Tuple[str, str]]
    for route_path, schema in routing.items():
        if model_dir == route_path or model_dir.startswith(route_path + "/"):
            matches.append((route_path, schema))
    if not matches:
        return None
    matches.sort(key=lambda x: len(x[0]), reverse=True)
    return matches[0][1]


def apply_schema_prefix(schema: str, target_schema: str = "PROD") -> str:
    if not schema or schema.upper() == target_schema.upper():
        return target_schema.upper()
    return f"{target_schema.upper()}_{schema.upper()}"


def resolve_schema(
    dbt_project_path: Union[str, Path],
    model_path: Union[str, Path],
    default_schema: str = "PROD",
    apply_prefix: bool = True,
) -> str:
    dbt_project_path = Path(dbt_project_path)
    model_path = Path(model_path)

    model_content = model_path.read_text()

    config_schema = parse_model_config_schema(model_content)
    if config_schema:
        if apply_prefix:
            return apply_schema_prefix(config_schema, default_schema)
        return config_schema

    with open(dbt_project_path) as f:
        dbt_project = yaml.safe_load(f)

    project_name = dbt_project.get("name", "")

    routing = parse_dbt_project_schema_routing(dbt_project, project_name)
    model_relative = get_model_relative_path(dbt_project_path, model_path)
    matched_schema = find_matching_schema(model_relative, routing)
    if matched_schema:
        if apply_prefix:
            return apply_schema_prefix(matched_schema, default_schema)
        return matched_schema

    return default_schema.upper()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Resolve the output schema for a dbt model"
    )
    parser.add_argument("dbt_project_path", help="Path to dbt_project.yml")
    parser.add_argument("model_path", help="Path to the model SQL file")
    parser.add_argument("--default", default="PROD", help="Default schema (default: PROD)")
    parser.add_argument("--no-prefix", action="store_true", help="Don't apply PROD_ prefix")

    args = parser.parse_args()

    dbt_project_path = Path(args.dbt_project_path)
    model_path = Path(args.model_path)

    if not dbt_project_path.exists():
        print(f"Error: dbt_project.yml not found: {dbt_project_path}", file=sys.stderr)
        sys.exit(1)

    if not model_path.exists():
        print(f"Error: Model file not found: {model_path}", file=sys.stderr)
        sys.exit(1)

    apply_prefix = not args.no_prefix
    schema = resolve_schema(dbt_project_path, model_path, args.default, apply_prefix)
    print(schema)


if __name__ == "__main__":
    main()
