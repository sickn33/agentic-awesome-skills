#!/usr/bin/env python3
from __future__ import annotations

import argparse
import errno
import json
import os
import re
import shutil
import tempfile
import time
import uuid
from pathlib import Path
from typing import Any, Callable

from _project_paths import find_repo_root
from plugin_compatibility import build_report as build_plugin_compatibility_report
from plugin_compatibility import compatibility_by_skill_id, sync_plugin_compatibility
from update_readme import configure_utf8_output, load_metadata


SAFE_SKILL_ID_RE = re.compile(
    r"^(?!.*(?:^|/)\.{1,2}(?:/|$))[A-Za-z0-9._-]+(?:/[A-Za-z0-9._-]+)*$"
)
SAFE_BUNDLE_ID_RE = re.compile(r"^[A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?$")
REPO_URL = "https://github.com/sickn33/antigravity-awesome-skills"
AUTHOR = {
    "name": "sickn33 and contributors",
    "url": REPO_URL,
}
ROOT_CLAUDE_PLUGIN_NAME = "antigravity-awesome-skills"
ROOT_CODEX_PLUGIN_NAME = "antigravity-awesome-skills"
ROOT_CLAUDE_PLUGIN_DIRNAME = "antigravity-awesome-skills-claude"
EDITORIAL_BUNDLES_PATH = Path("data") / "editorial-bundles.json"
EDITORIAL_TEMPLATE_PATH = Path("tools") / "templates" / "editorial-bundles.md.tmpl"
CLAUDE_MARKETPLACE_PATH = Path(".claude-plugin") / "marketplace.json"
CLAUDE_PLUGIN_PATH = Path(".claude-plugin") / "plugin.json"
CODEX_MARKETPLACE_PATH = Path(".agents") / "plugins" / "marketplace.json"
CODEX_ROOT_PLUGIN_PATH = Path("plugins") / ROOT_CODEX_PLUGIN_NAME / ".codex-plugin" / "plugin.json"
CLAUDE_ROOT_PLUGIN_PATH = Path("plugins") / ROOT_CLAUDE_PLUGIN_DIRNAME / ".claude-plugin" / "plugin.json"
ACRONYM_TOKENS = {
    "ab": "A/B",
    "adb": "ADB",
    "adr": "ADR",
    "ads": "ADS",
    "ai": "AI",
    "api": "API",
    "apis": "APIs",
    "app": "App",
    "apps": "Apps",
    "aso": "ASO",
    "aws": "AWS",
    "bat": "BAT",
    "ci": "CI",
    "cli": "CLI",
    "cms": "CMS",
    "crm": "CRM",
    "cro": "CRO",
    "css": "CSS",
    "csv": "CSV",
    "dag": "DAG",
    "dbt": "dbt",
    "ddd": "DDD",
    "devops": "DevOps",
    "docx": "DOCX",
    "dx": "DX",
    "e2e": "E2E",
    "expo": "Expo",
    "fastapi": "FastAPI",
    "github": "GitHub",
    "gitlab": "GitLab",
    "grafana": "Grafana",
    "html": "HTML",
    "ios": "iOS",
    "jwt": "JWT",
    "k8s": "K8s",
    "kpi": "KPI",
    "langfuse": "Langfuse",
    "langgraph": "LangGraph",
    "linux": "Linux",
    "llm": "LLM",
    "llms": "LLMs",
    "mcp": "MCP",
    "nextjs": "Next.js",
    "nodejs": "Node.js",
    "oauth2": "OAuth2",
    "odoo": "Odoo",
    "openai": "OpenAI",
    "owasp": "OWASP",
    "pdf": "PDF",
    "php": "PHP",
    "postgres": "Postgres",
    "pr": "PR",
    "prd": "PRD",
    "pwa": "PWA",
    "python": "Python",
    "rag": "RAG",
    "rails": "Rails",
    "react": "React",
    "rest": "REST",
    "rpc": "RPC",
    "saas": "SaaS",
    "seo": "SEO",
    "shopify": "Shopify",
    "slack": "Slack",
    "slo": "SLO",
    "sre": "SRE",
    "sql": "SQL",
    "sso": "SSO",
    "stripe": "Stripe",
    "svg": "SVG",
    "swiftui": "SwiftUI",
    "tailwind": "Tailwind",
    "tdd": "TDD",
    "ts": "TS",
    "tsx": "TSX",
    "ui": "UI",
    "ux": "UX",
    "uv": "uv",
    "webgl": "WebGL",
    "xcode": "Xcode",
    "xml": "XML",
    "yaml": "YAML",
    "zod": "Zod",
}


def _read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def _write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8", newline="\n")


def _clean_group_label(group: str) -> str:
    return re.sub(r"^[^A-Za-z0-9]+", "", group).strip()


def _bundle_plugin_name(bundle_id: str) -> str:
    return f"antigravity-bundle-{bundle_id}"


def _bundle_codex_plugin_name(bundle_id: str) -> str:
    return f"agyb-{bundle_id}"


def _humanize_skill_label(skill_id: str) -> str:
    tokens = re.split(r"[-_]+", skill_id.split("/")[-1])
    words = [ACRONYM_TOKENS.get(token.lower(), token.capitalize()) for token in tokens if token]
    return " ".join(words)


def _bundle_codex_long_description(bundle: dict[str, Any]) -> str:
    audience = bundle.get("audience") or bundle["description"]
    highlights = [
        _humanize_skill_label(skill["id"])
        for skill in bundle["skills"][:2]
        if skill.get("id")
    ]
    remaining = len(bundle["skills"]) - len(highlights)

    if not highlights:
        return f'{audience} Includes {len(bundle["skills"])} curated skills from Antigravity Awesome Skills.'

    if remaining > 0:
        return f"{audience} Covers {', '.join(highlights)}, and {remaining} more skills."

    if len(highlights) == 1:
        return f"{audience} Covers {highlights[0]}."

    return f"{audience} Covers {' and '.join(highlights)}."


def _format_count_label(count: int) -> str:
    return f"{count:,}"


def _validate_bundle_skill_id(skill_id: str) -> None:
    if not SAFE_SKILL_ID_RE.fullmatch(skill_id):
        raise ValueError(f"Invalid skill id in editorial bundles manifest: {skill_id!r}")


def _validate_bundle_id(bundle_id: str) -> None:
    if not SAFE_BUNDLE_ID_RE.fullmatch(bundle_id):
        raise ValueError(f"Invalid editorial bundle id: {bundle_id!r}")


def _validate_editorial_bundles(root: Path, payload: dict[str, Any]) -> list[dict[str, Any]]:
    bundles = payload.get("bundles")
    if not isinstance(bundles, list) or not bundles:
        raise ValueError("data/editorial-bundles.json must contain a non-empty 'bundles' array.")

    seen_bundle_ids: set[str] = set()
    seen_bundle_names: set[str] = set()
    skills_root = root / "skills"

    for bundle in bundles:
        if not isinstance(bundle, dict):
            raise ValueError("Each editorial bundle must be an object.")

        bundle_id = str(bundle.get("id", "")).strip()
        bundle_name = str(bundle.get("name", "")).strip()
        if not bundle_id or not bundle_name:
            raise ValueError("Each editorial bundle requires non-empty 'id' and 'name'.")
        _validate_bundle_id(bundle_id)
        if bundle_id in seen_bundle_ids:
            raise ValueError(f"Duplicate editorial bundle id: {bundle_id}")
        if bundle_name in seen_bundle_names:
            raise ValueError(f"Duplicate editorial bundle name: {bundle_name}")

        seen_bundle_ids.add(bundle_id)
        seen_bundle_names.add(bundle_name)

        plugin_name = _bundle_plugin_name(bundle_id)
        if len(plugin_name) > 64:
            raise ValueError(f"Bundle plugin name exceeds 64 characters: {plugin_name}")

        for key in ("group", "emoji", "tagline", "audience", "description"):
            if not str(bundle.get(key, "")).strip():
                raise ValueError(f"Editorial bundle '{bundle_id}' is missing required field '{key}'.")

        skills = bundle.get("skills")
        if not isinstance(skills, list) or not skills:
            raise ValueError(f"Editorial bundle '{bundle_id}' must include a non-empty 'skills' array.")

        seen_skill_ids: set[str] = set()
        for skill in skills:
            if not isinstance(skill, dict):
                raise ValueError(f"Editorial bundle '{bundle_id}' contains a non-object skill entry.")
            skill_id = str(skill.get("id", "")).strip()
            summary = str(skill.get("summary", "")).strip()
            _validate_bundle_skill_id(skill_id)
            if skill_id in seen_skill_ids:
                raise ValueError(f"Editorial bundle '{bundle_id}' contains duplicate skill '{skill_id}'.")
            if not summary:
                raise ValueError(f"Editorial bundle '{bundle_id}' skill '{skill_id}' is missing summary.")
            skill_path = (skills_root / skill_id).resolve(strict=False)
            if not skill_path.exists():
                raise ValueError(f"Editorial bundle '{bundle_id}' references missing skill '{skill_id}'.")
            seen_skill_ids.add(skill_id)

    return bundles


def _bundle_target_status(bundle: dict[str, Any], compatibility: dict[str, dict[str, Any]]) -> dict[str, Any]:
    bundle_skills = [compatibility[skill["id"]] for skill in bundle["skills"] if skill["id"] in compatibility]
    return {
        "codex": bool(bundle_skills) and all(skill["targets"]["codex"] == "supported" for skill in bundle_skills),
        "claude": bool(bundle_skills) and all(skill["targets"]["claude"] == "supported" for skill in bundle_skills),
        "manual_setup": any(skill["setup"]["type"] == "manual" for skill in bundle_skills),
    }


def _render_bundle_plugin_status(bundle_status: dict[str, Any]) -> str:
    codex_status = "Codex plugin-safe" if bundle_status["codex"] else "Codex pending hardening"
    claude_status = "Claude plugin-safe" if bundle_status["claude"] else "Claude pending hardening"
    parts = [codex_status, claude_status]
    if bundle_status["manual_setup"]:
        parts.append("Requires manual setup")
    return " · ".join(parts)


def _render_bundle_sections(
    bundles: list[dict[str, Any]],
    compatibility: dict[str, dict[str, Any]],
) -> str:
    lines: list[str] = []
    current_group: str | None = None

    for bundle in bundles:
        group = bundle["group"]
        if group != current_group:
            if lines:
                lines.extend(["", "---", ""])
            lines.append(f"## {group}")
            lines.append("")
            current_group = group

        bundle_status = _bundle_target_status(bundle, compatibility)
        lines.append(f'### {bundle["emoji"]} {bundle["tagline"]}')
        lines.append("")
        lines.append(f'_{bundle["audience"]}_')
        lines.append("")
        lines.append(f'**Plugin status:** {_render_bundle_plugin_status(bundle_status)}')
        lines.append("")
        for skill in bundle["skills"]:
            skill_status = compatibility.get(skill["id"], {})
            plugin_info = skill_status.get("setup", {}) if isinstance(skill_status, dict) else {}
            suffix = " _(manual setup)_" if plugin_info.get("type") == "manual" else ""
            lines.append(
                f'- [`{skill["id"]}`](../../skills/{skill["id"]}/): {skill["summary"]}{suffix}'
            )
        lines.append("")

    return "\n".join(lines).strip() + "\n"


def render_bundles_doc(
    root: Path,
    metadata: dict[str, Any],
    bundles: list[dict[str, Any]],
    compatibility: dict[str, dict[str, Any]],
) -> str:
    template = (root / EDITORIAL_TEMPLATE_PATH).read_text(encoding="utf-8")
    return (
        template.replace("{{bundle_sections}}", _render_bundle_sections(bundles, compatibility).rstrip())
        .replace("{{total_skills_label}}", metadata["total_skills_label"])
        .replace("{{bundle_count}}", str(len(bundles)))
    )


def _copy_file_contents(src: Path, dest: Path, allowed_root: Path) -> None:
    resolved_src = src.resolve(strict=True)
    resolved_src.relative_to(allowed_root.resolve())

    if resolved_src.is_dir():
        dest.mkdir(parents=True, exist_ok=True)
        for child in resolved_src.iterdir():
            _copy_file_contents(child, dest / child.name, allowed_root)
        return

    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(resolved_src, dest)


def _copy_skill_directory(root: Path, skill_id: str, destination_root: Path) -> None:
    skills_root = root / "skills"
    source = (skills_root / skill_id).resolve(strict=True)
    source.relative_to(skills_root.resolve())
    if not source.is_dir():
        raise ValueError(f"Editorial bundle skill '{skill_id}' is not a directory.")

    skill_dest = destination_root / skill_id
    if skill_dest.exists():
        shutil.rmtree(skill_dest)

    for child in source.iterdir():
        _copy_file_contents(child, skill_dest / child.name, skills_root)

    if not (skill_dest / "SKILL.md").is_file():
        raise ValueError(f"Copied bundle skill '{skill_id}' is missing SKILL.md in {skill_dest}")


def _root_claude_plugin_manifest(metadata: dict[str, Any], supported_skill_count: int) -> dict[str, Any]:
    supported_label = _format_count_label(supported_skill_count)
    return {
        "name": ROOT_CLAUDE_PLUGIN_NAME,
        "version": metadata["version"],
        "description": (
            f"Plugin-safe Claude Code distribution of Antigravity Awesome Skills with "
            f"{supported_label} supported skills."
        ),
        "author": AUTHOR,
        "homepage": REPO_URL,
        "repository": REPO_URL,
        "license": "MIT",
        "keywords": [
            "claude-code",
            "skills",
            "agentic-skills",
            "plugin-safe",
            "productivity",
        ],
    }


def _root_codex_plugin_manifest(metadata: dict[str, Any], supported_skill_count: int) -> dict[str, Any]:
    supported_label = _format_count_label(supported_skill_count)
    return {
        "name": ROOT_CODEX_PLUGIN_NAME,
        "version": metadata["version"],
        "description": "Plugin-safe Codex plugin for the Antigravity Awesome Skills library.",
        "author": AUTHOR,
        "homepage": REPO_URL,
        "repository": REPO_URL,
        "license": "MIT",
        "keywords": [
            "codex",
            "skills",
            "agentic-skills",
            "developer-tools",
            "plugin-safe",
        ],
        "skills": "./skills/",
        "interface": {
            "displayName": "Antigravity Awesome Skills",
            "shortDescription": (
                f"{supported_label} plugin-safe skills for coding, security, product, and ops workflows."
            ),
            "longDescription": (
                "Install a plugin-safe Codex distribution of Antigravity Awesome Skills. "
                "Skills that still need hardening or target-specific setup remain available in the repo "
                "but are excluded from this plugin."
            ),
            "developerName": AUTHOR["name"],
            "category": "Productivity",
            "capabilities": ["Interactive", "Write"],
            "websiteURL": REPO_URL,
            "defaultPrompt": [
                "Use @brainstorming to plan a new feature.",
                "Use @test-driven-development to fix a bug safely.",
                "Use @lint-and-validate to verify this branch.",
            ],
            "brandColor": "#111827",
        },
    }


def _bundle_claude_plugin_manifest(metadata: dict[str, Any], bundle: dict[str, Any]) -> dict[str, Any]:
    return {
        "name": _bundle_plugin_name(bundle["id"]),
        "version": metadata["version"],
        "description": (
            f'Editorial "{bundle["name"]}" bundle for Claude Code from Antigravity Awesome Skills.'
        ),
        "author": AUTHOR,
        "homepage": REPO_URL,
        "repository": REPO_URL,
        "license": "MIT",
        "keywords": [
            "claude-code",
            "skills",
            "bundle",
            bundle["id"],
            "antigravity-awesome-skills",
        ],
    }


def _bundle_codex_plugin_manifest(metadata: dict[str, Any], bundle: dict[str, Any]) -> dict[str, Any]:
    category = _clean_group_label(bundle["group"])
    plugin_name = _bundle_codex_plugin_name(bundle["id"])
    skill_count = len(bundle["skills"])
    return {
        "name": plugin_name,
        "version": metadata["version"],
        "description": (
            f'Install the "{bundle["name"]}" editorial skill bundle from Antigravity Awesome Skills.'
        ),
        "author": AUTHOR,
        "homepage": REPO_URL,
        "repository": REPO_URL,
        "license": "MIT",
        "keywords": [
            "codex",
            "skills",
            "bundle",
            bundle["id"],
            "productivity",
        ],
        "skills": "./skills/",
        "interface": {
            "displayName": bundle["name"],
            "shortDescription": f"{category} · {skill_count} curated skills",
            "longDescription": _bundle_codex_long_description(bundle),
            "developerName": AUTHOR["name"],
            "category": category,
            "capabilities": ["Interactive", "Write"],
            "websiteURL": REPO_URL,
            "brandColor": "#111827",
        },
    }


def _bundle_claude_marketplace_entry(metadata: dict[str, Any], bundle: dict[str, Any]) -> dict[str, Any]:
    plugin_name = _bundle_plugin_name(bundle["id"])
    return {
        "name": plugin_name,
        "version": metadata["version"],
        "description": (
            f'Install the "{bundle["name"]}" editorial skill bundle for Claude Code.'
        ),
        "author": AUTHOR,
        "homepage": REPO_URL,
        "repository": REPO_URL,
        "license": "MIT",
        "keywords": [
            "claude-code",
            "skills",
            "bundle",
            bundle["id"],
            "marketplace",
        ],
        "source": f"./plugins/{plugin_name}",
    }


def _render_claude_marketplace(
    metadata: dict[str, Any],
    bundles: list[dict[str, Any]],
    bundle_support: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    plugins = [
        {
            "name": ROOT_CLAUDE_PLUGIN_NAME,
            "version": metadata["version"],
            "description": (
                "Expose the plugin-safe Claude Code subset of Antigravity Awesome Skills "
                "through a single marketplace entry."
            ),
            "author": AUTHOR,
            "homepage": REPO_URL,
            "repository": REPO_URL,
            "license": "MIT",
            "keywords": [
                "claude-code",
                "skills",
                "agentic-skills",
                "plugin",
                "marketplace",
            ],
            "source": f"./plugins/{ROOT_CLAUDE_PLUGIN_DIRNAME}",
        }
    ]
    plugins.extend(
        _bundle_claude_marketplace_entry(metadata, bundle)
        for bundle in bundles
        if bundle_support[bundle["id"]]["claude"]
    )
    return {
        "name": ROOT_CLAUDE_PLUGIN_NAME,
        "owner": AUTHOR,
        "metadata": {
            "description": (
                "Claude Code marketplace entries for the plugin-safe Antigravity Awesome Skills "
                "library and its compatible editorial bundles."
            ),
            "version": metadata["version"],
        },
        "plugins": plugins,
    }


def _render_codex_marketplace(
    bundles: list[dict[str, Any]],
    bundle_support: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    plugins: list[dict[str, Any]] = [
        {
            "name": ROOT_CODEX_PLUGIN_NAME,
            "source": {
                "source": "local",
                "path": f"./plugins/{ROOT_CODEX_PLUGIN_NAME}",
            },
            "policy": {
                "installation": "AVAILABLE",
                "authentication": "ON_INSTALL",
            },
            "category": "Productivity",
        }
    ]

    for bundle in bundles:
        if not bundle_support[bundle["id"]]["codex"]:
            continue
        plugins.append(
            {
                "name": _bundle_codex_plugin_name(bundle["id"]),
                "source": {
                    "source": "local",
                    "path": f'./plugins/{_bundle_plugin_name(bundle["id"])}',
                },
                "policy": {
                    "installation": "AVAILABLE",
                    "authentication": "ON_INSTALL",
                },
                "category": _clean_group_label(bundle["group"]),
            }
        )

    return {
        "name": ROOT_CODEX_PLUGIN_NAME,
        "interface": {
            "displayName": "Antigravity Awesome Skills",
        },
        "plugins": plugins,
    }


def _remove_tree(path: Path, retries: int = 3, delay_seconds: float = 0.1) -> None:
    last_error: OSError | None = None
    for attempt in range(retries):
        try:
            shutil.rmtree(path)
            return
        except OSError as exc:
            if exc.errno != errno.ENOTEMPTY or attempt == retries - 1:
                raise
            last_error = exc
            time.sleep(delay_seconds * (attempt + 1))

    if last_error is not None:
        raise last_error


def _materialize_plugin_skills(root: Path, destination_root: Path, skill_ids: list[str]) -> None:
    destination_root.mkdir(parents=True, exist_ok=True)

    for skill_id in skill_ids:
        _copy_skill_directory(root, skill_id, destination_root)


def _remove_path(path: Path) -> None:
    if path.is_symlink() or path.is_file():
        path.unlink()
        return
    if path.exists():
        _remove_tree(path)


def _replace_directory_atomically(
    destination_root: Path,
    populate: Callable[[Path], None],
) -> None:
    parent = destination_root.parent
    parent.mkdir(parents=True, exist_ok=True)

    staging_root = Path(
        tempfile.mkdtemp(
            prefix=f".{destination_root.name}.staging-",
            dir=parent,
        )
    )
    backup_root = parent / f".{destination_root.name}.backup-{uuid.uuid4().hex}"
    replaced_existing = False

    try:
        populate(staging_root)

        if destination_root.exists() or destination_root.is_symlink():
            os.replace(destination_root, backup_root)
            replaced_existing = True

        os.replace(staging_root, destination_root)
    except Exception:
        if replaced_existing and backup_root.exists() and not destination_root.exists():
            os.replace(backup_root, destination_root)
        raise
    finally:
        if staging_root.exists():
            _remove_path(staging_root)
        if backup_root.exists():
            _remove_path(backup_root)


def _supported_skill_ids(
    compatibility: dict[str, dict[str, Any]],
    target: str,
) -> list[str]:
    return sorted(
        skill_id
        for skill_id, skill in compatibility.items()
        if skill["targets"][target] == "supported"
    )


def _sync_root_plugins(
    root: Path,
    metadata: dict[str, Any],
    compatibility: dict[str, dict[str, Any]],
) -> None:
    codex_skill_ids = _supported_skill_ids(compatibility, "codex")
    claude_skill_ids = _supported_skill_ids(compatibility, "claude")

    codex_root = root / "plugins" / ROOT_CODEX_PLUGIN_NAME
    claude_root = root / "plugins" / ROOT_CLAUDE_PLUGIN_DIRNAME

    def populate_codex_root(staging_root: Path) -> None:
        _materialize_plugin_skills(root, staging_root / "skills", codex_skill_ids)
        _write_json(
            staging_root / ".codex-plugin" / "plugin.json",
            _root_codex_plugin_manifest(metadata, len(codex_skill_ids)),
        )

    def populate_claude_root(staging_root: Path) -> None:
        _materialize_plugin_skills(root, staging_root / "skills", claude_skill_ids)
        _write_json(
            staging_root / ".claude-plugin" / "plugin.json",
            _root_claude_plugin_manifest(metadata, len(claude_skill_ids)),
        )

    _replace_directory_atomically(codex_root, populate_codex_root)
    _replace_directory_atomically(claude_root, populate_claude_root)

    claude_manifest = _root_claude_plugin_manifest(metadata, len(claude_skill_ids))
    _write_json(root / CLAUDE_PLUGIN_PATH, claude_manifest)


def _sync_bundle_plugin_directory(
    root: Path,
    metadata: dict[str, Any],
    bundle: dict[str, Any],
    support: dict[str, Any],
) -> None:
    if not support["codex"] and not support["claude"]:
        return

    plugin_name = _bundle_plugin_name(bundle["id"])
    plugin_root = root / "plugins" / plugin_name

    def populate_bundle_plugin(staging_root: Path) -> None:
        bundle_skills_root = staging_root / "skills"
        bundle_skills_root.mkdir(parents=True, exist_ok=True)

        for skill in bundle["skills"]:
            _copy_skill_directory(root, skill["id"], bundle_skills_root)

        if support["claude"]:
            _write_json(
                staging_root / ".claude-plugin" / "plugin.json",
                _bundle_claude_plugin_manifest(metadata, bundle),
            )
        if support["codex"]:
            _write_json(
                staging_root / ".codex-plugin" / "plugin.json",
                _bundle_codex_plugin_manifest(metadata, bundle),
            )

    _replace_directory_atomically(plugin_root, populate_bundle_plugin)


def sync_editorial_bundle_plugins(
    root: Path,
    metadata: dict[str, Any],
    bundles: list[dict[str, Any]],
    bundle_support: dict[str, dict[str, Any]],
) -> None:
    plugins_root = root / "plugins"
    expected_plugin_names = {
        _bundle_plugin_name(bundle["id"])
        for bundle in bundles
        if bundle_support[bundle["id"]]["codex"] or bundle_support[bundle["id"]]["claude"]
    }
    for bundle in bundles:
        _sync_bundle_plugin_directory(root, metadata, bundle, bundle_support[bundle["id"]])

    for candidate in plugins_root.glob("antigravity-bundle-*"):
        if candidate.is_dir() and candidate.name not in expected_plugin_names:
            _remove_tree(candidate)


def load_editorial_bundles(root: Path) -> list[dict[str, Any]]:
    root = Path(root)
    payload = _read_json(root / EDITORIAL_BUNDLES_PATH)
    return _validate_editorial_bundles(root, payload)


def sync_editorial_bundles(root: Path) -> None:
    metadata = load_metadata(str(root))
    compatibility_report = sync_plugin_compatibility(root)
    compatibility = compatibility_by_skill_id(compatibility_report)
    bundles = load_editorial_bundles(root)
    bundle_support = {
        bundle["id"]: _bundle_target_status(bundle, compatibility)
        for bundle in bundles
    }

    _write_text(
        root / "docs" / "users" / "bundles.md",
        render_bundles_doc(root, metadata, bundles, compatibility),
    )
    _sync_root_plugins(root, metadata, compatibility)
    _write_json(
        root / CLAUDE_MARKETPLACE_PATH,
        _render_claude_marketplace(metadata, bundles, bundle_support),
    )
    _write_json(
        root / CODEX_MARKETPLACE_PATH,
        _render_codex_marketplace(bundles, bundle_support),
    )
    sync_editorial_bundle_plugins(root, metadata, bundles, bundle_support)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Sync editorial bundle docs and plugin marketplaces.")
    parser.add_argument(
        "--check",
        action="store_true",
        help="Validate the editorial bundles manifest and exit without writing files.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    root = find_repo_root(__file__)
    if args.check:
        metadata = load_metadata(str(root))
        compatibility_report = build_plugin_compatibility_report(root / "skills")
        compatibility = compatibility_by_skill_id(compatibility_report)
        bundles = load_editorial_bundles(root)
        expected_doc = render_bundles_doc(root, metadata, bundles, compatibility)
        current_doc = (root / "docs" / "users" / "bundles.md").read_text(encoding="utf-8")
        if current_doc != expected_doc:
            raise SystemExit("docs/users/bundles.md is out of sync with data/editorial-bundles.json")
        print("✅ Editorial bundles manifest and generated doc are in sync.")
        return 0
    sync_editorial_bundles(root)
    print("✅ Editorial bundles synced.")
    return 0


if __name__ == "__main__":
    configure_utf8_output()
    raise SystemExit(main())
