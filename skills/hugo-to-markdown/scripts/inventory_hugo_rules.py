#!/usr/bin/env python3

import argparse
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

try:
    import tomllib
except ModuleNotFoundError:  # pragma: no cover
    tomllib = None


SHORTCODE_RE = re.compile(
    r"\{\{[<%](?:/\*)?\s*(?!/)([A-Za-z0-9][A-Za-z0-9_/-]*)",
    re.MULTILINE,
)
YAML_KEY_RE = re.compile(r"^([A-Za-z0-9_-]+):", re.MULTILINE)
TOML_KEY_RE = re.compile(r"^([A-Za-z0-9_.-]+)\s*=", re.MULTILINE)


def parse_args():
    parser = argparse.ArgumentParser(
        description="Inventory Hugo config, shortcodes, render hooks, and content patterns.",
    )
    parser.add_argument("--site-root", required=True, help="Path to the Hugo site root")
    parser.add_argument("--output", help="Write JSON output to this file")
    return parser.parse_args()


def ensure_dir(path: Path) -> Path:
    resolved = path.expanduser().resolve()
    if not resolved.is_dir():
        raise SystemExit(f"Site root does not exist or is not a directory: {resolved}")
    return resolved


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace")


def relpath(path: Path, root: Path) -> str:
    return str(path.resolve().relative_to(root))


def find_config_files(root: Path):
    direct = [
        root / "hugo.toml",
        root / "hugo.yaml",
        root / "hugo.yml",
        root / "hugo.json",
        root / "config.toml",
        root / "config.yaml",
        root / "config.yml",
        root / "config.json",
    ]
    found = [p for p in direct if p.is_file()]
    config_dir = root / "config"
    if config_dir.is_dir():
        found.extend(sorted(p for p in config_dir.rglob("*") if p.is_file()))
    return found


def load_config_summary(path: Path):
    suffix = path.suffix.lower()
    if suffix == ".toml" and tomllib is not None:
        data = tomllib.loads(read_text(path))
    elif suffix == ".json":
        data = json.loads(read_text(path))
    else:
        return {
            "path": str(path),
            "format": suffix.lstrip("."),
            "parsed": False,
        }

    module_mounts = data.get("module", {}).get("mounts", [])
    markup = data.get("markup", {})
    goldmark = markup.get("goldmark", {})
    passthrough = (
        goldmark.get("extensions", {})
        .get("passthrough", {})
        .get("delimiters", {})
    )
    parser_attribute = goldmark.get("parser", {}).get("attribute", {})
    render_hook_params = data.get("params", {}).get("render_hooks", {}).get("link", {})

    return {
        "path": str(path),
        "format": suffix.lstrip("."),
        "parsed": True,
        "module_mounts": module_mounts,
        "goldmark_passthrough_delimiters": passthrough,
        "goldmark_block_attributes": parser_attribute.get("block"),
        "link_render_error_level": render_hook_params.get("errorLevel"),
    }


def extract_frontmatter_keys(text: str):
    if text.startswith("---\n"):
        end = text.find("\n---", 4)
        if end != -1:
            return sorted(set(YAML_KEY_RE.findall(text[4:end])))
    if text.startswith("+++\n"):
        end = text.find("\n+++", 4)
        if end != -1:
            return sorted({k.split(".")[0] for k in TOML_KEY_RE.findall(text[4:end])})
    return []


def content_files(root: Path):
    content_root = root / "content"
    if not content_root.is_dir():
        return []
    exts = {".md", ".markdown", ".mdown", ".gotmpl"}
    return sorted(p for p in content_root.rglob("*") if p.is_file() and p.suffix.lower() in exts)


def main():
    args = parse_args()
    site_root = ensure_dir(Path(args.site_root))

    shortcode_files = sorted((site_root / "layouts" / "_shortcodes").glob("*"))
    render_hook_files = sorted((site_root / "layouts" / "_markup").glob("render-*"))

    shortcode_usage = Counter()
    shortcode_locations = defaultdict(list)
    frontmatter_keys = Counter()
    content_entries = []

    for path in content_files(site_root):
        text = read_text(path)
        keys = extract_frontmatter_keys(text)
        for key in keys:
            frontmatter_keys[key] += 1

        names = SHORTCODE_RE.findall(text)
        unique_names = sorted(set(names))
        for name in names:
            shortcode_usage[name] += 1
        for name in unique_names:
            shortcode_locations[name].append(relpath(path, site_root))

        content_entries.append(
            {
                "path": relpath(path, site_root),
                "frontmatter_keys": keys,
                "shortcodes": unique_names,
            }
        )

    result = {
        "site_root": str(site_root),
        "config_files": [load_config_summary(path) for path in find_config_files(site_root)],
        "shortcode_templates": [
            {
                "name": path.stem,
                "path": relpath(path, site_root),
            }
            for path in shortcode_files
            if path.is_file()
        ],
        "render_hooks": [
            {
                "name": path.stem,
                "path": relpath(path, site_root),
            }
            for path in render_hook_files
            if path.is_file()
        ],
        "frontmatter_key_frequency": dict(frontmatter_keys.most_common()),
        "shortcode_usage_frequency": dict(shortcode_usage.most_common()),
        "shortcode_locations": dict(sorted(shortcode_locations.items())),
        "content_files": content_entries,
    }

    payload = json.dumps(result, indent=2, sort_keys=True)
    if args.output:
        output = Path(args.output)
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(payload + "\n", encoding="utf-8")
    else:
        print(payload)


if __name__ == "__main__":
    main()
