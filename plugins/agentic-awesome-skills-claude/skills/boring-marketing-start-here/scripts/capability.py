#!/usr/bin/env python3
"""Detect optional public toolsets and emit a value-free capability manifest.

Usage:
  capability.py [--json|--markdown] [--root DIR] [--env-file PATH]
                [--brand SLUG] [--brand-dir [PATH|auto]]

Environment resolution is process environment, then the workspace env file,
then the resolved brand directory's .env file. Later sources take precedence.
Only source names and detected provider names are emitted; key values are never
printed. Python 3 standard library only.
"""

import argparse
import json
import os
import sys
from collections import OrderedDict
from pathlib import Path


CAPABILITY_ORDER = [
    "web-scrape",
    "web-search",
    "social-data",
    "creative",
    "esp",
    "analytics",
    "search-console",
    "ads",
    "social-api",
    "scheduling",
]

ESP_PROVIDERS = [
    ("KIT_API_KEY", "kit"),
    ("CONVERTKIT_API_KEY", "kit"),
    ("BEEHIIV_API_KEY", "beehiiv"),
    ("LOOPS_API_KEY", "loops"),
    ("RESEND_API_KEY", "resend"),
    ("MAILCHIMP_API_KEY", "mailchimp"),
    ("HUBSPOT_API_KEY", "hubspot"),
    ("HUBSPOT_ACCESS_TOKEN", "hubspot"),
]
ADS_PROVIDERS = [
    ("META_ACCESS_TOKEN", "meta"),
    ("GOOGLE_ADS_DEVELOPER_TOKEN", "google-ads"),
]
SOCIAL_API_PROVIDERS = [("X_BEARER_TOKEN", "x-api")]
SCHEDULING_PROVIDERS = [
    ("ZERNIO_API_KEY", "zernio"),
    ("BUFFER_ACCESS_TOKEN", "buffer"),
    ("HOOTSUITE_API_KEY", "hootsuite"),
]
ANALYTICS_PROVIDERS = [
    ("GOOGLE_APPLICATION_CREDENTIALS", "ga4-service-account"),
    ("POSTHOG_API_KEY", "posthog"),
]
GSC_PROVIDERS = [("GOOGLE_APPLICATION_CREDENTIALS", "gsc-service-account")]
SOCIAL_DATA_PROVIDERS = [
    ("SCRAPECREATORS_API_KEY", "scrapecreators"),
    ("TREG_TOKEN", "treg"),
]
CREATIVE_PROVIDERS = [
    ("REPLICATE_API_TOKEN", "replicate"),
    ("HF_API_KEY_ID", "higgsfield"),
    ("OPENAI_API_KEY", "openai"),
]
COMPOSIO_TOOLSETS = (
    "esp",
    "analytics",
    "search-console",
    "ads",
    "scheduling",
    "social-api",
)

BRAND_FILES = [
    "brand.yaml",
    "voice-profile.md",
    "positioning.md",
    "audience.md",
    "voc.md",
    "competitors.md",
    "creative-kit.md",
    "keyword-plan.md",
    "stack.md",
    "social-canon.md",
    "assets.md",
    "learnings.md",
    "algo-cache.md",
    "preferences.md",
]

CLAUDE_CODE_ENV_HINTS = (
    "CLAUDECODE",
    "CLAUDE_CODE_ENTRYPOINT",
    "CLAUDE_SKILL_DIR",
)


def parse_env_file(path):
    """Return KEY=VALUE entries from *path* without executing the file."""
    entries = {}
    try:
        lines = Path(path).read_text(encoding="utf-8").splitlines()
    except OSError:
        return entries

    for raw_line in lines:
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[len("export "):].lstrip()
        if "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip("'\"")
        if key:
            entries[key] = value
    return entries


def resolve_brand_dir(root, slug):
    """Resolve a brand directory: explicit slug, active pointer, then ./brand/."""
    root = Path(root)
    if slug:
        return root / "brands" / str(slug)

    active_pointer = root / "brands" / "active"
    try:
        active_slug = active_pointer.read_text(encoding="utf-8").strip()
    except OSError:
        active_slug = ""
    if active_slug:
        return root / "brands" / active_slug
    return root / "brand"


def _source_name(root, path):
    """Render an env-file path relative to root when that is possible."""
    root = Path(root).resolve()
    path = Path(path).resolve()
    try:
        return path.relative_to(root).as_posix()
    except ValueError:
        return str(path)


def _env_file_path(root, env_file):
    if not env_file:
        return None
    path = Path(env_file).expanduser()
    return path if path.is_absolute() else Path(root) / path


def resolve_env(root, brand_dir, base, env_file=".env"):
    """Merge process-style values with workspace and brand env-file overlays."""
    root = Path(root).resolve()
    merged = dict(base or {})
    sources = ["process"]
    loaded_paths = set()

    def overlay(path):
        if path is None or not path.is_file():
            return
        resolved = path.resolve()
        if resolved in loaded_paths:
            return
        merged.update(parse_env_file(path))
        sources.append(_source_name(root, path))
        loaded_paths.add(resolved)

    overlay(_env_file_path(root, env_file))
    if brand_dir is not None:
        overlay(Path(brand_dir) / ".env")
    return merged, sources


def _has_value(env, key):
    value = env.get(key, "")
    return bool(str(value).strip())


def provider_cap(env, table):
    """Return a capability from an ordered key/provider table without duplicates."""
    providers = []
    seen = set()
    for key, provider in table:
        if _has_value(env, key) and provider not in seen:
            providers.append(provider)
            seen.add(provider)
    return {
        "available": bool(providers),
        "via": providers[0] if providers else None,
        "providers": providers,
    }


def _single_provider(available, provider):
    return {
        "available": available,
        "via": provider if available else None,
        "providers": [provider] if available else [],
    }


def _resolve_requested_brand(root, brand, brand_dir):
    if brand_dir == "auto":
        return resolve_brand_dir(root, brand)
    if brand_dir is not None:
        candidate = Path(brand_dir).expanduser()
        return candidate if candidate.is_absolute() else Path(root) / candidate
    if brand:
        return resolve_brand_dir(root, brand)
    return None


def build_manifest(env=None, root=".", brand=None, brand_dir=None, env_file=".env"):
    """Build the deterministic, public-toolset manifest for one workspace."""
    root_path = Path(root).expanduser().resolve()
    resolved_brand = _resolve_requested_brand(root_path, brand, brand_dir)
    base_env = dict(os.environ if env is None else env)
    merged_env, env_sources = resolve_env(
        root_path, resolved_brand, base_env, env_file=env_file
    )

    environment = (
        "claude-code"
        if any(_has_value(merged_env, hint) for hint in CLAUDE_CODE_ENV_HINTS)
        else "unknown"
    )
    firecrawl = _has_value(merged_env, "FIRECRAWL_API_KEY")
    in_claude_code = environment == "claude-code"

    capabilities = OrderedDict()
    if in_claude_code:
        capabilities["web-scrape"] = _single_provider(
            True, "firecrawl" if firecrawl else "webfetch"
        )
        capabilities["web-search"] = _single_provider(True, "websearch")
    elif firecrawl:
        capabilities["web-scrape"] = _single_provider(True, "firecrawl")
        capabilities["web-search"] = _single_provider(True, "firecrawl")
    else:
        capabilities["web-scrape"] = _single_provider(False, None)
        capabilities["web-search"] = _single_provider(False, None)

    if _has_value(merged_env, "EXA_API_KEY"):
        entry = capabilities["web-search"]
        entry["available"] = True
        if "exa" not in entry["providers"]:
            entry["providers"].append("exa")

    capabilities["social-data"] = provider_cap(merged_env, SOCIAL_DATA_PROVIDERS)
    capabilities["creative"] = provider_cap(merged_env, CREATIVE_PROVIDERS)
    capabilities["esp"] = provider_cap(merged_env, ESP_PROVIDERS)
    capabilities["analytics"] = provider_cap(merged_env, ANALYTICS_PROVIDERS)
    capabilities["search-console"] = provider_cap(merged_env, GSC_PROVIDERS)
    capabilities["ads"] = provider_cap(merged_env, ADS_PROVIDERS)
    capabilities["social-api"] = provider_cap(merged_env, SOCIAL_API_PROVIDERS)
    capabilities["scheduling"] = provider_cap(merged_env, SCHEDULING_PROVIDERS)

    if _has_value(merged_env, "COMPOSIO_API_KEY"):
        for toolset in COMPOSIO_TOOLSETS:
            entry = capabilities[toolset]
            if entry["available"]:
                if "composio" not in entry["providers"]:
                    entry["providers"].append("composio")
            else:
                capabilities[toolset] = _single_provider(True, "composio")

    manifest = {
        "environment": environment,
        "env_sources": env_sources,
        "capabilities": OrderedDict(
            (name, capabilities[name]) for name in CAPABILITY_ORDER
        ),
    }
    if resolved_brand is not None:
        manifest["brand"] = {
            "dir": str(resolved_brand),
            "exists": resolved_brand.is_dir(),
            "files": {
                filename: (resolved_brand / filename).is_file()
                for filename in BRAND_FILES
            },
        }
    return manifest


def to_markdown(manifest):
    """Render the manifest for a person without exposing any key values."""
    lines = [
        "# Capability manifest, environment: {0}".format(manifest["environment"]),
        "",
        "env sources: " + ", ".join(manifest["env_sources"]),
        "",
        "| toolset | available | via | providers |",
        "|---|---|---|---|",
    ]
    for name, cap in manifest["capabilities"].items():
        providers = ", ".join(cap["providers"]) or "none"
        lines.append(
            "| {0} | {1} | {2} | {3} |".format(
                name,
                "yes" if cap["available"] else "no",
                cap["via"] or "none",
                providers,
            )
        )

    brand = manifest.get("brand")
    if brand is not None:
        lines.extend(
            [
                "",
                "## Brand files: {0}{1}".format(
                    brand["dir"], "" if brand["exists"] else " (directory missing)"
                ),
                "",
                "present: "
                + (", ".join(name for name, present in brand["files"].items() if present) or "none"),
                "absent: "
                + (", ".join(name for name, present in brand["files"].items() if not present) or "none"),
            ]
        )
    return "\n".join(lines)


def main(argv=None):
    parser = argparse.ArgumentParser(
        prog="capability.py",
        description="Detect optional public toolsets and emit a value-free manifest.",
        epilog="Missing keys are reported as unavailable, not as errors.",
    )
    output = parser.add_mutually_exclusive_group()
    output.add_argument("--json", action="store_true", help="emit JSON (the default)")
    output.add_argument("--markdown", action="store_true", help="emit a Markdown table")
    parser.add_argument(
        "--brand", metavar="SLUG", help="select ./brands/SLUG for env and file checks"
    )
    parser.add_argument(
        "--brand-dir",
        nargs="?",
        const="auto",
        metavar="PATH|auto",
        help="include a brand inventory; no value resolves active brand then ./brand/",
    )
    parser.add_argument(
        "--root", default=".", metavar="DIR", help="workspace root (default: current directory)"
    )
    parser.add_argument(
        "--env-file",
        default=".env",
        metavar="PATH",
        help="workspace env file relative to --root unless absolute (default: .env)",
    )
    args = parser.parse_args(argv)

    manifest = build_manifest(
        root=args.root,
        brand=args.brand,
        brand_dir=args.brand_dir,
        env_file=args.env_file,
    )
    if args.markdown:
        print(to_markdown(manifest))
    else:
        print(json.dumps(manifest, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
