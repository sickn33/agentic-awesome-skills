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
REPO_URL = "https://github.com/sickn33/agentic-awesome-skills"
AUTHOR = {
    "name": "sickn33 and contributors",
    "url": REPO_URL,
}
ROOT_CLAUDE_PLUGIN_NAME = "agentic-awesome-skills"
ROOT_CODEX_PLUGIN_NAME = "agentic-awesome-skills"
ROOT_CLAUDE_PLUGIN_DIRNAME = "agentic-awesome-skills-claude"
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
    return f"agentic-bundle-{bundle_id}"


def _bundle_codex_plugin_name(bundle_id: str) -> str:
    return f"aasb-{bundle_id}"


def _humanize_skill_label(skill_id: str) -> str:
    tokens = re.split(r"[-_]+", skill_id.split("/")[-1])
    words = [ACRONYM_TOKENS.get(token.lower(), token.capitalize()) for token in tokens if token]
    return " ".join(words)


def _string_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item).strip() for item in value if str(item).strip()]


def _bundle_codex_short_description(bundle: dict[str, Any], category: str, skill_count: int) -> str:
    positioning = str(bundle.get("positioning", "")).strip()
    if positioning:
        return positioning
    return f"{category} · {skill_count} curated skills"


def _format_codex_audience(prefix: str, values: list[str]) -> str:
    if not values:
        return ""
    return f"{prefix}: {', '.join(values)}."


def _bundle_codex_long_description(bundle: dict[str, Any]) -> str:
    audience = str(bundle.get("audience") or bundle["description"]).strip()
    positioning = str(bundle.get("positioning", "")).strip()
    why = str(bundle.get("why", "")).strip()
    recommended_for = _string_list(bundle.get("recommendedFor"))
    not_for = _string_list(bundle.get("notFor"))
    highlights = [
        _humanize_skill_label(skill["id"])
        for skill in bundle["skills"][:2]
        if skill.get("id")
    ]
    remaining = len(bundle["skills"]) - len(highlights)

    if not highlights:
        coverage = f'Includes {len(bundle["skills"])} curated skills from Agentic Awesome Skills.'
    elif remaining > 0:
        coverage = f"Covers {', '.join(highlights)}, and {remaining} more skills."
    elif len(highlights) == 1:
        coverage = f"Covers {highlights[0]}."
    else:
        coverage = f"Covers {' and '.join(highlights)}."

    parts = [positioning or audience]
    if why and why not in parts:
        parts.append(why)
    parts.extend(
        part
        for part in (
            _format_codex_audience("Recommended for", recommended_for),
            _format_codex_audience("Not for", not_for),
            coverage,
        )
        if part
    )
    return " ".join(parts)


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

        for key in ("recommendedFor", "notFor", "defaultPrompts"):
            if key in bundle and not _string_list(bundle[key]):
                raise ValueError(f"Editorial bundle '{bundle_id}' field '{key}' must be a non-empty string array.")

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
            f"Plugin-safe Claude Code distribution of Agentic Awesome Skills with "
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
        "description": "Plugin-safe Codex plugin for the Agentic Awesome Skills library.",
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
            "displayName": "Agentic Awesome Skills",
            "shortDescription": (
                f"{supported_label} plugin-safe skills for coding, security, product, and ops workflows."
            ),
            "longDescription": (
                "Install a plugin-safe Codex distribution of Agentic Awesome Skills. "
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
            f'Editorial "{bundle["name"]}" bundle for Claude Code from Agentic Awesome Skills.'
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
            "agentic-awesome-skills",
        ],
    }


def _bundle_codex_plugin_manifest(metadata: dict[str, Any], bundle: dict[str, Any]) -> dict[str, Any]:
    category = _clean_group_label(bundle["group"])
    plugin_name = _bundle_codex_plugin_name(bundle["id"])
    skill_count = len(bundle["skills"])
    is_productized = bool(str(bundle.get("positioning", "")).strip() or _string_list(bundle.get("defaultPrompts")))
    description = (
        f'Install the "{bundle["name"]}" workflow plugin from Agentic Awesome Skills.'
        if is_productized
        else f'Install the "{bundle["name"]}" editorial skill bundle from Agentic Awesome Skills.'
    )
    interface = {
        "displayName": bundle["name"],
        "shortDescription": _bundle_codex_short_description(bundle, category, skill_count),
        "longDescription": _bundle_codex_long_description(bundle),
        "developerName": AUTHOR["name"],
        "category": category,
        "capabilities": ["Interactive", "Write"],
        "websiteURL": REPO_URL,
        "brandColor": "#111827",
    }
    default_prompts = _string_list(bundle.get("defaultPrompts"))
    if default_prompts:
        interface["defaultPrompt"] = default_prompts

    return {
        "name": plugin_name,
        "version": metadata["version"],
        "description": description,
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
        "interface": interface,
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
                "Expose the plugin-safe Claude Code subset of Agentic Awesome Skills "
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
                "Claude Code marketplace entries for the plugin-safe Agentic Awesome Skills "
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
            "displayName": "Agentic Awesome Skills",
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


def _skill_tree_files(root: Path, skill_ids: list[str]) -> dict[str, Path]:
    files: dict[str, Path] = {}
    skills_root = root / "skills"
    resolved_skills_root = skills_root.resolve()

    def collect(source_path: Path, relative_path: Path) -> None:
        resolved_source = source_path.resolve(strict=True)
        resolved_source.relative_to(resolved_skills_root)
        if resolved_source.is_dir():
            for child in resolved_source.iterdir():
                collect(child, relative_path / child.name)
            return
        files[relative_path.as_posix()] = resolved_source

    for skill_id in skill_ids:
        source_root = skills_root / skill_id
        if not source_root.is_dir():
            raise ValueError(f"Expected canonical skill directory is missing: {skill_id}")
        for child in source_root.iterdir():
            collect(child, Path(skill_id) / child.name)

    return files


def _assert_skill_mirror_matches(
    root: Path,
    destination_root: Path,
    skill_ids: list[str],
    label: str,
) -> None:
    if destination_root.is_symlink():
        raise ValueError(f"{label} skills directory must not be a symlink: {destination_root}")
    if not destination_root.is_dir():
        raise ValueError(f"{label} skills directory is missing: {destination_root}")

    expected_files = _skill_tree_files(root, skill_ids)
    actual_files = {
        path.relative_to(destination_root).as_posix(): path
        for path in destination_root.rglob("*")
        if path.is_file()
    }
    mirrored_symlinks = sorted(
        path.relative_to(destination_root).as_posix()
        for path in destination_root.rglob("*")
        if path.is_symlink()
    )
    if mirrored_symlinks:
        raise ValueError(f"{label} contains unexpected symlink: {mirrored_symlinks[0]}")
    expected_paths = set(expected_files)
    actual_paths = set(actual_files)

    missing = sorted(expected_paths - actual_paths)
    if missing:
        raise ValueError(f"{label} is missing mirrored file: {missing[0]}")

    unexpected = sorted(actual_paths - expected_paths)
    if unexpected:
        raise ValueError(f"{label} contains unexpected mirrored file: {unexpected[0]}")

    for relative_path in sorted(expected_paths):
        if expected_files[relative_path].read_bytes() != actual_files[relative_path].read_bytes():
            raise ValueError(f"{label} contains stale mirrored file: {relative_path}")


def _assert_json_matches(
    path: Path,
    expected: dict[str, Any],
    label: str,
    allowed_root: Path,
) -> None:
    relative_path = path.relative_to(allowed_root)
    current_path = allowed_root
    for part in relative_path.parts:
        current_path /= part
        if current_path.is_symlink():
            raise ValueError(f"{label} path must not contain a symlink: {current_path}")
    if not path.is_file():
        raise ValueError(f"{label} is missing: {path}")
    expected_content = (json.dumps(expected, indent=2, ensure_ascii=False) + "\n").encode("utf-8")
    if path.read_bytes() != expected_content:
        raise ValueError(f"{label} is out of sync: {path}")


def _assert_plugin_metadata_layout(
    plugin_root: Path,
    expected_relative_paths: set[str],
    label: str,
) -> None:
    if plugin_root.is_symlink():
        raise ValueError(f"{label} root must not be a symlink: {plugin_root}")
    if not plugin_root.is_dir():
        raise ValueError(f"{label} root is missing: {plugin_root}")
    actual_relative_paths = {
        path.relative_to(plugin_root).as_posix()
        for path in plugin_root.rglob("*")
        if path.is_file() and "skills" not in path.relative_to(plugin_root).parts[:1]
    }
    unexpected_symlinks = sorted(
        path.relative_to(plugin_root).as_posix()
        for path in plugin_root.rglob("*")
        if path.is_symlink() and "skills" not in path.relative_to(plugin_root).parts[:1]
    )
    if unexpected_symlinks:
        raise ValueError(f"{label} contains unexpected metadata symlink: {unexpected_symlinks[0]}")
    if actual_relative_paths != expected_relative_paths:
        missing = sorted(expected_relative_paths - actual_relative_paths)
        unexpected = sorted(actual_relative_paths - expected_relative_paths)
        detail = f"missing {missing[0]}" if missing else f"unexpected {unexpected[0]}"
        raise ValueError(f"{label} metadata layout is out of sync: {detail}")


def check_editorial_bundle_plugins(
    root: Path,
    metadata: dict[str, Any],
    bundles: list[dict[str, Any]],
    compatibility: dict[str, dict[str, Any]],
) -> None:
    bundle_support = {
        bundle["id"]: _bundle_target_status(bundle, compatibility)
        for bundle in bundles
    }
    codex_skill_ids = _supported_skill_ids(compatibility, "codex")
    claude_skill_ids = _supported_skill_ids(compatibility, "claude")

    _assert_json_matches(
        root / CODEX_MARKETPLACE_PATH,
        _render_codex_marketplace(bundles, bundle_support),
        "Codex marketplace",
        root,
    )
    _assert_json_matches(
        root / CLAUDE_MARKETPLACE_PATH,
        _render_claude_marketplace(metadata, bundles, bundle_support),
        "Claude marketplace",
        root,
    )
    _assert_json_matches(
        root / CLAUDE_PLUGIN_PATH,
        _root_claude_plugin_manifest(metadata, len(claude_skill_ids)),
        "root Claude plugin manifest",
        root,
    )

    codex_root = root / "plugins" / ROOT_CODEX_PLUGIN_NAME
    claude_root = root / "plugins" / ROOT_CLAUDE_PLUGIN_DIRNAME
    _assert_json_matches(
        codex_root / ".codex-plugin" / "plugin.json",
        _root_codex_plugin_manifest(metadata, len(codex_skill_ids)),
        "root Codex plugin manifest",
        root,
    )
    _assert_json_matches(
        claude_root / ".claude-plugin" / "plugin.json",
        _root_claude_plugin_manifest(metadata, len(claude_skill_ids)),
        "root Claude plugin manifest",
        root,
    )
    _assert_plugin_metadata_layout(
        codex_root,
        {".codex-plugin/plugin.json"},
        "root Codex plugin",
    )
    _assert_plugin_metadata_layout(
        claude_root,
        {".claude-plugin/plugin.json"},
        "root Claude plugin",
    )
    _assert_skill_mirror_matches(root, codex_root / "skills", codex_skill_ids, "root Codex plugin")
    _assert_skill_mirror_matches(root, claude_root / "skills", claude_skill_ids, "root Claude plugin")

    expected_bundle_names = {
        _bundle_plugin_name(bundle["id"])
        for bundle in bundles
        if bundle_support[bundle["id"]]["codex"] or bundle_support[bundle["id"]]["claude"]
    }
    actual_bundle_names = {
        path.name
        for path in (root / "plugins").glob("agentic-bundle-*")
        if path.is_dir()
    }
    if actual_bundle_names != expected_bundle_names:
        missing = sorted(expected_bundle_names - actual_bundle_names)
        unexpected = sorted(actual_bundle_names - expected_bundle_names)
        detail = f"missing {missing[0]}" if missing else f"unexpected {unexpected[0]}"
        raise ValueError(f"Generated bundle plugin directories are out of sync: {detail}")

    for bundle in bundles:
        support = bundle_support[bundle["id"]]
        if not support["codex"] and not support["claude"]:
            continue
        plugin_root = root / "plugins" / _bundle_plugin_name(bundle["id"])
        skill_ids = [skill["id"] for skill in bundle["skills"]]
        _assert_skill_mirror_matches(
            root,
            plugin_root / "skills",
            skill_ids,
            f'bundle plugin {bundle["id"]}',
        )

        manifest_specs = (
            (
                "codex",
                plugin_root / ".codex-plugin" / "plugin.json",
                _bundle_codex_plugin_manifest(metadata, bundle),
            ),
            (
                "claude",
                plugin_root / ".claude-plugin" / "plugin.json",
                _bundle_claude_plugin_manifest(metadata, bundle),
            ),
        )
        expected_manifest_paths: set[str] = set()
        for target, manifest_path, expected_manifest in manifest_specs:
            if support[target]:
                expected_manifest_paths.add(manifest_path.relative_to(plugin_root).as_posix())
                _assert_json_matches(
                    manifest_path,
                    expected_manifest,
                    f'bundle {bundle["id"]} {target} manifest',
                    root,
                )
            elif manifest_path.exists():
                raise ValueError(
                    f'Bundle {bundle["id"]} contains an unsupported {target} manifest: {manifest_path}'
                )
        _assert_plugin_metadata_layout(
            plugin_root,
            expected_manifest_paths,
            f'bundle plugin {bundle["id"]}',
        )


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

    stale_plugin_roots = [
        plugins_root / "antigravity-awesome-skills",
        plugins_root / "antigravity-awesome-skills-claude",
    ]
    for stale_root in stale_plugin_roots:
        if stale_root.is_dir():
            _remove_tree(stale_root)

    for candidate in plugins_root.glob("antigravity-bundle-*"):
        if candidate.is_dir():
            _remove_tree(candidate)

    for candidate in plugins_root.glob("agentic-bundle-*"):
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
        try:
            check_editorial_bundle_plugins(root, metadata, bundles, compatibility)
        except ValueError as exc:
            raise SystemExit(str(exc)) from exc
        print("✅ Editorial bundles, marketplaces, manifests, and plugin mirrors are in sync.")
        return 0
    sync_editorial_bundles(root)
    print("✅ Editorial bundles synced.")
    return 0


if __name__ == "__main__":
    configure_utf8_output()
    raise SystemExit(main())
