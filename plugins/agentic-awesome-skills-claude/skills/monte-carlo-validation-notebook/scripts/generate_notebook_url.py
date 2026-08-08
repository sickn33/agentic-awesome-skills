#!/usr/bin/env python3
"""
Encode a notebook YAML file into a base64 import URL and open it in the browser.

Usage:
    python3 generate_notebook_url.py <notebook_yaml_path> [--mc-base-url URL]
"""

import argparse
import base64
import os
import re
import subprocess
import sys

import yaml


def sanitize_yaml(content: str) -> str:
    """Replace non-ASCII characters with ASCII equivalents."""
    replacements = {
        "\u2014": "-",
        "\u2013": "-",
        "\u2018": "'",
        "\u2019": "'",
        "\u201c": '"',
        "\u201d": '"',
        "\u2026": "...",
        "\u00a0": " ",
    }
    for char, replacement in replacements.items():
        content = content.replace(char, replacement)
    content = re.sub(r"[^\x00-\x7F]", "?", content)
    return content


def validate_yaml(content: str) -> None:
    """Parse YAML, validate notebook schema, and exit with context on failure."""
    try:
        doc = yaml.safe_load(content)
    except yaml.YAMLError as e:
        print(f"YAML validation failed: {e}", file=sys.stderr)
        sys.exit(1)

    errors: list[str] = []

    # Top-level structure
    if not isinstance(doc, dict):
        errors.append("Root must be a mapping")
    else:
        if "version" not in doc:
            errors.append("Missing top-level 'version'")
        metadata = doc.get("metadata")
        if not isinstance(metadata, dict):
            errors.append("Missing or invalid 'metadata' mapping")
        else:
            for field in ("id", "name", "created_at", "updated_at"):
                if field not in metadata:
                    errors.append(f"metadata.{field}: missing required field")
            for bad_field in ("title", "description", "pr_number", "generated_by"):
                if bad_field in metadata:
                    errors.append(
                        f"metadata.{bad_field}: unexpected field (use 'name' for the notebook title)"
                    )

        cells = doc.get("cells")
        if not isinstance(cells, list):
            errors.append("Missing or invalid 'cells' list")
        else:
            for i, cell in enumerate(cells):
                prefix = f"cells[{i}]"
                if not isinstance(cell, dict):
                    errors.append(f"{prefix}: must be a mapping")
                    continue
                if "id" not in cell:
                    errors.append(f"{prefix}: missing 'id'")
                if "type" not in cell:
                    errors.append(f"{prefix}: missing 'type'")
                cell_type = cell.get("type")
                if cell_type not in ("sql", "markdown", "parameter"):
                    errors.append(
                        f"{prefix}: invalid type '{cell_type}' (must be sql, markdown, or parameter)"
                    )
                if "display_type" not in cell:
                    errors.append(f"{prefix}: missing 'display_type'")
                if cell_type == "parameter":
                    content_val = cell.get("content")
                    if not isinstance(content_val, dict):
                        errors.append(f"{prefix}: parameter cell 'content' must be a mapping with 'name' and 'config'")
                    else:
                        if "name" not in content_val:
                            errors.append(f"{prefix}: parameter content missing 'name'")
                        if "config" not in content_val:
                            errors.append(f"{prefix}: parameter content missing 'config'")

    if errors:
        print("Invalid notebook:", file=sys.stderr)
        for err in errors:
            print(f"  - {err}", file=sys.stderr)
        sys.exit(1)


def main() -> None:
    parser = argparse.ArgumentParser(description="Encode notebook YAML to import URL")
    parser.add_argument("yaml_path", help="Path to notebook YAML file")
    parser.add_argument(
        "--mc-base-url",
        default="https://getmontecarlo.com",
        help="MC Bridge base URL",
    )
    args = parser.parse_args()

    with open(args.yaml_path) as f:
        notebook_yaml = f.read()

    yaml_content = sanitize_yaml(notebook_yaml.strip())
    validate_yaml(yaml_content)

    encoded = base64.b64encode(yaml_content.encode()).decode()
    url = f"{args.mc_base_url}/notebooks/import#{encoded}"

    print(f"URL length: {len(url)} chars")

    # Save URL to file alongside the YAML
    url_file = os.path.join(os.path.dirname(os.path.abspath(args.yaml_path)), "notebook_url.txt")
    with open(url_file, "w") as f:
        f.write(url)
    print(f"URL saved to: {url_file}")

    print("\n" + "=" * 60)
    print("NOTEBOOK URL:")
    print("=" * 60)
    print(url)
    print("=" * 60 + "\n")

    print("Opening notebook in browser...")
    subprocess.run(["open", url])


if __name__ == "__main__":
    main()
