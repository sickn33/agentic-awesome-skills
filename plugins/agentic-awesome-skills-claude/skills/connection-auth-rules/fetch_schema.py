#!/usr/bin/env python3
"""
Fetch Connection Auth Rules schema from the apollo-agent GitHub repo.

Reads connector defaults and transform step contracts, then outputs JSON
for use by the connection-auth-rules skill.

Usage:
    python3 fetch_schema.py --list
    python3 fetch_schema.py --connector <name>
    python3 fetch_schema.py --connector <name> --transforms
    python3 fetch_schema.py --transforms

Set GITHUB_TOKEN env var to raise the GitHub API rate limit from 60 to
5,000 requests/hour.
"""

from __future__ import annotations

import ast
import json
import os
import sys
import argparse
import urllib.request
import urllib.error

REPO = "monte-carlo-data/apollo-agent"
DEFAULTS_PATH = "apollo/integrations/ctp/defaults"
TRANSFORMS_PATH = "apollo/integrations/ctp/transforms"
GITHUB_API = f"https://api.github.com/repos/{REPO}/contents"


def _headers() -> dict[str, str]:
    headers = {"User-Agent": "mc-agent-toolkit/connection-auth-rules"}
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


def _fetch_json(url: str) -> object:
    req = urllib.request.Request(url, headers=_headers())
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())


def _fetch_text(url: str) -> str:
    req = urllib.request.Request(url, headers=_headers())
    with urllib.request.urlopen(req) as resp:
        return resp.read().decode("utf-8")


def _list_py_files(api_path: str) -> list[dict]:
    entries = _fetch_json(f"{GITHUB_API}/{api_path}")
    return [
        {"name": e["name"].removesuffix(".py"), "download_url": e["download_url"]}
        for e in entries
        if e["type"] == "file"
        and e["name"].endswith(".py")
        and e["name"] != "__init__.py"
    ]


# ---------------------------------------------------------------------------
# AST helpers
# ---------------------------------------------------------------------------


def _ast_unparse(node: ast.expr) -> str:
    # Return the actual string value for string constants — callers want the
    # Jinja2 template text, not the Python repr with surrounding quotes.
    if isinstance(node, ast.Constant) and isinstance(node.value, str):
        return node.value
    if hasattr(ast, "unparse"):
        return ast.unparse(node)
    if isinstance(node, ast.Constant):
        return repr(node.value)
    return "<complex expression>"


def _extract_dict(node: ast.expr) -> dict[str, str]:
    if not isinstance(node, ast.Dict):
        return {}
    return {
        k.value: _ast_unparse(v)
        for k, v in zip(node.keys, node.values)
        if isinstance(k, ast.Constant)
    }


def _call_name(node: ast.Call) -> str:
    if isinstance(node.func, ast.Name):
        return node.func.id
    if isinstance(node.func, ast.Attribute):
        return node.func.attr
    return ""


def _parse_step_call(call: ast.Call) -> dict:
    # Default type to the constructor name; overridden by an explicit type= kwarg.
    step: dict = {"type": _call_name(call)}
    for kw in call.keywords:
        if kw.arg == "type":
            step["type"] = _ast_unparse(kw.value)
        elif kw.arg in ("input", "output", "when", "field_map"):
            step[kw.arg] = (
                _extract_dict(kw.value)
                if isinstance(kw.value, ast.Dict)
                else _ast_unparse(kw.value)
            )
    return step


# ---------------------------------------------------------------------------
# Connector schema parsing
# ---------------------------------------------------------------------------


def _parse_connector_schema(source: str) -> dict:
    tree = ast.parse(source)

    output_keys: list[str] = []
    default_field_map: dict[str, str] = {}
    default_steps: list[dict] = []

    for node in ast.walk(tree):
        # TypedDict subclass → output keys
        if isinstance(node, ast.ClassDef):
            for base in node.bases:
                is_typed_dict = (
                    isinstance(base, ast.Name) and base.id == "TypedDict"
                ) or (isinstance(base, ast.Attribute) and base.attr == "TypedDict")
                if is_typed_dict:
                    output_keys.extend(
                        stmt.target.id
                        for stmt in node.body
                        if isinstance(stmt, ast.AnnAssign)
                        and isinstance(stmt.target, ast.Name)
                    )

        if not isinstance(node, ast.Call):
            continue

        name = _call_name(node)

        # MapperConfig(field_map={...})
        if name == "MapperConfig":
            for kw in node.keywords:
                if kw.arg == "field_map":
                    default_field_map = _extract_dict(kw.value)

        # CtpConfig(steps=[...], mapper=...)
        if name == "CtpConfig":
            for kw in node.keywords:
                if kw.arg == "steps" and isinstance(kw.value, ast.List):
                    default_steps = [
                        _parse_step_call(elt)
                        for elt in kw.value.elts
                        if isinstance(elt, ast.Call)
                    ]

    return {
        "output_keys": output_keys,
        "default_field_map": default_field_map,
        "default_steps": default_steps,
    }


# ---------------------------------------------------------------------------
# Transform step parsing
# ---------------------------------------------------------------------------


def _parse_docstring_sections(docstring: str) -> dict[str, str]:
    """Extract Step input/output/field_map sections from a docstring."""
    sections: dict[str, str] = {}
    current_key: str | None = None
    buf: list[str] = []

    # Prefixes are matched with startswith so "Step field_map (typical usage):"
    # is caught by the "Step field_map" prefix.
    prefix_map = [
        ("Step input", "step_input"),
        ("Step output", "step_output"),
        ("Step field_map", "step_field_map"),
    ]

    for line in docstring.splitlines():
        stripped = line.strip()
        matched = False
        for prefix, key in prefix_map:
            if stripped.startswith(prefix):
                if current_key is not None:
                    sections[current_key] = "\n".join(buf).strip()
                current_key = key
                # Drop everything up to and including the first ":"
                after_colon = (
                    stripped[stripped.index(":") + 1 :].strip()
                    if ":" in stripped
                    else ""
                )
                buf = [after_colon] if after_colon else []
                matched = True
                break
        if not matched and current_key is not None:
            buf.append(stripped)

    if current_key is not None:
        sections[current_key] = "\n".join(buf).strip()

    return sections


def _parse_transform_step(name: str, source: str) -> dict:
    tree = ast.parse(source)

    # Docstrings live on the Transform subclass, not the module.
    docstring = ast.get_docstring(tree) or ""
    for node in ast.walk(tree):
        if isinstance(node, ast.ClassDef):
            class_doc = ast.get_docstring(node)
            if class_doc:
                docstring = class_doc
                break

    sections = _parse_docstring_sections(docstring)
    return {
        "name": name,
        "step_input": sections.get("step_input", ""),
        "step_output": sections.get("step_output", ""),
        "step_field_map": sections.get("step_field_map", ""),
    }


# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------


def cmd_list() -> dict:
    return {"connectors": _list_py_files(DEFAULTS_PATH)}


def cmd_connector(name: str) -> dict:
    files = _list_py_files(DEFAULTS_PATH)
    match = next((f for f in files if f["name"] == name), None)
    if not match:
        return {
            "error": (
                f"Connector '{name}' not found. "
                "Run --list to see available connectors."
            )
        }
    source = _fetch_text(match["download_url"])
    schema = _parse_connector_schema(source)
    schema["connector"] = name
    return {"schema": schema}


def cmd_transforms() -> dict:
    files = _list_py_files(TRANSFORMS_PATH)
    return {
        "transforms": [
            _parse_transform_step(f["name"], _fetch_text(f["download_url"]))
            for f in files
        ]
    }


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Fetch connection-auth-rules schema from the apollo-agent repo",
    )
    parser.add_argument("--list", action="store_true", help="List available connectors")
    parser.add_argument(
        "--connector", metavar="NAME", help="Fetch schema for a connector"
    )
    parser.add_argument(
        "--transforms", action="store_true", help="Fetch available transform steps"
    )
    args = parser.parse_args()

    if not (args.list or args.connector or args.transforms):
        parser.print_help()
        sys.exit(1)

    result: dict = {}

    try:
        if args.list:
            result.update(cmd_list())

        if args.connector:
            connector_result = cmd_connector(args.connector)
            if "error" in connector_result:
                print(json.dumps(connector_result, indent=2))
                sys.exit(1)
            result.update(connector_result)

        if args.transforms:
            result.update(cmd_transforms())

    except urllib.error.HTTPError as exc:
        print(json.dumps({"error": f"GitHub API error {exc.code}: {exc.reason}"}))
        sys.exit(1)
    except urllib.error.URLError as exc:
        print(json.dumps({"error": f"Network error: {exc.reason}"}))
        sys.exit(1)

    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
